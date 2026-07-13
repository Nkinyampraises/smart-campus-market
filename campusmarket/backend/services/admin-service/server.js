require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { authenticate, requireRole } = require('../../shared/authMiddleware');
const { sanitizeString, validateUUID } = require('../../shared/validate');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3005;
let server;

collectDefaultMetrics();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

const authenticateAdmin = [authenticate, requireRole('admin')];

// GET /api/admin/stats
app.get('/api/admin/stats', authenticateAdmin, asyncHandler(async (req, res) => {
  const [users, activeListings, totalListings, reports, fraudFlags, transactions, messages] = await Promise.all([
    pool.query('SELECT COUNT(*)::int as cnt FROM users'),
    pool.query("SELECT COUNT(*)::int as cnt FROM listings WHERE status='active'"),
    pool.query('SELECT COUNT(*)::int as cnt FROM listings'),
    pool.query("SELECT COUNT(*)::int as cnt FROM reports WHERE status='pending'"),
    pool.query('SELECT COUNT(*)::int as cnt FROM fraud_flags WHERE resolved=false'),
    pool.query('SELECT COUNT(*)::int as cnt FROM transactions'),
    pool.query('SELECT COUNT(*)::int as cnt FROM messages'),
  ]);
  res.json({
    totalUsers: users.rows[0].cnt,
    activeListings: activeListings.rows[0].cnt,
    totalListings: totalListings.rows[0].cnt,
    pendingReports: reports.rows[0].cnt,
    fraudFlags: fraudFlags.rows[0].cnt,
    transactions: transactions.rows[0].cnt,
    messages: messages.rows[0].cnt,
  });
}));

// GET /api/admin/public-stats
app.get('/api/admin/public-stats', asyncHandler(async (_req, res) => {
  const [users, activeListings, transactions] = await Promise.all([
    pool.query('SELECT COUNT(*)::int as cnt FROM users WHERE is_verified=true'),
    pool.query("SELECT COUNT(*)::int as cnt FROM listings WHERE status='active'"),
    pool.query('SELECT COUNT(*)::int as cnt FROM transactions'),
  ]);
  res.json({
    verifiedUsers: users.rows[0].cnt,
    activeListings: activeListings.rows[0].cnt,
    transactions: transactions.rows[0].cnt,
  });
}));

// GET /api/admin/users
app.get('/api/admin/users', authenticateAdmin, asyncHandler(async (req, res) => {
  const { suspended, search } = req.query;
  let query = `SELECT id, email, first_name, last_name, campus_zone, is_verified, is_suspended, created_at FROM users WHERE 1=1`;
  const params = [];
  if (suspended === 'true') { query += " AND is_suspended=true"; }
  if (suspended === 'false') { query += " AND is_suspended=false"; }
  if (search) { params.push(`%${search}%`); query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`; }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// POST /api/admin/users/:id/suspend
app.post('/api/admin/users/:id/suspend', authenticateAdmin, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  await pool.query('UPDATE users SET is_suspended=true, suspended_reason=$1 WHERE id=$2', [sanitizeString(reason, 500), req.params.id]);
  await publishEvent(EVENT_CHANNELS.ADMIN, {
    type: EVENT_TYPES.USER_SUSPENDED,
    userId: req.params.id, reason: sanitizeString(reason, 500), adminId: req.user.userId,
  });
  logger.info('User suspended', { userId: req.params.id, adminId: req.user.userId });
  res.json({ message: 'User suspended' });
}));

// POST /api/admin/users/:id/unsuspend
app.post('/api/admin/users/:id/unsuspend', authenticateAdmin, asyncHandler(async (req, res) => {
  await pool.query('UPDATE users SET is_suspended=false, suspended_reason=NULL WHERE id=$1', [req.params.id]);
  res.json({ message: 'User unsuspended' });
}));

// GET /api/admin/reports
app.get('/api/admin/reports', authenticateAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT r.*, l.title as listing_title, l.seller_id, u.first_name as reporter_first, u.last_name as reporter_last
     FROM reports r
     LEFT JOIN listings l ON r.listing_id=l.id
     LEFT JOIN users u ON r.reporter_id=u.id
     WHERE r.status=$1 ORDER BY r.created_at DESC`, ['pending']
  );
  res.json(result.rows);
}));

