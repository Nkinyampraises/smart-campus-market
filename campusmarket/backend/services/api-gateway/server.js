require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { collectDefaultMetrics, register } = require('prom-client');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173', 'ws:', 'wss:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Request ID + audit logging
app.use((req, res, next) => {
  req.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.setHeader('X-Request-Id', req.id);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.userId || null,
    };
    if (res.statusCode >= 500) logger.error('HTTP request failed', meta);
    else if (res.statusCode >= 400) logger.warn('HTTP request warning', meta);
    else logger.info('HTTP request', meta);
  });
  next();
});

// NOTE: Do NOT parse body here — proxy must forward raw body to downstream services
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-User-Id'],
}));
app.use(metricsMiddleware);
collectDefaultMetrics();

// Global rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

// Per-route stricter rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth attempts, please try again later' } });
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const adminLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });

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
  if (req.user?.userId) {
    req.headers['x-user-id'] = req.user.userId;
  }
  next();
};
app.use(attachUser);

// Helper: proxy factory — streams raw body to downstream service
const proxy = (target, opts = {}) =>
  createProxyMiddleware({
    target, changeOrigin: true,
    ws: true,
    on: {
      error: (err, _req, res) => {
        logger.error('Proxy error', { error: err.message, target });
        if (res && !res.headersSent) res.status(502).json({ error: 'Service temporarily unavailable' });
      },
    },
    ...opts,
  });

// ── Routes ──────────────────────────────────────────────────────────────────

// Auth service
app.use('/api/auth', authLimiter, proxy(SERVICES.auth));

// User service
app.use('/api/users', proxy(SERVICES.user));
app.use('/api/wishlist', proxy(SERVICES.user));

// Listing service
app.use('/api/listings', proxy(SERVICES.listing));
app.use('/api/reports', strictLimiter, proxy(SERVICES.admin)); // reports handled by admin service now

// Chat service (WebSocket enabled)
app.use('/api/conversations', proxy(SERVICES.chat));
app.use('/api/offers', proxy(SERVICES.chat));

// Admin service
app.use('/api/admin', adminLimiter, proxy(SERVICES.admin));

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

// Security.txt (RFC 9116)
app.get('/.well-known/security.txt', (_req, res) => {
  res.type('text/plain');
  res.send(`Contact: security@campustrade.cm\nPolicy: ${process.env.FRONTEND_URL || 'https://campustrade.cm'}/security-policy\nAcknowledgments: ${process.env.FRONTEND_URL || 'https://campustrade.cm'}/security-hall-of-fame\n`);
});

// Metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error('Gateway error', { error: err.message });
  if (!res.headersSent) res.status(500).json({ error: 'Internal gateway error' });
});

const server = app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Routing to services', SERVICES);
});

// Upgrade HTTP server for WebSocket proxying
server.on('upgrade', (request, socket, head) => {
  // Route WebSocket upgrades to chat service
  const chatProxy = proxy(SERVICES.chat);
  chatProxy.upgrade(request, socket, head);
});

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'api-gateway' });
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
