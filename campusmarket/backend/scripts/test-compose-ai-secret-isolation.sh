#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compose_file="$root_dir/backend/docker-compose.ai.yml"
base_compose_file="$root_dir/backend/docker-compose.prod.yml"
production_guide="$root_dir/backend/PRODUCTION.md"

[[ -r "$compose_file" && -r "$base_compose_file" && -r "$production_guide" ]]

# The dedicated file must be attached exactly once and only beneath ai-service.
awk '
  /^  [[:alnum:]][[:alnum:]_-]*:$/ {
    service = $1
    sub(/:$/, "", service)
  }
  /AI_PROVIDER_ENV_FILE/ {
    references++
    if (service == "ai-service" && previous ~ /^    env_file:$/) {
      ai_references++
    }
  }
  { previous = $0 }
  END { exit !(references == 1 && ai_references == 1) }
' "$compose_file"

# Provider values must not be copied into the shared environment anchor or any
# other service declaration.
if grep -Eq 'ANTHROPIC_(API_KEY|MODEL)' "$compose_file"; then
  echo 'Anthropic values must enter Compose only through the ai-service env_file.' >&2
  exit 1
fi
! grep -Fq 'AI_PROVIDER_ENV_FILE' "$base_compose_file"

grep -Fq '/srv/campustrade/shared/ai-provider.env' "$production_guide"
grep -Fq 'only on `ai-service`' "$production_guide"
grep -Fq -- '-f docker-compose.prod.yml -f docker-compose.ai.yml' "$production_guide"

echo 'Compose AI provider isolation tests passed.'
