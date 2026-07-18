#!/usr/bin/env bash
set -euo pipefail

expected_contract='ictuniversity.edu.cm:v1'

if [[ -n "${AUTH_CONTRACT_URL:-}" ]]; then
  payload="$(curl --fail --silent --show-error --max-time 10 "$AUTH_CONTRACT_URL")" || {
    echo 'Strict authentication release probe failed.' >&2
    exit 1
  }
else
  payload="$(k3s kubectl get --raw \
    '/api/v1/namespaces/campustrade/services/http:auth-service:3001/proxy/health')" || {
    echo 'Strict authentication release probe failed.' >&2
    exit 1
  }
fi

[[ -n "$payload" ]] || {
  echo 'Strict authentication release probe failed.' >&2
  exit 1
}

jq -e --arg expected "$expected_contract" \
  '.contracts.university_email == $expected' <<<"$payload" >/dev/null || {
    echo 'Strict authentication release contract is not active.' >&2
    exit 1
  }

echo 'Strict university authentication release is active.'
