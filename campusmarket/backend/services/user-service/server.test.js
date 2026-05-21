const request = require('supertest');

jest.mock('../../shared/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../shared/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(),
  publishEvent: jest.fn().mockResolvedValue(),
  subscribeToEvents: jest.fn().mockResolvedValue(),
  EVENT_CHANNELS: {},
  EVENT_TYPES: {},
}));

const pool = require('../../shared/db');
let app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret';
  const server = require('./server');
  app = server.app || server;
});

afterEach(() => jest.clearAllMocks());

describe('User Service', () => {
  describe('GET /api/users/me', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should return user profile', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'u1', email: 'test@ictuniversity.edu.cm',
          first_name: 'John', last_name: 'Doe', campus_zone: 'Main',
          is_verified: true, avatar_url: null, created_at: new Date().toISOString(),
        }],
      });
      pool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ avg: '4.5' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const token = require('jsonwebtoken').sign({ userId: 'u1', role: 'user' }, 'test_secret');
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@ictuniversity.edu.cm');
    });
  });

  describe('GET /api/wishlist', () => {
    it('should return wishlist items', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 'l1', title: 'Book', price_fcfa: 5000, category: 'Textbooks', campus_zone: 'Main', images: [] },
        ],
      });

      const token = require('jsonwebtoken').sign({ userId: 'u1', role: 'user' }, 'test_secret');
      const res = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });
});
