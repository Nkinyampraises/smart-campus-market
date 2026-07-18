#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration_sql="$root_dir/backend/migrations/20260718_migrate_university_emails.sql"
migration_script="$root_dir/backend/scripts/migrate-university-emails.sh"
seed_sql="$root_dir/backend/seed-production.sql"
container="campustrade-university-data-test-$$"
database=campustrade_test
database_password=test-only-password
work_dir="$(mktemp -d)"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

[[ -r "$migration_sql" ]] || {
  echo "Missing university-email migration SQL: $migration_sql" >&2
  exit 1
}
[[ -x "$migration_script" ]] || {
  echo "Missing executable university-email migration script: $migration_script" >&2
  exit 1
}
bash -n "$migration_script"

docker run -d --name "$container" \
  -e POSTGRES_DB="$database" \
  -e POSTGRES_USER=campustrade \
  -e POSTGRES_PASSWORD="$database_password" \
  postgres:16-alpine >/dev/null

for _ in $(seq 1 60); do
  docker exec "$container" pg_isready -U campustrade -d "$database" >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$container" pg_isready -U campustrade -d "$database" >/dev/null

psql_exec() {
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U campustrade -d "$database" "$@"
}

# Exercise the migration independently of the application schema so the test
# remains valid after the final database domain CHECK constraint is introduced.
psql_exec >/dev/null <<'SQL'
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id),
  text TEXT
);
INSERT INTO users (id, email, password_hash, role) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin@campustrade.local', 'admin-hash', 'admin'),
  ('00000000-0000-4000-8000-000000000002', 'Student.Person@GMAIL.COM', 'student-hash', 'user'),
  ('00000000-0000-4000-8000-000000000003', 'ready@ictuniversity.edu.cm', 'ready-hash', 'user');
