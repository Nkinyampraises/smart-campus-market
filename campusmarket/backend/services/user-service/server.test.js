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
const userId = '11111111-1111-1111-1111-111111111111';
const listingId = '22222222-2222-2222-2222-222222222222';

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
        rows: [{ id: userId, role: 'user', is_suspended: false }],
      });
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: userId, email: 'test@ictuniversity.edu.cm',
          first_name: 'John', last_name: 'Doe', campus_zone: 'Main',
          is_verified: true, avatar_url: null, created_at: new Date().toISOString(),
        }],
      });
      pool.query.mockResolvedValueOnce({ rows: [{ cnt: 5 }] });
      pool.query.mockResolvedValueOnce({ rows: [{ cnt: 3 }] });
      pool.query.mockResolvedValueOnce({ rows: [{ cnt: 2 }] });

      const token = require('jsonwebtoken').sign({ userId, role: 'user' }, 'test_secret');
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
        rows: [{ id: userId, role: 'user', is_suspended: false }],
      });
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: listingId, title: 'Book', price_fcfa: 5000, category: 'Textbooks', campus_zone: 'Main', images: [] },
        ],
      });

      const token = require('jsonwebtoken').sign({ userId, role: 'user' }, 'test_secret');
      const res = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });
});