// PATCH /api/admin/reports/:id
app.patch('/api/admin/reports/:id', authenticateAdmin, asyncHandler(async (req, res) => {
  const { status, action } = req.body;
  await pool.query('UPDATE reports SET status=$1, resolved_at=NOW(), admin_id=$2 WHERE id=$3', [status, req.user.userId, req.params.id]);

  if (action === 'remove_listing') {
    const report = await pool.query('SELECT listing_id FROM reports WHERE id=$1', [req.params.id]);
    if (report.rows[0]?.listing_id) {
      await publishEvent(EVENT_CHANNELS.ADMIN, { type: 'listing.removed', listingId: report.rows[0].listing_id });
    }
  }

  // Auto-hide listing if it has >= 3 pending reports
  const report = await pool.query('SELECT listing_id FROM reports WHERE id=$1', [req.params.id]);
  if (report.rows[0]?.listing_id) {
    const count = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM reports WHERE listing_id=$1 AND status=$2',
      [report.rows[0].listing_id, 'pending']
    );
    if (count.rows[0].cnt >= 3) {
      await publishEvent(EVENT_CHANNELS.ADMIN, { type: 'listing.removed', listingId: report.rows[0].listing_id });
      logger.info('Auto-hidden listing due to reports', { listingId: report.rows[0].listing_id });
    }
  }

  res.json({ message: 'Report resolved' });
}));

// GET /api/admin/fraud-flags
app.get('/api/admin/fraud-flags', authenticateAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT f.*, l.title as listing_title, u.first_name as seller_first, u.last_name as seller_last
     FROM fraud_flags f
     LEFT JOIN listings l ON f.listing_id=l.id
     LEFT JOIN users u ON f.seller_id=u.id
     WHERE f.resolved=false ORDER BY f.created_at DESC`
  );
  res.json(result.rows);
}));

// PATCH /api/admin/fraud-flags/:id/resolve
app.patch('/api/admin/fraud-flags/:id/resolve', authenticateAdmin, asyncHandler(async (req, res) => {
  await pool.query('UPDATE fraud_flags SET resolved=true, resolved_at=NOW() WHERE id=$1', [req.params.id]);
  res.json({ message: 'Fraud flag resolved' });
}));

// GET /api/admin/listing-flags/:listingId — public, used by listing detail page
app.get('/api/admin/listing-flags/:listingId', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, type, rule, created_at FROM fraud_flags WHERE listing_id=$1 AND resolved=false ORDER BY created_at DESC',
    [req.params.listingId]
  );
  res.json({ flagged: result.rows.length > 0, flags: result.rows });
}));

// POST /api/reports — any authenticated user can file a report
app.post('/api/reports', authenticate, asyncHandler(async (req, res) => {
  const { listing_id, reason, description } = req.body;
  if (!validateUUID(listing_id)) throw new AppError('Invalid listing ID', 400);

  await pool.query(
    'INSERT INTO reports (listing_id, reporter_id, reason, description, status, created_at) VALUES ($1,$2,$3,$4,\'pending\',NOW())',
    [listing_id, req.user.userId, sanitizeString(reason, 100), sanitizeString(description, 2000)]
  );

  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: 'report_submitted', listingId: listing_id, reason: sanitizeString(reason, 100),
  });

  // Auto-hide check
  const count = await pool.query(
    'SELECT COUNT(*)::int as cnt FROM reports WHERE listing_id=$1 AND status=$2',
    [listing_id, 'pending']
  );
  if (count.rows[0].cnt >= 3) {
    await publishEvent(EVENT_CHANNELS.ADMIN, { type: 'listing.removed', listingId: listing_id });
    logger.info('Auto-hidden listing due to reports', { listingId: listing_id });
  }

  res.status(201).json({ message: 'Report submitted' });
}));

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'admin-service', timestamp: new Date().toISOString() });
}));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((err, req, res, _next) => {
  logger.error(err.message || 'Admin error');
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.AUDIT, async (event) => {
    if ([EVENT_TYPES.LOW_PRICE_FLAG, EVENT_TYPES.HIGH_PRICE_FLAG, EVENT_TYPES.SPAM_RATE_FLAG].includes(event.type)) {
      await pool.query(
        'INSERT INTO fraud_flags (listing_id, seller_id, rule, type, resolved, created_at) VALUES ($1,$2,$3,$4,false,NOW())',
        [event.listingId, event.sellerId, event.rule, event.type]
      ).catch((e) => logger.error('Fraud flag insert failed', { error: e.message }));
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`Admin service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start admin-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'admin-service' });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeRedis();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
module.exports._init = init;
module.exports._shutdown = shutdown;
if (require.main === module) { init(); }
