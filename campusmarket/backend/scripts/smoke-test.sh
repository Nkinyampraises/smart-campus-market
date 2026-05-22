#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
fi

docker compose -f backend/docker-compose.prod.yml up -d --build

check_endpoint() {
  local url="$1"
  local name="$2"
  local max_retries=30
  local delay=3
  local count=0

  until curl -fsS "$url" >/dev/null; do
    count=$((count + 1))
    if [[ "$count" -ge "$max_retries" ]]; then
      echo "Smoke test failed: $name ($url) not healthy after $((max_retries * delay))s"
      docker compose -f backend/docker-compose.prod.yml logs --tail=200
      exit 1
    fi
    sleep "$delay"
  done
  echo "Smoke test passed: $name"
}

check_endpoint "http://localhost/health" "nginx edge"
check_endpoint "http://localhost:80/health" "api gateway via nginx"
check_endpoint "http://localhost:80/api/admin/public-stats" "public stats route"

echo "All smoke tests passed."
