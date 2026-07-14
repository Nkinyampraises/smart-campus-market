const request = require('supertest');
const jwt = require('jsonwebtoken');

const SECRET = 'test_secret';
const token = () => jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '1h' });
const mockRedis = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  ping: jest.fn().mockResolvedValue('PONG'),
  isOpen: true,
};

jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('metrics_data') },
}));
jest.mock('../../shared/db', () => ({ query: jest.fn(), end: jest.fn().mockResolvedValue() }));
jest.mock('../../shared/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../shared/metrics', () => ({ metricsMiddleware: (_req, _res, next) => next() }));
jest.mock('../../shared/errorHandler', () => ({
  asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
  AppError: class AppError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  },
}));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(),
  closeRedis: jest.fn().mockResolvedValue(),
  getRedisClient: jest.fn(() => mockRedis),
  publishEvent: jest.fn().mockResolvedValue(),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { LISTING: 'listing.event', AUDIT: 'audit.channel' },
  EVENT_TYPES: {
    LISTING_CREATED: 'listing.created',
    LOW_PRICE_FLAG: 'fraud.low_price',
    HIGH_PRICE_FLAG: 'fraud.high_price',
    SPAM_RATE_FLAG: 'fraud.spam_rate',
  },
}));

const pool = require('../../shared/db');
const events = require('../../shared/events');
const app = require('./server');
let listingEventHandler;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  jest.spyOn(app, 'listen').mockReturnValue({ close: jest.fn((callback) => callback?.()) });
  await app._init();
  listingEventHandler = events.subscribeToEvents.mock.calls.find(([channel]) => channel === 'listing.event')[1];
  app.listen.mockRestore();
});

afterEach(() => {
  jest.clearAllMocks();
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.ping.mockResolvedValue('PONG');
  events.initRedis.mockResolvedValue();
});

describe('AI service — price suggestion', () => {
  it('rejects unauthenticated and malformed requests', async () => {
    expect((await request(app).post('/api/ai/price-suggestion').send({ category: 'Electronics', condition: 'new' })).status).toBe(401);
    expect((await request(app).post('/api/ai/price-suggestion').set('Authorization', `Bearer ${token()}`).send({ category: 'Electronics' })).status).toBe(400);
    expect((await request(app).post('/api/ai/price-suggestion').set('Authorization', 'Bearer invalid').send({ category: 'Electronics', condition: 'new' })).status).toBe(401);
  });

  it('returns a high-confidence suggestion from transaction history', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce({ rows: [{ avg: 100000, cnt: 5 }] });
    const res = await request(app).post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${token()}`)
      .send({ category: 'Electronics', condition: 'Like New' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ suggestion: 90000, range: { min: 81000, max: 99000 }, confidence: 'high', count: 5 });
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it('uses cached averages and defaults unknown condition factors', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ avg: 10000, count: 4 }));
    const res = await request(app).post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${token()}`)
      .send({ category: 'Services', condition: 'unknown' });
    expect(res.body.suggestion).toBe(7000);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('reports low confidence when comparable data is insufficient', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce({ rows: [{ avg: null, cnt: 1 }] });
    const res = await request(app).post('/api/ai/price-suggestion')
      .set('Authorization', `Bearer ${token()}`)
      .send({ category: 'Other', condition: 'used' });
    expect(res.body.confidence).toBe('low');
    expect(res.body.suggestion).toBeNull();
  });
});

describe('AI service — fraud rules', () => {
  const payload = { listingId: 'l1', category: 'Electronics', sellerId: 'u1' };

  it('validates the complete listing input', async () => {
    const res = await request(app).post('/api/ai/fraud-check').send({ listingId: 'l1' });
    expect(res.status).toBe(400);
  });

  it('publishes suspicious low-price and spam flags', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ avg: 100000, count: 4 }));
    pool.query.mockResolvedValueOnce({ rows: [{ cnt: 11 }] });
    const res = await request(app).post('/api/ai/fraud-check').send({ ...payload, price_fcfa: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.flags).toHaveLength(2);
    expect(events.publishEvent).toHaveBeenCalledTimes(2);
  });

  it('publishes a suspicious high-price flag', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ avg: 10000, count: 4 }));
    pool.query.mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    const res = await request(app).post('/api/ai/fraud-check').send({ ...payload, price_fcfa: 100000 });
    expect(res.body.flags[0].type).toBe('fraud.high_price');
  });

  it('uses the category minimum and accepts a normal price', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ avg: 0, count: 0 }));
    pool.query.mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    const res = await request(app).post('/api/ai/fraud-check').send({ ...payload, category: 'Unknown', price_fcfa: 300 });
    expect(res.body).toEqual({ flagged: false, flags: [] });
  });
});

describe('AI service — discovery', () => {
  it('returns a cached trending feed', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify([{ id: 'cached' }]));
    const res = await request(app).get('/api/trending');
    expect(res.body).toEqual([{ id: 'cached' }]);
  });

  it('returns an empty trending feed', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/trending');
    expect(res.body).toEqual([]);
  });

  it('scores, sorts, enriches, and caches trending listings', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    pool.query
      .mockResolvedValueOnce({ rows: [
        { id: 'l1', views: 10, seller_id: 'u1' },
        { id: 'l2', views: 2, seller_id: 'missing' },
      ] })
      .mockResolvedValueOnce({ rows: [{ listing_id: 'l2', cnt: '20' }] })
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ada', last_name: 'Lovelace' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/trending');
    expect(res.body[0].id).toBe('l2');
    expect(res.body[0].seller_name).toBe('Ada Lovelace');
    expect(res.body[1].seller_name).toBe('Unknown');
    expect(mockRedis.set).toHaveBeenCalledWith('trending:feed', expect.any(String), { EX: 900 });
  });

  it('returns similar listings inside the price band', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ category: 'Books', condition: 'used', price_fcfa: 10000 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'similar' }] });
    const res = await request(app).get('/api/ai/similar/l1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'similar' }]);
  });

  it('returns 404 when the source listing does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect((await request(app).get('/api/ai/similar/missing')).status).toBe(404);
  });
});

describe('AI service — operations and events', () => {
  let exitSpy;
  beforeEach(() => { exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {}); });
  afterEach(() => exitSpy.mockRestore());

  it('exposes health and metrics', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const health = await request(app).get('/health');
    const metrics = await request(app).get('/metrics');
    expect(health.body.status).toBe('ok');
    expect(mockRedis.ping).toHaveBeenCalled();
    expect(metrics.status).toBe(200);
  });

  it('fails initialization closed', async () => {
    events.initRedis.mockRejectedValueOnce(new Error('Redis unavailable'));
    await app._init();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('automatically evaluates listing-created events', async () => {
    expect(listingEventHandler).toBeDefined();
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ avg: 10000, count: 5 }));
    pool.query.mockResolvedValueOnce({ rows: [{ cnt: 12 }] });
    await listingEventHandler({ type: 'listing.created', listingId: 'l1', sellerId: 'u1', category: 'Electronics', price_fcfa: 10 });
    expect(events.publishEvent).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated events and contains handler failures', async () => {
    await listingEventHandler({ type: 'other.event' });
    mockRedis.get.mockRejectedValueOnce(new Error('cache failed'));
    await listingEventHandler({ type: 'listing.created', category: 'Books', price_fcfa: 1 });
    expect(require('../../shared/logger').error).toHaveBeenCalled();
  });

  it('shuts down dependencies cleanly', async () => {
    await app._shutdown('SIGTERM');
    expect(events.closeRedis).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
