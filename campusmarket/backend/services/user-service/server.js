require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3002;

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

// Middleware: verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/users/:id — get public profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, first_name, last_name, campus_zone, bio, rating, sold_items, member_since, is_verified FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me — get own profile
app.get('/api/users/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const { password_hash, verification_token, ...user } = result.rows[0];
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/me — update own profile
app.patch('/api/users/me', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, bio, campus_zone, phone } = req.body;
    await pool.query(
      'UPDATE users SET first_name=$1, last_name=$2, bio=$3, campus_zone=$4, phone=$5, updated_at=NOW() WHERE id=$6',
      [first_name, last_name, bio, campus_zone, phone, req.user.userId]
    );
    await publishEvent(EVENT_CHANNELS.USER, {
      type: EVENT_TYPES.USER_PROFILE_UPDATED,
      userId: req.user.userId,
    });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/reviews — leave a review
app.post('/api/users/:id/reviews', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const sellerId = req.params.id;
    await pool.query(
      'INSERT INTO reviews (reviewer_id, seller_id, rating, comment, created_at) VALUES ($1,$2,$3,$4,NOW())',
      [req.user.userId, sellerId, rating, comment]
    );
    // Recalculate seller avg rating
    const avg = await pool.query('SELECT AVG(rating) as avg FROM reviews WHERE seller_id=$1', [sellerId]);
    await pool.query('UPDATE users SET rating=$1 WHERE id=$2', [avg.rows[0].avg, sellerId]);
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function setupEventHandlers() {
  // When auth-service registers a new user, create their profile row
  await subscribeToEvents(EVENT_CHANNELS.USER, (event) => {
    if (event.type === EVENT_TYPES.USER_REGISTERED) {
      pool.query(
        'INSERT INTO users (id, email, created_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING',
        [event.userId, event.email]
      ).catch(console.error);
    }
    if (event.type === EVENT_TYPES.USER_SUSPENDED) {
      pool.query('UPDATE users SET is_suspended=true WHERE id=$1', [event.userId]).catch(console.error);
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    app.listen(PORT, () => console.log(`User service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start user-service:', err);
    process.exit(1);
  }
}

init();
