const logger = require('./logger');

function loadRedis() {
  try {
    return require(require.resolve('redis', { paths: [process.cwd(), __dirname] }));
  } catch (err) {
    logger.error('Redis dependency not found', { cwd: process.cwd(), error: err.message });
    throw err;
  }
}

const REDIS_URL = process.env.REDIS_URL
  || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

const EVENT_CHANNELS = {
  NOTIFICATION: 'notification.channel',
  CHAT: 'chat.conversation',
  AUDIT: 'audit.channel',
  LISTING: 'listing.event',
  USER: 'user.event',
  ADMIN: 'admin.event',
};

const EVENT_TYPES = {
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  USER_SUSPENDED: 'user.suspended',
  USER_PROFILE_UPDATED: 'user.profile_updated',
  LISTING_CREATED: 'listing.created',
  LISTING_UPDATED: 'listing.updated',
  LISTING_SOLD: 'listing.sold',
  LISTING_EXPIRED: 'listing.expired',
  NEW_OFFER: 'new_offer',
  OFFER_ACCEPTED: 'offer_accepted',
  WELCOME_EMAIL: 'welcome_email',
  LOW_PRICE_FLAG:  'low_price_flag',
  HIGH_PRICE_FLAG: 'high_price_flag',
  SPAM_RATE_FLAG:  'spam_rate_flag',
};

let redisClient;
let pubClient;
let subClient;
let shuttingDown = false;

async function initRedis() {
  if (redisClient && redisClient.isOpen) return redisClient;

  const { createClient } = loadRedis();
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => logger.error('Redis client error', { error: err.message }));
  await redisClient.connect();

  pubClient = redisClient.duplicate();
  subClient = redisClient.duplicate();
  pubClient.on('error', (err) => logger.error('Redis publisher error', { error: err.message }));
  subClient.on('error', (err) => logger.error('Redis subscriber error', { error: err.message }));

  await pubClient.connect();
  await subClient.connect();

  logger.info('Redis event bus connected', { redisUrl: REDIS_URL });
  return redisClient;
}

function getRedisClient() {
  return redisClient;
}

async function publishEvent(channel, event) {
  if (!pubClient?.isOpen) await initRedis();

  const payload = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  await pubClient.publish(channel, JSON.stringify(payload));
}

async function subscribeToEvents(channel, handler) {
  if (!subClient?.isOpen) await initRedis();

  await subClient.subscribe(channel, async (rawPayload) => {
    try {
      const event = JSON.parse(rawPayload);
      await handler(event);
    } catch (err) {
      logger.error('Event handler failed', { channel, error: err.message });
    }
  });
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis: async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const clients = [subClient, pubClient, redisClient].filter(Boolean);
    for (const client of clients) {
      if (client.isOpen) {
        try {
          await client.quit();
        } catch (err) {
          logger.warn('Redis client quit failed', { error: err.message });
          try { client.disconnect(); } catch {}
        }
      }
    }
    redisClient = null;
    pubClient = null;
    subClient = null;
    shuttingDown = false;
  },
  publishEvent,
  subscribeToEvents,
  EVENT_CHANNELS,
  EVENT_TYPES,
};
