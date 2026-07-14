#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo 'Run this script as root: sudo bash backend/scripts/provision-operator-accounts.sh' >&2
  exit 1
fi

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
credential_file="$shared_dir/operator-credentials.env"
production_env="$shared_dir/backend.env"
jenkins_stage=/var/lib/jenkins/campustrade-operator.properties
jenkins_hook=/var/lib/jenkins/init.groovy.d/60-campustrade-operator.groovy

[[ -r "$production_env" ]] || { echo "Missing protected environment: $production_env" >&2; exit 1; }
install -d -o root -g root -m 0700 "$shared_dir"
umask 077

new_password() {
  printf 'Aa1%s' "$(openssl rand -hex 20)"
}

if [[ ! -f "$credential_file" ]]; then
  {
    printf 'JENKINS_USERNAME=campustrade-admin\n'
    printf 'JENKINS_PASSWORD=%s\n' "$(new_password)"
    printf 'GRAFANA_USERNAME=campustrade-admin\n'
    printf 'GRAFANA_PASSWORD=%s\n' "$(new_password)"
    printf 'SONAR_USERNAME=campustrade-admin\n'
    printf 'SONAR_PASSWORD=%s\n' "$(new_password)"
    printf 'CAMPUSTRADE_ADMIN_EMAIL=admin@campustrade.local\n'
    printf 'CAMPUSTRADE_ADMIN_PASSWORD=%s\n' "$(new_password)"
    printf 'CAMPUSTRADE_DEMO_EMAIL=demo.student@campustrade.local\n'
    printf 'CAMPUSTRADE_DEMO_PASSWORD=%s\n' "$(new_password)"
    printf 'CREATED_AT=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  } | install -o root -g root -m 0600 /dev/stdin "$credential_file"
fi

# shellcheck disable=SC1090
source "$credential_file"
# shellcheck disable=SC1090
source "$production_env"

required=(
  JENKINS_USERNAME JENKINS_PASSWORD GRAFANA_USERNAME GRAFANA_PASSWORD
  SONAR_USERNAME SONAR_PASSWORD CAMPUSTRADE_ADMIN_EMAIL
  CAMPUSTRADE_ADMIN_PASSWORD CAMPUSTRADE_DEMO_EMAIL CAMPUSTRADE_DEMO_PASSWORD
  GRAFANA_USER GRAFANA_PASS POSTGRES_USER POSTGRES_DB
)
for variable in "${required[@]}"; do
  [[ -n "${!variable:-}" ]] || { echo "Required variable is empty: $variable" >&2; exit 1; }
done

echo 'Provisioning the Grafana operator account...'
grafana_lookup="$({
  curl -fsS -u "$GRAFANA_USER:$GRAFANA_PASS" \
    --get --data-urlencode "loginOrEmail=$GRAFANA_USERNAME" \
    http://127.0.0.1:3009/api/users/lookup
} 2>/dev/null || true)"
grafana_id="$(jq -r '.id // empty' <<<"$grafana_lookup")"
if [[ -z "$grafana_id" ]]; then
  grafana_payload="$(jq -n \
    --arg name 'CampusTrade Administrator' \
    --arg email 'admin@campustrade.local' \
    --arg login "$GRAFANA_USERNAME" \
    --arg password "$GRAFANA_PASSWORD" \
    '{name:$name,email:$email,login:$login,password:$password}')"
  grafana_id="$(curl -fsS -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -H 'Content-Type: application/json' -X POST \
    -d "$grafana_payload" http://127.0.0.1:3009/api/admin/users | jq -r '.id')"
fi
curl -fsS -u "$GRAFANA_USER:$GRAFANA_PASS" \
  -H 'Content-Type: application/json' -X PATCH \
  -d '{"role":"Admin"}' \
  "http://127.0.0.1:3009/api/org/users/$grafana_id" >/dev/null
curl -fsS -u "$GRAFANA_USERNAME:$GRAFANA_PASSWORD" \
  http://127.0.0.1:3009/api/user >/dev/null

echo 'Provisioning the SonarQube operator account...'
sonar_admin_password="$(cat "$shared_dir/sonar-admin-password")"
sonar_exists="$(curl -fsS -u "admin:$sonar_admin_password" \
  --get --data-urlencode "q=$SONAR_USERNAME" \
  http://127.0.0.1:9000/api/users/search | \
  jq -r --arg login "$SONAR_USERNAME" '[.users[] | select(.login == $login)] | length')"
