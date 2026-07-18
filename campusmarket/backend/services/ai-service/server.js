require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { createCorsOptions } = require('../../shared/corsOptions');
const helmet = require('helmet');
const { collectDefaultMetrics, register } = require('prom-client');
const pool = require('../../shared/db');
const { asyncHandler, AppError } = require('../../shared/errorHandler');
const logger = require('../../shared/logger');
const { metricsMiddleware } = require('../../shared/metrics');
const { initRedis, closeRedis, getRedisClient, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3006;

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';
const CLAUDE_TIMEOUT_MS = 12000;
const CLAUDE_MAX_RETRIES = 1;
const CLAUDE_MAX_TOKENS = 120;
const MAX_EXPLANATION_LENGTH = 320;
const MIN_COMPARABLE_SALES = 3;
const CLAUDE_QUOTA_LIMIT = 10;
const CLAUDE_QUOTA_WINDOW_SECONDS = 15 * 60;
const CLAUDE_QUOTA_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;
const NUMBER_WORDS = new Set(`
  zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen
  fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy
  eighty ninety hundred thousand million billion trillion first second third fourth
  fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth fifteenth
  sixteenth seventeenth eighteenth nineteenth twentieth hundredth thousandth millionth
  billionth trillionth dozen half quarter single double triple once twice
`.trim().split(/\s+/));
const MARKDOWN_CHARACTERS = new Set(['*', '_', '`', '~', '#', '>', '[', ']', '{', '}', '|', '\\']);

const PRICE_CATEGORIES = new Map([
  'Accessories',
  'Books',
  'Bracelets',
  'Clothing',
  'Cosmetics',
  'Electronics',
  'Fruit Salad',
  'Housing',
  'Juice',
  'Liquid Soap',
  'Other',
  'Pancake/Cake',
  'Perfumes',
  'Services',
  'Shawarma',
  'Shoes',
  'Textbooks',
].map((category) => [category.toLowerCase(), category]));

const CONDITION_PROFILES = {
  new: { label: 'new', factor: 1.0 },
  'new / unopened': { label: 'new / unopened', factor: 1.0 },
  'like new': { label: 'like new', factor: 0.9 },
  'excellent condition': { label: 'excellent condition', factor: 0.85 },
  'good condition': { label: 'good condition', factor: 0.7 },
  used: { label: 'used', factor: 0.7 },
  old: { label: 'old', factor: 0.4 },
  'for parts': { label: 'for parts', factor: 0.4 },
};

let redis;
let server;

// Minimum reference prices per category (FCFA) — used when no sales data exists
const CATEGORY_MIN_PRICES = {
  Electronics:    2000,
  Clothing:       2000,
  Services:       1000,
  Accessories:     500,
  Cosmetics:       500,
  Perfumes:        250,
  Bracelets:       100,
  'Fruit Salad':   500,
  Juice:           350,
  'Pancake/Cake':  250,
  Shawarma:        500,
  Shoes:          1500,
  'Liquid Soap':  2000,
  default:         250,
};

collectDefaultMetrics();
app.use(helmet());
app.use(cors(createCorsOptions()));
app.use(express.json());
app.use(metricsMiddleware);

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

function normalizePriceCategory(value) {
  if (typeof value !== 'string') throw new AppError('Category and condition required', 400);
  const normalized = value.trim().replace(/\s+/g, ' ');
  const category = PRICE_CATEGORIES.get(normalized.toLowerCase());
  if (!category) throw new AppError('Unsupported category', 400);
  return category;
}

function getConditionProfile(value) {
  if (typeof value !== 'string') throw new AppError('Category and condition required', 400);
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized || normalized.length > 40) throw new AppError('Invalid condition', 400);
  return CONDITION_PROFILES[normalized] || { label: 'other', factor: 0.7 };
}

