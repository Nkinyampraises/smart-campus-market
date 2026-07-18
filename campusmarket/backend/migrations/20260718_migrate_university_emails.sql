\set ON_ERROR_STOP on

BEGIN;
LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE university_email_identity_snapshot ON COMMIT DROP AS
SELECT id, password_hash, role
FROM users;

DO $migration$
DECLARE
  collision_target TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE email IS NULL
       OR btrim(email) = ''
       OR btrim(email) !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}$'
       OR lower(split_part(btrim(email), '@', 1)) !~ '^[a-z0-9._%+-]+$'
       OR length(lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm') > 255
  ) THEN
    RAISE EXCEPTION 'Cannot migrate malformed application email addresses';
  END IF;

  SELECT target_email
  INTO collision_target
  FROM (
    SELECT
      lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm' AS target_email,
      count(*) AS account_count
    FROM users
    GROUP BY lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm'
    HAVING count(*) > 1
  ) collisions
  LIMIT 1;

  IF collision_target IS NOT NULL THEN
    RAISE EXCEPTION 'University email migration target collision detected';
  END IF;
END
$migration$;

SELECT
  email,
  lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm'
FROM users
WHERE email IS DISTINCT FROM
  lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm'
ORDER BY email;

UPDATE users
SET email = lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm',
    updated_at = NOW()
WHERE email IS DISTINCT FROM
  lower(split_part(btrim(email), '@', 1)) || '@ictuniversity.edu.cm';

DO $preservation$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM university_email_identity_snapshot snapshot
    FULL JOIN users current_identity USING (id)
    WHERE snapshot.id IS NULL
       OR current_identity.id IS NULL
       OR snapshot.password_hash IS DISTINCT FROM current_identity.password_hash
       OR snapshot.role IS DISTINCT FROM current_identity.role
  ) THEN
    RAISE EXCEPTION 'Identity attributes changed during university email migration';
  END IF;
END
$preservation$;

COMMIT;
