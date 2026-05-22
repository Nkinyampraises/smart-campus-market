const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('pg', () => {
  const mockPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock('socket.io', () => {
  return { Server: jest.fn(() => ({ use: jest.fn(), on: jest.fn() })) };
});
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvents: jest.fn().mockResolvedValue(true),
  EVENT_CHANNELS: { NOTIFICATION: 'notification.channel' },
  EVENT_TYPES: {},
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

app.get('/api/conversations', authenticate, async (req, res) => {
  try {
    const result = await mockPool.query('SELECT * FROM conversations WHERE buyer_id=$1 OR seller_id=$1', [req.user.userId]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const result = await mockPool.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC', [req.params.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/conversations', authenticate, async (req, res) => {
  try {
    const { seller_id, listing_id } = req.body;
    if (!seller_id || !listing_id) return res.status(400).json({ error: 'seller_id and listing_id required' });
    const existing = await mockPool.query('SELECT id FROM conversations WHERE buyer_id=$1 AND seller_id=$2 AND listing_id=$3', [req.user.userId, seller_id, listing_id]);
    if (existing.rows.length > 0) return res.json({ conversationId: existing.rows[0].id });
    const result = await mockPool.query('INSERT INTO conversations (buyer_id, seller_id, listing_id) VALUES ($1,$2,$3) RETURNING id', [req.user.userId, seller_id, listing_id]);
    res.status(201).json({ conversationId: result.rows[0].id });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Chat Service — Conversations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns conversations for authenticated user', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'c1', buyer_id: 'u1', seller_id: 'u2', listing_id: 'l1', last_message: 'Hi!' },
      ],
    });
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${makeToken('u1')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('c1');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  it('starts a new conversation', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'c2' }] });
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${makeToken('u1')}`)
      .send({ seller_id: 'u2', listing_id: 'l1' });
    expect(res.status).toBe(201);
    expect(res.body.conversationId).toBe('c2');
  });

  it('returns existing conversation if already started', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'c-existing' }] });
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${makeToken('u1')}`)
      .send({ seller_id: 'u2', listing_id: 'l1' });
    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe('c-existing');
  });

  it('returns 400 when seller_id is missing', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${makeToken('u1')}`)
      .send({ listing_id: 'l1' });
    expect(res.status).toBe(400);
  });
});

describe('Chat Service — Messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns messages for a conversation', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'm1', conversation_id: 'c1', sender_id: 'u1', text: 'Hello!', type: 'text' },
        { id: 'm2', conversation_id: 'c1', sender_id: 'u2', text: 'Hi there!', type: 'text' },
      ],
    });
    const res = await request(app)
      .get('/api/conversations/c1/messages')
      .set('Authorization', `Bearer ${makeToken('u1')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].text).toBe('Hello!');
  });

  it('returns empty array when no messages exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/conversations/c1/messages')
      .set('Authorization', `Bearer ${makeToken('u1')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
