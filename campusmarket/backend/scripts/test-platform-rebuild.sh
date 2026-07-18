#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
scripts_dir="$root_dir/backend/scripts"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

source_env="$work_dir/source.env"
generated_env="$work_dir/generated.env"

cat >"$source_env" <<'ENV'
DB_PASSWORD=old-database-password
JWT_SECRET=old-jwt-secret
GRAFANA_PASS=old-grafana-password
SONAR_DB_PASSWORD=old-sonar-password
GOOGLE_CLIENT_ID=campustrade.apps.example
SMTP_HOST=smtp.example.test
SMTP_PORT=587
SMTP_USER=mailer@example.test
SMTP_PASS=external-smtp-secret
FROM_EMAIL=noreply@example.test
VAPID_PUBLIC_KEY=old-vapid-public
VAPID_PRIVATE_KEY=old-vapid-private
VAPID_EMAIL=mailto:ops@example.test
ENV

ALLOW_UNPRIVILEGED=true \
SOURCE_ENV="$source_env" \
OUTPUT_ENV="$generated_env" \
  bash "$scripts_dir/generate-production-env.sh"

[[ "$(stat -c '%a' "$generated_env")" == 600 ]]
for key in \
  DB_HOST DB_USER DB_PASSWORD DB_NAME JWT_SECRET GRAFANA_USER GRAFANA_PASS \
  SONAR_DB_USER SONAR_DB_PASSWORD GOOGLE_CLIENT_ID SMTP_HOST SMTP_USER \
  SMTP_PASS VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_EMAIL
do
  [[ "$(grep -c "^${key}=" "$generated_env")" == 1 ]] || {
    echo "Generated environment has an invalid ${key} entry count." >&2
    exit 1
  }
done

grep -qx 'GOOGLE_CLIENT_ID=campustrade.apps.example' "$generated_env"
grep -qx 'SMTP_PASS=external-smtp-secret' "$generated_env"
grep -qx 'FRONTEND_URL=http://4.168.192.5' "$generated_env"
if grep -Eq '=(change_me|replace_with|old-(database|jwt|grafana|sonar))' "$generated_env"; then
  echo 'Generated environment retained a placeholder or rotated secret.' >&2
  exit 1
fi

