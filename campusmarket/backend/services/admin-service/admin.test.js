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
  EVENT_CHANNELS: { ADMIN: 'admin.event', AUDIT: 'audit.channel' },
  EVENT_TYPES: { USER_SUSPENDED: 'user.suspended' },
}));
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') },
}));

const { Pool } = require('pg');
const { publishEvent } = require('../../shared/events');
const mockPool = new Pool();
process.env.JWT_SECRET = 'test_secret';

const makeAdminToken = () => jwt.sign({ userId: 'admin1', role: 'admin' }, 'test_secret', { expiresIn: '1h' });
const makeUserToken  = () => jwt.sign({ userId: 'user1',  role: 'user'  }, 'test_secret', { expiresIn: '1h' });

const app = express();
app.use(express.json());

const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  const [users, listings, reports, fraud] = await Promise.all([
    mockPool.query('SELECT COUNT(*) FROM users'),
    mockPool.query("SELECT COUNT(*) FROM listings WHERE status='active'"),
    mockPool.query("SELECT COUNT(*) FROM reports WHERE status='pending'"),
    mockPool.query('SELECT COUNT(*) FROM fraud_flags WHERE resolved=false'),
  ]);
  res.json({
    totalUsers:      parseInt(users.rows[0].count),
    activeListings:  parseInt(listings.rows[0].count),
    pendingReports:  parseInt(reports.rows[0].count),
    fraudFlags:      parseInt(fraud.rows[0].count),
  });
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const result = await mockPool.query('SELECT id, email, first_name, last_name, role, is_suspended FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/users/:id/suspend', authenticateAdmin, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Reason required' });
  await mockPool.query('UPDATE users SET is_suspended=true WHERE id=$1', [req.params.id]);
  await publishEvent('admin.event', { type: 'user.suspended', userId: req.params.id, reason });
  res.json({ message: 'User suspended' });
});

app.post('/api/admin/users/:id/unsuspend', authenticateAdmin, async (req, res) => {
  await mockPool.query('UPDATE users SET is_suspended=false WHERE id=$1', [req.params.id]);
  res.json({ message: 'User unsuspended' });
});

app.get('/api/admin/reports', authenticateAdmin, async (req, res) => {
  const result = await mockPool.query("SELECT * FROM reports WHERE status='pending' ORDER BY created_at DESC");
  res.json(result.rows);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Service — Stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns dashboard stats for admin', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '12' }] })
      .mockResolvedValueOnce({ rows: [{ count: '5'  }] })
      .mockResolvedValueOnce({ rows: [{ count: '2'  }] })
      .mockResolvedValueOnce({ rows: [{ count: '1'  }] });

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(12);
    expect(res.body.activeListings).toBe(5);
    expect(res.body.pendingReports).toBe(2);
    expect(res.body.fraudFlags).toBe(1);
  });

  it('returns 403 for non-admin users', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${makeUserToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('Admin Service — User Management', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists all users', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'u1', email: 'alice@test.com', first_name: 'Alice', role: 'user', is_suspended: false },
        { id: 'u2', email: 'bob@test.com',   first_name: 'Bob',   role: 'user', is_suspended: true  },
      ],
    });
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1].is_suspended).toBe(true);
  });

  it('suspends a user with reason', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/admin/users/u1/suspend')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ reason: 'Spam behaviour' });

    expect(res.status).toBe(200);
    expect(publishEvent).toHaveBeenCalledWith('admin.event', expect.objectContaining({ type: 'user.suspended', userId: 'u1' }));
  });

  it('returns 400 when suspend reason is missing', async () => {
    const res = await request(app)
      .post('/api/admin/users/u1/suspend')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('unsuspends a user', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/admin/users/u1/unsuspend')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User unsuspended');
  });
});

describe('Admin Service — Reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns pending reports', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'r1', listing_id: 'l1', reason: 'Suspected Fraud', severity: 'high', status: 'pending' },
        { id: 'r2', listing_id: 'l2', reason: 'Wrong Item',      severity: 'low',  status: 'pending' },
      ],
    });

    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].severity).toBe('high');
  });

  it('returns empty array when no pending reports', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
