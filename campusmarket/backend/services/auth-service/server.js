require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { collectDefaultMetrics, register } = require('prom-client');
const { OAuth2Client } = require('google-auth-library');

const pool = require('../../shared/db');
const { validateEmail, validatePassword, sanitizeString } = require('../../shared/validate');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 12;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
let server;

collectDefaultMetrics();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, campus_zone } = req.body;

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new AppError(emailCheck.error, 400);

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) throw new AppError(pwCheck.error, 400);

  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [emailCheck.value]);
  if (existing.rows.length > 0) throw new AppError('User already exists', 409);

  const passwordHash = await bcrypt.hash(pwCheck.value, SALT_ROUNDS);

  const result = await pool.query(
    'INSERT INTO users (email, password_hash, first_name, last_name, campus_zone, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id',
    [emailCheck.value, passwordHash, sanitizeString(first_name, 100), sanitizeString(last_name, 100), sanitizeString(campus_zone, 100)]
  );

  const userId = result.rows[0].id;
  const verificationToken = jwt.sign({ userId, type: 'verify' }, JWT_SECRET, { expiresIn: '24h' });
  await pool.query('UPDATE users SET verification_token=$1 WHERE id=$2', [verificationToken, userId]);

  await publishEvent(EVENT_CHANNELS.USER, {
    type: EVENT_TYPES.USER_REGISTERED,
    userId, email: emailCheck.value,
    first_name: sanitizeString(first_name, 100), last_name: sanitizeString(last_name, 100), campus_zone: sanitizeString(campus_zone, 100),
    timestamp: new Date().toISOString()
  });

  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: EVENT_TYPES.WELCOME_EMAIL,
    userId, email: emailCheck.value,
    payload: { verificationToken }
  });

  logger.info('User registered', { userId, email: emailCheck.value });
  res.status(201).json({ message: 'Account created! Check your email to verify your account.', userId });
}));

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new AppError(emailCheck.error, 400);

  const result = await pool.query(
    'SELECT id, password_hash, is_verified, is_suspended, suspended_reason, role FROM users WHERE email=$1',
    [emailCheck.value]
  );
  if (result.rows.length === 0) throw new AppError('Invalid credentials', 401);

  const user = result.rows[0];
  const validPw = await bcrypt.compare(password, user.password_hash);
  if (!validPw) throw new AppError('Invalid credentials', 401);

  if (!user.is_verified) throw new AppError('Please verify your email first', 403);
  if (user.is_suspended) throw new AppError(`Account suspended: ${user.suspended_reason || 'No reason given'}`, 403);

  const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

  const refreshHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + INTERVAL \'7 days\')',
    [user.id, refreshHash]
  );

  await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

  logger.info('User logged in', { userId: user.id });
  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
}));

// POST /api/auth/logout
app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.json({ message: 'Logged out' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [decoded.userId]);
  } catch {}

  res.json({ message: 'Logged out successfully' });
}));

// POST /api/auth/google — Google OAuth sign-in / sign-up
app.post('/api/auth/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) throw new AppError('Google credential required', 400);

  // Verify ID token via Google tokeninfo API (no local cert download needed)
  const tokenInfoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
  );
  if (!tokenInfoRes.ok) throw new AppError('Invalid Google token', 401);
  const payload = await tokenInfoRes.json();
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new AppError('Token audience mismatch', 401);

  const { email, given_name, family_name, picture } = payload;

  if (!email) throw new AppError('No email in Google account', 400);

  // Find existing user or create new one
  let result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);

  if (result.rows.length === 0) {
    // New user — create auto-verified (Google already verified their email)
    result = await pool.query(
      'INSERT INTO users (email, first_name, last_name, avatar_url, is_verified, created_at) VALUES ($1,$2,$3,$4,TRUE,NOW()) RETURNING *',
      [email, given_name || '', family_name || '', picture || null]
    );
    logger.info('New user via Google OAuth', { email });
  }

  const user = result.rows[0];
  if (user.is_suspended) throw new AppError(`Account suspended: ${user.suspended_reason || 'Violation'}`, 403);

  // Issue JWT same as regular login
  const accessToken = jwt.sign({ userId: user.id, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '24h' });

  logger.info('Google OAuth login', { userId: user.id, email });
  res.json({
    accessToken,
    user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
  });
}));

