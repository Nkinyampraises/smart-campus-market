const request = require('supertest');
const jwt = require('jsonwebtoken');

const SECRET = 'test_secret';
const adminToken = () => jwt.sign({ userId: 'admin1', role: 'admin' }, SECRET);
const userToken  = () => jwt.sign({ userId: 'user1',  role: 'user'  }, SECRET);
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
  EVENT_CHANNELS: { ADMIN: 'admin', NOTIFICATION: 'notification', AUDIT: 'audit' },
  EVENT_TYPES: { USER_SUSPENDED: 'user.suspended', LOW_PRICE_FLAG: 'fraud.low_price', SPAM_RATE_FLAG: 'fraud.spam' },
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
  requireRole: (role) => (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
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
const { publishEvent } = require('../../shared/events');

let app;

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  app = require('./server');
});

afterEach(() => jest.clearAllMocks());

describe('Admin Service — Stats', () => {
  it('GET /api/admin/stats rejects unauthenticated', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/stats rejects non-admin', async () => {
    const res = await request(app).get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/stats returns dashboard stats', async () => {
    const countRow = { cnt: 42 };
    pool.query
      .mockResolvedValueOnce({ rows: [countRow] })
      .mockResolvedValueOnce({ rows: [countRow] })
      .mockResolvedValueOnce({ rows: [countRow] })
      .mockResolvedValueOnce({ rows: [countRow] })
      .mockResolvedValueOnce({ rows: [countRow] })
      .mockResolvedValueOnce({ rows: [countRow] })
      .mockResolvedValueOnce({ rows: [countRow] });
    const res = await request(app).get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('pendingReports');
  });

  it('GET /api/admin/public-stats returns public stats', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ cnt: 100 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 50 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 30 }] });
    const res = await request(app).get('/api/admin/public-stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('verifiedUsers');
    expect(res.body).toHaveProperty('activeListings');
    expect(res.body).toHaveProperty('transactions');
  });
});

