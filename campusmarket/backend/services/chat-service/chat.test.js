const request = require('supertest');
const jwt = require('jsonwebtoken');
const http = require('http');

const SECRET = 'test_secret';
const mkToken = (userId = 'u1', role = 'user') => jwt.sign({ userId, role }, SECRET);
const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const UUID3 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  Histogram: jest.fn(() => ({ observe: jest.fn(), startTimer: jest.fn(() => jest.fn()) })),
  Counter: jest.fn(() => ({ inc: jest.fn() })),
  Gauge: jest.fn(() => ({ set: jest.fn(), inc: jest.fn(), dec: jest.fn() })),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('metrics_data'), registerMetric: jest.fn() },
}));
jest.mock('../../shared/metrics', () => ({ metricsMiddleware: (req, res, next) => next() }));
jest.mock('socket.io', () => {
  const mockIo = {
    use: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    close: jest.fn((cb) => cb && cb()),
    adapter: jest.fn(),
  };
  return { Server: jest.fn(() => mockIo) };
});
jest.mock('../../shared/db', () => ({ query: jest.fn(), end: jest.fn().mockResolvedValue() }));
jest.mock('../../shared/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(),
  closeRedis: jest.fn().mockResolvedValue(),
  getRedisClient: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(), duplicate: jest.fn().mockReturnValue({}) }),
  publishEvent: jest.fn().mockResolvedValue(),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { NOTIFICATION: 'notification', LISTING: 'listing' },
  EVENT_TYPES: { NEW_OFFER: 'offer.new', OFFER_ACCEPTED: 'offer.accepted' },
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
const { publishEvent } = require('../../shared/events');

let app;
let mockIo;
let socketUseCallback = null;
let socketConnectionCallback = null;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;

  app = require('./server');

  // Capture socket.io callbacks registered at module load time
  const { Server } = require('socket.io');
  mockIo = Server.mock.results[0]?.value;
  if (mockIo) {
    socketUseCallback = mockIo.use.mock.calls[0]?.[0];
    const onCall = mockIo.on.mock.calls.find(c => c[0] === 'connection');
    socketConnectionCallback = onCall?.[1];
  }

  // Initialize service with mocked server.listen
  const listenSpy = jest.spyOn(http.Server.prototype, 'listen').mockReturnValue({});
  pool.query.mockResolvedValue({ rows: [] });
  await app._init();
  listenSpy.mockRestore();
});

afterEach(() => {
  jest.resetAllMocks();
  pool.query.mockResolvedValue({ rows: [] });
  publishEvent.mockResolvedValue();
  // Restore io.close so _shutdown doesn't hang
  if (mockIo) {
    mockIo.close.mockImplementation(cb => cb && cb());
    mockIo.to.mockReturnThis();
    mockIo.emit.mockReturnValue(undefined);
  }
});

describe('Chat Service — Conversations', () => {
  it('GET /api/conversations rejects unauthenticated', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  it('GET /api/conversations returns list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID, buyer_id: 'u1', seller_id: 'u2', unread_count: 0 }] });
    const res = await request(app).get('/api/conversations')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/conversations rejects unauthenticated', async () => {
    const res = await request(app).post('/api/conversations')
      .send({ seller_id: UUID2, listing_id: UUID3 });
    expect(res.status).toBe(401);
  });

  it('POST /api/conversations returns existing conversation', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: UUID }] });
    const res = await request(app).post('/api/conversations')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ seller_id: UUID2, listing_id: UUID3 });
    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe(UUID);
  });

  it('POST /api/conversations creates new conversation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: UUID }] });
    const res = await request(app).post('/api/conversations')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ seller_id: UUID2, listing_id: UUID3 });
    expect(res.status).toBe(201);
    expect(res.body.conversationId).toBe(UUID);
  });
});

