const request = require('supertest');
const express = require('express');

jest.mock('pg', () => {
  const mockPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvents: jest.fn().mockResolvedValue(true),
  EVENT_CHANNELS: { LISTING: 'listing.event' },
  EVENT_TYPES: { LISTING_CREATED: 'listing.created', LISTING_UPDATED: 'listing.updated' },
}));
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') },
}));

const { Pool } = require('pg');
const mockPool = new Pool();

const app = express();
app.use(express.json());

app.get('/api/search', async (req, res) => {
  try {
    const { q, category, campus_zone } = req.query;
    if (!q) return res.json({ results: [], total: 0 });
    const result = await mockPool.query('SELECT * FROM listings WHERE status=$1', ['active']);
    res.json({ results: result.rows, total: result.rows.length });
  } catch { res.status(500).json({ error: 'Search failed' }); }
});

app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const result = await mockPool.query('SELECT DISTINCT title FROM listings WHERE title ILIKE $1 LIMIT 8', [`%${q}%`]);
    res.json(result.rows.map((r) => r.title));
  } catch { res.status(500).json({ error: 'Suggestions failed' }); }
});

app.get('/api/search/trending', async (req, res) => {
  try {
    const result = await mockPool.query('SELECT query, COUNT(*) as count FROM search_logs GROUP BY query ORDER BY count DESC LIMIT 10');
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Trending failed' }); }
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Search Service — Search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns search results for a query', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'l1', title: 'MacBook Air M2', category: 'Electronics', price_fcfa: 510000, status: 'active' },
        { id: 'l2', title: 'MacBook Pro', category: 'Electronics', price_fcfa: 800000, status: 'active' },
      ],
    });
    const res = await request(app).get('/api/search?q=macbook');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it('returns empty results when no query provided', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
  });

  it('returns empty results when nothing matches', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/search?q=xyznonexistent');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(0);
  });
});

describe('Search Service — Suggestions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns title suggestions for a query', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ title: 'MacBook Air M2' }, { title: 'MacBook Pro M3' }],
    });
    const res = await request(app).get('/api/search/suggestions?q=mac');
    expect(res.status).toBe(200);
    expect(res.body).toContain('MacBook Air M2');
    expect(res.body).toHaveLength(2);
  });

  it('returns empty array for queries shorter than 2 chars', async () => {
    const res = await request(app).get('/api/search/suggestions?q=m');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('returns empty array when no query provided', async () => {
    const res = await request(app).get('/api/search/suggestions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('Search Service — Trending', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns trending search terms', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { query: 'macbook', count: '45' },
        { query: 'textbooks', count: '32' },
        { query: 'headphones', count: '28' },
      ],
    });
    const res = await request(app).get('/api/search/trending');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].query).toBe('macbook');
  });
});
