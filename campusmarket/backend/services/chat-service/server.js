require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { createCorsOptions } = require('../../shared/corsOptions');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { authenticate } = require('../../shared/authMiddleware');
const { sanitizeString, validateUUID } = require('../../shared/validate');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, getRedisClient, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3004;

let redis;
let io;

collectDefaultMetrics();
app.use(helmet());
app.use(cors(createCorsOptions()));
app.use(express.json());
app.use(metricsMiddleware);

// GET /api/conversations — enriched with partner info
app.get('/api/conversations', authenticate, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT c.*,
      (SELECT text FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*)::int FROM messages WHERE conversation_id=c.id AND is_read=false AND sender_id<>$1) as unread_count,
      CASE WHEN c.buyer_id=$1 THEN c.seller_id ELSE c.buyer_id END as partner_id,
      u.first_name as partner_first, u.last_name as partner_last, u.avatar_url as partner_avatar, u.email as partner_email
     FROM conversations c
     LEFT JOIN users u ON u.id = CASE WHEN c.buyer_id=$1 THEN c.seller_id ELSE c.buyer_id END
     WHERE c.buyer_id=$1 OR c.seller_id=$1
     ORDER BY last_message_at DESC NULLS LAST`,
    [req.user.userId]
  );
  res.json(result.rows);
}));

// GET /api/conversations/:id/messages
app.get('/api/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const convId = req.params.id;
  const conv = await pool.query(
    'SELECT buyer_id, seller_id FROM conversations WHERE id=$1', [convId]
  );
  if (!conv.rows.length) throw new AppError('Conversation not found', 404);
  const { buyer_id, seller_id } = conv.rows[0];
  if (buyer_id !== req.user.userId && seller_id !== req.user.userId) throw new AppError('Forbidden', 403);

  const result = await pool.query(
    `SELECT m.*, u.first_name as sender_first, u.last_name as sender_last
     FROM messages m JOIN users u ON m.sender_id=u.id
     WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`, [convId]
  );
  res.json(result.rows);
}));

// POST /api/conversations/:id/messages — send a message
app.post('/api/conversations/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const convId = req.params.id;
  const { text, type = 'text', offer_amount } = req.body;
  if (!text) throw new AppError('Message text required', 400);

  const conv = await pool.query('SELECT buyer_id, seller_id FROM conversations WHERE id=$1', [convId]);
  if (!conv.rows.length) throw new AppError('Conversation not found', 404);
  const { buyer_id, seller_id } = conv.rows[0];
  if (buyer_id !== req.user.userId && seller_id !== req.user.userId) throw new AppError('Forbidden', 403);

  const result = await pool.query(
    'INSERT INTO messages (conversation_id, sender_id, text, type, offer_amount, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *',
    [convId, req.user.userId, text, type, offer_amount || null]
  );

  // Notify the other party
  const recipientId = buyer_id === req.user.userId ? seller_id : buyer_id;
  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: 'new_message',
    conversationId: convId,
    senderId: req.user.userId,
    recipientId,
    text: type === 'text' ? text.slice(0, 80) : `Sent a ${type}`,
  });

  res.status(201).json(result.rows[0]);
}));

// POST /api/conversations
app.post('/api/conversations', authenticate, asyncHandler(async (req, res) => {
  const { seller_id, listing_id } = req.body;
  if (!validateUUID(seller_id) || !validateUUID(listing_id)) throw new AppError('Invalid IDs', 400);

  const existing = await pool.query(
    'SELECT id FROM conversations WHERE buyer_id=$1 AND seller_id=$2 AND listing_id=$3',
    [req.user.userId, seller_id, listing_id]
  );
  if (existing.rows.length > 0) return res.json({ conversationId: existing.rows[0].id });

  const result = await pool.query(
    'INSERT INTO conversations (buyer_id, seller_id, listing_id, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id',
    [req.user.userId, seller_id, listing_id]
  );
  res.status(201).json({ conversationId: result.rows[0].id });
}));

// POST /api/offers — create offer and link to conversation
app.post('/api/offers', authenticate, asyncHandler(async (req, res) => {
  const { listing_id, amount, note } = req.body;
  if (!validateUUID(listing_id)) throw new AppError('Invalid listing ID', 400);

  const listing = await pool.query("SELECT seller_id, title, price_fcfa, status FROM listings WHERE id=$1", [listing_id]);
  if (!listing.rows.length) throw new AppError('Listing not found', 404);
  if (listing.rows[0].status !== 'active') throw new AppError('Listing not active', 400);
  if (listing.rows[0].seller_id === req.user.userId) throw new AppError('Cannot offer on own listing', 400);

  // Find or create conversation
  let conv = await pool.query(
    'SELECT id FROM conversations WHERE buyer_id=$1 AND seller_id=$2 AND listing_id=$3',
    [req.user.userId, listing.rows[0].seller_id, listing_id]
  );
  let convId;
  if (conv.rows.length) {
    convId = conv.rows[0].id;
  } else {
    const newConv = await pool.query(
      'INSERT INTO conversations (buyer_id, seller_id, listing_id, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id',
      [req.user.userId, listing.rows[0].seller_id, listing_id]
    );
    convId = newConv.rows[0].id;
  }

  const offerResult = await pool.query(
    'INSERT INTO offers (listing_id, buyer_id, amount, note, status, created_at) VALUES ($1,$2,$3,$4,\'pending\',NOW()) RETURNING id',
    [listing_id, req.user.userId, amount, sanitizeString(note, 500)]
  );

  const offerId = offerResult.rows[0].id;

  // Insert offer message
  await pool.query(
    'INSERT INTO messages (conversation_id, sender_id, text, type, offer_id, created_at) VALUES ($1,$2,$3,\'offer\',$4,NOW())',
    [convId, req.user.userId, `Offer: ${amount} FCFA`, offerId]
  );

  await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
    type: EVENT_TYPES.NEW_OFFER,
    offerId, listingId: listing_id,
    sellerId: listing.rows[0].seller_id,
    buyerId: req.user.userId, amount,
    listingTitle: listing.rows[0].title,
  });

  io?.to(`conv:${convId}`).emit('new_message', { conversationId: convId, text: `Offer: ${amount} FCFA`, type: 'offer', offerId, sender_id: req.user.userId });

  res.status(201).json({ message: 'Offer sent', offerId, conversationId: convId });
}));

// GET /api/offers — sent or received
app.get('/api/offers', authenticate, asyncHandler(async (req, res) => {
  const { direction } = req.query; // 'sent' or 'received'
  let query, params;
  if (direction === 'received') {
    query = `SELECT o.*, l.title as listing_title, u.first_name as buyer_first, u.last_name as buyer_last
             FROM offers o JOIN listings l ON o.listing_id=l.id JOIN users u ON o.buyer_id=u.id
             WHERE l.seller_id=$1 ORDER BY o.created_at DESC`;
    params = [req.user.userId];
  } else {
    query = `SELECT o.*, l.title as listing_title, u.first_name as seller_first, u.last_name as seller_last
             FROM offers o JOIN listings l ON o.listing_id=l.id JOIN users u ON l.seller_id=u.id
             WHERE o.buyer_id=$1 ORDER BY o.created_at DESC`;
    params = [req.user.userId];
  }
  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// PATCH /api/offers/:id — accept / decline / counter
app.patch('/api/offers/:id', authenticate, asyncHandler(async (req, res) => {
  const { action, counter_amount } = req.body;
  const offerId = req.params.id;

  const offer = await pool.query(
    `SELECT o.*, l.seller_id, l.title, l.status as listing_status
     FROM offers o JOIN listings l ON o.listing_id=l.id WHERE o.id=$1`, [offerId]
  );
  if (!offer.rows.length) throw new AppError('Offer not found', 404);
  const o = offer.rows[0];

  // Seller actions
  if (action === 'accept') {
    if (o.seller_id !== req.user.userId) throw new AppError('Forbidden', 403);
    await pool.query("UPDATE offers SET status='accepted', updated_at=NOW() WHERE id=$1", [offerId]);
    await pool.query("UPDATE listings SET status='reserved' WHERE id=$1", [o.listing_id]);

    await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
      type: EVENT_TYPES.OFFER_ACCEPTED,
      offerId, listingId: o.listing_id,
      buyerId: o.buyer_id, sellerId: o.seller_id,
      amount: o.amount,
    });
    res.json({ message: 'Offer accepted' });
  } else if (action === 'decline') {
    if (o.seller_id !== req.user.userId) throw new AppError('Forbidden', 403);
    await pool.query("UPDATE offers SET status='declined', updated_at=NOW() WHERE id=$1", [offerId]);
    res.json({ message: 'Offer declined' });
  } else if (action === 'counter') {
    if (o.seller_id !== req.user.userId) throw new AppError('Forbidden', 403);
    if (!counter_amount || counter_amount < 1) throw new AppError('Counter amount required', 400);
    await pool.query("UPDATE offers SET status='countered', counter_amount=$1, updated_at=NOW() WHERE id=$2", [counter_amount, offerId]);
    res.json({ message: 'Counter offer sent', counter_amount });
  } else if (action === 'withdraw') {
    if (o.buyer_id !== req.user.userId) throw new AppError('Forbidden', 403);
    await pool.query("UPDATE offers SET status='withdrawn', updated_at=NOW() WHERE id=$1", [offerId]);
    res.json({ message: 'Offer withdrawn' });
  } else {
    throw new AppError('Invalid action', 400);
  }
}));

// PATCH /api/conversations/:id/read — mark messages as read
app.patch('/api/conversations/:id/read', authenticate, asyncHandler(async (req, res) => {
  const convId = req.params.id;
  await pool.query(
    'UPDATE messages SET is_read=true WHERE conversation_id=$1 AND sender_id<>$2 AND is_read=false',
    [convId, req.user.userId]
  );
  io?.to(`conv:${convId}`).emit('message_read', { conversationId: convId, readerId: req.user.userId });
  res.json({ message: 'Messages marked as read' });
}));

// Socket.io — real-time messaging with Redis adapter
const _chatAllowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim());
io = new Server(server, { cors: { origin: _chatAllowedOrigins, credentials: true } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`User ${socket.user.userId} connected to chat`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on('send_message', async ({ conversationId, text, type = 'text' }) => {
    try {
      const result = await pool.query(
        'INSERT INTO messages (conversation_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,$4,NOW()) RETURNING *',
        [conversationId, socket.user.userId, sanitizeString(text, 2000), type]
      );
      const message = result.rows[0];
      io.to(`conv:${conversationId}`).emit('new_message', message);

      // Increment unread for other party
      const conv = await pool.query('SELECT buyer_id, seller_id FROM conversations WHERE id=$1', [conversationId]);
      if (conv.rows.length) {
        const otherId = conv.rows[0].buyer_id === socket.user.userId ? conv.rows[0].seller_id : conv.rows[0].buyer_id;
        await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
          type: 'new_message',
          conversationId, senderId: socket.user.userId,
          receiverId: otherId, text: message.text,
        });
      }
    } catch (err) {
      logger.error('Message save error', { error: err.message });
    }
  });

  socket.on('message_read', async ({ conversationId }) => {
    try {
      await pool.query(
        'UPDATE messages SET is_read=true WHERE conversation_id=$1 AND sender_id<>$2 AND is_read=false',
        [conversationId, socket.user.userId]
      );
      io.to(`conv:${conversationId}`).emit('message_read', { conversationId, readerId: socket.user.userId });
    } catch (err) {
      logger.error('Message read error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User ${socket.user.userId} disconnected from chat`);
  });
});

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'chat-service', timestamp: new Date().toISOString() });
}));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use((err, req, res, _next) => {
  logger.error(err.message || 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function init() {
  try {
    await initRedis();
    redis = getRedisClient();
    // Redis adapter for Socket.IO multi-pod scaling (requires @socket.io/redis-adapter)
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const pubClient = redis.duplicate ? redis.duplicate() : redis;
      const subClient = redis.duplicate ? redis.duplicate() : redis;
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter enabled');
    } catch {
      logger.warn('@socket.io/redis-adapter not installed; chat will not scale across pods');
    }
    server.listen(PORT, () => logger.info(`Chat service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start chat-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'chat-service' });
  await new Promise((resolve) => io.close(resolve));
  await new Promise((resolve) => server.close(resolve));
  await closeRedis();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
module.exports._init = init;
module.exports._shutdown = shutdown;
if (require.main === module) { init(); }
