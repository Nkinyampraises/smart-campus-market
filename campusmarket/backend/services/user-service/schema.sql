CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL
              CONSTRAINT users_university_email_check CHECK (
                email = LOWER(BTRIM(email))
                AND CHAR_LENGTH(email) <= 255
                AND email ~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'
              ),
  first_name  TEXT,
  last_name   TEXT,
  phone       TEXT,
  campus_zone TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  rating      NUMERIC(3,2) DEFAULT 0,
  sold_items  INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  suspended_reason TEXT,
  member_since INT DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL,
  seller_id   UUID NOT NULL,
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
