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
          { id: 'l1', title: 'Book', price_fcfa: 5000, category: 'Textbooks', condition: 'Good', campus_zone: 'Main', status: 'active', seller_id: 'u2', created_at: new Date().toISOString() },
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
          id: 'l1', title: 'Book', price_fcfa: 5000, category: 'Textbooks',
          condition: 'Good', campus_zone: 'Main', status: 'active',
          seller_id: 'u2', created_at: new Date().toISOString(),
          seller_first: 'Jane', seller_last: 'Doe',
        }],
      });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/listings/l1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('l1');
    });

    it('should return 404 for missing listing', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/listings/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/listings', () => {
    it('should create a listing', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'l1', title: 'New Book', price_fcfa: 10000, category: 'Textbooks',
          condition: 'New', campus_zone: 'Main', status: 'active', seller_id: 'u1',
          created_at: new Date().toISOString(),
        }],
      });

      const token = require('jsonwebtoken').sign({ userId: 'u1', role: 'user' }, 'test_secret');
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Book', description: 'Desc', price_fcfa: 10000, category: 'Textbooks', condition: 'New', campus_zone: 'Main' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('l1');
    });
  });
});
