#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1}"
GRAFANA_URL="${GRAFANA_URL:-http://127.0.0.1:3009}"
GRAFANA_CDN_URL="${GRAFANA_CDN_URL:-https://4-168-192-5.sslip.io:80}"
GRAFANA_VERSION="${GRAFANA_VERSION:-13.0.2}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_DELAY="${RETRY_DELAY:-3}"

check_url() {
  local url="$1"
  local name="$2"
  local attempt

  for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do
    if curl --fail --silent --show-error "$url" >/dev/null; then
      echo "Smoke test passed: ${name}"
      return 0
    fi
    sleep "$RETRY_DELAY"
  done

  echo "Smoke test failed: ${name} (${url})" >&2
  return 1
}

check_status() {
  local url="$1"
  local expected_status="$2"
  local name="$3"
  local actual_status
  local attempt

  for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do
    actual_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url" || true)"
    if [[ "$actual_status" == "$expected_status" ]]; then
      echo "Smoke test passed: ${name}"
      return 0
    fi
    sleep "$RETRY_DELAY"
  done

  echo "Smoke test failed: ${name} (${url}) returned ${actual_status}, expected ${expected_status}" >&2
  return 1
}

check_content_type() {
  local url="$1"
  local expected_content_type="$2"
  local name="$3"
  local actual_content_type
  local attempt

  for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do
    actual_content_type="$(curl --fail --silent --show-error --output /dev/null --write-out '%{content_type}' "$url" || true)"
    if [[ "$actual_content_type" == "$expected_content_type" ]]; then
      echo "Smoke test passed: ${name}"
      return 0
    fi
    sleep "$RETRY_DELAY"
  done

  echo "Smoke test failed: ${name} (${url}) returned ${actual_content_type}, expected ${expected_content_type}" >&2
  return 1
}

check_contains() {
  local url="$1"
  local expected_text="$2"
  local name="$3"
  local attempt

  for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do
    if curl --fail --silent --show-error "$url" | grep --fixed-strings "$expected_text" >/dev/null; then
      echo "Smoke test passed: ${name}"
      return 0
    fi
    sleep "$RETRY_DELAY"
  done

  echo "Smoke test failed: ${name} (${url}) does not contain ${expected_text}" >&2
  return 1
}

grafana_asset_prefix="${GRAFANA_CDN_URL}/grafana-oss/${GRAFANA_VERSION}/public"

check_url "${BASE_URL}/" "frontend"
check_url "${BASE_URL}/health" "API gateway health"
check_url "${BASE_URL}/api/admin/public-stats" "public statistics API"
check_content_type "${grafana_asset_prefix}/build/img/fav32.png" "image/png" "public Grafana static asset"
check_status "${grafana_asset_prefix}/api/health" "404" "Grafana API isolation from public asset route"
check_contains "${GRAFANA_URL}/login" "${grafana_asset_prefix}/" "Grafana CDN configuration"

echo "All running-stack smoke tests passed."
