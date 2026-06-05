require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { authenticate } = require('../../shared/authMiddleware');
const { validateListing, validateUUID, sanitizeString } = require('../../shared/validate');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, getRedisClient, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3003;

let redis;
let server;

collectDefaultMetrics();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(metricsMiddleware);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: record unique view with Redis dedup (1 hour window)
async function recordView(listingId, userIdOrIp) {
  const key = `view:${listingId}:${userIdOrIp}`;
  const exists = await redis.get(key);
  if (!exists) {
    await pool.query('UPDATE listings SET views=views+1 WHERE id=$1', [listingId]);
    await redis.set(key, '1', { EX: 3600 });
  }
}

// GET /api/listings — browse active listings
app.get('/api/listings', asyncHandler(async (req, res) => {
  const { category, campus_zone, min_price, max_price, condition, mine, page = 1, limit = 20 } = req.query;
  let query = "SELECT l.*, COALESCE(array_agg(li.image_url ORDER BY li.sort_order) FILTER (WHERE li.id IS NOT NULL), ARRAY[]::TEXT[]) as images FROM listings l LEFT JOIN listing_images li ON l.id=li.listing_id WHERE l.status=$1";
  const params = ['active'];
  let idx = 2;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  if (mine) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new AppError('Unauthorized', 401);
    let userId;
    try {
      userId = jwt.verify(token, process.env.JWT_SECRET).userId;
    } catch {
      throw new AppError('Invalid token', 401);
    }
    query = query.replace("l.status=$1", "l.status IN ('active','reserved','sold','expired') AND l.seller_id=$1");
    params[0] = userId;
  }

  if (category) { query += ` AND l.category=$${idx++}`; params.push(category); }
  if (campus_zone) { query += ` AND l.campus_zone=$${idx++}`; params.push(campus_zone); }
  if (min_price) { query += ` AND l.price_fcfa>=$${idx++}`; params.push(min_price); }
  if (max_price) { query += ` AND l.price_fcfa<=$${idx++}`; params.push(max_price); }
  if (condition) { query += ` AND l.condition=$${idx++}`; params.push(condition); }

  query += ` GROUP BY l.id ORDER BY l.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(limitNum, (pageNum - 1) * limitNum);

  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// GET /api/listings/:id
app.get('/api/listings/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!validateUUID(id)) throw new AppError('Invalid listing ID', 400);

  const result = await pool.query(
    `SELECT l.*,
      COALESCE((SELECT array_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id=l.id), ARRAY[]::TEXT[]) as images,
      u.first_name as seller_first, u.last_name as seller_last, u.rating as seller_rating, u.avatar_url as seller_avatar
     FROM listings l JOIN users u ON l.seller_id=u.id WHERE l.id=$1`, [id]
  );
  if (!result.rows.length) throw new AppError('Listing not found', 404);

  const viewerId = req.headers['x-user-id'] || req.ip;
  await recordView(id, viewerId);

  res.json(result.rows[0]);
}));

// POST /api/listings — create listing
app.post('/api/listings', authenticate, asyncHandler(async (req, res) => {
  const { title, description, category, price_fcfa, condition, campus_zone, tags, images } = req.body;
  const v = validateListing({ title, description, category, price_fcfa, condition, campus_zone, tags });
  if (!v.valid) throw new AppError(v.errors.join(', '), 400);

  const result = await pool.query(
    `INSERT INTO listings (seller_id, title, description, category, price_fcfa, condition, campus_zone, tags, status, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',NOW(), NOW() + INTERVAL '30 days') RETURNING id`,
    [req.user.userId, v.sanitized.title, v.sanitized.description, v.sanitized.category, v.sanitized.price_fcfa,
     v.sanitized.condition, v.sanitized.campus_zone, JSON.stringify(v.sanitized.tags)]
  );
  const listingId = result.rows[0].id;

  // Store image URLs if provided
  if (Array.isArray(images)) {
    for (let i = 0; i < images.length; i++) {
      await pool.query(
        'INSERT INTO listing_images (listing_id, image_url, sort_order) VALUES ($1,$2,$3)',
        [listingId, images[i], i]
      );
    }
  }

  await publishEvent(EVENT_CHANNELS.LISTING, {
    type: EVENT_TYPES.LISTING_CREATED,
    listingId, sellerId: req.user.userId,
    title: v.sanitized.title, category: v.sanitized.category, price_fcfa: v.sanitized.price_fcfa,
  });

  logger.info('Listing created', { listingId, sellerId: req.user.userId });
  res.status(201).json({ message: 'Listing created', listingId });
}));

// POST /api/listings/:id/images — upload images
app.post('/api/listings/:id/images', authenticate, upload.array('images', 5), asyncHandler(async (req, res) => {
  const listingId = req.params.id;
  const listing = await pool.query('SELECT seller_id FROM listings WHERE id=$1', [listingId]);
  if (!listing.rows.length || listing.rows[0].seller_id !== req.user.userId) throw new AppError('Forbidden', 403);

  // For production, upload to Cloudinary here. For now, accept base64 or URLs from frontend.
  const uploaded = req.files ? req.files.map((f, i) => ({ name: f.originalname, size: f.size, index: i })) : [];
  res.json({ message: 'Images received', count: uploaded.length });
}));

