require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, getRedisClient, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3006;

const CONDITION_FACTORS = { new: 1.0, 'like new': 0.9, 'excellent condition': 0.85, 'good condition': 0.7, used: 0.7, old: 0.4 };

let redis;
let server;

collectDefaultMetrics();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

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

// Helper: get or compute category average price
async function getCategoryAvgPrice(category) {
  const cacheKey = `ai:category_avg:${category}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    "SELECT AVG(price_fcfa)::float as avg, COUNT(*)::int as cnt FROM transactions WHERE listing_id IN (SELECT id FROM listings WHERE category=$1) AND completed_at > NOW() - INTERVAL '90 days'",
    [category]
  );
  const data = { avg: result.rows[0].avg || 0, count: result.rows[0].cnt || 0 };
  await redis.set(cacheKey, JSON.stringify(data), { EX: 21600 }); // 6 hours
  return data;
}

// POST /api/ai/price-suggestion — rule-based price engine
app.post('/api/ai/price-suggestion', authenticate, asyncHandler(async (req, res) => {
  const { category, condition } = req.body;
  if (!category || !condition) throw new AppError('Category and condition required', 400);

  const condKey = condition.toLowerCase();
  const factor = CONDITION_FACTORS[condKey] ?? 0.7;

  const { avg, count } = await getCategoryAvgPrice(category);

  if (count < 3) {
    return res.json({ suggestion: null, confidence: 'low', message: 'Not enough comparable sales data' });
  }

  const suggested = Math.round(avg * factor);
  const min = Math.round(suggested * 0.9);
  const max = Math.round(suggested * 1.1);

  logger.info('Price suggestion generated', { category, condition, suggested });
  res.json({ suggestion: suggested, range: { min, max }, confidence: 'high', count });
}));

// POST /api/ai/fraud-check — rule-based fraud detection
app.post('/api/ai/fraud-check', asyncHandler(async (req, res) => {
  const { listingId, category, price_fcfa, sellerId } = req.body;
  if (!listingId || !category || price_fcfa === undefined || !sellerId) {
    throw new AppError('listingId, category, price_fcfa, sellerId required', 400);
  }

  const { avg } = await getCategoryAvgPrice(category);
  const flags = [];

  // Rule 1: Price < 30% of category average
  if (avg > 0 && price_fcfa < avg * 0.30) {
    flags.push({
      type: EVENT_TYPES.LOW_PRICE_FLAG,
      rule: `Price ${Math.round((price_fcfa / avg) * 100)}% below 90-day category average`,
      listingId, sellerId
    });
  }

  // Rule 2: Spam rate (>10 listings in 60 minutes)
  const recentCount = await pool.query(
    "SELECT COUNT(*)::int as cnt FROM listings WHERE seller_id=$1 AND created_at > NOW() - INTERVAL '60 minutes'",
    [sellerId]
  );
  if (recentCount.rows[0].cnt > 10) {
    flags.push({
      type: EVENT_TYPES.SPAM_RATE_FLAG,
      rule: `${recentCount.rows[0].cnt} listings posted in 60 minutes`,
      listingId, sellerId
    });
  }

  for (const flag of flags) {
    await publishEvent(EVENT_CHANNELS.AUDIT, flag);
  }

  res.json({ flagged: flags.length > 0, flags });
}));

// GET /api/trending — trending feed algorithm
app.get('/api/trending', asyncHandler(async (req, res) => {
  const cacheKey = 'trending:feed';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const listingsResult = await pool.query(
    "SELECT id, title, price_fcfa, category, campus_zone, condition, views, images, seller_id, created_at FROM listings WHERE status='active'"
  );

  const listings = listingsResult.rows;
  if (!listings.length) return res.json([]);

  // Get wishlist counts for last 7 days
  const wishlistResult = await pool.query(
    "SELECT listing_id, COUNT(*) as cnt FROM wishlist WHERE added_at > NOW() - INTERVAL '7 days' GROUP BY listing_id"
  );
  const wishlistMap = {};
  wishlistResult.rows.forEach(r => { wishlistMap[r.listing_id] = parseInt(r.cnt, 10); });

  // Get view counts for last 7 days (using total views as proxy; in production use a separate view_logs table)
  const scored = listings.map(l => {
    const views7d = l.views || 0;
    const wish7d = wishlistMap[l.id] || 0;
    const trendScore = (views7d * 0.6) + (wish7d * 0.4);
    return { ...l, trend_score: trendScore };
  });

  scored.sort((a, b) => b.trend_score - a.trend_score);
  const top10 = scored.slice(0, 10);

  // Enrich with seller name
  for (const item of top10) {
    const seller = await pool.query('SELECT first_name, last_name FROM users WHERE id=$1', [item.seller_id]);
    item.seller_name = seller.rows.length ? `${seller.rows[0].first_name} ${seller.rows[0].last_name}`.trim() : 'Unknown';
  }

  await redis.set(cacheKey, JSON.stringify(top10), { EX: 900 }); // 15 min TTL
  res.json(top10);
}));

// GET /api/ai/similar/:listingId
app.get('/api/ai/similar/:listingId', asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const listing = await pool.query('SELECT category, condition, price_fcfa FROM listings WHERE id=$1', [listingId]);
  if (!listing.rows.length) throw new AppError('Listing not found', 404);

  const { category, condition, price_fcfa } = listing.rows[0];
  const bandMin = Math.round(price_fcfa * 0.7);
  const bandMax = Math.round(price_fcfa * 1.3);

  const similar = await pool.query(
    `SELECT id, title, price_fcfa, category, campus_zone, condition, images, seller_id FROM listings
     WHERE status='active' AND category=$1 AND id<>$2 AND price_fcfa BETWEEN $3 AND $4
     ORDER BY ABS(price_fcfa - $5) ASC LIMIT 4`,
    [category, listingId, bandMin, bandMax, price_fcfa]
  );

  res.json(similar.rows);
}));

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  if (redis?.isOpen && redis.ping) await redis.ping();
  res.json({ status: 'ok', service: 'ai-service', timestamp: new Date().toISOString() });
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
  await subscribeToEvents(EVENT_CHANNELS.LISTING, async (event) => {
    if (event.type === EVENT_TYPES.LISTING_CREATED) {
      try {
        const { avg } = await getCategoryAvgPrice(event.category);
        if (avg > 0 && event.price_fcfa < avg * 0.30) {
          await publishEvent(EVENT_CHANNELS.AUDIT, {
            type: EVENT_TYPES.LOW_PRICE_FLAG,
            rule: `Price ${Math.round((event.price_fcfa / avg) * 100)}% below 90-day category average`,
            listingId: event.listingId,
            sellerId: event.sellerId
          });
        }

        const recentCount = await pool.query(
          "SELECT COUNT(*)::int as cnt FROM listings WHERE seller_id=$1 AND created_at > NOW() - INTERVAL '60 minutes'",
          [event.sellerId]
        );
        if (recentCount.rows[0].cnt > 10) {
          await publishEvent(EVENT_CHANNELS.AUDIT, {
            type: EVENT_TYPES.SPAM_RATE_FLAG,
            rule: `${recentCount.rows[0].cnt} listings posted in 60 minutes`,
            listingId: event.listingId,
            sellerId: event.sellerId
          });
        }
      } catch (err) {
        logger.error('Auto fraud check failed', { error: err.message });
      }
    }
  });
}

async function init() {
  try {
    await initRedis();
    redis = getRedisClient ? getRedisClient() : null;
    if (!redis) {
      const { createClient } = require('redis');
      redis = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });
      await redis.connect();
    }
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`AI service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start ai-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'ai-service' });
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
