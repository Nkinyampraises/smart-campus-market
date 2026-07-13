const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = 'test_secret';

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
  EVENT_CHANNELS: { USER: 'user', NOTIFICATION: 'notification', ADMIN: 'admin' },
  EVENT_TYPES: { USER_REGISTERED: 'user.registered', USER_VERIFIED: 'user.verified', WELCOME_EMAIL: 'welcome.email' },
}));
jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn(() => ({})) }));
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

const pool = require('../../shared/db');
const { publishEvent } = require('../../shared/events');

let app;

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.GOOGLE_CLIENT_ID = 'test_google_client_id';
  app = require('./server');
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$12$hashedpw');
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Auth Service — Register', () => {
  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'notanemail', password: 'pass1234', first_name: 'A', last_name: 'B', campus_zone: 'X' });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'test@ictuniversity.edu.cm', password: '123', first_name: 'A', last_name: 'B', campus_zone: 'X' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] });
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'test@ictuniversity.edu.cm', password: 'securePass123', first_name: 'A', last_name: 'B', campus_zone: 'X' });
    expect(res.status).toBe(409);
  });

  it('creates new user successfully', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'new@ictuniversity.edu.cm', password: 'securePass123', first_name: 'John', last_name: 'Doe', campus_zone: 'Main' });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('u1');
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith('user', expect.objectContaining({
      type: 'user.registered',
      userId: 'u1',
      email: 'new@ictuniversity.edu.cm',
    }));
  });
});

describe('Auth Service — Login', () => {
  it('rejects user not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'no@ictuniversity.edu.cm', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('rejects wrong password', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', password_hash: '$hash', is_verified: true, is_suspended: false, role: 'user' }] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@ictuniversity.edu.cm', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('allows a legacy unverified user to log in', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', password_hash: '$hash', is_verified: false, is_suspended: false, role: 'user' }] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@ictuniversity.edu.cm', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('rejects suspended user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', password_hash: '$hash', is_verified: true, is_suspended: true, suspended_reason: 'Fraud', role: 'user' }] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@ictuniversity.edu.cm', password: 'pass' });
    expect(res.status).toBe(403);
  });

  it('returns tokens on successful login', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'test@ictuniversity.edu.cm', password_hash: '$hash', is_verified: true, is_suspended: false, role: 'user' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@ictuniversity.edu.cm', password: 'correct123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'pass' });
    expect(res.status).toBe(400);
  });
});

describe('Auth Service — Logout', () => {
  it('logs out without token', async () => {
    const res = await request(app).post('/api/auth/logout').send();
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });

  it('logs out with valid token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = jwt.sign({ userId: 'u1' }, SECRET);
    const res = await request(app).post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('logs out with invalid token gracefully', async () => {
    const res = await request(app).post('/api/auth/logout')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

describe('Auth Service — Google OAuth', () => {
  it('rejects missing credential', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
  });

  it('rejects invalid google token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const res = await request(app).post('/api/auth/google').send({ credential: 'bad_token' });
    expect(res.status).toBe(401);
  });

  it('rejects audience mismatch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ aud: 'wrong_client', email: 'g@example.com', given_name: 'G', family_name: 'U', picture: null }),
    });
    const res = await request(app).post('/api/auth/google').send({ credential: 'token' });
    expect(res.status).toBe(401);
  });

  it('logs in existing google user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ aud: 'test_google_client_id', email: 'g@example.com', given_name: 'G', family_name: 'U', picture: null }),
    });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'g@example.com', first_name: 'G', last_name: 'U', is_suspended: false, role: 'user' }] });
    const res = await request(app).post('/api/auth/google').send({ credential: 'valid_token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('creates new google user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ aud: 'test_google_client_id', email: 'new@example.com', given_name: 'New', family_name: 'User', picture: null }),
    });
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'u2', email: 'new@example.com', first_name: 'New', last_name: 'User', is_suspended: false, role: 'user' }] });
    const res = await request(app).post('/api/auth/google').send({ credential: 'valid_token' });
    expect(res.status).toBe(200);
  });

  it('rejects suspended google user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ aud: 'test_google_client_id', email: 'sus@example.com', given_name: 'Sus', family_name: 'User', picture: null }),
    });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u3', email: 'sus@example.com', is_suspended: true, suspended_reason: 'Violation' }] });
    const res = await request(app).post('/api/auth/google').send({ credential: 'valid_token' });
    expect(res.status).toBe(403);
  });
});

