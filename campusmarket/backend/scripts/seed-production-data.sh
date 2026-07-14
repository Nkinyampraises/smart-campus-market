#!/usr/bin/env bash
set -euo pipefail

[[ "${EUID}" -eq 0 ]] || { echo 'Production seeding must run as root.' >&2; exit 1; }

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
credential_file="$shared_dir/operator-credentials.env"
production_env="$shared_dir/backend.env"
base_url="${BASE_URL:-http://127.0.0.1}"

[[ -r "$credential_file" ]] || { echo "Missing operator credentials: $credential_file" >&2; exit 1; }
[[ -r "$production_env" ]] || { echo "Missing production environment: $production_env" >&2; exit 1; }
[[ -r "$root_dir/backend/seed-production.sql" ]] || { echo 'Missing production seed SQL.' >&2; exit 1; }

# shellcheck disable=SC1090
source "$credential_file"
# shellcheck disable=SC1090
source "$production_env"

required=(
  DB_USER DB_NAME CAMPUSTRADE_ADMIN_EMAIL CAMPUSTRADE_DEMO_EMAIL
  SEED_USER_1_EMAIL SEED_USER_1_PASSWORD SEED_USER_2_EMAIL SEED_USER_2_PASSWORD
  SEED_USER_3_EMAIL SEED_USER_3_PASSWORD SEED_USER_4_EMAIL SEED_USER_4_PASSWORD
)
for variable in "${required[@]}"; do
  [[ -n "${!variable:-}" ]] || { echo "Required seed variable is empty: $variable" >&2; exit 1; }
done

exec 9>"$shared_dir/seed-production.lock"
flock -n 9 || { echo 'Another production seed operation is already running.' >&2; exit 1; }

for _ in $(seq 1 60); do
  curl -fsS "$base_url/health" >/dev/null 2>&1 && break
  sleep 3
done
curl -fsS "$base_url/health" >/dev/null

register_user() {
  local email="$1"
  local password="$2"
  local first_name="$3"
  local last_name="$4"
  local response_file status payload

  if [[ "$(printf "SELECT count(*) FROM users WHERE email=:'seed_email';\n" | \
    k3s kubectl -n campustrade exec -i postgres-0 -- \
      psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -v "seed_email=$email")" == 1 ]]
  then
    return 0
  fi

  response_file="$(mktemp)"
  payload="$(jq -n \
    --arg email "$email" --arg password "$password" \
    --arg first_name "$first_name" --arg last_name "$last_name" \
    --arg campus_zone 'Main Campus' \
    '{email:$email,password:$password,first_name:$first_name,last_name:$last_name,campus_zone:$campus_zone}')"
  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -H 'Content-Type: application/json' -X POST -d "$payload" \
    "$base_url/api/auth/register")"
  rm -f "$response_file"
  [[ "$status" == 201 || "$status" == 409 ]] || {
    echo "Seed account registration failed for $email (HTTP $status)." >&2
    return 1
  }
}

register_user "$SEED_USER_1_EMAIL" "$SEED_USER_1_PASSWORD" Amina Nfor
register_user "$SEED_USER_2_EMAIL" "$SEED_USER_2_PASSWORD" Joel Tamba
register_user "$SEED_USER_3_EMAIL" "$SEED_USER_3_PASSWORD" Grace Mbi
register_user "$SEED_USER_4_EMAIL" "$SEED_USER_4_PASSWORD" Eric Nji

k3s kubectl -n campustrade exec -i postgres-0 -- \
  psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
    -v "admin_email=$CAMPUSTRADE_ADMIN_EMAIL" \
    -v "demo_email=$CAMPUSTRADE_DEMO_EMAIL" \
    -v "seed_user_1_email=$SEED_USER_1_EMAIL" \
    -v "seed_user_2_email=$SEED_USER_2_EMAIL" \
    -v "seed_user_3_email=$SEED_USER_3_EMAIL" \
    -v "seed_user_4_email=$SEED_USER_4_EMAIL" \
  <"$root_dir/backend/seed-production.sql" >/dev/null

BASE_URL="$base_url" DEPLOY_SHARED_DIR="$shared_dir" \
  bash "$root_dir/backend/scripts/verify-production-seed.sh"
echo 'Production demonstration data is ready.'
