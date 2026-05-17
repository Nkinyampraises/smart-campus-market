require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3008;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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

// GET /api/notifications — get notifications for current user
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all
app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function saveNotification(userId, type, title, description, link = null) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, title, description, link, is_read, created_at) VALUES ($1,$2,$3,$4,$5,false,NOW())',
    [userId, type, title, description, link]
  ).catch(console.error);
}

async function sendEmail(to, subject, html) {
  try {
    await mailer.sendMail({ from: process.env.FROM_EMAIL, to, subject, html });
  } catch (err) {
    console.error('Email send error:', err);
  }
}

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.NOTIFICATION, async (event) => {
    switch (event.type) {

      case EVENT_TYPES.WELCOME_EMAIL: {
        const user = await pool.query('SELECT email FROM users WHERE id=$1', [event.userId]);
        if (!user.rows.length) break;
        await sendEmail(user.rows[0].email, 'Welcome to CampusTrade!',
          `<h2>Welcome!</h2><p>Verify your email: <a href="${process.env.FRONTEND_URL}/verify-email?token=${event.payload.verificationToken}">Click here</a></p>`
        );
        break;
      }

      case EVENT_TYPES.NEW_OFFER: {
        await saveNotification(
          event.sellerId, 'offer', 'New offer received',
          `Someone made an offer of ${event.amount.toLocaleString()} FCFA on "${event.listingTitle}"`,
          '/offers'
        );
        break;
      }

      case EVENT_TYPES.OFFER_ACCEPTED: {
        await saveNotification(
          event.buyerId, 'offer_accepted', 'Your offer was accepted!',
          `The seller accepted your offer on "${event.listingTitle}"`,
          '/offers'
        );
        break;
      }

      case 'buy_request': {
        await saveNotification(
          event.sellerId, 'buy_request', 'New buy request!',
          `A student wants to buy "${event.listingTitle}" — delivering to ${event.campus_zone}${event.landmark ? `, ${event.landmark}` : ''}`,
          '/inbox'
        );
        break;
      }

      case EVENT_TYPES.LISTING_EXPIRED: {
        await saveNotification(
          event.sellerId, 'expire', 'Listing expiring soon',
          `Your listing "${event.title}" expires in 2 days. Renew to keep it visible.`,
          '/my-listings'
        );
        break;
      }

      case EVENT_TYPES.USER_SUSPENDED: {
        await saveNotification(
          event.userId, 'suspended', 'Your account has been suspended',
          `Reason: ${event.reason}. Contact support if you believe this is a mistake.`,
          null
        );
        const user = await pool.query('SELECT email FROM users WHERE id=$1', [event.userId]);
        if (user.rows.length) {
          await sendEmail(user.rows[0].email, 'Account Suspended — CampusTrade',
            `<p>Your account has been suspended. Reason: ${event.reason}</p>`
          );
        }
        break;
      }

      case 'new_message': {
        // Fetch the conversation to find the other party
        const conv = await pool.query('SELECT buyer_id, seller_id FROM conversations WHERE id=$1', [event.conversationId]);
        if (!conv.rows.length) break;
        const recipientId = conv.rows[0].buyer_id === event.senderId ? conv.rows[0].seller_id : conv.rows[0].buyer_id;
        await saveNotification(recipientId, 'message', 'New message', event.text?.slice(0, 80), `/chat/${event.conversationId}`);
        break;
      }
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start notification-service:', err);
    process.exit(1);
  }
}

init();
