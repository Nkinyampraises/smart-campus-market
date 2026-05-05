require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { collectDefaultMetrics, register } = require('prom-client');

// Import shared event system
const { initRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
});

// Prometheus metrics
collectDefaultMetrics();

// Routes
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id',
      [email, passwordHash]
    );

    const userId = result.rows[0].id;

    // Generate verification token
    const verificationToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Update user with verification token
    await pool.query('UPDATE users SET verification_token = $1 WHERE id = $2', [verificationToken, userId]);

    // Publish event for user registration (event-driven architecture)
    await publishEvent(EVENT_CHANNELS.USER, {
      type: EVENT_TYPES.USER_REGISTERED,
      userId,
      email,
      timestamp: new Date().toISOString()
    });

    // Publish welcome email event
    await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
      type: EVENT_TYPES.WELCOME_EMAIL,
      userId,
      email,
      payload: { verificationToken }
    });

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.',
      userId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query('SELECT id, password_hash, is_verified FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if verified
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshTokenHash]
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Update user as verified
    await pool.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1', [userId]);

    // Publish verification event
    await publishEvent(EVENT_CHANNELS.USER, {
      type: EVENT_TYPES.USER_VERIFIED,
      userId,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(400).json({ error: 'Invalid or expired verification token' });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Event handlers (subscribing to events from other services)
async function setupEventHandlers() {
  // Example: Listen for admin suspension events
  await subscribeToEvents(EVENT_CHANNELS.ADMIN, (event) => {
    if (event.type === 'user.suspended') {
      console.log(`User ${event.userId} suspended by admin`);
      // Handle suspension logic (invalidate tokens, etc.)
    }
  });
}

// Initialize service
async function init() {
  try {
    // Initialize Redis for event-driven architecture
    await initRedis();

    // Setup event handlers
    await setupEventHandlers();

    // Start server
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
      console.log('Event-driven architecture initialized');
    });

  } catch (error) {
    console.error('Failed to initialize auth service:', error);
    process.exit(1);
  }
}

init();