function getAnthropicModel() {
  const configured = process.env.ANTHROPIC_MODEL?.trim();
  if (!configured) return DEFAULT_ANTHROPIC_MODEL;
  return /^[a-zA-Z0-9._:-]{1,100}$/.test(configured) ? configured : DEFAULT_ANTHROPIC_MODEL;
}

function getClaudeExplanation(message) {
  const content = message?.content;
  const hasSingleTextBlock = Array.isArray(content)
    && content.length === 1
    && content[0]?.type === 'text'
    && typeof content[0].text === 'string';
  const rawExplanation = hasSingleTextBlock ? content[0].text : '';
  const explanation = rawExplanation.trim();
  const sentenceMarks = explanation.match(/[.!?]/g) || [];

  const isComplete = message?.stop_reason === 'end_turn';
  const containsUnsafeMarkup = /[<>]/.test(explanation);
  const containsControlOrBidiCharacters = /[\u0000-\u001F\u007F-\u009F\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/.test(rawExplanation);
  const words = explanation.toLowerCase().match(/[a-z]+/g) || [];
  const containsNumber = /\p{N}/u.test(explanation) || words.some((word) => NUMBER_WORDS.has(word));
  const containsMarkdown = [...explanation].some((character) => MARKDOWN_CHARACTERS.has(character))
    || /^[-+]\s/.test(explanation);
  const isSingleSentence = sentenceMarks.length === 1 && /[.!?]$/.test(explanation);
  if (
    !isComplete
    || !hasSingleTextBlock
    || explanation.length < 10
    || explanation.length > MAX_EXPLANATION_LENGTH
    || containsUnsafeMarkup
    || containsControlOrBidiCharacters
    || containsNumber
    || containsMarkdown
    || !isSingleSentence
  ) {
    throw new Error('Invalid Claude response');
  }
  return explanation;
}

function getClaudeFailureReason(error, requestAborted) {
  if (requestAborted) return 'timeout';
  if (error instanceof Error && error.message === 'Invalid Claude response') return 'invalid_response';
  return 'provider_error';
}

async function requestClaudePriceExplanation(context) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    logger.warn('Claude price guidance unavailable', { reason: 'not_configured' });
    throw new Error('Claude is not configured');
  }

  const model = getAnthropicModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  timeout.unref?.();

  try {
    const client = new Anthropic({
      apiKey,
      timeout: CLAUDE_TIMEOUT_MS,
      maxRetries: CLAUDE_MAX_RETRIES,
    });
    const message = await client.messages.create({
      model,
      max_tokens: CLAUDE_MAX_TOKENS,
      thinking: { type: 'disabled' },
      system: [
        'You explain a deterministic CampusTrade price estimate to a university seller.',
        'Use only the supplied completed-sale facts and give qualitative guidance only.',
        'Do not repeat any figure or sale count. Do not use digits, number words, HTML, or Markdown.',
        'Return exactly one plain-text sentence under 280 characters.',
      ].join(' '),
      messages: [{ role: 'user', content: JSON.stringify(context) }],
    }, { signal: controller.signal });

    return {
      explanation: getClaudeExplanation(message),
      provider: 'anthropic',
      model,
    };
  } catch (error) {
    const reason = getClaudeFailureReason(error, controller.signal.aborted);
    logger.warn('Claude price guidance unavailable', { reason, model });
    throw new Error('Claude price guidance unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

async function getFreshPriceStats(category) {
  const result = await pool.query(
    `SELECT AVG(t.final_price)::float AS avg, COUNT(*)::int AS cnt
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
      WHERE l.category = $1
        AND t.completed_at > NOW() - INTERVAL '90 days'
        AND t.final_price > 0`,
    [category]
  );
  const row = result.rows[0] || {};
  return { avg: Number(row.avg), count: Number(row.cnt) };
}

async function consumeClaudeQuota(userId) {
  if (
    (typeof userId !== 'string' && typeof userId !== 'number')
    || !String(userId).trim()
    || String(userId).length > 128
  ) {
    throw new Error('Invalid quota identity');
  }
  const count = Number(await redis.eval(CLAUDE_QUOTA_SCRIPT, {
    keys: [`ai:claude_quota:${String(userId)}`],
    arguments: [String(CLAUDE_QUOTA_WINDOW_SECONDS)],
  }));
  if (!Number.isInteger(count) || count < 1) throw new Error('Invalid Redis quota response');
  return count <= CLAUDE_QUOTA_LIMIT;
}

// Helper: get or compute category average price
async function getCategoryAvgPrice(category) {
  const cacheKey = `ai:category_avg:${category}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    "SELECT AVG(final_price)::float as avg, COUNT(*)::int as cnt FROM transactions WHERE listing_id IN (SELECT id FROM listings WHERE category=$1) AND completed_at > NOW() - INTERVAL '90 days'",
    [category]
  );
  const data = { avg: result.rows[0].avg || 0, count: result.rows[0].cnt || 0 };
  await redis.set(cacheKey, JSON.stringify(data), { EX: 21600 }); // 6 hours
  return data;
}

// POST /api/ai/price-suggestion — deterministic estimate with opt-in Claude explanation
app.post('/api/ai/price-suggestion', authenticate, asyncHandler(async (req, res) => {
  const category = normalizePriceCategory(req.body?.category);
  const condition = getConditionProfile(req.body?.condition);

  const { avg, count } = await getFreshPriceStats(category);

  if (!Number.isInteger(count) || count < 0) {
    return res.status(503).json({
      error: 'Price data is temporarily unavailable',
      code: 'PRICE_DATA_UNAVAILABLE',
    });
  }

  if (count > 0 && (!Number.isFinite(avg) || avg <= 0)) {
    return res.status(503).json({
      error: 'Price data is temporarily unavailable',
      code: 'PRICE_DATA_UNAVAILABLE',
    });
  }

  if (count < MIN_COMPARABLE_SALES) {
    return res.json({
      suggestion: null,
      confidence: 'low',
      count,
      message: 'Not enough completed campus sales for reliable price guidance',
    });
  }

  const suggested = Math.max(1, Math.round(avg * condition.factor));
  const min = Math.max(1, Math.round(suggested * 0.9));
  const max = Math.max(1, Math.round(suggested * 1.1));
  let claudeGuidance;

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    logger.warn('Claude price guidance unavailable', { reason: 'not_configured' });
    return res.status(503).json({
      error: 'Claude price guidance is temporarily unavailable',
      code: 'CLAUDE_UNAVAILABLE',
    });
  }

  try {
    const withinQuota = await consumeClaudeQuota(req.user.userId);
    if (!withinQuota) {
      return res.status(429).json({
        error: 'Claude guidance request limit reached; please try again later',
        code: 'CLAUDE_RATE_LIMITED',
      });
    }
  } catch {
    logger.warn('Claude price guidance unavailable', { reason: 'quota_check_failed' });
    return res.status(503).json({
      error: 'Claude price guidance is temporarily unavailable',
      code: 'CLAUDE_UNAVAILABLE',
    });
  }

  try {
    claudeGuidance = await requestClaudePriceExplanation({
      category,
      condition: condition.label,
      comparable_sales: count,
      average_sale_price_fcfa: Math.round(avg),
      deterministic_suggestion_fcfa: suggested,
      deterministic_range_min_fcfa: min,
      deterministic_range_max_fcfa: max,
    });
  } catch {
    return res.status(503).json({
      error: 'Claude price guidance is temporarily unavailable',
      code: 'CLAUDE_UNAVAILABLE',
    });
  }

  logger.info('Price suggestion generated', {
    category,
    condition: condition.label,
    suggested,
    provider: claudeGuidance.provider,
    model: claudeGuidance.model,
  });
  res.json({
    suggestion: suggested,
    range: { min, max },
    confidence: 'high',
    count,
    ...claudeGuidance,
  });
}));

// POST /api/ai/fraud-check — rule-based fraud detection
app.post('/api/ai/fraud-check', asyncHandler(async (req, res) => {
  const { listingId, category, price_fcfa, sellerId } = req.body;
  if (!listingId || !category || price_fcfa === undefined || !sellerId) {
    throw new AppError('listingId, category, price_fcfa, sellerId required', 400);
  }

  const { avg } = await getCategoryAvgPrice(category);
  const flags = [];

  // Use transaction average OR hardcoded market minimum — whichever is higher
  const refPrice = Math.max(avg || 0, CATEGORY_MIN_PRICES[category] || CATEGORY_MIN_PRICES.default);

  // Rule 1: Price < 60% of reference price — suspiciously low
  if (price_fcfa < refPrice * 0.60) {
    flags.push({
      type: EVENT_TYPES.LOW_PRICE_FLAG,
      rule: `Price is only ${Math.round((price_fcfa / refPrice) * 100)}% of market reference for ${category} (ref: ${refPrice.toLocaleString()} FCFA) — suspiciously low`,
      listingId, sellerId
    });
  }

  // Rule 2: Price > 8x reference price — suspiciously high
  if (price_fcfa > refPrice * 8) {
    flags.push({
      type: EVENT_TYPES.HIGH_PRICE_FLAG,
      rule: `Price ${Math.round((price_fcfa / refPrice) * 100)}% above market reference for ${category} (ref: ${refPrice.toLocaleString()} FCFA) — suspiciously high`,
      listingId, sellerId
    });
  }

  // Rule 3: Spam rate (>10 listings in 60 minutes)
  const recentCount = await pool.query(
    "SELECT COUNT(*)::int as cnt FROM listings WHERE seller_id=$1 AND created_at > NOW() - INTERVAL '60 minutes'",
    [sellerId]
  );
  if (recentCount.rows[0].cnt > 10) {
    flags.push({
      type: EVENT_TYPES.SPAM_RATE_FLAG,
      rule: `${recentCount.rows[0].cnt} listings posted in 60 minutes`,
      listingId, sellerId
    });
  }

  for (const flag of flags) {
    await publishEvent(EVENT_CHANNELS.AUDIT, flag);
  }

  res.json({ flagged: flags.length > 0, flags });
}));

// GET /api/trending — trending feed algorithm
app.get('/api/trending', asyncHandler(async (req, res) => {
  const cacheKey = 'trending:feed';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const listingsResult = await pool.query(
    "SELECT id, title, price_fcfa, category, campus_zone, condition, views, images, seller_id, created_at FROM listings WHERE status='active'"
  );

  const listings = listingsResult.rows;
  if (!listings.length) return res.json([]);

  // Get wishlist counts for last 7 days
  const wishlistResult = await pool.query(
    "SELECT listing_id, COUNT(*) as cnt FROM wishlist WHERE added_at > NOW() - INTERVAL '7 days' GROUP BY listing_id"
  );
  const wishlistMap = {};
  wishlistResult.rows.forEach(r => { wishlistMap[r.listing_id] = parseInt(r.cnt, 10); });

  // Get view counts for last 7 days (using total views as proxy; in production use a separate view_logs table)
  const scored = listings.map(l => {
    const views7d = l.views || 0;
    const wish7d = wishlistMap[l.id] || 0;
    const trendScore = (views7d * 0.6) + (wish7d * 0.4);
    return { ...l, trend_score: trendScore };
  });

  scored.sort((a, b) => b.trend_score - a.trend_score);
  const top10 = scored.slice(0, 10);

  // Enrich with seller name
  for (const item of top10) {
    const seller = await pool.query('SELECT first_name, last_name FROM users WHERE id=$1', [item.seller_id]);
    item.seller_name = seller.rows.length ? `${seller.rows[0].first_name} ${seller.rows[0].last_name}`.trim() : 'Unknown';
  }

  await redis.set(cacheKey, JSON.stringify(top10), { EX: 900 }); // 15 min TTL
  res.json(top10);
}));

// GET /api/ai/similar/:listingId
app.get('/api/ai/similar/:listingId', asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const listing = await pool.query('SELECT category, condition, price_fcfa FROM listings WHERE id=$1', [listingId]);
  if (!listing.rows.length) throw new AppError('Listing not found', 404);

  const { category, condition, price_fcfa } = listing.rows[0];
  const bandMin = Math.round(price_fcfa * 0.7);
  const bandMax = Math.round(price_fcfa * 1.3);

  const similar = await pool.query(
    `SELECT id, title, price_fcfa, category, campus_zone, condition, images, seller_id FROM listings
     WHERE status='active' AND category=$1 AND id<>$2 AND price_fcfa BETWEEN $3 AND $4
     ORDER BY ABS(price_fcfa - $5) ASC LIMIT 4`,
    [category, listingId, bandMin, bandMax, price_fcfa]
  );

  res.json(similar.rows);
}));

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  if (redis?.isOpen && redis.ping) await redis.ping();
  res.json({ status: 'ok', service: 'ai-service', timestamp: new Date().toISOString() });
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

async function setupEventHandlers() {
  await subscribeToEvents(EVENT_CHANNELS.LISTING, async (event) => {
    if (event.type === EVENT_TYPES.LISTING_CREATED) {
      try {
        const { avg } = await getCategoryAvgPrice(event.category);
        const refPrice = Math.max(avg || 0, CATEGORY_MIN_PRICES[event.category] || CATEGORY_MIN_PRICES.default);

        if (event.price_fcfa < refPrice * 0.60) {
          await publishEvent(EVENT_CHANNELS.AUDIT, {
            type: EVENT_TYPES.LOW_PRICE_FLAG,
            rule: `Price is only ${Math.round((event.price_fcfa / refPrice) * 100)}% of market reference for ${event.category} (ref: ${refPrice.toLocaleString()} FCFA) — suspiciously low`,
            listingId: event.listingId,
            sellerId: event.sellerId
          });
        }

        if (event.price_fcfa > refPrice * 8) {
          await publishEvent(EVENT_CHANNELS.AUDIT, {
            type: EVENT_TYPES.HIGH_PRICE_FLAG,
            rule: `Price ${Math.round((event.price_fcfa / refPrice) * 100)}% above market reference for ${event.category} (ref: ${refPrice.toLocaleString()} FCFA) — suspiciously high`,
            listingId: event.listingId,
            sellerId: event.sellerId
          });
        }

        const recentCount = await pool.query(
          "SELECT COUNT(*)::int as cnt FROM listings WHERE seller_id=$1 AND created_at > NOW() - INTERVAL '60 minutes'",
          [event.sellerId]
        );
        if (recentCount.rows[0].cnt > 10) {
          await publishEvent(EVENT_CHANNELS.AUDIT, {
            type: EVENT_TYPES.SPAM_RATE_FLAG,
            rule: `${recentCount.rows[0].cnt} listings posted in 60 minutes`,
            listingId: event.listingId,
            sellerId: event.sellerId
          });
        }
      } catch (err) {
        logger.error('Auto fraud check failed', { error: err.message });
      }
    }
  });
}

async function init() {
  try {
    await initRedis();
    redis = getRedisClient ? getRedisClient() : null;
    if (!redis) {
      const { createClient } = require('redis');
      redis = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });
      await redis.connect();
    }
    await setupEventHandlers();
    server = app.listen(PORT, () => logger.info(`AI service running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start ai-service', { error: err.message });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info('Shutdown signal received', { signal, service: 'ai-service' });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeRedis();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
module.exports._init = init;
module.exports._requestClaudePriceExplanation = requestClaudePriceExplanation;
module.exports._shutdown = shutdown;
if (require.main === module) { init(); }
