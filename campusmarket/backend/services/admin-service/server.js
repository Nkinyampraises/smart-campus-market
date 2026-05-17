require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3005;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(helmet());
app.use(cors());
app.use(express.json());
collectDefaultMetrics();

const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/admin/stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const [users, listings, reports, fraudFlags] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM listings WHERE status='active'"),
      pool.query("SELECT COUNT(*) FROM reports WHERE status='pending'"),
      pool.query('SELECT COUNT(*) FROM fraud_flags WHERE resolved=false'),
    ]);
    res.json({
      totalUsers: users.rows[0].count,
      liveListings: listings.rows[0].count,
      pendingReports: reports.rows[0].count,
      fraudFlags: fraudFlags.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, first_name, last_name, campus_zone, is_verified, is_suspended, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/suspend
app.post('/api/admin/users/:id/suspend', authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query('UPDATE users SET is_suspended=true, suspended_reason=$1 WHERE id=$2', [reason, req.params.id]);
    await publishEvent(EVENT_CHANNELS.ADMIN, {
      type: EVENT_TYPES.USER_SUSPENDED,
      userId: req.params.id,
      reason,
      adminId: req.user.userId,
    });
    res.json({ message: 'User suspended' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/unsuspend
app.post('/api/admin/users/:id/unsuspend', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_suspended=false, suspended_reason=NULL WHERE id=$1', [req.params.id]);
    res.json({ message: 'User unsuspended' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/reports
app.get('/api/admin/reports', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports WHERE status=$1 ORDER BY created_at DESC', ['pending']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/reports/:id
app.patch('/api/admin/reports/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, action } = req.body;
    await pool.query('UPDATE reports SET status=$1, resolved_at=NOW(), admin_id=$2 WHERE id=$3', [status, req.user.userId, req.params.id]);
    if (action === 'remove_listing') {
      const report = await pool.query('SELECT listing_id FROM reports WHERE id=$1', [req.params.id]);
      await publishEvent(EVENT_CHANNELS.ADMIN, { type: 'listing.removed', listingId: report.rows[0].listing_id });
    }
    res.json({ message: 'Report resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/fraud-flags
app.get('/api/admin/fraud-flags', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fraud_flags WHERE resolved=false ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reports — any user can file a report
app.post('/api/reports', async (req, res) => {
  try {
    const { listing_id, reason, description } = req.body;
    await pool.query(
      'INSERT INTO reports (listing_id, reason, description, status, created_at) VALUES ($1,$2,$3,\'pending\',NOW())',
      [listing_id, reason, description]
    );
    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function setupEventHandlers() {
  // Receive fraud flags from AI service and store them
  await subscribeToEvents(EVENT_CHANNELS.LISTING, async (event) => {
    if (event.type === EVENT_TYPES.LOW_PRICE_FLAG || event.type === EVENT_TYPES.SPAM_RATE_FLAG) {
      await pool.query(
        'INSERT INTO fraud_flags (listing_id, seller_id, rule, type, resolved, created_at) VALUES ($1,$2,$3,$4,false,NOW())',
        [event.listingId, event.sellerId, event.rule, event.type]
      ).catch(console.error);
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    app.listen(PORT, () => console.log(`Admin service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start admin-service:', err);
    process.exit(1);
  }
}

init();
