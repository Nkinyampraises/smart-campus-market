#!/usr/bin/env bash
set -euo pipefail

contract_url="${AUTH_CONTRACT_URL:-http://127.0.0.1/api/auth/health}"
expected_contract='ictuniversity.edu.cm:v1'

payload="$(curl --fail --silent --show-error --max-time 10 "$contract_url")" || {
  echo 'Strict authentication release probe failed.' >&2
  exit 1
}

jq -e --arg expected "$expected_contract" \
  '.contracts.university_email == $expected' <<<"$payload" >/dev/null || {
    echo 'Strict authentication release contract is not active.' >&2
    exit 1
  }

echo 'Strict university authentication release is active.'