INSERT INTO messages (id, sender_id, text) VALUES
  ('90000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'preserve me');
SQL

psql_exec <"$migration_sql" >/dev/null
psql_exec <"$migration_sql" >/dev/null

migration_result="$(psql_exec -Atc \
  "SELECT
     count(*) FILTER (WHERE email ~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'),
     count(*) FILTER (WHERE email='admin@ictuniversity.edu.cm' AND password_hash='admin-hash' AND role='admin'),
     count(*) FILTER (WHERE email='student.person@ictuniversity.edu.cm' AND password_hash='student-hash'),
     (SELECT count(*) FROM messages WHERE sender_id='00000000-0000-4000-8000-000000000002' AND text='preserve me')
   FROM users;")"
[[ "$migration_result" == '3|1|1|1' ]] || {
  echo "University migration did not preserve identities and relationships: $migration_result" >&2
  exit 1
}

# Two source identities with the same local part must fail closed, and the SQL
# transaction must leave both addresses untouched.
psql_exec >/dev/null <<'SQL'
TRUNCATE messages, users;
INSERT INTO users (id, email, password_hash) VALUES
  ('00000000-0000-4000-8000-000000000011', 'collision@gmail.com', 'one'),
  ('00000000-0000-4000-8000-000000000012', 'COLLISION@campustrade.local', 'two');
SQL
if psql_exec <"$migration_sql" >"$work_dir/collision.log" 2>&1; then
  echo 'University migration accepted a target-email collision.' >&2
  exit 1
fi
collision_result="$(psql_exec -Atc "SELECT string_agg(email, ',' ORDER BY email) FROM users;")"
[[ "$collision_result" == 'COLLISION@campustrade.local,collision@gmail.com' ]] || {
  echo 'Collision failure did not roll back the migration transaction.' >&2
  exit 1
}

# Malformed source identities must fail rather than being silently repaired from
# only the text before their first at-sign.
psql_exec >/dev/null <<'SQL'
TRUNCATE messages, users;
INSERT INTO users (id, email, password_hash) VALUES
  ('00000000-0000-4000-8000-000000000021', 'student@', 'one'),
  ('00000000-0000-4000-8000-000000000022', 'student@@example.com', 'two');
SQL
if psql_exec <"$migration_sql" >"$work_dir/malformed.log" 2>&1; then
  echo 'University migration accepted malformed source identities.' >&2
  exit 1
fi
[[ "$(psql_exec -Atc "SELECT count(*) FROM users WHERE email IN ('student@', 'student@@example.com');")" == 2 ]]

# Exercise the production wrapper, including its cross-system recovery rules.
test_shared="$work_dir/shared"
test_backups="$work_dir/backups"
mkdir -p "$test_shared" "$test_backups"
cat >"$test_shared/backend.env" <<ENV
DB_USER=campustrade
DB_NAME=$database
ENV

write_old_credentials() {
  cat >"$test_shared/operator-credentials.env" <<'ENV'
CAMPUSTRADE_ADMIN_EMAIL=admin@campustrade.local
CAMPUSTRADE_ADMIN_PASSWORD=admin-password-preserved
CAMPUSTRADE_DEMO_EMAIL=demo.student@campustrade.local
CAMPUSTRADE_DEMO_PASSWORD=demo-password-preserved
SEED_USER_1_EMAIL=amina.nfor@campustrade.local
SEED_USER_1_PASSWORD=seed-one-password-preserved
SEED_USER_2_EMAIL=joel.tamba@campustrade.local
SEED_USER_2_PASSWORD=seed-two-password-preserved
SEED_USER_3_EMAIL=grace.mbi@campustrade.local
SEED_USER_3_PASSWORD=seed-three-password-preserved
SEED_USER_4_EMAIL=eric.nji@campustrade.local
SEED_USER_4_PASSWORD=seed-four-password-preserved
ENV
  chmod 0600 "$test_shared/operator-credentials.env"
}

reset_wrapper_fixture() {
  psql_exec >/dev/null <<'SQL'
TRUNCATE messages, users;
INSERT INTO users (id, email, password_hash, role) VALUES
  ('02000000-0000-4000-8000-000000000001', 'admin@campustrade.local', 'admin-hash', 'admin'),
  ('02000000-0000-4000-8000-000000000002', 'demo.student@campustrade.local', 'demo-hash', 'user'),
  ('02000000-0000-4000-8000-000000000003', 'amina.nfor@campustrade.local', 'one-hash', 'user'),
  ('02000000-0000-4000-8000-000000000004', 'joel.tamba@campustrade.local', 'two-hash', 'user'),
  ('02000000-0000-4000-8000-000000000005', 'grace.mbi@campustrade.local', 'three-hash', 'user'),
  ('02000000-0000-4000-8000-000000000006', 'eric.nji@campustrade.local', 'four-hash', 'user'),
  ('02000000-0000-4000-8000-000000000007', 'outside.user@gmail.com', 'outside-hash', 'user');
INSERT INTO messages (id, sender_id, text) VALUES
  ('92000000-0000-4000-8000-000000000001', '02000000-0000-4000-8000-000000000007', 'preserve wrapper relation');
SQL
  write_old_credentials
}

run_wrapper() {
  ALLOW_UNPRIVILEGED_TEST=true \
  MIGRATION_TEST_CONTAINER="$container" \
  DEPLOY_SHARED_DIR="$test_shared" \
  DEPLOY_BACKUP_DIR="$test_backups" \
  bash "$migration_script"
}

reset_wrapper_fixture
run_wrapper >"$work_dir/wrapper-success.log"
run_wrapper >>"$work_dir/wrapper-success.log"
wrapper_result="$(psql_exec -Atc \
  "SELECT
     count(*) FILTER (WHERE email ~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'),
     count(*) FILTER (WHERE email='outside.user@ictuniversity.edu.cm' AND password_hash='outside-hash'),
     (SELECT count(*) FROM messages WHERE sender_id='02000000-0000-4000-8000-000000000007')
   FROM users;")"
[[ "$wrapper_result" == '7|1|1' ]]
grep -qx 'CAMPUSTRADE_ADMIN_EMAIL=admin@ictuniversity.edu.cm' "$test_shared/operator-credentials.env"
grep -qx 'CAMPUSTRADE_ADMIN_PASSWORD=admin-password-preserved' "$test_shared/operator-credentials.env"
[[ "$(find "$test_backups" -maxdepth 1 -type f -name '*.dump' | wc -l)" -ge 2 ]]
[[ "$(find "$test_shared" -maxdepth 1 -type f -name 'university-email-migration-*.tsv' | wc -l)" -ge 2 ]]
while IFS= read -r protected_file; do
  [[ "$(stat -c '%a' "$protected_file")" == 600 ]] || {
    echo "Migration evidence has unsafe permissions: $protected_file" >&2
    exit 1
  }
done < <(find "$test_backups" "$test_shared" -maxdepth 1 -type f \
  \( -name '*.dump' -o -name 'operator-credentials-before-*.env' -o -name 'university-email-migration-*.tsv' \))

reset_wrapper_fixture
if MIGRATION_TEST_FAIL_AT=before_database run_wrapper >"$work_dir/wrapper-before-failure.log" 2>&1; then
  echo 'Injected pre-database failure unexpectedly succeeded.' >&2
  exit 1
fi
grep -qx 'CAMPUSTRADE_ADMIN_EMAIL=admin@campustrade.local' "$test_shared/operator-credentials.env"
[[ "$(psql_exec -Atc "SELECT count(*) FROM users WHERE email='admin@campustrade.local';")" == 1 ]]

reset_wrapper_fixture
if MIGRATION_TEST_FAIL_AT=after_database run_wrapper >"$work_dir/wrapper-after-failure.log" 2>&1; then
  echo 'Injected post-database failure unexpectedly succeeded.' >&2
  exit 1
fi
grep -qx 'CAMPUSTRADE_ADMIN_EMAIL=admin@ictuniversity.edu.cm' "$test_shared/operator-credentials.env"
grep -qx 'CAMPUSTRADE_ADMIN_PASSWORD=admin-password-preserved' "$test_shared/operator-credentials.env"
[[ "$(psql_exec -Atc "SELECT count(*) FROM users WHERE email='admin@ictuniversity.edu.cm';")" == 1 ]]

# Exercise the complete production seed twice against the real schema to prove
# its durable expiry, comparison history, index invariant, and idempotency.
psql_exec >/dev/null <<SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public AUTHORIZATION campustrade;
SQL
psql_exec <"$root_dir/backend/init.sql" >/dev/null
psql_exec >/dev/null <<'SQL'
INSERT INTO users (id, email, password_hash, role) VALUES
  ('01000000-0000-4000-8000-000000000001', 'admin@ictuniversity.edu.cm', 'hash', 'admin'),
  ('01000000-0000-4000-8000-000000000002', 'demo.student@ictuniversity.edu.cm', 'hash', 'user'),
  ('01000000-0000-4000-8000-000000000003', 'amina.nfor@ictuniversity.edu.cm', 'hash', 'user'),
  ('01000000-0000-4000-8000-000000000004', 'joel.tamba@ictuniversity.edu.cm', 'hash', 'user'),
  ('01000000-0000-4000-8000-000000000005', 'grace.mbi@ictuniversity.edu.cm', 'hash', 'user'),
  ('01000000-0000-4000-8000-000000000006', 'eric.nji@ictuniversity.edu.cm', 'hash', 'user');
SQL

seed_database() {
  psql_exec \
    -v admin_email=admin@ictuniversity.edu.cm \
    -v demo_email=demo.student@ictuniversity.edu.cm \
    -v seed_user_1_email=amina.nfor@ictuniversity.edu.cm \
    -v seed_user_2_email=joel.tamba@ictuniversity.edu.cm \
    -v seed_user_3_email=grace.mbi@ictuniversity.edu.cm \
    -v seed_user_4_email=eric.nji@ictuniversity.edu.cm \
    <"$seed_sql" >/dev/null
}
seed_database
seed_database

seed_result="$(psql_exec -Atc \
  "SELECT
     (SELECT count(*) FROM listings WHERE id::text LIKE '10000000-0000-4000-8000-%'),
     (SELECT count(*) FROM listings WHERE id::text LIKE '10000000-0000-4000-8000-%' AND status='active'),
     (SELECT count(*) FROM listing_images WHERE listing_id::text LIKE '10000000-0000-4000-8000-%'),
     (SELECT count(*) FROM search_index WHERE listing_id::text LIKE '10000000-0000-4000-8000-%'),
     (SELECT count(*) FROM transactions t JOIN listings l ON l.id=t.listing_id
       WHERE t.id IN (
         '40000000-0000-4000-8000-000000000002',
         '40000000-0000-4000-8000-000000000003',
         '40000000-0000-4000-8000-000000000004')
         AND l.category='Electronics' AND l.status='sold'
         AND t.completed_at >= NOW() - INTERVAL '90 days'),
     (SELECT count(*) FROM listings WHERE id::text LIKE '10000000-0000-4000-8000-%' AND status='active' AND expires_at <= NOW() + INTERVAL '300 days'),
     (SELECT count(*) FROM search_index s JOIN listings l ON l.id=s.listing_id WHERE l.status <> 'active');")"
[[ "$seed_result" == '15|10|16|10|3|0|0' ]] || {
  echo "Production seed invariants failed: $seed_result" >&2
  exit 1
}

echo 'University identity migration and durable production seed tests passed.'
