require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS } = require('../../shared/events');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3004;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(helmet());
app.use(cors());
app.use(express.json());
collectDefaultMetrics();

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/conversations — get all conversations for current user
app.get('/api/conversations', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
        (SELECT text FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
       FROM conversations c
       WHERE c.buyer_id=$1 OR c.seller_id=$1
       ORDER BY last_message_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/conversations/:id/messages
app.get('/api/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/conversations — start a new conversation
app.post('/api/conversations', authenticate, async (req, res) => {
  try {
    const { seller_id, listing_id } = req.body;
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
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.io — real-time messaging
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
  console.log(`User ${socket.user.userId} connected`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on('send_message', async ({ conversationId, text, type = 'text', offerAmount }) => {
    try {
      const result = await pool.query(
        'INSERT INTO messages (conversation_id, sender_id, text, type, offer_amount, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *',
        [conversationId, socket.user.userId, text, type, offerAmount || null]
      );
      const message = result.rows[0];
      io.to(`conv:${conversationId}`).emit('new_message', message);

      // Publish to notification service so the other party gets notified
      await publishEvent(EVENT_CHANNELS.NOTIFICATION, {
        type: 'new_message',
        conversationId,
        senderId: socket.user.userId,
        text,
      });
    } catch (err) {
      console.error('Message save error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.userId} disconnected`);
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function init() {
  try {
    await initRedis();
    server.listen(PORT, () => console.log(`Chat service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start chat-service:', err);
    process.exit(1);
  }
}

init();
