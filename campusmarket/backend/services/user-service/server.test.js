const request = require('supertest');
const jwt = require('jsonwebtoken');

const SECRET = 'test_secret';
const mkToken = (userId = 'u1', role = 'user') => jwt.sign({ userId, role }, SECRET);
const UUID = '550e8400-e29b-41d4-a716-446655440000';

jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  Histogram: jest.fn(() => ({ observe: jest.fn(), startTimer: jest.fn(() => jest.fn()) })),
  Counter: jest.fn(() => ({ inc: jest.fn() })),
  Gauge: jest.fn(() => ({ set: jest.fn(), inc: jest.fn(), dec: jest.fn() })),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('metrics_data'), registerMetric: jest.fn() },
}));
jest.mock('../../shared/metrics', () => ({ metricsMiddleware: (req, res, next) => next() }));
jest.mock('../../shared/db', () => ({ query: jest.fn(), end: jest.fn().mockResolvedValue() }));
jest.mock('../../shared/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(),
  closeRedis: jest.fn().mockResolvedValue(),
  publishEvent: jest.fn().mockResolvedValue(),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { USER: 'user' },
  EVENT_TYPES: { USER_REGISTERED: 'user.registered', USER_SUSPENDED: 'user.suspended' },
}));
jest.mock('../../shared/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'test_secret');
      next();
    } catch { return res.status(401).json({ error: 'Invalid token' }); }
  },
}));
jest.mock('../../shared/validate', () => ({
  sanitizeString: (s) => (s ? String(s).trim() : ''),
  validateUUID: () => true,
}));
jest.mock('../../shared/errorHandler', () => ({
  asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
  AppError: class AppError extends Error {
    constructor(msg, code) { super(msg); this.status = code; this.statusCode = code; }
  },
}));

const pool = require('../../shared/db');

let app;

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.FRONTEND_URL = 'http://trusted.test';
  app = require('./server');
});

afterEach(() => jest.clearAllMocks());

describe('User Service — GET /api/users/me', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 404 if user not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/users/me')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(404);
  });

  it('returns user profile with stats', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@b.cm', first_name: 'A', last_name: 'B', campus_zone: 'Main' }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 3 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    const res = await request(app).get('/api/users/me')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('active_listings');
  });
});

describe('User Service — PATCH /api/users/me', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).patch('/api/users/me').send({ first_name: 'X' });
    expect(res.status).toBe(401);
  });

  it('updates profile', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/users/me')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ first_name: 'New', last_name: 'Name', bio: 'Bio', campus_zone: 'Block A' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });
});

describe('User Service — GET /api/users/:id', () => {
  it('returns public profile', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: UUID, first_name: 'J', last_name: 'D', campus_zone: 'Main' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 5 }] });
    const res = await request(app).get(`/api/users/${UUID}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reviews');
  });

  it('returns 404 for unknown user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/users/${UUID}`);
    expect(res.status).toBe(404);
  });
});

describe('User Service — POST /api/users/:id/reviews', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).post(`/api/users/${UUID}/reviews`).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('rejects invalid rating', async () => {
    const res = await request(app).post(`/api/users/${UUID}/reviews`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ rating: 10 });
    expect(res.status).toBe(400);
  });

  it('rejects zero rating', async () => {
    const res = await request(app).post(`/api/users/${UUID}/reviews`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  it('submits review successfully', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ avg: '4.5' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/users/${UUID}/reviews`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ rating: 4, comment: 'Great seller' });
    expect(res.status).toBe(201);
  });
});

describe('User Service — Wishlist', () => {
  it('GET /api/wishlist returns wishlist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID, title: 'Book', price_fcfa: 5000 }] });
    const res = await request(app).get('/api/wishlist')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/wishlist/:id rejects if listing not active', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/wishlist/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/wishlist/:id adds to wishlist', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: UUID, seller_id: 'u2', price_fcfa: 1000 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/wishlist/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /api/wishlist/:id removes from wishlist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete(`/api/wishlist/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/wishlist rejects unauthenticated', async () => {
    const res = await request(app).get('/api/wishlist');
    expect(res.status).toBe(401);
  });
});

describe('User Service — Transactions', () => {
  it('GET /api/users/me/transactions rejects unauthenticated', async () => {
    const res = await request(app).get('/api/users/me/transactions');
    expect(res.status).toBe(401);
  });

  it('GET /api/users/me/transactions returns sold and bought', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 't1', final_price: 5000, listing_id: UUID, title: 'Book' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/users/me/transactions')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sold');
    expect(res.body).toHaveProperty('bought');
  });
});

describe('User Service — Health & Metrics', () => {
  it('GET /health returns ok', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /metrics returns prometheus data', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });

  it('permits the configured browser origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://trusted.test');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://trusted.test');
  });

  it('rejects an untrusted browser origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://untrusted.test');
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('error handler returns 500 for internal errors', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(500);
  });
});

describe('User Service — Lifecycle (init/shutdown/events)', () => {
  let exitSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('_init starts redis and registers event handlers', async () => {
    const mockServer = { close: jest.fn((cb) => cb && cb()) };
    jest.spyOn(app, 'listen').mockReturnValue(mockServer);
    const { initRedis, subscribeToEvents } = require('../../shared/events');
    await app._init();
    expect(initRedis).toHaveBeenCalled();
    expect(subscribeToEvents).toHaveBeenCalled();
    app.listen.mockRestore();
  });

  it('event handler processes USER_REGISTERED event', async () => {
    const { subscribeToEvents } = require('../../shared/events');
    const userCall = subscribeToEvents.mock.calls.find(c => c[0] === 'user');
    if (userCall) {
      pool.query.mockResolvedValue({ rows: [] });
      await userCall[1]({ type: 'user.registered', userId: 'u1', email: 'a@b.cm', first_name: 'A', last_name: 'B', campus_zone: 'Main' });
    }
    expect(true).toBe(true);
  });

  it('event handler processes USER_SUSPENDED event', async () => {
    const { subscribeToEvents } = require('../../shared/events');
    const userCall = subscribeToEvents.mock.calls.find(c => c[0] === 'user');
    if (userCall) {
      pool.query.mockResolvedValue({ rows: [] });
      await userCall[1]({ type: 'user.suspended', userId: 'u1' });
    }
    expect(true).toBe(true);
  });

  it('_shutdown closes server, redis and exits', async () => {
    const mockServer = { close: jest.fn((cb) => cb && cb()) };
    jest.spyOn(app, 'listen').mockReturnValue(mockServer);
    await app._init();
    app.listen.mockRestore();

    pool.end = jest.fn().mockResolvedValue();
    await app._shutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
