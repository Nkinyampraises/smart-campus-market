#!/usr/bin/env bash
set -euo pipefail

[[ "${EUID}" -eq 0 ]] || { echo 'Production seed verification must run as root.' >&2; exit 1; }

shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
credential_file="$shared_dir/operator-credentials.env"
production_env="$shared_dir/backend.env"
base_url="${BASE_URL:-http://127.0.0.1}"

[[ -r "$credential_file" && -r "$production_env" ]] || {
  echo 'Protected production configuration is unavailable.' >&2
  exit 1
}
# shellcheck disable=SC1090
source "$credential_file"
# shellcheck disable=SC1090
source "$production_env"

counts="$(k3s kubectl -n campustrade exec postgres-0 -- \
  psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT
    (SELECT count(*) FROM users WHERE email ~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'),
    (SELECT count(*) FROM users WHERE email !~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$'),
    (SELECT count(*) FROM listings WHERE id::text LIKE '10000000-0000-4000-8000-%'),
    (SELECT count(*) FROM listings WHERE id::text LIKE '10000000-0000-4000-8000-%' AND status='active'),
    (SELECT count(*) FROM listing_images WHERE listing_id::text LIKE '10000000-0000-4000-8000-%'),
    (SELECT count(*) FROM search_index WHERE listing_id::text LIKE '10000000-0000-4000-8000-%'),
    (SELECT count(*) FROM offers WHERE id::text LIKE '20000000-0000-4000-8000-%'),
    (SELECT count(*) FROM messages WHERE id::text LIKE '31000000-0000-4000-8000-%'),
    (SELECT count(*) FROM transactions t JOIN listings l ON l.id=t.listing_id
      WHERE t.id IN (
        '40000000-0000-4000-8000-000000000002',
        '40000000-0000-4000-8000-000000000003',
        '40000000-0000-4000-8000-000000000004')
        AND l.category='Electronics' AND l.status='sold'
        AND t.completed_at >= NOW() - INTERVAL '90 days'),
    (SELECT count(*) FROM listings
      WHERE id::text LIKE '10000000-0000-4000-8000-%'
        AND status='active' AND expires_at <= NOW() + INTERVAL '300 days'),
    (SELECT count(*) FROM search_index s JOIN listings l ON l.id=s.listing_id
      WHERE s.listing_id::text LIKE '10000000-0000-4000-8000-%' AND l.status <> 'active');")"
IFS='|' read -r \
  user_count invalid_user_count listing_count active_count image_count search_count \
  offer_count message_count electronics_history_count expiring_active_count inactive_search_count \
  <<<"$counts"

[[ "$user_count" -ge 6 ]]
[[ "$invalid_user_count" == 0 ]]
[[ "$listing_count" == 15 ]]
[[ "$active_count" == 10 ]]
[[ "$image_count" -ge 16 ]]
[[ "$search_count" == "$active_count" ]]
[[ "$offer_count" == 2 ]]
[[ "$message_count" == 2 ]]
[[ "$electronics_history_count" == 3 ]]
[[ "$expiring_active_count" == 0 ]]
[[ "$inactive_search_count" == 0 ]]

for expected_email in \
  "$CAMPUSTRADE_ADMIN_EMAIL" "$CAMPUSTRADE_DEMO_EMAIL" \
  "$SEED_USER_1_EMAIL" "$SEED_USER_2_EMAIL" "$SEED_USER_3_EMAIL" "$SEED_USER_4_EMAIL"
do
  account_count="$(printf "SELECT count(*) FROM users WHERE email=:'expected_email';\n" | \
    k3s kubectl -n campustrade exec -i postgres-0 -- \
      psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -v "expected_email=$expected_email")"
  [[ "$account_count" == 1 ]]
done

listings_json="$(curl -fsS "$base_url/api/listings?limit=100")"
jq -e 'length >= 10 and all(.[]; (.images | type == "array") and (.images | length >= 1))' \
  <<<"$listings_json" >/dev/null
curl -fsS "$base_url/api/search?q=MacBook&limit=20" | \
  jq -e '.results | length >= 1' >/dev/null

login_works() {
  local email="$1"
  local password="$2"
  local payload
  payload="$(jq -n --arg email "$email" --arg password "$password" '{email:$email,password:$password}')"
  curl -fsS -H 'Content-Type: application/json' -X POST -d "$payload" \
    "$base_url/api/auth/login" | jq -e '.accessToken and .user.id' >/dev/null
}

login_works "$CAMPUSTRADE_ADMIN_EMAIL" "$CAMPUSTRADE_ADMIN_PASSWORD"
login_works "$SEED_USER_1_EMAIL" "$SEED_USER_1_PASSWORD"

first_image="$(jq -r '.[0].images[0]' <<<"$listings_json")"
[[ "$first_image" == https://images.unsplash.com/* ]]
curl -fsSL --retry 3 --max-time 20 --range 0-1023 "$first_image" -o /dev/null

printf 'Production seed verified: university_users=%s listings=%s active=%s images=%s search=%s electronics_history=%s offers=%s messages=%s\n' \
  "$user_count" "$listing_count" "$active_count" "$image_count" "$search_count" \
  "$electronics_history_count" "$offer_count" "$message_count"
