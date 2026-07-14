#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
plugin_file="$root_dir/backend/jenkins-plugins.txt"
plugin_manager_version=2.15.0
plugin_manager_sha256=a86853ec2e2933f37a4b471ba65099b61e03c87a80c2ef8fe2315eb135672d43
plugin_manager_url="https://github.com/jenkinsci/plugin-installation-manager-tool/releases/download/${plugin_manager_version}/jenkins-plugin-manager-${plugin_manager_version}.jar"
jenkins_war=/usr/share/java/jenkins.war
jenkins_home=/var/lib/jenkins
credential_file="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}/operator-credentials.env"
validate_only="${VALIDATE_ONLY:-false}"

[[ -r "$plugin_file" ]] || { echo "Missing Jenkins plugin manifest: $plugin_file" >&2; exit 1; }
[[ -r "$jenkins_war" ]] || { echo "Missing Jenkins WAR: $jenkins_war" >&2; exit 1; }
command -v java >/dev/null
command -v curl >/dev/null

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
manager_jar="$work_dir/jenkins-plugin-manager.jar"
curl -fsSL --retry 5 --retry-delay 2 -o "$manager_jar" "$plugin_manager_url"
printf '%s  %s\n' "$plugin_manager_sha256" "$manager_jar" | sha256sum -c - >/dev/null

install_plugins() {
  local destination="$1"
  java -jar "$manager_jar" \
    --war "$jenkins_war" \
    --plugin-file "$plugin_file" \
    --plugin-download-directory "$destination" \
    --clean-download-directory \
    --latest=false
}

if [[ "$validate_only" == true ]]; then
  validation_plugins="$work_dir/plugins"
  install_plugins "$validation_plugins"
  for plugin in workflow-aggregator git credentials-binding plain-credentials timestamper ws-cleanup; do
    [[ -s "$validation_plugins/$plugin.jpi" ]] || {
      echo "Jenkins plugin closure is missing $plugin." >&2
      exit 1
    }
  done
  echo 'Jenkins plugin manifest validation passed.'
  exit 0
fi

[[ "${EUID}" -eq 0 ]] || { echo 'Jenkins bootstrap must run as root.' >&2; exit 1; }
[[ -r "$credential_file" ]] || { echo "Missing operator credentials: $credential_file" >&2; exit 1; }

systemctl stop jenkins || true
install -d -o jenkins -g jenkins -m 0750 "$jenkins_home" "$jenkins_home/plugins" "$jenkins_home/init.groovy.d"
install_plugins "$jenkins_home/plugins"
chown -R jenkins:jenkins "$jenkins_home/plugins"

# shellcheck disable=SC1090
source "$credential_file"
[[ -n "${JENKINS_USERNAME:-}" && -n "${JENKINS_PASSWORD:-}" ]] || {
  echo 'Jenkins operator credentials are incomplete.' >&2
  exit 1
}
{
  printf 'username=%s\n' "$JENKINS_USERNAME"
  printf 'password=%s\n' "$JENKINS_PASSWORD"
} | install -o jenkins -g jenkins -m 0600 /dev/stdin "$jenkins_home/campustrade-operator.properties"
install -o jenkins -g jenkins -m 0600 \
  "$root_dir/backend/scripts/configure-jenkins-operator.groovy" \
  "$jenkins_home/init.groovy.d/60-campustrade-operator.groovy"

systemctl enable jenkins
systemctl start jenkins
for _ in $(seq 1 90); do
  if systemctl is-active --quiet jenkins && \
    curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
      http://127.0.0.1:8080/whoAmI/api/json | \
      jq -e --arg user "$JENKINS_USERNAME" '.authenticated == true and .name == $user' >/dev/null 2>&1
  then
    echo 'Jenkins plugins and operator account are ready.'
    exit 0
  fi
  sleep 3
done

echo 'Jenkins did not become ready with the provisioned operator account.' >&2
exit 1
