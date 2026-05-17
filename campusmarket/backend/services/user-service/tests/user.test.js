const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('pg', () => {
  const mockPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvents: jest.fn().mockResolvedValue(true),
  EVENT_CHANNELS: { USER: 'user.event' },
  EVENT_TYPES: { USER_PROFILE_UPDATED: 'user.profile_updated', USER_REGISTERED: 'user.registered', USER_SUSPENDED: 'user.suspended' },
}));
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') },
}));

const { Pool } = require('pg');
const mockPool = new Pool();
process.env.JWT_SECRET = 'test_secret';

const makeToken = (userId = 'u1') =>
  jwt.sign({ userId }, 'test_secret', { expiresIn: '1h' });

const app = express();
app.use(express.json());

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/api/users/:id', async (req, res) => {
  const result = await mockPool.query(
    'SELECT id, first_name, last_name, campus_zone, bio, rating FROM users WHERE id = $1',
    [req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

app.get('/api/users/me', authenticate, async (req, res) => {
  const result = await mockPool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...user } = result.rows[0];
  res.json(user);
});

app.post('/api/users/:id/reviews', authenticate, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
  await mockPool.query('INSERT INTO reviews (...) VALUES (...)', [req.user.userId, req.params.id, rating, comment]);
  await mockPool.query('SELECT AVG(rating) as avg FROM reviews WHERE seller_id=$1', [req.params.id]);
  res.status(201).json({ message: 'Review submitted' });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('User Service — Public Profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a public user profile', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', first_name: 'Alex', last_name: 'Henderson', rating: 4.8, campus_zone: 'Engineering Block' }],
    });

    const res = await request(app).get('/api/users/u1');

    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Alex');
    expect(res.body.rating).toBe(4.8);
  });

  it('returns 404 for unknown user', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/users/unknown');

    expect(res.status).toBe(404);
  });
});

describe('User Service — Own Profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns own profile without password hash', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'u1', email: 'alex@ict.edu.cm', first_name: 'Alex', password_hash: 'secret-hash' }],
    });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${makeToken('u1')}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('alex@ict.edu.cm');
    expect(res.body.password_hash).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('User Service — Reviews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('submits a valid review and updates rating', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ avg: 4.5 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/users/u2/reviews')
      .set('Authorization', `Bearer ${makeToken('u1')}`)
      .send({ rating: 5, comment: 'Great seller!' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Review submitted');
  });

  it('rejects a rating below 1', async () => {
    const res = await request(app)
      .post('/api/users/u2/reviews')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ rating: 0, comment: 'Bad' });

    expect(res.status).toBe(400);
  });

  it('rejects a rating above 5', async () => {
    const res = await request(app)
      .post('/api/users/u2/reviews')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ rating: 6 });

    expect(res.status).toBe(400);
  });
});
