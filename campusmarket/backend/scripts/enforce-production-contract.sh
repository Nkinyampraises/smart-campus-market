#!/usr/bin/env bash
set -euo pipefail

[[ "${EUID}" -eq 0 ]] || {
  echo 'Production database contract enforcement must run as root.' >&2
  exit 1
}

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
production_env="$shared_dir/backend.env"
migration="$root_dir/backend/migrations/20260718_enforce_production_contract.sql"

[[ -r "$production_env" ]] || { echo 'Missing protected production environment.' >&2; exit 1; }
[[ -r "$migration" ]] || { echo 'Missing production contract migration.' >&2; exit 1; }
# shellcheck disable=SC1090
source "$production_env"
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"

exec 9>"$shared_dir/production-contract.lock"
flock -n 9 || { echo 'Another production contract operation is already running.' >&2; exit 1; }

# The database constraint is safe only after the strict auth code is live.
bash "$root_dir/backend/scripts/verify-strict-auth-release.sh"

invalid_count="$(k3s kubectl -n campustrade exec postgres-0 -- \
  psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT count(*) FROM users
   WHERE email <> lower(btrim(email))
      OR char_length(email) > 255
      OR email !~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$';")"
[[ "$invalid_count" == 0 ]] || {
  echo 'Refusing database enforcement: noncanonical users remain.' >&2
  exit 1
}

k3s kubectl -n campustrade exec -i postgres-0 -- \
  psql -q -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
  <"$migration" >/dev/null

verification="$(k3s kubectl -n campustrade exec postgres-0 -- \
  psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT concat_ws('|',
     (SELECT convalidated FROM pg_constraint
       WHERE conrelid='users'::regclass AND conname='users_university_email_check'),
     (SELECT count(*) FROM pg_indexes
       WHERE tablename='transactions' AND indexname='idx_transactions_listing_completed_positive'));")"
[[ "$verification" == 't|1' ]] || {
  echo 'Production database contract verification failed.' >&2
  exit 1
}

echo 'Production database email constraint and AI comparison index are enforced.'
