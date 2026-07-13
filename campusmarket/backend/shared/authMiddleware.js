const jwt = require('jsonwebtoken');
const pool = require('./db');

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await pool.query(
      'SELECT id, role, is_suspended, suspended_reason FROM users WHERE id=$1',
      [decoded.userId]
    );
    if (!userResult.rows.length) return res.status(401).json({ error: 'User not found' });
    const user = userResult.rows[0];
    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended', reason: user.suspended_reason });
    }
    req.user = { userId: user.id, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
