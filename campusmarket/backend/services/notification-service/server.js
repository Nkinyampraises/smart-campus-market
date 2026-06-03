require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const cors = require('cors');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { authenticate } = require('../../shared/authMiddleware');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

// Configure VAPID for Web Push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@campustrade.cm',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();
const PORT = process.env.PORT || 3008;
let server;

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  secure: false,
  tls: { rejectUnauthorized: false },
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
collectDefaultMetrics();

// GET /api/notifications — get notifications for current user
app.get('/api/notifications', authenticate, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.userId]
  );
  res.json(result.rows);
}));

// GET /api/notifications/unread-count
app.get('/api/notifications/unread-count', authenticate, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int as cnt FROM notifications WHERE user_id=$1 AND is_read=false',
    [req.user.userId]
  );
  res.json({ count: result.rows[0].cnt });
}));

// PATCH /api/notifications/:id/read
app.patch('/api/notifications/:id/read', authenticate, asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
  res.json({ message: 'Notification marked as read' });
}));

// PATCH /api/notifications/read-all
app.patch('/api/notifications/read-all', authenticate, asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.userId]);
  res.json({ message: 'All notifications marked as read' });
}));

async function saveNotification(userId, type, title, description, link = null) {
  if (!userId) {
    const admins = await pool.query("SELECT id FROM users WHERE role='admin'");
    for (const row of admins.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, description, link, is_read, created_at) VALUES ($1,$2,$3,$4,$5,false,NOW())',
        [row.id, type, title, description, link]
      ).catch((e) => logger.error('Admin notification save failed', { error: e.message }));
    }
    return;
  }
  await pool.query(
    'INSERT INTO notifications (user_id, type, title, description, link, is_read, created_at) VALUES ($1,$2,$3,$4,$5,false,NOW())',
    [userId, type, title, description, link]
  ).catch((e) => logger.error('Notification save failed', { error: e.message }));

  // Also send browser push notification immediately
  await sendPushToUser(userId, {
    title,
    body: description,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: link || '/',
    tag: type,
  });
}

async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_HOST) return;
  try {
    await mailer.sendMail({ from: process.env.FROM_EMAIL || 'noreply@campustrade.edu.cm', to, subject, html });
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error('Email send error', { to, error: err.message });
  }
}

// ── Push Subscription endpoints ───────────────────────────────────────────

// POST /api/notifications/push/subscribe — save browser push subscription
app.post('/api/notifications/push/subscribe', authenticate, asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw new AppError('Invalid subscription', 400);
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh=$3, auth=$4`,
    [req.user.userId, endpoint, keys.p256dh, keys.auth]
  );
  res.json({ message: 'Subscribed to push notifications' });
}));

// DELETE /api/notifications/push/unsubscribe
app.delete('/api/notifications/push/unsubscribe', authenticate, asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  await pool.query('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [req.user.userId, endpoint]);
  res.json({ message: 'Unsubscribed' });
}));

// GET /api/notifications/push/vapid-public-key — frontend needs this to subscribe
app.get('/api/notifications/push/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ── Push helper ───────────────────────────────────────────────────────────

async function sendPushToUser(userId, payload) {
  try {
    const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id=$1', [userId]);
    const message = JSON.stringify(payload);
    for (const sub of subs.rows) {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      webpush.sendNotification(pushSub, message).catch((err) => {
        // Remove invalid/expired subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          pool.query('DELETE FROM push_subscriptions WHERE endpoint=$1', [sub.endpoint]).catch(() => {});
        }
      });
    }
  } catch (err) {
    logger.error('Push send error', { error: err.message });
  }
}

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
}));

app.use((err, req, res, _next) => {
  logger.error(err.message || 'Notification error');
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.NOTIFICATION, async (event) => {
    switch (event.type) {
      case EVENT_TYPES.WELCOME_EMAIL: {
        const user = await pool.query('SELECT email, first_name FROM users WHERE id=$1', [event.userId]);
        if (!user.rows.length) break;
        await sendEmail(user.rows[0].email, 'Welcome to CampusTrade!',
          `<h2>Hi ${user.rows[0].first_name || 'there'}, welcome!</h2>
           <p>Verify your email: <a href="${process.env.FRONTEND_URL}/verify-email?token=${event.payload?.verificationToken}">Click here</a></p>`
        );
        break;
      }

      case 'email_verification': {
        const user = await pool.query('SELECT email FROM users WHERE id=$1', [event.userId]);
        if (user.rows.length) {
          await sendEmail(user.rows[0].email, 'Verify your CampusTrade email',
            `<p><a href="${process.env.FRONTEND_URL}/verify-email?token=${event.payload?.token}">Click to verify</a></p>`
          );
        }
        break;
      }

      case 'password_reset': {
        const user = await pool.query('SELECT email, first_name FROM users WHERE id=$1', [event.userId]);
        if (user.rows.length) {
          await sendEmail(user.rows[0].email, 'Password reset request',
            `<p>Hi ${user.rows[0].first_name || 'there'},</p>
             <p>Click <a href="${process.env.FRONTEND_URL}/reset-password?token=${event.payload?.token}">here</a> to reset your password.</p>`
          );
        }
        break;
      }

      case EVENT_TYPES.NEW_OFFER: {
        await saveNotification(
          event.sellerId, 'offer', 'New offer received',
          `Someone made an offer of ${event.amount?.toLocaleString()} FCFA on "${event.listingTitle}"`,
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
          event.sellerId, 'expire', 'Listing expired',
          `Your listing "${event.title}" has expired. Renew it to keep it visible.`,
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
        if (event.receiverId) {
          await saveNotification(event.receiverId, 'message', 'New message', event.text?.slice(0, 80), `/chat/${event.conversationId}`);
        }
        break;
      }

      case 'listing_fraud_flag': {
        const listing = await pool.query('SELECT seller_id, title FROM listings WHERE id=$1', [event.listingId]);
        if (listing.rows.length) {
          await saveNotification(listing.rows[0].seller_id, 'fraud_flag', 'Listing flagged',
            `Your listing "${listing.rows[0].title}" was flagged for review.`, '/my-listings');
        }
        break;
      }

      case 'report_submitted': {
        // Admin notification
        await saveNotification(null, 'report', 'New report submitted',
          `A listing was reported for ${event.reason}.`, '/admin/reports');
        break;
      }

      default: break;
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`Notification service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start notification-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'notification-service' });
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
