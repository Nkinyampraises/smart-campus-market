#!/usr/bin/env bash
set -euo pipefail

[[ "${EUID}" -eq 0 ]] || {
  echo 'AI provider rotation must run as root on the production VPS.' >&2
  exit 1
}

source_file="${1:-}"
shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
canonical_file="$shared_dir/ai-provider.env"
backend_env="$shared_dir/backend.env"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
deployment_group="${DEPLOYMENT_GROUP:-campustrade-deploy}"

[[ -n "$source_file" && -f "$source_file" && -r "$source_file" ]] || {
  echo 'Usage: rotate-ai-provider-secret.sh /root/new-ai-provider.env' >&2
  exit 2
}
getent group "$deployment_group" >/dev/null || {
  echo 'The production deployment group does not exist.' >&2
  exit 1
}
bash "$root_dir/backend/scripts/validate-ai-provider-env.sh" "$backend_env" "$source_file"

if [[ -f "$canonical_file" ]] && cmp -s "$source_file" "$canonical_file"; then
  chown root:"$deployment_group" "$canonical_file"
  chmod 0640 "$canonical_file"
else
  temporary_file="$(mktemp "$shared_dir/.ai-provider.env.XXXXXX")"
  trap 'rm -f "$temporary_file"' EXIT
  install -o root -g "$deployment_group" -m 0640 "$source_file" "$temporary_file"
  mv -f "$temporary_file" "$canonical_file"
  trap - EXIT
fi

# A one-shot Jenkins hook schedules the full tested deployment after restart.
install -o jenkins -g jenkins -m 0600 \
  "$root_dir/backend/scripts/trigger-jenkins-build.groovy" \
  /var/lib/jenkins/init.groovy.d/50-campustrade-trigger.groovy
systemctl restart jenkins

echo 'AI provider configuration rotated; Jenkins will run the production release pipeline.'