// POST /api/auth/refresh
app.post('/api/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') throw new Error();
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await pool.query(
    'SELECT token_hash FROM refresh_tokens WHERE user_id=$1 AND expires_at > NOW()',
    [decoded.userId]
  );
  if (!stored.rows.length) throw new AppError('Refresh token revoked or expired', 401);

  const valid = await bcrypt.compare(refreshToken, stored.rows[0].token_hash);
  if (!valid) throw new AppError('Invalid refresh token', 401);

  await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [decoded.userId]);

  const user = await pool.query('SELECT id, role FROM users WHERE id=$1', [decoded.userId]);
  if (!user.rows.length) throw new AppError('User not found', 404);

  const newAccess = jwt.sign({ userId: user.rows[0].id, role: user.rows[0].role }, JWT_SECRET, { expiresIn: '24h' });
  const newRefresh = jwt.sign({ userId: user.rows[0].id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
  const newHash = await bcrypt.hash(newRefresh, SALT_ROUNDS);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW() + INTERVAL \'7 days\')',
    [user.rows[0].id, newHash]
  );

  res.json({ accessToken: newAccess, refreshToken: newRefresh });
}));

// GET /api/auth/verify/:token
app.get('/api/auth/verify/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== 'verify') throw new AppError('Invalid token type', 400);

  await pool.query('UPDATE users SET is_verified=true, verification_token=NULL WHERE id=$1', [decoded.userId]);

  await publishEvent(EVENT_CHANNELS.USER, {
    type: EVENT_TYPES.USER_VERIFIED,
    userId: decoded.userId,
    timestamp: new Date().toISOString()
  });

  logger.info('Email verified', { userId: decoded.userId });
  res.json({ message: 'Email verified successfully' });
}));

// POST /api/auth/resend-verification
app.post('/api/auth/resend-verification', authLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new AppError(emailCheck.error, 400);

  const user = await pool.query('SELECT id, is_verified FROM users WHERE email=$1', [emailCheck.value]);
  if (!user.rows.length) return res.json({ message: 'If an account exists, a verification email has been sent' });
  if (user.rows[0].is_verified) return res.json({ message: 'Email already verified' });

  const verificationToken = jwt.sign({ userId: user.rows[0].id, type: 'verify' }, JWT_SECRET, { expiresIn: '24h' });
  await pool.query('UPDATE users SET verification_token=$1 WHERE id=$2', [verificationToken, user.rows[0].id]);

  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: EVENT_TYPES.WELCOME_EMAIL,
    userId: user.rows[0].id,
    email: emailCheck.value,
    payload: { verificationToken }
  });

  logger.info('Verification email resent', { userId: user.rows[0].id });
  res.json({ message: 'If an account exists, a verification email has been sent' });
}));

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', authLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new AppError(emailCheck.error, 400);

  const user = await pool.query('SELECT id FROM users WHERE email=$1', [emailCheck.value]);
  if (!user.rows.length) return res.json({ message: 'If an account exists, a reset email has been sent' });

  const resetToken = jwt.sign({ userId: user.rows[0].id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });

  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: 'password_reset',
    userId: user.rows[0].id,
    email: emailCheck.value,
    payload: { resetToken }
  });

  res.json({ message: 'If an account exists, a reset email has been sent' });
}));

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', authLimiter, asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new AppError('Token and password required', 400);

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) throw new AppError(pwCheck.error, 400);

  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== 'reset') throw new AppError('Invalid token', 400);

  const passwordHash = await bcrypt.hash(pwCheck.value, SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, decoded.userId]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [decoded.userId]);

  logger.info('Password reset', { userId: decoded.userId });
  res.json({ message: 'Password reset successfully' });
}));

// GET /health
app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
}));

// GET /metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((err, req, res, _next) => {
  logger.error(err.message || 'Unhandled error', { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.ADMIN, (event) => {
    if (event.type === 'user.suspended') {
      logger.info(`User ${event.userId} suspended by admin`);
      pool.query('DELETE FROM refresh_tokens WHERE user_id=$1', [event.userId]).catch(() => {});
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    server = app.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize auth service', { error: error.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'auth-service' });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeRedis();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

init();
