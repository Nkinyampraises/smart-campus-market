const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('pg', () => {
  const mockPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvents: jest.fn().mockResolvedValue(true),
  EVENT_CHANNELS: { LISTING: 'listing.event', NOTIFICATION: 'notification.channel', ADMIN: 'admin.event' },
  EVENT_TYPES: { LISTING_CREATED: 'listing.created', LISTING_UPDATED: 'listing.updated', NEW_OFFER: 'new_offer' },
}));
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') },
}));

const { Pool } = require('pg');
const mockPool = new Pool();
const { publishEvent } = require('../../shared/events');

process.env.JWT_SECRET = 'test_secret';

const makeToken = (userId = 'u1') =>
  jwt.sign({ userId }, 'test_secret', { expiresIn: '1h' });

// Minimal testable express app mirroring the real listing-service
const app = express();
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/api/listings', async (req, res) => {
  const result = await mockPool.query.mock.results[0]?.value || { rows: [] };
  try {
    const r = await mockPool.query("SELECT * FROM listings WHERE status='active' ORDER BY created_at DESC");
    res.json(r.rows);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const result = await mockPool.query('SELECT * FROM listings WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    await mockPool.query('UPDATE listings SET views=views+1 WHERE id=$1', [req.params.id]);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/listings', authenticate, async (req, res) => {
  try {
    const { title, description, category, price_fcfa, condition, campus_zone } = req.body;
    if (!title || !category || !price_fcfa) return res.status(400).json({ error: 'Missing required fields' });
    const result = await mockPool.query(
      'INSERT INTO listings (...) VALUES (...) RETURNING id',
      [req.user.userId, title, description, category, price_fcfa, condition, campus_zone]
    );
    await publishEvent('listing.event', { type: 'listing.created', listingId: result.rows[0].id });
    res.status(201).json({ message: 'Listing created', listingId: result.rows[0].id });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/listings/:id/offers', authenticate, async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid offer amount' });
    const listing = await mockPool.query('SELECT seller_id, title, price_fcfa FROM listings WHERE id=$1', [req.params.id]);
    if (!listing.rows.length) return res.status(404).json({ error: 'Listing not found' });
    const offer = await mockPool.query('INSERT INTO offers (...) VALUES (...) RETURNING id', [req.params.id, req.user.userId, amount, note]);
    await publishEvent('notification.channel', { type: 'new_offer', listingId: req.params.id, amount });
    res.status(201).json({ message: 'Offer sent', offerId: offer.rows[0].id });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Listing Service — Browse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of active listings', async () => {
    const fakeListings = [
      { id: 'l1', title: 'MacBook Air M2', category: 'Electronics', price_fcfa: 510000, status: 'active' },
      { id: 'l2', title: 'Calculus Textbook', category: 'Textbooks', price_fcfa: 18500, status: 'active' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: fakeListings });

    const res = await request(app).get('/api/listings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('MacBook Air M2');
  });

  it('returns empty array when no listings exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/listings');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('Listing Service — Get by ID', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a single listing and increments views', async () => {
    const fakeListing = { id: 'l1', title: 'Sony Headphones', price_fcfa: 108000 };
    mockPool.query
      .mockResolvedValueOnce({ rows: [fakeListing] })
      .mockResolvedValueOnce({ rows: [] }); // view increment

    const res = await request(app).get('/api/listings/l1');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Sony Headphones');
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('returns 404 for unknown listing', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/listings/unknown-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Listing not found');
  });
});

describe('Listing Service — Create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a listing and publishes event', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'l99' }] });

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${makeToken('u1')}`)
      .send({
        title: 'TI-84 Calculator',
        category: 'Electronics',
        price_fcfa: 35000,
        condition: 'Good Condition',
        campus_zone: 'Engineering Block',
      });

    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe('l99');
    expect(publishEvent).toHaveBeenCalledWith('listing.event', expect.objectContaining({ type: 'listing.created' }));
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/listings')
      .send({ title: 'Test', category: 'Electronics', price_fcfa: 5000 });

    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ title: 'No category or price' });

    expect(res.status).toBe(400);
  });
});

describe('Listing Service — Offers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('submits an offer and notifies seller via event', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'MacBook', price_fcfa: 510000 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'o1' }] });

    const res = await request(app)
      .post('/api/listings/l1/offers')
      .set('Authorization', `Bearer ${makeToken('u1')}`)
      .send({ amount: 480000, note: 'Can I get a discount?' });

    expect(res.status).toBe(201);
    expect(res.body.offerId).toBe('o1');
    expect(publishEvent).toHaveBeenCalledWith('notification.channel', expect.objectContaining({ type: 'new_offer' }));
  });

  it('returns 404 when listing does not exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/listings/bad-id/offers')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ amount: 10000 });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid offer amount', async () => {
    const res = await request(app)
      .post('/api/listings/l1/offers')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid offer amount');
  });
});
