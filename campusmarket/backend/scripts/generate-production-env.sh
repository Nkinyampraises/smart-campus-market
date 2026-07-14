#!/usr/bin/env bash
set -euo pipefail

output_env="${OUTPUT_ENV:-/srv/campustrade/shared/backend.env}"
source_env="${SOURCE_ENV:-}"
allow_unprivileged="${ALLOW_UNPRIVILEGED:-false}"

if [[ "$allow_unprivileged" != true && "$output_env" != /srv/campustrade/shared/backend.env ]]; then
  echo "Refusing to write an unexpected production environment path: $output_env" >&2
  exit 1
fi
if [[ "$allow_unprivileged" != true && "${EUID}" -ne 0 ]]; then
  echo 'Production environment generation must run as root.' >&2
  exit 1
fi

command -v openssl >/dev/null
command -v docker >/dev/null
if [[ "$allow_unprivileged" == true ]]; then
  install -d -m 0700 "$(dirname "$output_env")"
else
  getent group campustrade-deploy >/dev/null || groupadd --system campustrade-deploy
  id azureuser >/dev/null 2>&1 || {
    echo 'Required production owner azureuser does not exist.' >&2
    exit 1
  }
  install -d -o azureuser -g campustrade-deploy -m 2770 "$(dirname "$output_env")"
fi
umask 077

source_value() {
  local key="$1"
  local fallback="$2"
  local value=''

  if [[ -n "$source_env" && -r "$source_env" ]]; then
    value="$(sed -n "s/^${key}=//p" "$source_env" | head -1)"
  fi
  if [[ -z "$value" || "$value" == change_me* || "$value" == replace_with* ]]; then
    value="$fallback"
  fi
  printf '%s' "$value"
}

random_hex() {
  openssl rand -hex "$1"
}

mapfile -t vapid_keys < <(
  docker run --rm -i node:20-alpine node - <<'NODE'
const { generateKeyPairSync } = require('node:crypto');
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });
const rawPublicKey = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(publicJwk.x, 'base64url'),
  Buffer.from(publicJwk.y, 'base64url'),
]);
process.stdout.write(`${rawPublicKey.toString('base64url')}\n${privateJwk.d}\n`);
NODE
)
[[ "${#vapid_keys[@]}" == 2 && "${#vapid_keys[0]}" -ge 80 && "${#vapid_keys[1]}" -ge 32 ]] || {
  echo 'Failed to generate VAPID credentials.' >&2
  exit 1
}

google_client_id="$(source_value GOOGLE_CLIENT_ID '')"
smtp_host="$(source_value SMTP_HOST 'smtp.gmail.com')"
smtp_port="$(source_value SMTP_PORT '587')"
smtp_user="$(source_value SMTP_USER '')"
smtp_pass="$(source_value SMTP_PASS '')"
from_email="$(source_value FROM_EMAIL 'noreply@campustrade.local')"
vapid_email="$(source_value VAPID_EMAIL 'mailto:admin@campustrade.local')"

temporary_env="$(mktemp "${output_env}.XXXXXX")"
cleanup() { rm -f "$temporary_env"; }
trap cleanup EXIT

{
  printf 'DB_HOST=postgres\n'
  printf 'DB_PORT=5432\n'
  printf 'DB_USER=campustrade\n'
  printf 'DB_PASSWORD=%s\n' "$(random_hex 32)"
  printf 'DB_NAME=campustrade\n'
  printf 'DB_SSL=false\n'
  printf 'REDIS_HOST=redis\n'
  printf 'REDIS_PORT=6379\n'
  printf 'REDIS_URL=\n'
  printf 'JWT_SECRET=%s\n' "$(random_hex 48)"
  printf 'NPM_CONFIG_STRICT_SSL=true\n'
  printf 'SMTP_HOST=%s\n' "$smtp_host"
  printf 'SMTP_PORT=%s\n' "$smtp_port"
  printf 'SMTP_USER=%s\n' "$smtp_user"
  printf 'SMTP_PASS=%s\n' "$smtp_pass"
  printf 'FROM_EMAIL=%s\n' "$from_email"
  printf 'FRONTEND_URL=http://4.168.192.5\n'
  printf 'AUTH_SERVICE_URL=http://auth-service:3001\n'
  printf 'USER_SERVICE_URL=http://user-service:3002\n'
  printf 'LISTING_SERVICE_URL=http://listing-service:3003\n'
  printf 'CHAT_SERVICE_URL=http://chat-service:3004\n'
  printf 'ADMIN_SERVICE_URL=http://admin-service:3005\n'
  printf 'AI_SERVICE_URL=http://ai-service:3006\n'
  printf 'SEARCH_SERVICE_URL=http://search-service:3007\n'
  printf 'NOTIFICATION_SERVICE_URL=http://notification-service:3008\n'
  printf 'GRAFANA_USER=campusadmin\n'
  printf 'GRAFANA_PASS=%s\n' "$(random_hex 32)"
  printf 'GOOGLE_CLIENT_ID=%s\n' "$google_client_id"
  printf 'VAPID_PUBLIC_KEY=%s\n' "${vapid_keys[0]}"
  printf 'VAPID_PRIVATE_KEY=%s\n' "${vapid_keys[1]}"
  printf 'VAPID_EMAIL=%s\n' "$vapid_email"
  printf 'SONAR_DB_USER=sonar\n'
  printf 'SONAR_DB_NAME=sonarqube\n'
  printf 'SONAR_DB_PASSWORD=%s\n' "$(random_hex 32)"
} >"$temporary_env"

if [[ "$allow_unprivileged" == true ]]; then
  install -m 0600 "$temporary_env" "$output_env"
else
  install -o azureuser -g campustrade-deploy -m 0640 "$temporary_env" "$output_env"
fi

echo "Production environment generated at $output_env (secret values suppressed)."