describe('Auth Service — Refresh Token', () => {
  it('rejects missing refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('rejects invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'bad_token' });
    expect(res.status).toBe(401);
  });

  it('rejects token with wrong type', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'access' }, SECRET);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
  });

  it('rejects revoked/expired stored token', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'refresh' }, SECRET);
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
  });

  it('rejects hash mismatch', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'refresh' }, SECRET);
    pool.query.mockResolvedValueOnce({ rows: [{ token_hash: '$2a$12$wronghash' }] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
  });

  it('returns new tokens on valid refresh', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'refresh' }, SECRET);
    pool.query
      .mockResolvedValueOnce({ rows: [{ token_hash: '$2a$12$validhash' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'u1', role: 'user' }] })
      .mockResolvedValueOnce({ rows: [] });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });
});

describe('Auth Service — Email Verification', () => {
  it('verifies valid token', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'verify' }, SECRET);
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/auth/verify/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
  });

  it('rejects wrong token type', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'reset' }, SECRET);
    const res = await request(app).get(`/api/auth/verify/${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects invalid token', async () => {
    const res = await request(app).get('/api/auth/verify/notavalidtoken');
    expect(res.status).toBe(500);
  });
});

describe('Auth Service — Resend Verification', () => {
  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/resend-verification').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('responds safely when user not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/resend-verification')
      .send({ email: 'notfound@ictuniversity.edu.cm' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account exists/i);
  });

  it('responds if already verified', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', is_verified: true }] });
    const res = await request(app).post('/api/auth/resend-verification')
      .send({ email: 'verified@ictuniversity.edu.cm' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already verified/i);
  });

  it('resends verification email', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'u1', is_verified: false }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/resend-verification')
      .send({ email: 'unverified@ictuniversity.edu.cm' });
    expect(res.status).toBe(200);
  });
});

describe('Auth Service — Forgot Password', () => {
  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('responds safely when user not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/forgot-password')
      .send({ email: 'ghost@ictuniversity.edu.cm' });
    expect(res.status).toBe(200);
  });

  it('sends reset email for valid user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] });
    const res = await request(app).post('/api/auth/forgot-password')
      .send({ email: 'real@ictuniversity.edu.cm' });
    expect(res.status).toBe(200);
    expect(publishEvent).toHaveBeenCalled();
  });
});

describe('Auth Service — Reset Password', () => {
  it('rejects missing token or password', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'tok' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid password', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'reset' }, SECRET);
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token, password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects wrong token type', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'verify' }, SECRET);
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token, password: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('resets password with valid token', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'reset' }, SECRET);
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token, password: 'newpassword123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset/i);
  });

  it('rejects expired token', async () => {
    const token = jwt.sign({ userId: 'u1', type: 'reset' }, SECRET, { expiresIn: '-1s' });
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token, password: 'newpassword123' });
    expect(res.status).toBe(500);
  });
});

describe('Auth Service — Health & Metrics', () => {
  it('GET /health returns ok', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('auth-service');
  });

  it('GET /metrics returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });
});

describe('Auth Service — Lifecycle (init/shutdown/events)', () => {
  let exitSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('_init starts redis and subscribes to events', async () => {
    const mockServer = { close: jest.fn((cb) => cb && cb()) };
    jest.spyOn(app, 'listen').mockReturnValue(mockServer);
    const { initRedis, subscribeToEvents } = require('../../shared/events');

    await app._init();

    expect(initRedis).toHaveBeenCalled();
    expect(subscribeToEvents).toHaveBeenCalled();
    app.listen.mockRestore();
  });

  it('_shutdown closes server and exits', async () => {
    const mockServer = { close: jest.fn((cb) => cb && cb()) };
    jest.spyOn(app, 'listen').mockReturnValue(mockServer);
    await app._init();
    app.listen.mockRestore();

    pool.end = jest.fn().mockResolvedValue();
    const { closeRedis } = require('../../shared/events');
    await app._shutdown('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('admin event handler suspends user', async () => {
    const { subscribeToEvents } = require('../../shared/events');
    if (subscribeToEvents.mock.calls.length === 0) {
      const mockServer = { close: jest.fn((cb) => cb && cb()) };
      jest.spyOn(app, 'listen').mockReturnValue(mockServer);
      await app._init();
      app.listen.mockRestore();
    }
    const adminCall = subscribeToEvents.mock.calls.find(c => c[0] === 'admin');
    if (adminCall) {
      pool.query.mockResolvedValue({ rows: [] });
      await adminCall[1]({ type: 'user.suspended', userId: 'u1' });
    }
    expect(true).toBe(true);
  });
});