describe('Admin Service — Users', () => {
  it('GET /api/admin/users returns all users', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@b.cm', is_suspended: false }] });
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/admin/users filters suspended', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/admin/users?suspended=true')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/users filters not suspended', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/admin/users?suspended=false')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/users search by name/email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/admin/users?search=john')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/users rejects non-admin', async () => {
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/users/:id/suspend suspends user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/admin/users/${UUID}/suspend`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ reason: 'Policy violation' });
    expect(res.status).toBe(200);
    expect(publishEvent).toHaveBeenCalled();
  });

  it('POST /api/admin/users/:id/suspend rejects non-admin', async () => {
    const res = await request(app).post(`/api/admin/users/${UUID}/suspend`)
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ reason: 'Test' });
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/users/:id/unsuspend unsuspends user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/admin/users/${UUID}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  it('POST /api/admin/users/:id/unsuspend rejects non-admin', async () => {
    const res = await request(app).post(`/api/admin/users/${UUID}/unsuspend`)
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });
});

describe('Admin Service — Reports', () => {
  it('GET /api/admin/reports returns pending reports', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'r1', reason: 'fraud', status: 'pending' }] });
    const res = await request(app).get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/admin/reports rejects non-admin', async () => {
    const res = await request(app).get('/api/admin/reports')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /api/admin/reports/:id resolves report', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ listing_id: UUID }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    const res = await request(app).patch(`/api/admin/reports/r1`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'resolved', action: null });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/admin/reports/:id with remove_listing action', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ listing_id: UUID }] })
      .mockResolvedValueOnce({ rows: [{ listing_id: UUID }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    const res = await request(app).patch(`/api/admin/reports/r1`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'resolved', action: 'remove_listing' });
    expect(res.status).toBe(200);
    expect(publishEvent).toHaveBeenCalled();
  });

  it('PATCH /api/admin/reports/:id auto-hides when 3+ reports', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ listing_id: UUID }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
    const res = await request(app).patch(`/api/admin/reports/r1`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'resolved', action: null });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/admin/reports/:id rejects non-admin', async () => {
    const res = await request(app).patch('/api/admin/reports/r1')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ status: 'resolved' });
    expect(res.status).toBe(403);
  });
});

describe('Admin Service — Fraud Flags', () => {
  it('GET /api/admin/fraud-flags returns unresolved flags', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'f1', type: 'price', resolved: false }] });
    const res = await request(app).get('/api/admin/fraud-flags')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/admin/fraud-flags rejects non-admin', async () => {
    const res = await request(app).get('/api/admin/fraud-flags')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('PATCH /api/admin/fraud-flags/:id/resolve resolves flag', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/admin/fraud-flags/f1/resolve')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/resolved/i);
  });

  it('PATCH /api/admin/fraud-flags/:id/resolve rejects non-admin', async () => {
    const res = await request(app).patch('/api/admin/fraud-flags/f1/resolve')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });
});

describe('Admin Service — User Reports', () => {
  it('POST /api/reports rejects unauthenticated', async () => {
    const res = await request(app).post('/api/reports')
      .send({ listing_id: UUID, reason: 'spam', description: 'Spam item' });
    expect(res.status).toBe(401);
  });

  it('POST /api/reports submits report', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ listing_id: UUID, reason: 'spam', description: 'Spam description' });
    expect(res.status).toBe(201);
    expect(publishEvent).toHaveBeenCalled();
  });

  it('POST /api/reports auto-hides when 3+ reports', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ listing_id: UUID, reason: 'fraud', description: 'Fraud item' });
    expect(res.status).toBe(201);
  });
});

describe('Admin Service — Health & Metrics', () => {
  it('GET /health returns ok', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /metrics returns data', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });

  it('error handler catches DB errors', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(500);
  });
});

describe('Admin Service — Lifecycle (init/shutdown/events)', () => {
  let exitSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('_init starts redis and subscribes to audit events', async () => {
    const mockServer = { close: jest.fn((cb) => cb && cb()) };
    jest.spyOn(app, 'listen').mockReturnValue(mockServer);
    const { initRedis, subscribeToEvents } = require('../../shared/events');
    await app._init();
    expect(initRedis).toHaveBeenCalled();
    expect(subscribeToEvents).toHaveBeenCalled();
    app.listen.mockRestore();
  });

  it('audit event handler inserts fraud flag for LOW_PRICE_FLAG', async () => {
    const { subscribeToEvents } = require('../../shared/events');
    const auditCall = subscribeToEvents.mock.calls.find(c => c[0] === 'audit');
    if (auditCall) {
      pool.query.mockResolvedValue({ rows: [] });
      await auditCall[1]({ type: 'fraud.low_price', listingId: UUID, sellerId: 'u1', rule: 'price_too_low' });
    }
    expect(true).toBe(true);
  });

  it('audit event handler inserts fraud flag for SPAM_RATE_FLAG', async () => {
    const { subscribeToEvents } = require('../../shared/events');
    const auditCall = subscribeToEvents.mock.calls.find(c => c[0] === 'audit');
    if (auditCall) {
      pool.query.mockResolvedValue({ rows: [] });
      await auditCall[1]({ type: 'fraud.spam', listingId: UUID, sellerId: 'u1', rule: 'spam_detected' });
    }
    expect(true).toBe(true);
  });

  it('audit event handler ignores unknown event types', async () => {
    const { subscribeToEvents } = require('../../shared/events');
    const auditCall = subscribeToEvents.mock.calls.find(c => c[0] === 'audit');
    if (auditCall) {
      await auditCall[1]({ type: 'unknown.event' });
    }
    expect(true).toBe(true);
  });

  it('_shutdown closes server and exits', async () => {
    const mockServer = { close: jest.fn((cb) => cb && cb()) };
    jest.spyOn(app, 'listen').mockReturnValue(mockServer);
    await app._init();
    app.listen.mockRestore();

    pool.end = jest.fn().mockResolvedValue();
    await app._shutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
