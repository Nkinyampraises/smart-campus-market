#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

env_file="${ENV_FILE:-backend/.env}"
ai_env_file="${AI_ENV_FILE:-}"
image_tag="${IMAGE_TAG:?Set IMAGE_TAG to the imported application image tag}"
namespace=campustrade
backup_dir="${BACKUP_DIR:-/srv/campustrade/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_dir/campustrade-pre-k3s-$timestamp.dump"
kubectl="${KUBECTL:-sudo k3s kubectl}"
provider_validator="$root_dir/backend/scripts/validate-ai-provider-env.sh"

[[ -f "$env_file" ]] || { echo "Missing protected environment file: $env_file" >&2; exit 1; }
[[ -n "$ai_env_file" && -f "$ai_env_file" ]] || {
  echo 'A protected AI_ENV_FILE is required for production cutover.' >&2
  exit 1
}
# This preflight is deliberately before backup, restore, or legacy shutdown.
bash "$provider_validator" "$env_file" "$ai_env_file"
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"

mkdir -p "$backup_dir"
[[ -w "$backup_dir" ]] || {
  echo "Backup directory is not writable: $backup_dir" >&2
  exit 1
}
docker container inspect campusmarket-postgres-1 >/dev/null
docker exec campusmarket-postgres-1 pg_dump -Fc -U "$DB_USER" -d "$DB_NAME" >"$backup_file"
test -s "$backup_file"
chmod 0600 "$backup_file"

ENV_FILE="$env_file" bash k8s/scripts/deploy.sh data-only
$kubectl -n "$namespace" exec -i statefulset/postgres -- \
  pg_restore --clean --if-exists --no-owner --no-acl -U "$DB_USER" -d "$DB_NAME" <"$backup_file"

docker compose -p campusmarket --env-file "$env_file" \
  -f backend/docker-compose.prod.yml down --remove-orphans

IMAGE_TAG="$image_tag" ENV_FILE="$env_file" AI_ENV_FILE="$ai_env_file" \
  bash k8s/scripts/deploy.sh full
$kubectl -n kube-system rollout status deployment/traefik --timeout=300s
BASE_URL="${BASE_URL:-http://127.0.0.1}" bash backend/scripts/smoke-test-running.sh

echo "Cutover succeeded. Rollback backup: $backup_file"
