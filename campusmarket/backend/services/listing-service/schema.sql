CREATE TABLE IF NOT EXISTS listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL,
  price_fcfa  INT NOT NULL,
  condition   TEXT,
  campus_zone TEXT,
  images      JSONB DEFAULT '[]',
  tags        JSONB DEFAULT '[]',
  status      TEXT DEFAULT 'active',  -- active | reserved | sold | expired | removed
  views       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id),
  buyer_id    UUID NOT NULL,
  amount      INT NOT NULL,
  note        TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | accepted | declined | countered
  counter_amount INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_campus_zone ON listings(campus_zone);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
