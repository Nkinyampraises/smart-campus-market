require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { sanitizeString, validateUUID } = require('../../shared/validate');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, getRedisClient, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3007;

let redis;
let server;

collectDefaultMetrics();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// GET /api/search?q=&category=&campus_zone=&min_price=&max_price=&condition=&sort=&page=&limit=
app.get('/api/search', asyncHandler(async (req, res) => {
  const { q, category, campus_zone, min_price, max_price, condition, sort = 'relevance', page = 1, limit = 20 } = req.query;

  let query = `
    SELECT l.*, ts_rank(si.search_vector, plainto_tsquery('english', $1)) AS rank
    FROM listings l
    JOIN search_index si ON l.id = si.listing_id
    WHERE l.status = 'active'
  `;
  const params = [q || ''];
  let idx = 2;

  if (q) { query += ` AND si.search_vector @@ plainto_tsquery('english', $1)`; }
  if (category) { query += ` AND l.category=$${idx++}`; params.push(category); }
  if (campus_zone) { query += ` AND l.campus_zone=$${idx++}`; params.push(campus_zone); }
  if (min_price) { query += ` AND l.price_fcfa>=$${idx++}`; params.push(min_price); }
  if (max_price) { query += ` AND l.price_fcfa<=$${idx++}`; params.push(max_price); }
  if (condition) { query += ` AND l.condition=$${idx++}`; params.push(condition); }

  const orderMap = {
    relevance: 'rank DESC, l.created_at DESC',
    newest: 'l.created_at DESC',
    price_asc: 'l.price_fcfa ASC',
    price_desc: 'l.price_fcfa DESC',
    views: 'l.views DESC',
  };
  query += ` ORDER BY ${orderMap[sort] || orderMap.relevance} LIMIT $${idx++} OFFSET $${idx}`;
  params.push(limit, (page - 1) * limit);

  const result = await pool.query(query, params);

  // Log search query for trending analysis
  if (q) {
    pool.query('INSERT INTO search_logs (query, created_at) VALUES ($1,NOW())', [q.slice(0, 100)]).catch(() => {});
  }

  res.json({ results: result.rows, total: result.rowCount, page: Number(page), limit: Number(limit) });
}));

// GET /api/search/suggestions?q= — typeahead suggestions
app.get('/api/search/suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const result = await pool.query(
    "SELECT DISTINCT title FROM listings WHERE status='active' AND title ILIKE $1 LIMIT 8",
    [`%${sanitizeString(q, 100)}%`]
  );
  res.json(result.rows.map((r) => r.title));
}));

// GET /api/search/trending — trending search terms
app.get('/api/search/trending', asyncHandler(async (req, res) => {
  const [trendingTerms, trendingListings] = await Promise.all([
    pool.query('SELECT query, COUNT(*)::int as count FROM search_logs GROUP BY query ORDER BY count DESC LIMIT 10'),
    redis?.get('ai:trending').then(async (cached) => {
      if (cached) return JSON.parse(cached);
      // Fallback to DB trending
      const rows = await pool.query(
        `SELECT l.id, l.title, l.price_fcfa, l.category, l.views, l.created_at
         FROM listings l WHERE l.status='active' ORDER BY l.views DESC, l.created_at DESC LIMIT 10`
      );
      return rows.rows;
    }).catch(() => []),
  ]);
  res.json({ trending_terms: trendingTerms.rows, trending_listings: trendingListings });
}));

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'search-service', timestamp: new Date().toISOString() });
}));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((err, req, res, _next) => {
  logger.error(err.message || 'Search error');
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.LISTING, async (event) => {
    if (event.type === EVENT_TYPES.LISTING_CREATED || event.type === EVENT_TYPES.LISTING_UPDATED) {
      const listing = await pool.query('SELECT * FROM listings WHERE id=$1', [event.listingId]);
      if (!listing.rows.length) return;
      const l = listing.rows[0];
      const searchText = `${l.title} ${l.description} ${l.category} ${l.campus_zone} ${Array.isArray(l.tags) ? l.tags.join(' ') : l.tags}`;
      await pool.query(
        `INSERT INTO search_index (listing_id, search_vector, updated_at)
         VALUES ($1, to_tsvector('english', $2), NOW())
         ON CONFLICT (listing_id) DO UPDATE SET search_vector=EXCLUDED.search_vector, updated_at=NOW()`,
        [event.listingId, searchText]
      ).catch((e) => logger.error('Search index update failed', { error: e.message }));
    }
    if (event.type === EVENT_TYPES.LISTING_SOLD || event.type === 'listing.removed' || event.type === EVENT_TYPES.LISTING_EXPIRED) {
      await pool.query('DELETE FROM search_index WHERE listing_id=$1', [event.listingId]).catch(() => {});
    }
  });
}

async function init() {
  try {
    await initRedis();
    redis = getRedisClient();
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`Search service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start search-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'search-service' });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeRedis();
  await pool.end();
  process.exit(0);
}

app._init = init;
app._shutdown = shutdown;

if (require.main === module) {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  init();
}

module.exports = app;
