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
jest.mock('../../shared/metrics', () => ({
  metricsMiddleware: (req, res, next) => next(),
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

describe('Listing Service', () => {
  describe('GET /api/listings', () => {
    it('should return active listings', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: listingId, title: 'Book', price_fcfa: 5000, category: 'Textbooks', condition: 'Good', campus_zone: 'Main', status: 'active', seller_id: userId, created_at: new Date().toISOString() },
        ],
      });

      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Book');
    });
  });

  describe('GET /api/listings/:id', () => {
    it('should return a single listing', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: listingId, title: 'Book', price_fcfa: 5000, category: 'Textbooks',
          condition: 'Good', campus_zone: 'Main', status: 'active',
          seller_id: userId, created_at: new Date().toISOString(),
          seller_first: 'Jane', seller_last: 'Doe',
        }],
      });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get(`/api/listings/${listingId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(listingId);
    });

    it('should return 404 for missing listing', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get(`/api/listings/${listingId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/listings', () => {
    it('should create a listing', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: userId, role: 'user', is_suspended: false }],
      });
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: listingId, title: 'New Book', price_fcfa: 10000, category: 'Textbooks',
          condition: 'New', campus_zone: 'Main', status: 'active', seller_id: userId,
          created_at: new Date().toISOString(),
        }],
      });

      const token = require('jsonwebtoken').sign({ userId, role: 'user' }, 'test_secret');
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Book', description: 'Desc', price_fcfa: 10000, category: 'Textbooks', condition: 'New', campus_zone: 'Main' });

      expect(res.status).toBe(201);
      expect(res.body.listingId).toBe(listingId);
    });
  });
});
