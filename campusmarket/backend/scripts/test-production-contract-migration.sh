#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$root_dir/backend/migrations/20260718_enforce_production_contract.sql"
wrapper="$root_dir/backend/scripts/enforce-production-contract.sh"
probe="$root_dir/backend/scripts/verify-strict-auth-release.sh"
container="campustrade-production-contract-test-$$"
database=contract_test

cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

[[ -r "$migration" ]] || { echo 'Missing production contract migration.' >&2; exit 1; }
[[ -x "$wrapper" && -x "$probe" ]] || { echo 'Missing executable production contract scripts.' >&2; exit 1; }
bash -n "$wrapper"
bash -n "$probe"

docker run -d --name "$container" \
  -e POSTGRES_DB="$database" \
  -e POSTGRES_USER=campustrade \
  -e POSTGRES_PASSWORD=test-only-password \
  postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  docker exec "$container" pg_isready -U campustrade -d "$database" >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$container" pg_isready -U campustrade -d "$database" >/dev/null

psql_exec() {
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U campustrade -d "$database" "$@"
}

psql_exec >/dev/null <<'SQL'
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL
);
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  category VARCHAR(100) NOT NULL
);
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id),
  final_price INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO users VALUES
  ('00000000-0000-4000-8000-000000000001', 'student@ictuniversity.edu.cm'),
  ('00000000-0000-4000-8000-000000000009', 'external@gmail.com');
SQL

if psql_exec <"$migration" >/dev/null 2>&1; then
  echo 'Production contract migration accepted noncanonical seed data.' >&2
  exit 1
fi
[[ "$(psql_exec -Atc "SELECT count(*) FROM pg_constraint WHERE conrelid='users'::regclass AND conname='users_university_email_check';")" == 0 ]]
[[ "$(psql_exec -Atc "SELECT count(*) FROM pg_indexes WHERE tablename='transactions' AND indexname='idx_transactions_listing_completed_positive';")" == 0 ]]
psql_exec -c "DELETE FROM users WHERE email='external@gmail.com';" >/dev/null

psql_exec <"$migration" >/dev/null
psql_exec <"$migration" >/dev/null

constraint_state="$(psql_exec -Atc \
  "SELECT convalidated FROM pg_constraint
   WHERE conrelid='users'::regclass AND conname='users_university_email_check';")"
[[ "$constraint_state" == t ]]
index_count="$(psql_exec -Atc \
  "SELECT count(*) FROM pg_indexes
   WHERE tablename='transactions' AND indexname='idx_transactions_listing_completed_positive';")"
[[ "$index_count" == 1 ]]
constraint_definition="$(psql_exec -Atc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='users'::regclass AND conname='users_university_email_check';")"
[[ "$constraint_definition" == *'lower(btrim'* && "$constraint_definition" == *'char_length'* && "$constraint_definition" == *'ictuniversity'* ]]
index_definition="$(psql_exec -Atc "SELECT indexdef FROM pg_indexes WHERE tablename='transactions' AND indexname='idx_transactions_listing_completed_positive';")"
[[ "$index_definition" == *'(listing_id, completed_at DESC)'* && "$index_definition" == *'WHERE (final_price > 0)'* ]]

if psql_exec -c "INSERT INTO users VALUES ('00000000-0000-4000-8000-000000000002', 'student@gmail.com');" >/dev/null 2>&1; then
  echo 'Production email constraint accepted an external identity.' >&2
  exit 1
fi
if psql_exec -c "INSERT INTO users VALUES ('00000000-0000-4000-8000-000000000003', 'Student@ictuniversity.edu.cm');" >/dev/null 2>&1; then
  echo 'Production email constraint accepted a noncanonical identity.' >&2
  exit 1
fi

probe_dir="$(mktemp -d)"
cat >"$probe_dir/curl" <<'EOF'
#!/usr/bin/env sh
printf '%s' "$FAKE_AUTH_PAYLOAD"
EOF
chmod +x "$probe_dir/curl"
if PATH="$probe_dir:$PATH" FAKE_AUTH_PAYLOAD='{"contracts":{}}' bash "$probe" >/dev/null 2>&1; then
  echo 'Strict-auth probe accepted a missing contract.' >&2
  exit 1
fi
if PATH="$probe_dir:$PATH" FAKE_AUTH_PAYLOAD='{"contracts":{"university_email":"wrong:v1"}}' bash "$probe" >/dev/null 2>&1; then
  echo 'Strict-auth probe accepted the wrong contract.' >&2
  exit 1
fi
PATH="$probe_dir:$PATH" FAKE_AUTH_PAYLOAD='{"contracts":{"university_email":"ictuniversity.edu.cm:v1"}}' bash "$probe" >/dev/null
rm -rf "$probe_dir"

echo 'Production database contract migration tests passed.'
