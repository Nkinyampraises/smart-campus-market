const request = require('supertest');

const mockRedis = { get: jest.fn() };

jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('search_metrics') },
}));
jest.mock('../../shared/db', () => ({ query: jest.fn(), end: jest.fn().mockResolvedValue() }));
jest.mock('../../shared/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../shared/metrics', () => ({ metricsMiddleware: (_req, _res, next) => next() }));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(),
  closeRedis: jest.fn().mockResolvedValue(),
  getRedisClient: jest.fn(() => mockRedis),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { LISTING: 'listing.event' },
  EVENT_TYPES: {
    LISTING_CREATED: 'listing.created',
    LISTING_UPDATED: 'listing.updated',
    LISTING_SOLD: 'listing.sold',
    LISTING_EXPIRED: 'listing.expired',
  },
}));

const pool = require('../../shared/db');
const events = require('../../shared/events');
const logger = require('../../shared/logger');
const app = require('./server');
let listingEventHandler;

beforeAll(async () => {
  jest.spyOn(app, 'listen').mockImplementation((_port, callback) => {
    callback();
    return { close: jest.fn((done) => done?.()) };
  });
  await app._init();
  listingEventHandler = events.subscribeToEvents.mock.calls[0][1];
  app.listen.mockRestore();
});

afterEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
  pool.end.mockResolvedValue();
  mockRedis.get.mockReset();
  events.initRedis.mockResolvedValue();
});

describe('Search service — production routes', () => {
  it('searches with filters, sorting, and pagination and records the query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'l1' }], rowCount: 1 });
    pool.query.mockRejectedValueOnce(new Error('search log unavailable'));
    const res = await request(app).get('/api/search')
      .query({ q: 'macbook', category: 'Electronics', campus_zone: 'North', min_price: 100, max_price: 900000, condition: 'used', sort: 'price_asc', page: 2, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ results: [{ id: 'l1' }], total: 1, page: 2, limit: 5 });
    expect(pool.query.mock.calls[0][0]).toContain('l.price_fcfa ASC');
    expect(pool.query.mock.calls[0][1]).toEqual(['macbook', 'Electronics', 'North', '100', '900000', 'used', '5', 5]);
    expect(pool.query.mock.calls[1][0]).toContain('INSERT INTO search_logs');
  });

  it('supports an unfiltered search and safely falls back for an unknown sort', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get('/api/search?sort=unsafe');
    expect(res.body.total).toBe(0);
    expect(pool.query.mock.calls[0][0]).toContain('rank DESC');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('returns sanitized suggestions and rejects too-short input', async () => {
    expect((await request(app).get('/api/search/suggestions?q=x')).body).toEqual([]);
    pool.query.mockResolvedValueOnce({ rows: [{ title: 'MacBook Air' }, { title: 'MacBook Pro' }] });
    const res = await request(app).get('/api/search/suggestions?q=mac');
    expect(res.body).toEqual(['MacBook Air', 'MacBook Pro']);
    expect(pool.query.mock.calls[0][1]).toEqual(['%mac%']);
  });

  it('returns cached trending listings', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ query: 'books', count: 4 }] });
    mockRedis.get.mockResolvedValueOnce(JSON.stringify([{ id: 'cached' }]));
    const res = await request(app).get('/api/search/trending');
    expect(res.body).toEqual({ trending_terms: [{ query: 'books', count: 4 }], trending_listings: [{ id: 'cached' }] });
  });

  it('falls back to database trending listings when the cache is empty', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ query: 'laptop', count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'popular' }] });
    mockRedis.get.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/search/trending');
    expect(res.body.trending_listings).toEqual([{ id: 'popular' }]);
  });

  it('contains cache failures and exposes health and metrics', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mockRedis.get.mockRejectedValueOnce(new Error('cache down'));
    const trending = await request(app).get('/api/search/trending');
    pool.query.mockResolvedValueOnce({ rows: [] });
    const health = await request(app).get('/health');
    const metrics = await request(app).get('/metrics');
    expect(trending.body.trending_listings).toEqual([]);
    expect(health.body.status).toBe('ok');
    expect(metrics.text).toBe('search_metrics');
  });

  it('returns a safe 500 response and logs unexpected failures', async () => {
    pool.query.mockRejectedValueOnce(new Error('database credentials leaked'));
    const res = await request(app).get('/api/search?q=test');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('Search service — event lifecycle', () => {
  it('indexes created and updated listings', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ title: 'Bike', description: 'Fast', category: 'Transport', campus_zone: 'North', tags: ['green', 'cheap'] }] })
      .mockResolvedValueOnce({ rows: [] });
    await listingEventHandler({ type: 'listing.created', listingId: 'l1' });
    expect(pool.query.mock.calls[1][0]).toContain('INSERT INTO search_index');
    expect(pool.query.mock.calls[1][1][1]).toContain('green cheap');

    pool.query.mockResolvedValueOnce({ rows: [] });
    await listingEventHandler({ type: 'listing.updated', listingId: 'missing' });
  });

  it('removes sold, expired, and moderated listings from the index', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('already removed'));
    await listingEventHandler({ type: 'listing.sold', listingId: 'l1' });
    await listingEventHandler({ type: 'listing.expired', listingId: 'l2' });
    await listingEventHandler({ type: 'listing.removed', listingId: 'l3' });
    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls[0][0]).toContain('DELETE FROM search_index');
  });

  it('contains indexing failures', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ title: 'Book', description: '', category: 'Books', campus_zone: 'South', tags: 'textbook' }] })
      .mockRejectedValueOnce(new Error('index failed'));
    await listingEventHandler({ type: 'listing.created', listingId: 'l4' });
    expect(logger.error).toHaveBeenCalledWith('Search index update failed', { error: 'index failed' });
  });

  it('fails initialization closed and shuts down dependencies', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    events.initRedis.mockRejectedValueOnce(new Error('redis unavailable'));
    await app._init();
    expect(exitSpy).toHaveBeenCalledWith(1);
    await app._shutdown('SIGTERM');
    expect(events.closeRedis).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
