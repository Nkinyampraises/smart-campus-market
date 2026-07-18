#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

env_file="${ENV_FILE:-backend/.env}"
ai_env_file="${AI_ENV_FILE:-/srv/campustrade/shared/ai-provider.env}"
namespace=campustrade
kubectl="${KUBECTL:-sudo k3s kubectl}"

[[ -f "$env_file" ]] || { echo "Missing protected environment file: $env_file" >&2; exit 1; }
[[ -f "$ai_env_file" ]] || { echo 'Missing protected AI provider environment.' >&2; exit 1; }
# Validate both files before scaling any production workload down.
bash backend/scripts/validate-ai-provider-env.sh "$env_file" "$ai_env_file"

$kubectl -n "$namespace" scale deployment --all --replicas=0 || true
$kubectl -n "$namespace" scale statefulset --all --replicas=0 || true
AI_PROVIDER_ENV_FILE="$ai_env_file" \
  docker compose -p campusmarket --env-file "$env_file" \
  -f backend/docker-compose.prod.yml -f backend/docker-compose.ai.yml \
  up -d --build --remove-orphans
backend/scripts/smoke-test-running.sh

echo "Compose rollback is healthy. Restore the pre-cutover dump only if K3s accepted writes before rollback."
