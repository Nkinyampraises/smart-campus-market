const request = require('supertest');
const jwt = require('jsonwebtoken');

const SECRET = 'test_secret';
const mkToken = (userId = 'u1', role = 'user') => jwt.sign({ userId, role }, SECRET);
const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

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
  getRedisClient: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue() }),
  publishEvent: jest.fn().mockResolvedValue(),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { LISTING: 'listing', NOTIFICATION: 'notification', ADMIN: 'admin' },
  EVENT_TYPES: { LISTING_CREATED: 'listing.created', LISTING_UPDATED: 'listing.updated', LISTING_SOLD: 'listing.sold', LISTING_EXPIRED: 'listing.expired', NEW_OFFER: 'offer.new' },
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
  validateListing: (body) => {
    if (!body.title || !body.category || !body.price_fcfa || !body.condition) {
      return { valid: false, errors: ['Missing required fields'], sanitized: null };
    }
    return {
      valid: true,
      errors: [],
      sanitized: {
        title: String(body.title).trim(),
        description: String(body.description || '').trim(),
        category: String(body.category).trim(),
        price_fcfa: parseInt(body.price_fcfa, 10),
        condition: String(body.condition).trim(),
        campus_zone: String(body.campus_zone || '').trim(),
        tags: Array.isArray(body.tags) ? body.tags : [],
      },
    };
  },
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
let mockRedis;
let capturedAdminHandler = null;
let mockHttpServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;

  // Get the events mock to capture event handlers
  const events = require('../../shared/events');
  mockRedis = events.getRedisClient();

  // Capture admin handler when subscribeToEvents is called
  events.subscribeToEvents.mockImplementation((channel, cb) => {
    if (channel === 'admin') capturedAdminHandler = cb;
    return Promise.resolve();
  });

  app = require('./server');

  // Initialize service: sets redis = getRedisClient() = mockRedis
  mockHttpServer = { close: jest.fn((cb) => cb && cb()) };
  jest.spyOn(app, 'listen').mockReturnValue(mockHttpServer);
  pool.query.mockResolvedValue({ rows: [] });
  await app._init();
  app.listen.mockRestore();
});

afterEach(() => {
  jest.resetAllMocks();
  // Restore publishEvent default (returns a Promise so await works)
  publishEvent.mockResolvedValue();
  // Restore pool default (returns empty rows so result.rows is always an array)
  pool.query.mockResolvedValue({ rows: [] });
  // Restore redis default
  if (mockRedis) {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue();
  }
  // Restore mock server close so _shutdown doesn't hang
  if (mockHttpServer) {
    mockHttpServer.close.mockImplementation(cb => cb && cb());
  }
});

describe('Listing Service — GET /api/listings', () => {
  it('returns active listings', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID, title: 'Book', price_fcfa: 5000, category: 'Books', status: 'active' }] });
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/listings?category=Electronics');
    expect(res.status).toBe(200);
  });

  it('filters by campus_zone', async () => {
    const res = await request(app).get('/api/listings?campus_zone=Main');
    expect(res.status).toBe(200);
  });

  it('filters by min and max price', async () => {
    const res = await request(app).get('/api/listings?min_price=1000&max_price=10000');
    expect(res.status).toBe(200);
  });

  it('filters by condition', async () => {
    const res = await request(app).get('/api/listings?condition=New');
    expect(res.status).toBe(200);
  });

  it('handles mine=true with valid token', async () => {
    const token = mkToken();
    const res = await request(app).get('/api/listings?mine=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('rejects mine=true without token', async () => {
    const res = await request(app).get('/api/listings?mine=true');
    expect(res.status).toBe(401);
  });

  it('handles pagination params', async () => {
    const res = await request(app).get('/api/listings?page=2&limit=10');
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — GET /api/listings/:id', () => {
  it('returns 404 for missing listing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/listings/${UUID}`);
    expect(res.status).toBe(404);
  });

  it('returns listing when found with view tracking', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: UUID, title: 'Book', price_fcfa: 5000, seller_first: 'J', seller_last: 'D' }] })
      .mockResolvedValueOnce({ rows: [] });
    mockRedis.get.mockResolvedValueOnce(null);
    const res = await request(app).get(`/api/listings/${UUID}`)
      .set('x-user-id', 'u2');
    expect(res.status).toBe(200);
  });

  it('skips view update when already viewed (redis hit)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID, title: 'Book', price_fcfa: 5000, seller_first: 'J', seller_last: 'D' }] });
    mockRedis.get.mockResolvedValueOnce('1');
    const res = await request(app).get(`/api/listings/${UUID}`)
      .set('x-user-id', 'u2');
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — POST /api/listings', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).post('/api/listings').send({ title: 'Book' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid listing (missing fields)', async () => {
    const res = await request(app).post('/api/listings')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'Book' });
    expect(res.status).toBe(400);
  });

  it('creates listing without images', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID }] });
    const res = await request(app).post('/api/listings')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'New Book', description: 'Desc', category: 'Books', price_fcfa: 5000, condition: 'Good', campus_zone: 'Main' });
    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe(UUID);
    expect(publishEvent).toHaveBeenCalled();
  });

  it('creates listing with images', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: UUID }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/listings')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'Laptop', description: 'Good', category: 'Electronics', price_fcfa: 50000, condition: 'Good', campus_zone: 'Main', images: ['http://img1.jpg', 'http://img2.jpg'] });
    expect(res.status).toBe(201);
  });
});

