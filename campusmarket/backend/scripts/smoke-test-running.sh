#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_DELAY="${RETRY_DELAY:-3}"

check_endpoint() {
  local path="$1"
  local name="$2"
  local attempt

  for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do
    if curl --fail --silent --show-error "${BASE_URL}${path}" >/dev/null; then
      echo "Smoke test passed: ${name}"
      return 0
    fi
    sleep "$RETRY_DELAY"
  done

  echo "Smoke test failed: ${name} (${BASE_URL}${path})" >&2
  return 1
}

check_endpoint "/" "frontend"
check_endpoint "/health" "API gateway health"
check_endpoint "/api/admin/public-stats" "public statistics API"

echo "All running-stack smoke tests passed."
