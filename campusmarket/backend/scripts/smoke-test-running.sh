#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1}"
GRAFANA_URL="${GRAFANA_URL:-http://127.0.0.1:3009}"
PUBLIC_GRAFANA_URL="${PUBLIC_GRAFANA_URL:-https://grafana.4-168-192-5.sslip.io:80}"
PUBLIC_PROMETHEUS_URL="${PUBLIC_PROMETHEUS_URL:-https://prometheus.4-168-192-5.sslip.io:80}"
PUBLIC_JENKINS_URL="${PUBLIC_JENKINS_URL:-https://jenkins.4-168-192-5.sslip.io:80}"
PUBLIC_SONAR_URL="${PUBLIC_SONAR_URL:-https://sonar.4-168-192-5.sslip.io:80}"
MAX_RETRIES="${MAX_RETRIES:-60}"
RETRY_DELAY="${RETRY_DELAY:-3}"

env_file="${ENV_FILE:-backend/.env}"
read_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$env_file" | tail -1
}
prometheus_username="${PROMETHEUS_USERNAME:-$(read_env_value GRAFANA_USER)}"
prometheus_password="${PROMETHEUS_PASSWORD:-$(read_env_value GRAFANA_PASS)}"

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

check_url_with_basic_auth() {
  local url="$1"
  local name="$2"
  local attempt

  for ((attempt = 1; attempt <= MAX_RETRIES; attempt++)); do
    if curl --fail --silent --show-error \
      --user "$prometheus_username:$prometheus_password" "$url" >/dev/null; then
      echo "Smoke test passed: ${name}"
      return 0
    fi
    sleep "$RETRY_DELAY"
  done

  echo "Smoke test failed: ${name} (${url})" >&2
  return 1
}

check_prometheus_default_query() {
  local final_url

  final_url="$(curl --fail --silent --show-error --location \
    --output /dev/null --write-out '%{url_effective}' \
    --user "$prometheus_username:$prometheus_password" \
    "${PUBLIC_PROMETHEUS_URL}/")" || {
      echo "Smoke test failed: Prometheus default health query is unavailable" >&2
      return 1
    }

  if [[ "$final_url" != "${PUBLIC_PROMETHEUS_URL}/query?g0.expr=up"* ]]; then
    echo "Smoke test failed: Prometheus root did not open the default health query (${final_url})" >&2
    return 1
  fi

  echo "Smoke test passed: Prometheus default health query"
}

check_url "${BASE_URL}/" "frontend"
check_url "${BASE_URL}/health" "API gateway health"
check_url "${BASE_URL}/api/admin/public-stats" "public statistics API"
check_url "${GRAFANA_URL}/api/health" "VPS Grafana health"
check_url "${PUBLIC_GRAFANA_URL}/api/health" "public VPS Grafana route"
check_url_with_basic_auth "${PUBLIC_PROMETHEUS_URL}/-/ready" "authenticated public VPS Prometheus route"
check_prometheus_default_query
check_url "${PUBLIC_JENKINS_URL}/login" "public VPS Jenkins route"
check_url "${PUBLIC_SONAR_URL}/api/system/status" "public VPS SonarQube route"

echo "All running-stack smoke tests passed."
