const { createClient } = require('redis');

// Redis clients for pub/sub
let publisher;
let subscriber;

async function initRedis() {
  try {
    publisher = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

    subscriber = publisher.duplicate();

    await publisher.connect();
    await subscriber.connect();

    console.log('Redis connected for event-driven architecture');
  } catch (error) {
    console.error('Redis connection failed:', error);
    throw error;
  }
}

// Event publishing
async function publishEvent(channel, event) {
  try {
    const message = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
      source: process.env.SERVICE_NAME || 'unknown-service'
    });

    await publisher.publish(channel, message);
    console.log(`Event published to ${channel}:`, event.type);
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
}

// Event subscription
async function subscribeToEvents(channel, handler) {
  try {
    await subscriber.subscribe(channel, (message) => {
      try {
        const event = JSON.parse(message);
        handler(event);
      } catch (error) {
        console.error('Failed to parse event message:', error);
      }
    });

    console.log(`Subscribed to events on channel: ${channel}`);
  } catch (error) {
    console.error('Failed to subscribe to events:', error);
  }
}

// Predefined event channels (from blueprint)
const EVENT_CHANNELS = {
  NOTIFICATION: 'notification.channel',
  CHAT_CONVERSATION: (convId) => `chat.conversation.${convId}`,
  AUDIT: 'audit.channel',
  LISTING: 'listing.event',
  USER: 'user.event',
  ADMIN: 'admin.event'
};

// Event types (examples from blueprint)
const EVENT_TYPES = {
  // Notification events
  WELCOME_EMAIL: 'welcome_email',
  NEW_OFFER: 'new_offer',
  OFFER_ACCEPTED: 'offer_accepted',
  PRICE_DROP: 'price_drop',
  LISTING_EXPIRED: 'listing_expired',

  // Listing events
  LISTING_CREATED: 'listing.created',
  LISTING_UPDATED: 'listing.updated',
  LISTING_SOLD: 'listing.sold',
  LISTING_RESERVED: 'listing.reserved',
  LISTING_EXPIRED: 'listing.expired',

  // User events
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  USER_SUSPENDED: 'user.suspended',

  // Fraud detection
  LOW_PRICE_FLAG: 'fraud.low_price_flag',
  SPAM_RATE_FLAG: 'fraud.spam_rate_flag'
};

module.exports = {
  initRedis,
  publishEvent,
  subscribeToEvents,
  EVENT_CHANNELS,
  EVENT_TYPES
};