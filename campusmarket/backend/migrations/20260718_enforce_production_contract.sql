\set ON_ERROR_STOP on

BEGIN;
LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;

DO $contract$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE email <> lower(btrim(email))
       OR char_length(email) > 255
       OR email !~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'
  ) THEN
    RAISE EXCEPTION 'Cannot enforce the university email contract while noncanonical users remain';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND conname = 'users_university_email_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_university_email_check CHECK (
        email = lower(btrim(email))
        AND char_length(email) <= 255
        AND email ~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'
      ) NOT VALID;
  END IF;
END
$contract$;

ALTER TABLE users VALIDATE CONSTRAINT users_university_email_check;

CREATE INDEX IF NOT EXISTS idx_transactions_listing_completed_positive
  ON transactions (listing_id, completed_at DESC)
  WHERE final_price > 0;

COMMIT;
