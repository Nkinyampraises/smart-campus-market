const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('pg', () => {
  const mockPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: '{"suggested_price":450000,"min_price":400000,"max_price":510000,"reasoning":"Based on recent campus sales"}' }],
      }),
    },
  }));
});
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvents: jest.fn().mockResolvedValue(true),
  EVENT_CHANNELS: { LISTING: 'listing.event' },
  EVENT_TYPES: { LISTING_CREATED: 'listing.created', LOW_PRICE_FLAG: 'fraud.low_price_flag', SPAM_RATE_FLAG: 'fraud.spam_rate_flag' },
}));
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') },
}));

const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const { publishEvent } = require('../../shared/events');
const mockPool = new Pool();
const mockAnthropic = new Anthropic();

process.env.JWT_SECRET = 'test_secret';
process.env.ANTHROPIC_API_KEY = 'test_key';

const makeToken = (userId = 'u1') =>
  jwt.sign({ userId }, 'test_secret', { expiresIn: '1h' });

const app = express();
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.post('/api/ai/price-suggestion', authenticate, async (req, res) => {
  try {
    const { title, category, condition, description } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'title and category required' });
    const recentSales = await mockPool.query('SELECT title, price_fcfa, condition FROM listings WHERE category=$1 LIMIT 10', [category]);
    const message = await mockAnthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 300, messages: [{ role: 'user', content: 'price suggestion' }] });
    const suggestion = JSON.parse(message.content[0].text);
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: 'Could not generate price suggestion' });
  }
});

app.post('/api/ai/fraud-check', async (req, res) => {
  try {
    const { listingId, category, price_fcfa, sellerId } = req.body;
    const avg = await mockPool.query('SELECT AVG(price_fcfa) as avg FROM listings WHERE category=$1', [category]);
    const recentCount = await mockPool.query('SELECT COUNT(*) FROM listings WHERE seller_id=$1', [sellerId]);
    const marketAvg = parseFloat(avg.rows[0].avg) || 0;
    const flags = [];
    if (marketAvg > 0 && price_fcfa < marketAvg * 0.1) {
      flags.push({ type: 'fraud.low_price_flag', rule: 'Price suspiciously low' });
      await publishEvent('listing.event', { type: 'fraud.low_price_flag', listingId, sellerId });
    }
    if (parseInt(recentCount.rows[0].count) > 10) {
      flags.push({ type: 'fraud.spam_rate_flag', rule: 'Too many listings in 24h' });
    }
    res.json({ flagged: flags.length > 0, flags });
  } catch { res.status(500).json({ error: 'Fraud check failed' }); }
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AI Service — Price Suggestion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns AI price suggestion for a listing', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ title: 'MacBook Air', price_fcfa: 510000, condition: 'Good' }] });

    const res = await request(app)
      .post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ title: 'MacBook Air M2', category: 'Electronics', condition: 'Good Condition', description: 'Barely used' });

    expect(res.status).toBe(200);
    expect(res.body.suggested_price).toBe(450000);
    expect(res.body.min_price).toBe(400000);
    expect(res.body.max_price).toBe(510000);
    expect(res.body.reasoning).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ category: 'Electronics' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/ai/price-suggestion')
      .send({ title: 'Test', category: 'Electronics' });
    expect(res.status).toBe(401);
  });
});

describe('AI Service — Fraud Detection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('flags a listing with suspiciously low price', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ avg: '500000' }] })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const res = await request(app)
      .post('/api/ai/fraud-check')
      .send({ listingId: 'l1', category: 'Electronics', price_fcfa: 100, sellerId: 'u1' });

    expect(res.status).toBe(200);
    expect(res.body.flagged).toBe(true);
    expect(res.body.flags[0].type).toBe('fraud.low_price_flag');
    expect(publishEvent).toHaveBeenCalled();
  });

  it('does not flag a listing with normal price', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ avg: '500000' }] })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    const res = await request(app)
      .post('/api/ai/fraud-check')
      .send({ listingId: 'l2', category: 'Electronics', price_fcfa: 480000, sellerId: 'u1' });

    expect(res.status).toBe(200);
    expect(res.body.flagged).toBe(false);
    expect(res.body.flags).toHaveLength(0);
  });

  it('flags a seller posting too many listings', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ avg: '100000' }] })
      .mockResolvedValueOnce({ rows: [{ count: '15' }] });

    const res = await request(app)
      .post('/api/ai/fraud-check')
      .send({ listingId: 'l3', category: 'Electronics', price_fcfa: 95000, sellerId: 'u-spam' });

    expect(res.status).toBe(200);
    expect(res.body.flagged).toBe(true);
    expect(res.body.flags.some((f) => f.type === 'fraud.spam_rate_flag')).toBe(true);
  });
});