if [[ "$sonar_exists" == 0 ]]; then
  curl -fsS -u "admin:$sonar_admin_password" -X POST \
    --data-urlencode "login=$SONAR_USERNAME" \
    --data-urlencode 'name=CampusTrade Administrator' \
    --data-urlencode 'email=admin@campustrade.local' \
    --data-urlencode "password=$SONAR_PASSWORD" \
    --data-urlencode 'local=true' \
    http://127.0.0.1:9000/api/users/create >/dev/null
fi
curl -fsS -u "admin:$sonar_admin_password" -X POST \
  --data-urlencode "login=$SONAR_USERNAME" \
  --data-urlencode 'permission=admin' \
  http://127.0.0.1:9000/api/permissions/add_user >/dev/null
[[ "$(curl -fsS -u "$SONAR_USERNAME:$SONAR_PASSWORD" \
  http://127.0.0.1:9000/api/authentication/validate | jq -r '.valid')" == true ]]
unset sonar_admin_password

register_campustrade_user() {
  local email="$1"
  local password="$2"
  local first_name="$3"
  local last_name="$4"
  local response_file status payload
  response_file="$(mktemp)"
  payload="$(jq -n \
    --arg email "$email" --arg password "$password" \
    --arg first_name "$first_name" --arg last_name "$last_name" \
    --arg campus_zone 'Main Campus' \
    '{email:$email,password:$password,first_name:$first_name,last_name:$last_name,campus_zone:$campus_zone}')"
  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -H 'Content-Type: application/json' -X POST -d "$payload" \
    http://127.0.0.1/api/auth/register)"
  rm -f "$response_file"
  [[ "$status" == 201 || "$status" == 409 ]] || {
    echo "CampusTrade account provisioning failed for $email (HTTP $status)." >&2
    return 1
  }
}

echo 'Provisioning CampusTrade administrator and demonstration accounts...'
register_campustrade_user "$CAMPUSTRADE_ADMIN_EMAIL" "$CAMPUSTRADE_ADMIN_PASSWORD" CampusTrade Administrator
register_campustrade_user "$CAMPUSTRADE_DEMO_EMAIL" "$CAMPUSTRADE_DEMO_PASSWORD" Demo Student
k3s kubectl -n campustrade exec postgres-0 -- \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v admin_email="$CAMPUSTRADE_ADMIN_EMAIL" \
  -c "UPDATE users SET role='admin' WHERE email=:'admin_email';" >/dev/null

for account in admin demo; do
  if [[ "$account" == admin ]]; then
    email="$CAMPUSTRADE_ADMIN_EMAIL"; password="$CAMPUSTRADE_ADMIN_PASSWORD"; expected_role=admin
  else
    email="$CAMPUSTRADE_DEMO_EMAIL"; password="$CAMPUSTRADE_DEMO_PASSWORD"; expected_role=user
  fi
  login_payload="$(jq -n --arg email "$email" --arg password "$password" \
    '{email:$email,password:$password}')"
  actual_role="$(curl -fsS -H 'Content-Type: application/json' -X POST \
    -d "$login_payload" http://127.0.0.1/api/auth/login | jq -r '.user.role')"
  [[ "$actual_role" == "$expected_role" ]] || {
    echo "CampusTrade $account account has unexpected role: $actual_role" >&2
    exit 1
  }
done

echo 'Provisioning the Jenkins operator account...'
{
  printf 'username=%s\n' "$JENKINS_USERNAME"
  printf 'password=%s\n' "$JENKINS_PASSWORD"
} | install -o jenkins -g jenkins -m 0600 /dev/stdin "$jenkins_stage"
install -o jenkins -g jenkins -m 0600 \
  "$root_dir/backend/scripts/configure-jenkins-operator.groovy" "$jenkins_hook"
systemctl restart jenkins

for _ in $(seq 1 60); do
  if systemctl is-active --quiet jenkins && [[ ! -e "$jenkins_stage" && ! -e "$jenkins_hook" ]]; then
    break
  fi
  sleep 3
done
[[ ! -e "$jenkins_stage" && ! -e "$jenkins_hook" ]] || {
  echo 'Jenkins did not consume the staged operator credential.' >&2
  exit 1
}
curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
  http://127.0.0.1:8080/whoAmI/api/json | \
  jq -e --arg username "$JENKINS_USERNAME" '.authenticated == true and .name == $username' >/dev/null

chmod 0600 "$credential_file"
chown root:root "$credential_file"
echo "Operator accounts are ready. Credentials remain root-only at $credential_file"

