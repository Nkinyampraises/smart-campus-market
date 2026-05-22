require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { authenticate } = require('../../shared/authMiddleware');
const { sanitizeString, validateUUID } = require('../../shared/validate');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3002;
let server;

collectDefaultMetrics();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// GET /api/users/:id — public profile
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validateUUID(id)) throw new AppError('Invalid user ID', 400);

  const result = await pool.query(
    `SELECT id, first_name, last_name, campus_zone, bio, rating, sold_items, member_since, is_verified, avatar_url, created_at
     FROM users WHERE id=$1`, [id]
  );
  if (!result.rows.length) throw new AppError('User not found', 404);

  const reviews = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at,
            u.first_name as reviewer_first, u.last_name as reviewer_last
     FROM reviews r JOIN users u ON r.reviewer_id=u.id
     WHERE r.seller_id=$1 ORDER BY r.created_at DESC LIMIT 10`, [id]
  );

  const activeListings = await pool.query(
    "SELECT COUNT(*)::int as cnt FROM listings WHERE seller_id=$1 AND status='active'", [id]
  );

  res.json({
    ...result.rows[0],
    reviews: reviews.rows,
    active_listings: activeListings.rows[0].cnt,
  });
}));

// GET /api/users/me — own profile with computed stats
app.get('/api/users/me', authenticate, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.userId]);
  if (!result.rows.length) throw new AppError('User not found', 404);
  const { password_hash, verification_token, ...user } = result.rows[0];

  const activeListings = await pool.query("SELECT COUNT(*)::int as cnt FROM listings WHERE seller_id=$1 AND status='active'", [req.user.userId]);
  const soldItems = await pool.query("SELECT COUNT(*)::int as cnt FROM transactions WHERE seller_id=$1", [req.user.userId]);
  const boughtItems = await pool.query("SELECT COUNT(*)::int as cnt FROM transactions WHERE buyer_id=$1", [req.user.userId]);

  res.json({ ...user, active_listings: activeListings.rows[0].cnt, sold_items: soldItems.rows[0].cnt, bought_items: boughtItems.rows[0].cnt });
}));

// PATCH /api/users/me — update profile
app.patch('/api/users/me', authenticate, asyncHandler(async (req, res) => {
  const { first_name, last_name, bio, campus_zone, phone, avatar_url } = req.body;
  await pool.query(
    'UPDATE users SET first_name=$1, last_name=$2, bio=$3, campus_zone=$4, phone=$5, avatar_url=$6, updated_at=NOW() WHERE id=$7',
    [sanitizeString(first_name, 100), sanitizeString(last_name, 100), sanitizeString(bio, 2000), sanitizeString(campus_zone, 100), sanitizeString(phone, 30), sanitizeString(avatar_url, 500), req.user.userId]
  );
  await publishEvent(EVENT_CHANNELS.USER, {
    type: EVENT_TYPES.USER_PROFILE_UPDATED,
    userId: req.user.userId,
  });
  res.json({ message: 'Profile updated' });
}));

// POST /api/users/:id/reviews — leave a review
app.post('/api/users/:id/reviews', authenticate, asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const sellerId = req.params.id;
  if (!validateUUID(sellerId)) throw new AppError('Invalid seller ID', 400);
  if (!rating || rating < 1 || rating > 5) throw new AppError('Rating must be 1–5', 400);

  await pool.query(
    'INSERT INTO reviews (reviewer_id, seller_id, rating, comment, created_at) VALUES ($1,$2,$3,$4,NOW())',
    [req.user.userId, sellerId, rating, sanitizeString(comment, 2000)]
  );

  const avg = await pool.query('SELECT AVG(rating)::numeric(3,2) as avg FROM reviews WHERE seller_id=$1', [sellerId]);
  await pool.query('UPDATE users SET rating=$1 WHERE id=$2', [avg.rows[0].avg, sellerId]);

  logger.info('Review submitted', { reviewer: req.user.userId, seller: sellerId, rating });
  res.status(201).json({ message: 'Review submitted' });
}));

// ── Wishlist ────────────────────────────────────────────────────────────────
app.post('/api/wishlist/:listingId', authenticate, asyncHandler(async (req, res) => {
  const listingId = req.params.listingId;
  if (!validateUUID(listingId)) throw new AppError('Invalid listing ID', 400);

  const listing = await pool.query("SELECT id, seller_id, price_fcfa FROM listings WHERE id=$1 AND status='active'", [listingId]);
  if (!listing.rows.length) throw new AppError('Listing not found or not active', 404);

  await pool.query(
    'INSERT INTO wishlist (user_id, listing_id, added_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING',
    [req.user.userId, listingId]
  );
  res.json({ message: 'Added to wishlist' });
}));

app.delete('/api/wishlist/:listingId', authenticate, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM wishlist WHERE user_id=$1 AND listing_id=$2', [req.user.userId, req.params.listingId]);
  res.json({ message: 'Removed from wishlist' });
}));

app.get('/api/wishlist', authenticate, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT w.listing_id as id, l.title, l.price_fcfa, l.category, l.campus_zone, l.condition, l.images, l.status,
            u.first_name as seller_first, u.last_name as seller_last
     FROM wishlist w
     JOIN listings l ON w.listing_id=l.id
     JOIN users u ON l.seller_id=u.id
     WHERE w.user_id=$1 ORDER BY w.added_at DESC`,
    [req.user.userId]
  );
  res.json(result.rows);
}));

// ── Transactions ────────────────────────────────────────────────────────────
app.get('/api/users/me/transactions', authenticate, asyncHandler(async (req, res) => {
  const sold = await pool.query(
    `SELECT t.id, t.final_price, t.completed_at, l.id as listing_id, l.title, l.images,
            u.first_name as buyer_first, u.last_name as buyer_last
     FROM transactions t
     JOIN listings l ON t.listing_id=l.id
     JOIN users u ON t.buyer_id=u.id
     WHERE t.seller_id=$1 ORDER BY t.completed_at DESC`,
    [req.user.userId]
  );
  const bought = await pool.query(
    `SELECT t.id, t.final_price, t.completed_at, l.id as listing_id, l.title, l.images,
            u.first_name as seller_first, u.last_name as seller_last
     FROM transactions t
     JOIN listings l ON t.listing_id=l.id
     JOIN users u ON t.seller_id=u.id
     WHERE t.buyer_id=$1 ORDER BY t.completed_at DESC`,
    [req.user.userId]
  );
  res.json({ sold: sold.rows, bought: bought.rows });
}));

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
}));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((err, req, res, _next) => {
  logger.error(err.message || 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.USER, (event) => {
    if (event.type === EVENT_TYPES.USER_REGISTERED) {
      pool.query(
        'INSERT INTO users (id, email, first_name, last_name, campus_zone, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING',
        [event.userId, event.email, event.first_name, event.last_name, event.campus_zone]
      ).catch((e) => logger.error('Profile create failed', { error: e.message }));
    }
    if (event.type === EVENT_TYPES.USER_SUSPENDED) {
      pool.query('UPDATE users SET is_suspended=true WHERE id=$1', [event.userId]).catch(() => {});
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`User service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start user-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'user-service' });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeRedis();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

init();
