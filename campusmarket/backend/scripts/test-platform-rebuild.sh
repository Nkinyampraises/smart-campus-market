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

# A retry after a partial cleanup must retain the already preserved external
# configuration rather than replacing it with an empty file.
grep -Fq 'elif [[ ! -f' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'findmnt -rn -o TARGET' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq '/var/lib/kubelet/*' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq '/run/k3s/*' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'containerd.sock' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'systemctl restart containerd docker' "$scripts_dir/rebuild-vps-from-scratch.sh"
grep -Fq 'docker container inspect campusmarket-postgres-1' "$root_dir/Jenkinsfile"
grep -Fq 'native clean K3s deployment' "$root_dir/Jenkinsfile"

for script in \
  generate-production-env.sh bootstrap-jenkins.sh rebuild-vps-from-scratch.sh \
  seed-production-data.sh verify-production-seed.sh
do
  bash -n "$scripts_dir/$script"
done

echo 'Platform rebuild automation tests passed.'
