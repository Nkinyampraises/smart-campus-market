#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
sonar_url="${SONAR_HOST_URL:-http://127.0.0.1:9000}"
shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
admin_password_file="$shared_dir/sonar-admin-password"
token_file="$shared_dir/sonar-jenkins-token"
token_name=campustrade-jenkins

for _ in $(seq 1 90); do
  status="$(curl -fsS "$sonar_url/api/system/status" 2>/dev/null | jq -r '.status // empty' || true)"
  [[ "$status" == UP ]] && break
  sleep 5
done
[[ "${status:-}" == UP ]] || { echo 'SonarQube did not become ready.' >&2; exit 1; }

default_valid="$(curl -fsS -u admin:admin "$sonar_url/api/authentication/validate" | jq -r '.valid')"
if [[ "$default_valid" == true ]]; then
  admin_password="A!$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9@#%_' | head -c 44)z9"
  curl -fsS -u admin:admin -X POST "$sonar_url/api/users/change_password" \
    --data-urlencode login=admin \
    --data-urlencode previousPassword=admin \
    --data-urlencode "password=$admin_password" >/dev/null
  printf '%s' "$admin_password" | sudo install -o root -g root -m 0600 /dev/stdin "$admin_password_file"
else
  [[ -r "$admin_password_file" ]] || { echo 'Existing SonarQube admin credential is unavailable.' >&2; exit 1; }
  admin_password="$(sudo cat "$admin_password_file")"
fi

curl -fsS -u "admin:$admin_password" -X POST "$sonar_url/api/user_tokens/revoke" \
  --data-urlencode "name=$token_name" >/dev/null 2>&1 || true
token="$(curl -fsS -u "admin:$admin_password" -X POST "$sonar_url/api/user_tokens/generate" \
  --data-urlencode "name=$token_name" | jq -r '.token // empty')"
[[ -n "$token" ]] || { echo 'SonarQube token generation failed.' >&2; exit 1; }

printf '%s' "$token" | sudo install -o jenkins -g jenkins -m 0600 /dev/stdin "$token_file"
sudo install -o jenkins -g jenkins -m 0640 \
  "$root_dir/backend/scripts/configure-jenkins-sonar.groovy" \
  /var/lib/jenkins/init.groovy.d/40-campustrade-sonar.groovy
unset token admin_password

sudo systemctl restart jenkins
for _ in $(seq 1 60); do
  if systemctl is-active --quiet jenkins && [[ ! -e "$token_file" ]]; then
    echo 'SonarQube is secured and Jenkins received its encrypted analysis credential.'
    exit 0
  fi
  sleep 3
done
echo 'Jenkins did not consume the staged SonarQube credential.' >&2
exit 1