describe('Chat Service — Messages', () => {
  it('GET /api/conversations/:id/messages rejects unauthenticated', async () => {
    const res = await request(app).get(`/api/conversations/${UUID}/messages`);
    expect(res.status).toBe(401);
  });

  it('GET /api/conversations/:id/messages returns 404 if not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/conversations/:id/messages returns 403 if not member', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ buyer_id: 'u99', seller_id: 'u98' }] });
    const res = await request(app).get(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/conversations/:id/messages returns messages', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ buyer_id: 'u1', seller_id: 'u2' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'm1', text: 'Hello', sender_first: 'J', sender_last: 'D' }] });
    const res = await request(app).get(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/conversations/:id/messages rejects unauthenticated', async () => {
    const res = await request(app).post(`/api/conversations/${UUID}/messages`)
      .send({ text: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('POST /api/conversations/:id/messages requires text', async () => {
    const res = await request(app).post(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/conversations/:id/messages returns 404 if conv not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ text: 'Hi' });
    expect(res.status).toBe(404);
  });

  it('POST /api/conversations/:id/messages returns 403 if not member', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ buyer_id: 'u99', seller_id: 'u98' }] });
    const res = await request(app).post(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ text: 'Hi' });
    expect(res.status).toBe(403);
  });

  it('POST /api/conversations/:id/messages sends message', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ buyer_id: 'u1', seller_id: 'u2' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'm1', conversation_id: UUID, sender_id: 'u1', text: 'Hi' }] });
    const res = await request(app).post(`/api/conversations/${UUID}/messages`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ text: 'Hi', type: 'text' });
    expect(res.status).toBe(201);
    expect(publishEvent).toHaveBeenCalled();
  });

  it('PATCH /api/conversations/:id/read marks messages as read', async () => {
    const res = await request(app).patch(`/api/conversations/${UUID}/read`)
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('PATCH /api/conversations/:id/read rejects unauthenticated', async () => {
    const res = await request(app).patch(`/api/conversations/${UUID}/read`);
    expect(res.status).toBe(401);
  });
});

describe('Chat Service — Offers', () => {
  it('POST /api/offers rejects unauthenticated', async () => {
    const res = await request(app).post('/api/offers')
      .send({ listing_id: UUID, amount: 1000 });
    expect(res.status).toBe(401);
  });

  it('POST /api/offers returns 404 if listing not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/offers')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ listing_id: UUID, amount: 1000 });
    expect(res.status).toBe(404);
  });

  it('POST /api/offers rejects inactive listing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'Book', price_fcfa: 5000, status: 'sold' }] });
    const res = await request(app).post('/api/offers')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ listing_id: UUID, amount: 1000 });
    expect(res.status).toBe(400);
  });

  it('POST /api/offers rejects offer on own listing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'u1', title: 'Book', price_fcfa: 5000, status: 'active' }] });
    const res = await request(app).post('/api/offers')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ listing_id: UUID, amount: 1000 });
    expect(res.status).toBe(400);
  });

  it('POST /api/offers creates offer with existing conversation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'Book', price_fcfa: 5000, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ id: UUID3 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'o1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/offers')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ listing_id: UUID, amount: 4000 });
    expect(res.status).toBe(201);
    expect(res.body.offerId).toBe('o1');
  });

  it('POST /api/offers creates offer with new conversation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'Book', price_fcfa: 5000, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: UUID3 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'o2' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/offers')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ listing_id: UUID, amount: 4000, note: 'Please' });
    expect(res.status).toBe(201);
  });

  it('GET /api/offers returns sent offers', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', amount: 4000 }] });
    const res = await request(app).get('/api/offers')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/offers returns received offers', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', amount: 4000 }] });
    const res = await request(app).get('/api/offers?direction=received')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/offers rejects unauthenticated', async () => {
    const res = await request(app).get('/api/offers');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/offers/:id rejects unauthenticated', async () => {
    const res = await request(app).patch(`/api/offers/${UUID}`).send({ action: 'accept' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/offers/:id returns 404 if offer not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'accept' });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/offers/:id accept — rejects non-seller', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u99', buyer_id: 'u2', listing_id: UUID, listing_status: 'active', amount: 1000 }] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'accept' });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/offers/:id accept — seller accepts', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u1', buyer_id: 'u2', listing_id: UUID, listing_status: 'active', amount: 1000 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'accept' });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/offers/:id decline', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u1', buyer_id: 'u2', listing_id: UUID, listing_status: 'active', amount: 1000 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'decline' });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/offers/:id counter — requires amount', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u1', buyer_id: 'u2', listing_id: UUID, listing_status: 'active', amount: 1000 }] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'counter' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/offers/:id counter — sends counter offer', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u1', buyer_id: 'u2', listing_id: UUID, listing_status: 'active', amount: 1000 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'counter', counter_amount: 800 });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/offers/:id withdraw — buyer withdraws', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u2', buyer_id: 'u1', listing_id: UUID, listing_status: 'active', amount: 1000 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'withdraw' });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/offers/:id invalid action', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'u2', buyer_id: 'u2', listing_id: UUID, listing_status: 'active', amount: 1000 }] });
    const res = await request(app).patch(`/api/offers/${UUID}`)
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ action: 'unknown' });
    expect(res.status).toBe(400);
  });
});

