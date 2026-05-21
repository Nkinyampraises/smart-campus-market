const logger = require('./logger');

const SENSITIVE_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/reset-password',
  '/api/auth/forgot-password',
  '/api/admin/users',
  '/api/admin/reports',
  '/api/admin/fraud-flags',
];

function auditMiddleware(req, res, next) {
  const isSensitive = SENSITIVE_PATHS.some((p) => req.path.startsWith(p));
  if (!isSensitive) return next();

  const audit = {
    action: req.path,
    method: req.method,
    userId: req.user?.userId || null,
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id,
    userAgent: req.headers['user-agent'],
  };

  res.on('finish', () => {
    audit.status = res.statusCode;
    if (res.statusCode >= 400) {
      logger.warn('Sensitive operation', audit);
    } else {
      logger.info('Sensitive operation', audit);
    }
  });

  next();
}

module.exports = { auditMiddleware };
