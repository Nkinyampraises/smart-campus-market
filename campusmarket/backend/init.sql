-- CampusTrade Combined Database Schema
-- Merges all microservice schemas into one shared PostgreSQL database

-- ── Users (auth + profile combined) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    VARCHAR(255),
  first_name       VARCHAR(100),
  last_name        VARCHAR(100),
  phone            VARCHAR(30),
  campus_zone      VARCHAR(100),
  bio              TEXT,
  rating           NUMERIC(3,2) DEFAULT 0,
  sold_items       INT DEFAULT 0,
  is_verified      BOOLEAN DEFAULT FALSE,
  is_suspended     BOOLEAN DEFAULT FALSE,
  suspended_reason TEXT,
  verification_token VARCHAR(255) UNIQUE,
  role             VARCHAR(20) DEFAULT 'user',
  member_since     INT DEFAULT EXTRACT(YEAR FROM NOW()),
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Listings & Offers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100) NOT NULL,
  price_fcfa  INT NOT NULL,
  condition   VARCHAR(50),
  campus_zone VARCHAR(100),
  images      JSONB DEFAULT '[]',
  tags        JSONB DEFAULT '[]',
  status      VARCHAR(20) DEFAULT 'active',
  views       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE TABLE IF NOT EXISTS offers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  amount         INT NOT NULL,
  note           TEXT,
  status         VARCHAR(20) DEFAULT 'pending',
  counter_amount INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (buyer_id, seller_id, listing_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  text            TEXT,
  type            VARCHAR(20) DEFAULT 'text',
  offer_amount    INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Admin: Reports & Fraud ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  reason      VARCHAR(100) NOT NULL,
  description TEXT,
  severity    VARCHAR(20) DEFAULT 'medium',
  status      VARCHAR(20) DEFAULT 'pending',
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  seller_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  type        VARCHAR(50) NOT NULL,
  rule        TEXT NOT NULL,
  resolved    BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  link        VARCHAR(255),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Search Index ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_index (
  listing_id    UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  search_vector TSVECTOR,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query      VARCHAR(255) NOT NULL,
  results    INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Wishlist ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- ── Transactions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  final_price  INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Listing Images (normalized) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  sort_order  INT DEFAULT 0
);

-- ── Add missing columns ───────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_listings_category   ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status     ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller     ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_campus     ON listings(campus_zone);
CREATE INDEX IF NOT EXISTS idx_listings_active_cat ON listings(status, category, created_at);
CREATE INDEX IF NOT EXISTS idx_offers_listing      ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer        ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv       ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_read       ON messages(conversation_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_search_vector       ON search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_wishlist_user       ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer  ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reports_listing     ON reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_resolved ON fraud_flags(resolved);
CREATE INDEX IF NOT EXISTS idx_listings_expires    ON listings(expires_at) WHERE status = 'active';
