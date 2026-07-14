#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

env_file="${ENV_FILE:-backend/.env}"
namespace=campustrade
kubectl="${KUBECTL:-sudo k3s kubectl}"

[[ -f "$env_file" ]] || { echo "Missing protected environment file: $env_file" >&2; exit 1; }

$kubectl -n "$namespace" scale deployment --all --replicas=0 || true
$kubectl -n "$namespace" scale statefulset --all --replicas=0 || true
docker compose -p campusmarket --env-file "$env_file" \
  -f backend/docker-compose.prod.yml up -d --build --remove-orphans
backend/scripts/smoke-test-running.sh

echo "Compose rollback is healthy. Restore the pre-cutover dump only if K3s accepted writes before rollback."
