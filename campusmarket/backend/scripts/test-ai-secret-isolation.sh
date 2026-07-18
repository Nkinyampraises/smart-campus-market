#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
example="$root_dir/backend/ai-provider.env.example"
validator="$root_dir/backend/scripts/validate-ai-provider-env.sh"
deploy_script="$root_dir/k8s/scripts/deploy.sh"
applications="$root_dir/k8s/base/applications.yaml"
jenkinsfile="$root_dir/Jenkinsfile"
jenkins_config="$root_dir/backend/scripts/configure-jenkins-job.groovy"
ansible_deploy="$root_dir/ansible/playbooks/deploy-platform.yml"
rebuild_script="$root_dir/backend/scripts/rebuild-vps-from-scratch.sh"
migration_script="$root_dir/k8s/scripts/migrate-and-cutover.sh"
rollback_script="$root_dir/k8s/scripts/rollback-to-compose.sh"

[[ -r "$example" && -x "$validator" ]] || {
  echo 'Missing AI provider configuration contract.' >&2
  exit 1
}
[[ "$(grep -c '^ANTHROPIC_API_KEY=' "$example")" == 1 ]]
[[ "$(grep -c '^ANTHROPIC_MODEL=' "$example")" == 1 ]]
[[ "$(grep -c '^[A-Z][A-Z0-9_]*=' "$example")" == 2 ]]
grep -qx 'ANTHROPIC_API_KEY=replace_with_anthropic_api_key' "$example"
grep -qx 'ANTHROPIC_MODEL=claude-sonnet-5' "$example"

work_dir="$(mktemp -d)"
cleanup() { rm -rf "$work_dir"; }
trap cleanup EXIT
shared="$work_dir/backend.env"
provider="$work_dir/ai-provider.env"
printf 'JWT_SECRET=test-only\n' >"$shared"
printf '%s\n' \
  'ANTHROPIC_API_KEY=sk-ant-test_abcdefghijklmnopqrstuvwxyz0123456789' \
  'ANTHROPIC_MODEL=claude-sonnet-5' >"$provider"
bash "$validator" "$shared" "$provider"
bash "$validator" "$shared"

for invalid_value in '' 'replace_with_anthropic_api_key' 'change_me'; do
  printf 'ANTHROPIC_API_KEY=%s\nANTHROPIC_MODEL=claude-sonnet-5\n' \
    "$invalid_value" >"$provider"
  if bash "$validator" "$shared" "$provider" >/dev/null 2>&1; then
    echo 'AI provider validator accepted an empty or placeholder key.' >&2
    exit 1
  fi
done

printf '%s\n' \
  'ANTHROPIC_API_KEY=sk-ant-test_abcdefghijklmnopqrstuvwxyz0123456789' \
  'ANTHROPIC_MODEL=claude-sonnet-5' >"$provider"
printf 'JWT_SECRET=test-only\nANTHROPIC_API_KEY=forbidden\n' >"$shared"
if bash "$validator" "$shared" "$provider" >/dev/null 2>&1; then
  echo 'AI provider validator accepted Anthropic data in the shared env.' >&2
  exit 1
fi

printf 'JWT_SECRET=test-only\n' >"$shared"
secret_sentinel='sk-ant-api03-THIS_VALUE_MUST_NEVER_BE_ECHOED_1234567890'
printf 'UNEXPECTED_%s=value\n' "$secret_sentinel" >"$provider"
validation_error="$(bash "$validator" "$shared" "$provider" 2>&1 || true)"
[[ "$validation_error" != *"$secret_sentinel"* ]]

fake_kubectl="$work_dir/fake-kubectl"
cat >"$fake_kubectl" <<EOF
#!/usr/bin/env sh
touch '$work_dir/kubectl-called'
exit 73
EOF
chmod +x "$fake_kubectl"
rm -f "$work_dir/kubectl-called"
if ENV_FILE="$shared" KUBECTL="$fake_kubectl" \
  bash "$deploy_script" full >/dev/null 2>&1; then
  echo 'Full deployment accepted a missing AI provider file.' >&2
  exit 1
fi
[[ ! -e "$work_dir/kubectl-called" ]]

rm -f "$work_dir/kubectl-called"
set +e
ENV_FILE="$shared" KUBECTL="$fake_kubectl" \
  bash "$deploy_script" data-only >/dev/null 2>&1
data_only_status=$?
set -e
[[ "$data_only_status" -eq 73 && -e "$work_dir/kubectl-called" ]]

grep -Fq 'validate-ai-provider-env.sh' "$deploy_script"
grep -Fq 'validate-ai-provider-env.sh' "$migration_script"
grep -Fq 'validate-ai-provider-env.sh' "$rebuild_script"
grep -Fq 'validate-ai-provider-env.sh' "$rollback_script"
grep -Fq 'docker-compose.ai.yml' "$rollback_script"
grep -Fq 'AI_PROVIDER_ENV_FILE="$ai_env_file"' "$rollback_script"
grep -Fq 'campustrade.io/ai-provider-secret-sha256' "$deploy_script"

awk '
  /^kind: Deployment$/ { kind = "Deployment"; name = "" }
  kind == "Deployment" && /^  name: / { name = $2 }
  /secretRef: \{ name: ai-provider-secrets \}/ {
    references++
    if (kind == "Deployment" && name == "ai-service") ai_references++
  }
  /^---$/ { kind = ""; name = "" }
  END { exit !(references == 1 && ai_references == 1) }
' "$applications"

grep -Fq 'AI_PROVIDER_ENV_FILE="$DEPLOY_ROOT/shared/ai-provider.env"' "$jenkinsfile"
! grep -Fq "credentialsId: 'campustrade-ai-provider-env'" "$jenkinsfile"
grep -Fq "it.id == 'campustrade-ai-provider-env'" "$jenkins_config"
grep -Fq 'removeCredentials' "$jenkins_config"
grep -Fq '{{ deployment_root }}/shared/ai-provider.env' "$ansible_deploy"
grep -Fq 'backend/ai-provider.env' "$ansible_deploy"
grep -Fq 'existing-ai-provider.env' "$rebuild_script"
grep -Fq 'backend/ai-provider.env' "$root_dir/.gitignore"

if git -C "$root_dir" grep -n -E \
  'sk-ant-[A-Za-z0-9_-]{20,}' -- \
  . ':(exclude)backend/scripts/test-ai-secret-isolation.sh' >/dev/null
then
  echo 'An Anthropic secret-like value is present in the tracked source tree.' >&2
  exit 1
fi

bash -n "$validator"
bash -n "$deploy_script"
bash -n "$migration_script"
bash -n "$rebuild_script"
bash -n "$rollback_script"
echo 'AI provider secret isolation tests passed.'
