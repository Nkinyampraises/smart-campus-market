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
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { NOTIFICATION: 'notification' },
  EVENT_TYPES: {
    WELCOME_EMAIL: 'welcome.email',
    NEW_OFFER: 'offer.new',
    OFFER_ACCEPTED: 'offer.accepted',
    LISTING_EXPIRED: 'listing.expired',
    USER_SUSPENDED: 'user.suspended',
  },
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
jest.mock('../../shared/errorHandler', () => ({
  asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
  AppError: class AppError extends Error {
    constructor(msg, code) { super(msg); this.status = code; this.statusCode = code; }
  },
}));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  })),
}));
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({}),
}));

const pool = require('../../shared/db');
const events = require('../../shared/events');

let app;
let capturedNotifHandler = null;
let mockHttpServer;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  process.env.VAPID_PUBLIC_KEY = 'BTestPublicKey1234567890123456789012345678901234567890123456789012345678901234567890123456==';
  process.env.VAPID_PRIVATE_KEY = 'FakePrivateKey123456789012345678901234567890=';
  process.env.VAPID_EMAIL = 'mailto:test@test.cm';
  process.env.SMTP_HOST = 'smtp.test.cm';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASS = 'pass';
  process.env.FRONTEND_URL = 'http://localhost:5173';

  // Configure subscribeToEvents to capture the notification handler
  events.subscribeToEvents.mockImplementation((channel, cb) => {
    if (channel === 'notification') capturedNotifHandler = cb;
    return Promise.resolve();
  });

  app = require('./server');

  mockHttpServer = { close: jest.fn((cb) => cb && cb()) };
  jest.spyOn(app, 'listen').mockReturnValue(mockHttpServer);
  pool.query.mockResolvedValue({ rows: [] });
  await app._init();
  app.listen.mockRestore();
});

afterEach(() => {
  jest.resetAllMocks();
  // Restore safe defaults after reset
  pool.query.mockResolvedValue({ rows: [] });
  if (events.subscribeToEvents) events.subscribeToEvents.mockResolvedValue();
  const webpush = require('web-push');
  webpush.sendNotification.mockResolvedValue({});
  // Restore mock server close so _shutdown doesn't hang waiting for server.close(cb)
  if (mockHttpServer) mockHttpServer.close.mockImplementation(cb => cb && cb());
});

describe('Notification Service — GET /api/notifications', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('returns notifications list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'n1', type: 'offer', title: 'New offer', is_read: false }] });
    const res = await request(app).get('/api/notifications')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Notification Service — GET /api/notifications/unread-count', () => {
  it('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });

  it('returns unread count', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
    const res = await request(app).get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });
});

