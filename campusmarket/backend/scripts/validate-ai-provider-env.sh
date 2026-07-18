#!/usr/bin/env bash
set -euo pipefail

shared_env="${1:-}"
provider_env="${2:-}"

fail() {
  local line_number="${1:-}"
  if [[ -n "$line_number" ]]; then
    echo "AI provider environment validation failed at line ${line_number}." >&2
  else
    echo 'AI provider environment validation failed.' >&2
  fi
  exit 1
}

[[ -n "$shared_env" && -f "$shared_env" && -r "$shared_env" ]] || fail

# Provider credentials must never be present in the shared environment because
# that file is injected into every application and observability workload.
if grep -Eq '^[[:space:]]*ANTHROPIC_[A-Z0-9_]*=' "$shared_env"; then
  fail
fi

# A data-only deployment needs only the shared-env isolation check.
[[ -n "$provider_env" ]] || exit 0
[[ -f "$provider_env" && -r "$provider_env" ]] || fail

api_key_count=0
model_count=0
line_number=0
while IFS= read -r line || [[ -n "$line" ]]; do
  ((line_number += 1))
  [[ -z "$line" || "$line" == \#* ]] && continue
  [[ "$line" == *=* ]] || fail "$line_number"

  key="${line%%=*}"
  value="${line#*=}"
  case "$key" in
    ANTHROPIC_API_KEY)
      ((api_key_count += 1))
      [[ "$api_key_count" -eq 1 ]] || fail "$line_number"
      [[ "$value" =~ ^sk-ant-[A-Za-z0-9_-]{20,}$ ]] || fail "$line_number"
      ;;
    ANTHROPIC_MODEL)
      ((model_count += 1))
      [[ "$model_count" -eq 1 ]] || fail "$line_number"
      [[ "$value" =~ ^[A-Za-z0-9._:-]{1,100}$ ]] || fail "$line_number"
      [[ "$value" != replace_* && "$value" != change_* ]] || fail "$line_number"
      ;;
    *) fail "$line_number" ;;
  esac
done <"$provider_env"

[[ "$api_key_count" -eq 1 && "$model_count" -eq 1 ]] || fail
