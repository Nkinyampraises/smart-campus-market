require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const Anthropic = require('@anthropic-ai/sdk');
const { collectDefaultMetrics, register } = require('prom-client');
const { initRedis, publishEvent, subscribeToEvents, EVENT_CHANNELS, EVENT_TYPES } = require('../../shared/events');

const app = express();
const PORT = process.env.PORT || 3006;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// POST /api/ai/price-suggestion — suggest a fair price for a listing
app.post('/api/ai/price-suggestion', authenticate, async (req, res) => {
  try {
    const { title, category, condition, description } = req.body;

    // Get recent sold listings in same category for context
    const recentSales = await pool.query(
      "SELECT title, price_fcfa, condition FROM listings WHERE category=$1 AND status='sold' ORDER BY updated_at DESC LIMIT 10",
      [category]
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are a campus marketplace pricing assistant. Suggest a fair price in FCFA for this item:
Title: ${title}
Category: ${category}
Condition: ${condition}
Description: ${description}

Recent campus sales in this category:
${recentSales.rows.map(s => `- ${s.title}: ${s.price_fcfa} FCFA (${s.condition})`).join('\n')}

Respond with JSON only: { "suggested_price": number, "min_price": number, "max_price": number, "reasoning": "brief explanation" }`
      }],
    });

    const suggestion = JSON.parse(message.content[0].text);
    res.json(suggestion);
  } catch (err) {
    console.error('AI price suggestion error:', err);
    res.status(500).json({ error: 'Could not generate price suggestion' });
  }
});

// POST /api/ai/fraud-check — check a listing for fraud signals
app.post('/api/ai/fraud-check', async (req, res) => {
  try {
    const { listingId, title, category, price_fcfa, sellerId } = req.body;

    // Get market average for category
    const avg = await pool.query(
      "SELECT AVG(price_fcfa) as avg, MIN(price_fcfa) as min FROM listings WHERE category=$1 AND status IN ('active','sold')",
      [category]
    );
    const marketAvg = avg.rows[0].avg || 0;
    const flags = [];

    // Rule 1: Price suspiciously low (< 10% of market average)
    if (marketAvg > 0 && price_fcfa < marketAvg * 0.1) {
      flags.push({ type: EVENT_TYPES.LOW_PRICE_FLAG, rule: `Price ${Math.round((price_fcfa / marketAvg) * 100)}% below market average` });
    }

    // Rule 2: Seller posting too many listings in 24h
    const recentCount = await pool.query(
      "SELECT COUNT(*) FROM listings WHERE seller_id=$1 AND created_at > NOW() - INTERVAL '24 hours'",
      [sellerId]
    );
    if (recentCount.rows[0].count > 10) {
      flags.push({ type: EVENT_TYPES.SPAM_RATE_FLAG, rule: `${recentCount.rows[0].count} listings posted in 24 hours` });
    }

    // Publish fraud flags
    for (const flag of flags) {
      await publishEvent(EVENT_CHANNELS.LISTING, { ...flag, listingId, sellerId });
    }

    res.json({ flagged: flags.length > 0, flags });
  } catch (err) {
    console.error('Fraud check error:', err);
    res.status(500).json({ error: 'Fraud check failed' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

async function setupEventHandlers() {
  // Automatically run fraud check whenever a new listing is created
  await subscribeToEvents(EVENT_CHANNELS.LISTING, async (event) => {
    if (event.type === EVENT_TYPES.LISTING_CREATED) {
      try {
        await fetch(`http://localhost:${PORT}/api/ai/fraud-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: event.listingId,
            title: event.title,
            category: event.category,
            price_fcfa: event.price_fcfa,
            sellerId: event.sellerId,
          }),
        });
      } catch (err) {
        console.error('Auto fraud check failed:', err);
      }
    }
  });
}

async function init() {
  try {
    await initRedis();
    await setupEventHandlers();
    app.listen(PORT, () => console.log(`AI service running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start ai-service:', err);
    process.exit(1);
  }
}

init();
