require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { collectDefaultMetrics, register } = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('combined'));
collectDefaultMetrics();

// Global rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Service URLs (from env or defaults)
const SERVICES = {
  auth:         process.env.AUTH_SERVICE_URL         || 'http://localhost:3001',
  user:         process.env.USER_SERVICE_URL         || 'http://localhost:3002',
  listing:      process.env.LISTING_SERVICE_URL      || 'http://localhost:3003',
  chat:         process.env.CHAT_SERVICE_URL         || 'http://localhost:3004',
  admin:        process.env.ADMIN_SERVICE_URL        || 'http://localhost:3005',
  ai:           process.env.AI_SERVICE_URL           || 'http://localhost:3006',
  search:       process.env.SEARCH_SERVICE_URL       || 'http://localhost:3007',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
};

// JWT auth middleware (does NOT block — just attaches user if token present)
const attachUser = (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
};
app.use(attachUser);

// Helper: proxy factory
const proxy = (target, pathRewrite) =>
  createProxyMiddleware({ target, changeOrigin: true, pathRewrite });

// ── Routes ──────────────────────────────────────────────────────────────────

// Auth service
app.use('/api/auth', authLimiter, proxy(SERVICES.auth));

// User service
app.use('/api/users', proxy(SERVICES.user));

// Listing service
app.use('/api/listings', proxy(SERVICES.listing));
app.use('/api/reports',  proxy(SERVICES.listing));

// Chat service
app.use('/api/conversations', proxy(SERVICES.chat));

// Admin service
app.use('/api/admin', proxy(SERVICES.admin));

// AI service
app.use('/api/ai', proxy(SERVICES.ai));

// Search service
app.use('/api/search', proxy(SERVICES.search));

// Notification service
app.use('/api/notifications', proxy(SERVICES.notification));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', services: Object.keys(SERVICES), timestamp: new Date().toISOString() });
});

// Metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Routing to services:', SERVICES);
});