for key in DB_PASSWORD JWT_SECRET GRAFANA_PASS SONAR_DB_PASSWORD VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY; do
  value="$(sed -n "s/^${key}=//p" "$generated_env")"
  [[ ${#value} -ge 32 ]] || {
    echo "Generated ${key} is unexpectedly short." >&2
    exit 1
  }
done

if CONFIRM_RESET=wrong \
  EXPECTED_PUBLIC_IP=203.0.113.10 PUBLIC_IP_OVERRIDE=203.0.113.10 \
  DRY_RUN=true bash "$scripts_dir/rebuild-vps-from-scratch.sh" >/dev/null 2>&1
then
  echo 'Rebuild script accepted an invalid confirmation token.' >&2
  exit 1
fi

CONFIRM_RESET=DELETE_CAMPUSTRADE_PLATFORM \
EXPECTED_PUBLIC_IP=203.0.113.10 PUBLIC_IP_OVERRIDE=203.0.113.10 \
DRY_RUN=true bash "$scripts_dir/rebuild-vps-from-scratch.sh" >"$work_dir/rebuild-dry-run.log"
grep -q 'Dry run passed' "$work_dir/rebuild-dry-run.log"

sync_repo="$work_dir/sync-repo"
sync_target="$work_dir/sync-target"
canonical_env="$work_dir/canonical-backend.env"
mkdir -p \
  "$sync_repo/campusmarket/ansible/playbooks" \
  "$sync_repo/campusmarket/backend" \
  "$sync_target/backend"
git init --quiet --initial-branch=main "$sync_repo"
printf 'pipeline {}\n' >"$sync_repo/campusmarket/Jenkinsfile"
printf '%s\n' '---' >"$sync_repo/campusmarket/ansible/playbooks/provision-vps.yml"
printf '%s\n' '---' >"$sync_repo/campusmarket/ansible/playbooks/deploy-platform.yml"
printf 'services: {}\n' >"$sync_repo/campusmarket/backend/docker-compose.prod.yml"
printf 'new source\n' >"$sync_repo/campusmarket/source-marker.txt"
git -C "$sync_repo" add .
git -C "$sync_repo" \
  -c user.name='CampusTrade Test' \
  -c user.email='test@campustrade.local' \
  commit --quiet -m 'Create source fixture'
expected_sync_commit="$(git -C "$sync_repo" rev-parse --short=12 HEAD)"
printf 'canonical=true\n' >"$canonical_env"
printf 'stale=true\n' >"$sync_target/backend/.env"
printf 'remove me\n' >"$sync_target/stale.txt"

ALLOW_TEST_TARGET=true \
REPOSITORY="file://$sync_repo" \
TARGET="$sync_target" \
CANONICAL_ENV="$canonical_env" \
  bash "$scripts_dir/sync-ansible-source.sh"

[[ -L "$sync_target/backend/.env" ]]
[[ "$(readlink -f "$sync_target/backend/.env")" == "$(readlink -f "$canonical_env")" ]]
grep -qx 'canonical=true' "$sync_target/backend/.env"
if grep -q 'stale=true' "$sync_target/backend/.env"; then
  echo 'Source synchronization retained the stale environment.' >&2
  exit 1
fi
grep -qx 'new source' "$sync_target/source-marker.txt"
grep -qx "$expected_sync_commit" "$sync_target/.source-commit"
[[ ! -e "$sync_target/stale.txt" ]]
if ALLOW_TEST_TARGET=true \
  REPOSITORY="file://$sync_repo" \
  TARGET="$root_dir/forbidden-sync-target" \
  bash "$scripts_dir/sync-ansible-source.sh" >/dev/null 2>&1
then
  echo 'Source synchronization accepted a non-temporary test target.' >&2
  exit 1
fi
if ALLOW_TEST_TARGET=true \
  REPOSITORY="file://$sync_repo" \
  TARGET=/home/azureuser/campusmarket \
  bash "$scripts_dir/sync-ansible-source.sh" >/dev/null 2>&1
then
  echo 'Test mode accepted the production source target.' >&2
  exit 1
fi

deploy_playbook="$root_dir/ansible/playbooks/deploy-platform.yml"
if grep -Fq 'src: "{{ deployment_source }}/backend/.env"' "$deploy_playbook"; then
  echo 'Deployment playbook still copies the source environment over production.' >&2
  exit 1
fi
grep -Fq 'path: "{{ deployment_root }}/shared/backend.env"' "$deploy_playbook"
grep -Fq 'src: "{{ deployment_root }}/shared/backend.env"' "$deploy_playbook"

# A retry after a partial cleanup must retain the already preserved external
# configuration rather than replacing it with an empty file.
grep -Fq 'elif [[ ! -f' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'findmnt -rn -o TARGET' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq '/var/lib/kubelet/*' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq '/run/k3s/*' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'containerd.sock' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'systemctl restart containerd docker' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'CNI-HOSTPORT-DNAT' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'ip link delete flannel.1' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'docker container inspect campusmarket-postgres-1' "$root_dir/Jenkinsfile"
grep -Fq 'native clean K3s deployment' "$root_dir/Jenkinsfile"
grep -Fq 'kind: IngressRoute' "$root_dir/k8s/base/platform-access.yaml"
grep -Fq 'hostNetwork: true' "$root_dir/k8s/base/platform-access.yaml"
grep -Fq 'secret: prometheus-web-auth' "$root_dir/k8s/base/platform-access.yaml"
grep -Fq 'name: prometheus-default-query' "$root_dir/k8s/base/platform-access.yaml"
grep -Fq 'replacement: https://prometheus.4-168-192-5.sslip.io:80/query?g0.expr=up' \
  "$root_dir/k8s/base/platform-access.yaml"
grep -Fq 'public VPS Grafana route' "$scripts_dir/smoke-test-running.sh"
grep -Fq 'Prometheus default health query' "$scripts_dir/smoke-test-running.sh"
grep -Fq 'public VPS Jenkins route' "$scripts_dir/smoke-test-running.sh"
if grep -Eq 'localhost:(8080|9000|9090|3009)|SSH tunnel to port' \
  "$root_dir/README.md" "$root_dir/backend/OPERATIONS.md" \
  "$root_dir/docs/operations/PLATFORM_OPERATIONS_RUNBOOK.md"
then
  echo 'Operator documentation regressed to workstation dashboard access.' >&2
  exit 1
fi

for script in \
  generate-production-env.sh bootstrap-jenkins.sh rebuild-vps-from-scratch.sh \
  seed-production-data.sh verify-production-seed.sh smoke-test-running.sh \
  provision-operator-accounts.sh sync-ansible-source.sh \
  migrate-university-emails.sh test-university-data-migration.sh \
  enforce-production-contract.sh test-production-contract-migration.sh \
  validate-ai-provider-env.sh rotate-ai-provider-secret.sh \
  verify-strict-auth-release.sh test-ai-secret-isolation.sh \
  test-compose-ai-secret-isolation.sh
do
  bash -n "$scripts_dir/$script"
done
bash -n "$root_dir/k8s/scripts/deploy.sh"
bash "$scripts_dir/test-university-data-migration.sh"
bash "$scripts_dir/test-production-contract-migration.sh"
bash "$scripts_dir/test-ai-secret-isolation.sh"
bash "$scripts_dir/test-compose-ai-secret-isolation.sh"

echo 'Platform rebuild automation tests passed.'