// PATCH /api/listings/:id
app.patch('/api/listings/:id', authenticate, asyncHandler(async (req, res) => {
  const { title, description, price_fcfa, condition, campus_zone, tags, images } = req.body;
  const listing = await pool.query('SELECT seller_id, status FROM listings WHERE id=$1', [req.params.id]);
  if (!listing.rows.length || listing.rows[0].seller_id !== req.user.userId) throw new AppError('Forbidden', 403);

  await pool.query(
    'UPDATE listings SET title=$1, description=$2, price_fcfa=$3, condition=$4, campus_zone=$5, tags=$6, updated_at=NOW() WHERE id=$7',
    [sanitizeString(title, 255), sanitizeString(description, 5000), price_fcfa, sanitizeString(condition, 50), sanitizeString(campus_zone, 100), JSON.stringify(Array.isArray(tags) ? tags : []), req.params.id]
  );

  if (Array.isArray(images)) {
    await pool.query('DELETE FROM listing_images WHERE listing_id=$1', [req.params.id]);
    for (let i = 0; i < images.length; i++) {
      await pool.query('INSERT INTO listing_images (listing_id, image_url, sort_order) VALUES ($1,$2,$3)', [req.params.id, images[i], i]);
    }
  }

  await publishEvent(EVENT_CHANNELS.LISTING, { type: EVENT_TYPES.LISTING_UPDATED, listingId: req.params.id });
  res.json({ message: 'Listing updated' });
}));

// PATCH /api/listings/:id/sell
app.patch('/api/listings/:id/sell', authenticate, asyncHandler(async (req, res) => {
  const { buyer_id, final_price } = req.body;
  const listing = await pool.query('SELECT seller_id, title, price_fcfa FROM listings WHERE id=$1 AND status=$2', [req.params.id, 'active']);
  if (!listing.rows.length || listing.rows[0].seller_id !== req.user.userId) throw new AppError('Forbidden', 403);

  await pool.query("UPDATE listings SET status='sold', updated_at=NOW() WHERE id=$1", [req.params.id]);

  if (buyer_id && final_price) {
    await pool.query(
      'INSERT INTO transactions (listing_id, buyer_id, seller_id, final_price, completed_at) VALUES ($1,$2,$3,$4,NOW())',
      [req.params.id, buyer_id, req.user.userId, final_price]
    );
  }

  await publishEvent(EVENT_CHANNELS.LISTING, { type: EVENT_TYPES.LISTING_SOLD, listingId: req.params.id, sellerId: req.user.userId });
  res.json({ message: 'Listing marked as sold' });
}));

// DELETE /api/listings/:id
app.delete('/api/listings/:id', authenticate, asyncHandler(async (req, res) => {
  const listing = await pool.query('SELECT seller_id FROM listings WHERE id=$1', [req.params.id]);
  if (!listing.rows.length || listing.rows[0].seller_id !== req.user.userId) throw new AppError('Forbidden', 403);
  await pool.query("UPDATE listings SET status='removed' WHERE id=$1", [req.params.id]);
  res.json({ message: 'Listing removed' });
}));

// POST /api/listings/:id/offers
app.post('/api/listings/:id/offers', authenticate, asyncHandler(async (req, res) => {
  const { amount, note } = req.body;
  const listing = await pool.query("SELECT seller_id, title, price_fcfa, status FROM listings WHERE id=$1", [req.params.id]);
  if (!listing.rows.length) throw new AppError('Listing not found', 404);
  if (listing.rows[0].status !== 'active') throw new AppError('Listing is not active', 400);
  if (listing.rows[0].seller_id === req.user.userId) throw new AppError('Cannot offer on own listing', 400);

  const result = await pool.query(
    'INSERT INTO offers (listing_id, buyer_id, amount, note, status, created_at) VALUES ($1,$2,$3,$4,\'pending\',NOW()) RETURNING id',
    [req.params.id, req.user.userId, amount, sanitizeString(note, 500)]
  );

  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: EVENT_TYPES.NEW_OFFER,
    offerId: result.rows[0].id,
    listingId: req.params.id,
    sellerId: listing.rows[0].seller_id,
    buyerId: req.user.userId,
    amount,
    listingTitle: listing.rows[0].title,
  });

  res.status(201).json({ message: 'Offer sent', offerId: result.rows[0].id });
}));

// GET /api/listings/:id/offers
app.get('/api/listings/:id/offers', authenticate, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, u.first_name as buyer_first, u.last_name as buyer_last
     FROM offers o JOIN users u ON o.buyer_id=u.id
     WHERE o.listing_id=$1 ORDER BY o.created_at DESC`,
    [req.params.id]
  );
  res.json(result.rows);
}));

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'listing-service', timestamp: new Date().toISOString() });
}));

// GET /metrics
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
  await subscribeToEvents(EVENT_CHANNELS.ADMIN, (event) => {
    if (event.type === 'listing.removed') {
      pool.query("UPDATE listings SET status='removed' WHERE id=$1", [event.listingId]).catch(() => {});
    }
  });
}

// Auto-expiry: run every hour
const expiryInterval = setInterval(async () => {
  try {
    const result = await pool.query("UPDATE listings SET status='expired' WHERE status='active' AND expires_at < NOW() RETURNING id");
    for (const row of result.rows) {
      await publishEvent(EVENT_CHANNELS.LISTING, { type: EVENT_TYPES.LISTING_EXPIRED, listingId: row.id });
    }
  } catch (err) {
    logger.error('Auto-expiry failed', { error: err.message });
  }
}, 3600000);

async function init() {
  try {
    await initRedis();
    redis = getRedisClient();
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`Listing service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start listing-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'listing-service' });
  clearInterval(expiryInterval);
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
