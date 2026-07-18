-- Auth Service Database Schema
-- Run this against the campus_auth_db database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL
          CONSTRAINT users_university_email_check CHECK (
            email = LOWER(BTRIM(email))
            AND CHAR_LENGTH(email) <= 255
            AND email ~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'
          ),
    -- Google-created accounts authenticate without a local password.
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    campus_zone VARCHAR(100),
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    suspended_reason TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    verification_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
