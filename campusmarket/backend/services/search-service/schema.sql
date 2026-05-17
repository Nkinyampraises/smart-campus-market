CREATE TABLE IF NOT EXISTS search_index (
  listing_id     UUID PRIMARY KEY,
  search_vector  TSVECTOR,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_vector ON search_index USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS search_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query      TEXT NOT NULL,
  results    INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
