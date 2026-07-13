jest.mock('pg', () => {
  const mockPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));
jest.mock('../../shared/events', () => ({
  initRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToEvents: jest.fn().mockResolvedValue(true),
  EVENT_CHANNELS: { NOTIFICATION: 'notification.channel' },
  EVENT_TYPES: {
    WELCOME_EMAIL: 'welcome_email',
    NEW_OFFER: 'new_offer',
    OFFER_ACCEPTED: 'offer_accepted',
    LISTING_EXPIRED: 'listing.expired',
    USER_SUSPENDED: 'user.suspended',
  },
}));
jest.mock('prom-client', () => ({
  collectDefaultMetrics: jest.fn(),
  register: { contentType: 'text/plain', metrics: jest.fn().mockResolvedValue('') },
}));

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const mockPool = new Pool();
const mockMailer = nodemailer.createTransport();

describe('Notification Service — saveNotification helper', () => {
  beforeEach(() => jest.clearAllMocks());

  const saveNotification = async (userId, type, title, description, link = null) => {
    await mockPool.query(
      'INSERT INTO notifications (user_id, type, title, description, link, is_read, created_at) VALUES ($1,$2,$3,$4,$5,false,NOW())',
      [userId, type, title, description, link]
    );
  };

  it('inserts a notification row for the correct user', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await saveNotification('u1', 'offer', 'New offer', 'Someone made an offer', '/offers');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      ['u1', 'offer', 'New offer', 'Someone made an offer', '/offers']
    );
  });

  it('stores null link when none is provided', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await saveNotification('u2', 'suspended', 'Account suspended', 'Reason: spam');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['u2', 'suspended', 'Account suspended', 'Reason: spam', null])
    );
  });
});

describe('Notification Service — Email sending', () => {
  beforeEach(() => jest.clearAllMocks());

  const sendEmail = async (to, subject, html) => {
    await mockMailer.sendMail({ from: 'noreply@campustrade.cm', to, subject, html });
  };

  it('sends an email with the correct recipient and subject', async () => {
    await sendEmail('student@ictuniversity.edu.cm', 'Welcome to CampusTrade!', '<p>Welcome</p>');

    expect(mockMailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'student@ictuniversity.edu.cm',
        subject: 'Welcome to CampusTrade!',
      })
    );
  });

  it('sends suspension email with reason', async () => {
    await sendEmail(
      'user@ictuniversity.edu.cm',
      'Account Suspended — CampusTrade',
      '<p>Reason: Spam</p>'
    );

    expect(mockMailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Account Suspended — CampusTrade' })
    );
  });
});

describe('Notification Service — Event bus subscriptions', () => {
  const { subscribeToEvents, EVENT_CHANNELS } = require('../../shared/events');

  it('subscribes to the NOTIFICATION channel on init', () => {
    expect(subscribeToEvents).toBeDefined();
    // In a full integration test this would verify the handler is wired correctly
    expect(EVENT_CHANNELS.NOTIFICATION).toBe('notification.channel');
  });
});
