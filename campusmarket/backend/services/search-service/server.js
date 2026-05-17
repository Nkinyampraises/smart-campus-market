require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3007;

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

// GET /api/search?q=&category=&campus_zone=&min_price=&max_price=&condition=
app.get('/api/search', async (req, res) => {
  try {
    const { q, category, campus_zone, min_price, max_price, condition, page = 1, limit = 20 } = req.query;

    // Uses PostgreSQL full-text search on the search_index table (kept in sync via events)
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

    query += ` ORDER BY rank DESC, l.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);
    res.json({ results: result.rows, total: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/search/suggestions?q= — typeahead suggestions
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const result = await pool.query(
      "SELECT DISTINCT title FROM listings WHERE status='active' AND title ILIKE $1 LIMIT 8",
      [`%${q}%`]
    );
    res.json(result.rows.map((r) => r.title));
  } catch (err) {
    res.status(500).json({ error: 'Suggestions failed' });
  }
});

// GET /api/search/trending — trending search terms
app.get('/api/search/trending', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT query, COUNT(*) as count FROM search_logs GROUP BY query ORDER BY count DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Trending failed' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function setupEventHandlers() {
  // Keep search index in sync with listing changes
  await subscribeToEvents(EVENT_CHANNELS.LISTING, async (event) => {
    if (event.type === EVENT_TYPES.LISTING_CREATED || event.type === EVENT_TYPES.LISTING_UPDATED) {
      const listing = await pool.query('SELECT * FROM listings WHERE id=$1', [event.listingId]);
      if (!listing.rows.length) return;
      const l = listing.rows[0];
      const searchText = `${l.title} ${l.description} ${l.category} ${l.campus_zone} ${l.tags}`;
      await pool.query(
        `INSERT INTO search_index (listing_id, search_vector, updated_at)
         VALUES ($1, to_tsvector('english', $2), NOW())
         ON CONFLICT (listing_id) DO UPDATE SET search_vector=EXCLUDED.search_vector, updated_at=NOW()`,
        [event.listingId, searchText]
      ).catch(console.error);
    }
    if (event.type === EVENT_TYPES.LISTING_SOLD || event.type === 'listing.removed') {
      await pool.query('DELETE FROM search_index WHERE listing_id=$1', [event.listingId]).catch(console.error);
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    app.listen(PORT, () => console.log(`Search service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start search-service:', err);
    process.exit(1);
  }
}

init();
