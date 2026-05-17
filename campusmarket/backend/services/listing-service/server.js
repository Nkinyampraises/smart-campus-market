require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3003;

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

// GET /api/listings — browse all active listings
app.get('/api/listings', async (req, res) => {
  try {
    const { category, campus_zone, min_price, max_price, condition, page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM listings WHERE status=$1';
    const params = ['active'];
    let idx = 2;
    if (category) { query += ` AND category=$${idx++}`; params.push(category); }
    if (campus_zone) { query += ` AND campus_zone=$${idx++}`; params.push(campus_zone); }
    if (min_price) { query += ` AND price_fcfa>=$${idx++}`; params.push(min_price); }
    if (max_price) { query += ` AND price_fcfa<=$${idx++}`; params.push(max_price); }
    if (condition) { query += ` AND condition=$${idx++}`; params.push(condition); }
    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, (page - 1) * limit);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/listings/:id
app.get('/api/listings/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    await pool.query('UPDATE listings SET views=views+1 WHERE id=$1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/listings — create listing
app.post('/api/listings', authenticate, async (req, res) => {
  try {
    const { title, description, category, price_fcfa, condition, campus_zone, images, tags } = req.body;
    const result = await pool.query(
      `INSERT INTO listings (seller_id, title, description, category, price_fcfa, condition, campus_zone, images, tags, status, created_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',NOW(), NOW() + INTERVAL '30 days') RETURNING id`,
      [req.user.userId, title, description, category, price_fcfa, condition, campus_zone, JSON.stringify(images || []), JSON.stringify(tags || [])]
    );
    const listingId = result.rows[0].id;
    await publishEvent(EVENT_CHANNELS.LISTING, {
      type: EVENT_TYPES.LISTING_CREATED,
      listingId,
      sellerId: req.user.userId,
      title, category, price_fcfa, campus_zone,
    });
    res.status(201).json({ message: 'Listing created', listingId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/listings/:id
app.patch('/api/listings/:id', authenticate, async (req, res) => {
  try {
    const { title, description, price_fcfa, condition, campus_zone, images, tags } = req.body;
    const listing = await pool.query('SELECT seller_id FROM listings WHERE id=$1', [req.params.id]);
    if (!listing.rows.length || listing.rows[0].seller_id !== req.user.userId)
      return res.status(403).json({ error: 'Forbidden' });
    await pool.query(
      'UPDATE listings SET title=$1,description=$2,price_fcfa=$3,condition=$4,campus_zone=$5,images=$6,tags=$7,updated_at=NOW() WHERE id=$8',
      [title, description, price_fcfa, condition, campus_zone, JSON.stringify(images), JSON.stringify(tags), req.params.id]
    );
    await publishEvent(EVENT_CHANNELS.LISTING, { type: EVENT_TYPES.LISTING_UPDATED, listingId: req.params.id });
    res.json({ message: 'Listing updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/listings/:id
app.delete('/api/listings/:id', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE listings SET status=$1 WHERE id=$2 AND seller_id=$3', ['removed', req.params.id, req.user.userId]);
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/listings/:id/offers — make an offer
app.post('/api/listings/:id/offers', authenticate, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const listing = await pool.query('SELECT seller_id, title, price_fcfa FROM listings WHERE id=$1', [req.params.id]);
    if (!listing.rows.length) return res.status(404).json({ error: 'Listing not found' });
    const result = await pool.query(
      'INSERT INTO offers (listing_id, buyer_id, amount, note, status, created_at) VALUES ($1,$2,$3,$4,\'pending\',NOW()) RETURNING id',
      [req.params.id, req.user.userId, amount, note]
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
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/listings/:id/buy — buy now
app.post('/api/listings/:id/buy', authenticate, async (req, res) => {
  try {
    const { campus_zone, landmark, note } = req.body;
    const listing = await pool.query('SELECT seller_id, title FROM listings WHERE id=$1 AND status=$2', [req.params.id, 'active']);
    if (!listing.rows.length) return res.status(404).json({ error: 'Listing not available' });
    await pool.query('UPDATE listings SET status=$1 WHERE id=$2', ['reserved', req.params.id]);
    await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
      type: 'buy_request',
      listingId: req.params.id,
      sellerId: listing.rows[0].seller_id,
      buyerId: req.user.userId,
      campus_zone, landmark, note,
      listingTitle: listing.rows[0].title,
    });
    res.json({ message: 'Buy request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.ADMIN, (event) => {
    if (event.type === 'listing.removed') {
      pool.query('UPDATE listings SET status=$1 WHERE id=$2', ['removed', event.listingId]).catch(console.error);
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    app.listen(PORT, () => console.log(`Listing service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start listing-service:', err);
    process.exit(1);
  }
}

init();