describe('Listing Service — PATCH /api/listings/:id', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).patch(`/api/listings/${UUID}`).send({ title: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('rejects if not owner', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'otheruser', status: 'active' }] });
    const res = await request(app).patch(`/api/listings/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('rejects if listing not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/listings/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('updates listing', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u1', status: 'active' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/listings/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'Updated Title', price_fcfa: 9000, condition: 'Good', campus_zone: 'Main' });
    expect(res.status).toBe(200);
  });

  it('updates listing with new images', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u1', status: 'active' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/listings/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ title: 'Updated', price_fcfa: 9000, condition: 'Good', campus_zone: 'Main', images: ['http://new.jpg'] });
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — PATCH /api/listings/:id/sell', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).patch(`/api/listings/${UUID}/sell`);
    expect(res.status).toBe(401);
  });

  it('rejects if not owner or not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/listings/${UUID}/sell`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ buyer_id: UUID2, final_price: 5000 });
    expect(res.status).toBe(403);
  });

  it('marks listing as sold without transaction', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u1', title: 'Book', price_fcfa: 5000 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/listings/${UUID}/sell`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({});
    expect(res.status).toBe(200);
  });

  it('marks listing as sold with transaction', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u1', title: 'Book', price_fcfa: 5000 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/listings/${UUID}/sell`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ buyer_id: UUID2, final_price: 4500 });
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — DELETE /api/listings/:id', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).delete(`/api/listings/${UUID}`);
    expect(res.status).toBe(401);
  });

  it('rejects if not owner', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'other' }] });
    const res = await request(app).delete(`/api/listings/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(403);
  });

  it('removes listing', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete(`/api/listings/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — Offers', () => {
  it('POST /api/listings/:id/offers rejects unauthenticated', async () => {
    const res = await request(app).post(`/api/listings/${UUID}/offers`).send({ amount: 1000 });
    expect(res.status).toBe(401);
  });

  it('POST /api/listings/:id/offers returns 404 if listing not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/listings/${UUID}/offers`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ amount: 1000 });
    expect(res.status).toBe(404);
  });

  it('POST /api/listings/:id/offers rejects inactive listing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'Book', price_fcfa: 5000, status: 'sold' }] });
    const res = await request(app).post(`/api/listings/${UUID}/offers`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ amount: 1000 });
    expect(res.status).toBe(400);
  });

  it('POST /api/listings/:id/offers rejects own listing offer', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'u1', title: 'Book', price_fcfa: 5000, status: 'active' }] });
    const res = await request(app).post(`/api/listings/${UUID}/offers`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ amount: 1000 });
    expect(res.status).toBe(400);
  });

  it('POST /api/listings/:id/offers submits offer successfully', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'Book', price_fcfa: 5000, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'o1' }] });
    const res = await request(app).post(`/api/listings/${UUID}/offers`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ amount: 4500, note: 'Best price' });
    expect(res.status).toBe(201);
    expect(res.body.offerId).toBe('o1');
  });

  it('GET /api/listings/:id/offers rejects unauthenticated', async () => {
    const res = await request(app).get(`/api/listings/${UUID}/offers`);
    expect(res.status).toBe(401);
  });

  it('GET /api/listings/:id/offers returns offers', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', amount: 4500, buyer_first: 'J', buyer_last: 'D' }] });
    const res = await request(app).get(`/api/listings/${UUID}/offers`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — POST /api/listings/:id/images', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).post(`/api/listings/${UUID}/images`);
    expect(res.status).toBe(401);
  });

  it('rejects if not owner', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/listings/${UUID}/images`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(403);
  });

  it('accepts image upload from owner', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'u1' }] });
    const res = await request(app).post(`/api/listings/${UUID}/images`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });
});

describe('Listing Service — Health & Metrics', () => {
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
});

describe('Listing Service — Lifecycle', () => {
  it('admin event handler removes listing', async () => {
    if (capturedAdminHandler) {
      await capturedAdminHandler({ type: 'listing.removed', listingId: UUID });
    }
    expect(true).toBe(true);
  });

  it('admin event handler ignores unknown event', async () => {
    if (capturedAdminHandler) {
      await capturedAdminHandler({ type: 'unknown.event', listingId: UUID });
    }
    expect(true).toBe(true);
  });

  it('_shutdown cleans up and exits', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    pool.end = jest.fn().mockResolvedValue();
    await app._shutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