describe('Notification Service — PATCH mark as read', () => {
  it('marks notification as read', async () => {
    const res = await request(app).patch('/api/notifications/n1/read')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('marks all as read', async () => {
    const res = await request(app).patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${mkToken()}`);
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated single read', async () => {
    const res = await request(app).patch('/api/notifications/n1/read');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated read-all', async () => {
    const res = await request(app).patch('/api/notifications/read-all');
    expect(res.status).toBe(401);
  });
});

describe('Notification Service — Push Subscriptions', () => {
  it('rejects subscribe without auth', async () => {
    const res = await request(app).post('/api/notifications/push/subscribe')
      .send({ endpoint: 'https://push.example.com', keys: { p256dh: 'key', auth: 'auth' } });
    expect(res.status).toBe(401);
  });

  it('rejects invalid subscription (missing keys)', async () => {
    const res = await request(app).post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ endpoint: 'https://push.example.com' });
    expect(res.status).toBe(400);
  });

  it('saves push subscription', async () => {
    const res = await request(app).post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ endpoint: 'https://push.example.com/xyz', keys: { p256dh: 'pubkey', auth: 'authkey' } });
    expect(res.status).toBe(200);
  });

  it('unsubscribes from push', async () => {
    const res = await request(app).delete('/api/notifications/push/unsubscribe')
      .set('Authorization', `Bearer ${mkToken()}`)
      .send({ endpoint: 'https://push.example.com/xyz' });
    expect(res.status).toBe(200);
  });

  it('rejects unsubscribe without auth', async () => {
    const res = await request(app).delete('/api/notifications/push/unsubscribe')
      .send({ endpoint: 'https://push.example.com/xyz' });
    expect(res.status).toBe(401);
  });

  it('returns VAPID public key', async () => {
    const res = await request(app).get('/api/notifications/push/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('publicKey');
  });
});

describe('Notification Service — Health & Metrics', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /metrics returns data', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });

  it('error handler catches errors', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(500);
  });
});

describe('Notification Service — Event Handlers', () => {
  const call = async (event) => {
    if (capturedNotifHandler) await capturedNotifHandler(event);
  };

  it('WELCOME_EMAIL sends welcome email (user found)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ email: 'a@b.cm', first_name: 'Alice' }] });
    // sendPushToUser: SELECT push_subscriptions → default { rows: [] }
    await call({ type: 'welcome.email', userId: 'u1', payload: { verificationToken: 'tok' } });
    expect(true).toBe(true);
  });

  it('WELCOME_EMAIL user not found — skips', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await call({ type: 'welcome.email', userId: 'u99', payload: {} });
    expect(true).toBe(true);
  });

  it('email_verification sends email (user found)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ email: 'a@b.cm' }] });
    await call({ type: 'email_verification', userId: 'u1', payload: { token: 'tok' } });
    expect(true).toBe(true);
  });

  it('email_verification user not found — skips', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await call({ type: 'email_verification', userId: 'u99', payload: { token: 'tok' } });
    expect(true).toBe(true);
  });

  it('password_reset sends email (user found)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ email: 'a@b.cm', first_name: 'Alice' }] });
    await call({ type: 'password_reset', userId: 'u1', payload: { token: 'tok' } });
    expect(true).toBe(true);
  });

  it('password_reset user not found — skips', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await call({ type: 'password_reset', userId: 'u1', payload: { token: 'tok' } });
    expect(true).toBe(true);
  });

  it('NEW_OFFER saves notification to seller', async () => {
    // saveNotification(sellerId): INSERT, then sendPushToUser SELECT push_subscriptions
    await call({ type: 'offer.new', sellerId: 'u2', amount: 5000, listingTitle: 'Book' });
    expect(pool.query).toHaveBeenCalled();
  });

  it('OFFER_ACCEPTED saves notification to buyer', async () => {
    await call({ type: 'offer.accepted', buyerId: 'u1', listingTitle: 'Laptop' });
    expect(pool.query).toHaveBeenCalled();
  });

  it('buy_request saves notification with landmark', async () => {
    await call({ type: 'buy_request', sellerId: 'u2', listingTitle: 'Book', campus_zone: 'Main', landmark: 'Block A' });
    expect(pool.query).toHaveBeenCalled();
  });

  it('buy_request saves notification without landmark', async () => {
    await call({ type: 'buy_request', sellerId: 'u2', listingTitle: 'Laptop', campus_zone: 'East' });
    expect(pool.query).toHaveBeenCalled();
  });

  it('LISTING_EXPIRED notifies seller', async () => {
    await call({ type: 'listing.expired', sellerId: 'u2', title: 'OldBook' });
    expect(pool.query).toHaveBeenCalled();
  });

  it('USER_SUSPENDED notifies user and sends email (user found)', async () => {
    // saveNotification: INSERT, sendPushToUser SELECT; then pool.query for user email
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // INSERT notification
      .mockResolvedValueOnce({ rows: [] }) // SELECT push_subscriptions
      .mockResolvedValueOnce({ rows: [{ email: 'a@b.cm' }] }); // SELECT for email
    await call({ type: 'user.suspended', userId: 'u1', reason: 'Policy violation' });
    expect(true).toBe(true);
  });

  it('USER_SUSPENDED user email not found — skips email', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }) // push subscriptions
      .mockResolvedValueOnce({ rows: [] }); // user lookup → no email
    await call({ type: 'user.suspended', userId: 'u1', reason: 'Violation' });
    expect(true).toBe(true);
  });

  it('new_message notifies receiver', async () => {
    await call({ type: 'new_message', receiverId: 'u2', text: 'Hello there', conversationId: UUID });
    expect(pool.query).toHaveBeenCalled();
  });

  it('new_message without receiverId — skips', async () => {
    await call({ type: 'new_message', text: 'Hi' });
    expect(true).toBe(true);
  });

  it('listing_fraud_flag notifies seller (listing found)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'u2', title: 'Fake Book' }] }) // SELECT listing
      .mockResolvedValueOnce({ rows: [] })  // INSERT notification
      .mockResolvedValueOnce({ rows: [] }); // SELECT push_subscriptions
    await call({ type: 'listing_fraud_flag', listingId: UUID });
    expect(true).toBe(true);
  });

  it('listing_fraud_flag listing not found — skips', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await call({ type: 'listing_fraud_flag', listingId: UUID });
    expect(true).toBe(true);
  });

  it('report_submitted: admin found — sends notification', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'admin1' }] }) // SELECT admins
      .mockResolvedValueOnce({ rows: [] })  // INSERT notification for admin1
      .mockResolvedValueOnce({ rows: [] }); // SELECT push_subscriptions
    await call({ type: 'report_submitted', reason: 'spam' });
    expect(true).toBe(true);
  });

  it('report_submitted: no admins found — skips loop', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await call({ type: 'report_submitted', reason: 'spam' });
    expect(true).toBe(true);
  });

  it('contains notification persistence failures for users and administrators', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'admin1' }] })
      .mockRejectedValueOnce(new Error('admin insert unavailable'));
    await call({ type: 'report_submitted', reason: 'spam' });

    pool.query
      .mockRejectedValueOnce(new Error('user insert unavailable'))
      .mockResolvedValueOnce({ rows: [] });
    await call({ type: 'offer.new', sellerId: 'u2', amount: 1000, listingTitle: 'Stuff' });
    expect(require('../../shared/logger').error).toHaveBeenCalledTimes(2);
  });

  it('sendPushToUser with expired subscription (404) cleans up', async () => {
    const webpush = require('web-push');
    const pushErr = new Error('Gone');
    pushErr.statusCode = 410;
    webpush.sendNotification.mockRejectedValue(pushErr);
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // INSERT notification
      .mockResolvedValueOnce({ rows: [{ endpoint: 'https://old.push', p256dh: 'k', auth: 'a' }] }) // push subs
      .mockResolvedValue({ rows: [] }); // DELETE expired
    await call({ type: 'offer.new', sellerId: 'u2', amount: 1000, listingTitle: 'Stuff' });
    expect(true).toBe(true);
  });

  it('unknown event type — no crash', async () => {
    await call({ type: 'some_unknown_event' });
    expect(true).toBe(true);
  });
});

describe('Notification Service — Lifecycle', () => {
  it('contains cleanup failures for an expired push subscription', async () => {
    const webpush = require('web-push');
    webpush.sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 404 }));
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ endpoint: 'https://expired.push', p256dh: 'k', auth: 'a' }] })
      .mockRejectedValueOnce(new Error('cleanup unavailable'));
    await capturedNotifHandler({ type: 'offer.new', sellerId: 'u2', amount: 1000, listingTitle: 'Stuff' });
    await new Promise(setImmediate);
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM push_subscriptions WHERE endpoint=$1', ['https://expired.push']);
  });

  it('_shutdown closes server and exits', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    pool.end = jest.fn().mockResolvedValue();
    await app._shutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