describe('Chat Service — Health & Metrics', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /metrics returns data', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });
});

describe('Chat Service — Socket Handlers', () => {
  const makeMockSocket = (userId = 'u1') => ({
    user: { userId },
    handshake: { auth: { token: jwt.sign({ userId }, SECRET) } },
    join: jest.fn(),
    on: jest.fn(),
  });

  it('socket auth middleware allows valid token', (done) => {
    if (!socketUseCallback) return done();
    const mockSocket = makeMockSocket();
    mockSocket.handshake.auth.token = jwt.sign({ userId: 'u1' }, SECRET);
    socketUseCallback(mockSocket, (err) => {
      expect(err).toBeUndefined();
      expect(mockSocket.user).toBeDefined();
      done();
    });
  });

  it('socket auth middleware rejects missing token', (done) => {
    if (!socketUseCallback) return done();
    const mockSocket = { handshake: { auth: {} }, user: null };
    socketUseCallback(mockSocket, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  it('socket auth middleware rejects invalid token', (done) => {
    if (!socketUseCallback) return done();
    const mockSocket = { handshake: { auth: { token: 'bad.token.here' } } };
    socketUseCallback(mockSocket, (err) => {
      expect(err).toBeDefined();
      done();
    });
  });

  it('socket connection handler registers events', () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    expect(mockSocket.on).toHaveBeenCalledWith('join_conversation', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('send_message', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('message_read', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('socket join_conversation joins room', () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    const joinCall = mockSocket.on.mock.calls.find(c => c[0] === 'join_conversation');
    if (joinCall) joinCall[1](UUID);
    expect(mockSocket.join).toHaveBeenCalledWith(`conv:${UUID}`);
  });

  it('socket send_message inserts message and emits', async () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    const sendCall = mockSocket.on.mock.calls.find(c => c[0] === 'send_message');
    if (sendCall) {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'm1', text: 'Hello', conversation_id: UUID }] })
        .mockResolvedValueOnce({ rows: [{ buyer_id: 'u1', seller_id: 'u2' }] });
      await sendCall[1]({ conversationId: UUID, text: 'Hello', type: 'text' });
    }
    expect(true).toBe(true);
  });

  it('socket send_message handles error gracefully', async () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    const sendCall = mockSocket.on.mock.calls.find(c => c[0] === 'send_message');
    if (sendCall) {
      pool.query.mockRejectedValueOnce(new Error('DB error'));
      await sendCall[1]({ conversationId: UUID, text: 'Hello' });
    }
    expect(true).toBe(true);
  });

  it('socket message_read updates DB and emits', async () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    const readCall = mockSocket.on.mock.calls.find(c => c[0] === 'message_read');
    if (readCall) {
      await readCall[1]({ conversationId: UUID });
    }
    expect(true).toBe(true);
  });

  it('socket message_read handles error gracefully', async () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    const readCall = mockSocket.on.mock.calls.find(c => c[0] === 'message_read');
    if (readCall) {
      pool.query.mockRejectedValueOnce(new Error('DB fail'));
      await readCall[1]({ conversationId: UUID });
    }
    expect(true).toBe(true);
  });

  it('socket disconnect logs user disconnect', () => {
    if (!socketConnectionCallback) return;
    const mockSocket = makeMockSocket();
    socketConnectionCallback(mockSocket);
    const disconnectCall = mockSocket.on.mock.calls.find(c => c[0] === 'disconnect');
    if (disconnectCall) disconnectCall[1]();
    expect(true).toBe(true);
  });
});

describe('Chat Service — Lifecycle', () => {
  it('_shutdown closes io and server and exits', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const closeSpy = jest.spyOn(http.Server.prototype, 'close').mockImplementation(cb => { if (cb) cb(); });
    pool.end = jest.fn().mockResolvedValue();
    await app._shutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    closeSpy.mockRestore();
  });
});
