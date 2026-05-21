const logger = require('./logger');

function errorHandler(err, req, res, _next) {
  logger.error('Request error', { path: req.path, method: req.method, error: err.message, status: err.status });
  const status = err.status || 500;
  const message = status >= 500 ? 'Internal server error' : (err.message || 'Something went wrong');
  res.status(status).json({ error: message });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

module.exports = { errorHandler, asyncHandler, AppError };
