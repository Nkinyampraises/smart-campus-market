const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock shared modules before requiring server
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  Histogram: jest.fn().mockImplementation(() => ({ observe: jest.fn(), startTimer: jest.fn(() => jest.fn()) })),
  Counter: jest.fn().mockImplementation(() => ({ inc: jest.fn() })),
  Gauge: jest.fn().mockImplementation(() => ({ set: jest.fn(), inc: jest.fn(), dec: jest.fn() })),
  Registry: jest.fn().mockImplementation(() => ({ contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') })),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue(''), registerMetric: jest.fn() },
}));
jest.mock('../../shared/metrics', () => ({ metricsMiddleware: (req, res, next) => next() }));
jest.mock('../../shared/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../shared/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(),
  publishEvent: jest.fn().mockResolvedValue(),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: { AUTH: 'auth', NOTIFICATION: 'notification' },
  EVENT_TYPES: { USER_REGISTERED: 'user.registered' },
}));

const pool = require('../../shared/db');
const { publishEvent } = require('../../shared/events');

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  const server = require('./server');
  app = server.app || server;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Auth Service', () => {
  describe('POST /api/auth/register', () => {
    it('should reject invalid email domain', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@gmail.com', password: 'pass1234', first_name: 'John', last_name: 'Doe', campus_zone: 'Main' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ictuniversity\.edu\.cm/);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@ictuniversity.edu.cm', password: '123', first_name: 'John', last_name: 'Doe', campus_zone: 'Main' });
      expect(res.status).toBe(400);
    });

    it('should register a valid user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // no existing user
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'test@ictuniversity.edu.cm' }] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@ictuniversity.edu.cm', password: 'securePass123', first_name: 'John', last_name: 'Doe', campus_zone: 'Main' });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/registered/i);
      expect(publishEvent).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@ictuniversity.edu.cm', password: 'securePass123', first_name: 'John', last_name: 'Doe', campus_zone: 'Main' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid credentials', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@ictuniversity.edu.cm', password: 'wrongpass' });

      expect(res.status).toBe(401);
    });

    it('should reject suspended users', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'u1',
          email: 'test@ictuniversity.edu.cm',
          password_hash: '$2a$10$abcdefghijklmnopqrstuuxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          is_suspended: true,
          suspended_reason: 'Fraud',
        }],
      });

      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@ictuniversity.edu.cm', password: 'correct' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /health', () => {
    it('should return ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
