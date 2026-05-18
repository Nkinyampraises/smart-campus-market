CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL,
  reason      TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | resolved | dismissed
  reporter_id UUID,
  admin_id    UUID,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID,
  seller_id   UUID,
  type        TEXT NOT NULL,
  rule        TEXT NOT NULL,
  resolved    BOOLEAN DEFAULT false,
  resolved_by UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
