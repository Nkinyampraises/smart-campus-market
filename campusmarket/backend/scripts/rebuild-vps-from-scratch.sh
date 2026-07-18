#!/usr/bin/env bash
set -euo pipefail

confirmation="${CONFIRM_RESET:-}"
expected_public_ip="${EXPECTED_PUBLIC_IP:-4.168.192.5}"
dry_run="${DRY_RUN:-false}"
repository="${REPOSITORY:-https://github.com/Nkinyampraises/smart-campus-market.git}"
branch="${BRANCH:-main}"
deployment_root=/srv/campustrade
jenkins_home=/var/lib/jenkins
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ "$confirmation" == DELETE_CAMPUSTRADE_PLATFORM ]] || {
  echo 'Refusing rebuild: set CONFIRM_RESET=DELETE_CAMPUSTRADE_PLATFORM.' >&2
  exit 1
}

if [[ "$dry_run" == true ]]; then
  actual_public_ip="${PUBLIC_IP_OVERRIDE:-}"
  [[ -n "$actual_public_ip" ]] || {
    echo 'Dry-run validation requires PUBLIC_IP_OVERRIDE.' >&2
    exit 1
  }
else
  [[ "${EUID}" -eq 0 ]] || { echo 'The destructive rebuild must run as root.' >&2; exit 1; }
  actual_public_ip="$(curl -fsS --max-time 15 https://api.ipify.org)"
fi
[[ "$actual_public_ip" == "$expected_public_ip" ]] || {
  echo "Refusing rebuild: public IP ${actual_public_ip} does not match ${expected_public_ip}." >&2
  exit 1
}

wipe_paths=(
  /srv/campustrade
  /var/lib/jenkins
  /var/lib/rancher/k3s
  /etc/rancher/k3s
  /var/lib/kubelet
  /var/lib/cni
  /run/k3s
  /run/flannel
  /etc/cni/net.d
)

if [[ "$dry_run" == true ]]; then
  printf 'Validated public IP: %s\n' "$actual_public_ip"
  printf 'Platform state scheduled for deletion:\n'
  printf '  %s\n' "${wipe_paths[@]}"
  echo 'Dry run passed; no state was changed.'
  exit 0
fi

for path in "${wipe_paths[@]}"; do
  case "$path" in
    /srv/campustrade|/var/lib/jenkins|/var/lib/rancher/k3s|/etc/rancher/k3s|/var/lib/kubelet|/var/lib/cni|/run/k3s|/run/flannel|/etc/cni/net.d) ;;
    *) echo "Unsafe rebuild target rejected: $path" >&2; exit 1 ;;
  esac
done

bootstrap_state=/root/campustrade-rebuild
external_env="$bootstrap_state/existing-backend.env"
external_ai_env="$bootstrap_state/existing-ai-provider.env"
install -d -o root -g root -m 0700 "$bootstrap_state"
if [[ -r "$deployment_root/shared/backend.env" ]]; then
  install -o root -g root -m 0600 "$deployment_root/shared/backend.env" "$external_env"
elif [[ ! -f "$external_env" ]]; then
  : >"$external_env"
  chmod 0600 "$external_env"
fi
if [[ -r "$deployment_root/shared/ai-provider.env" ]]; then
  install -o root -g root -m 0600 "$deployment_root/shared/ai-provider.env" "$external_ai_env"
elif [[ ! -f "$external_ai_env" ]]; then
  echo 'Refusing rebuild: no protected Anthropic provider environment is available.' >&2
  exit 1
fi

# Validate the preserved inputs before stopping a service or deleting state.
bash "$script_dir/validate-ai-provider-env.sh" "$external_env" "$external_ai_env"

echo 'Stopping CampusTrade platform services...'
systemctl stop jenkins || true
if [[ -r "$deployment_root/shared/backend.env" && -f "$deployment_root/current/backend/docker-compose.prod.yml" ]]; then
  docker compose -p campusmarket \
    --env-file "$deployment_root/shared/backend.env" \
    -f "$deployment_root/current/backend/docker-compose.prod.yml" \
    down --volumes --remove-orphans || true
fi
systemctl stop k3s || true

# The K3s unit uses KillMode=process so containerd shims can survive the server.
# Terminate only shims from the K3s data tree connected to the K3s socket.
mapfile -t k3s_shim_pids < <(
  ps -eo pid=,args= | awk '
    /\/var\/lib\/rancher\/k3s\/data\/.*\/bin\/containerd-shim-runc-v2/ &&
    /-address \/run\/k3s\/containerd\/containerd.sock/ { print $1 }
  '
)
if (( ${#k3s_shim_pids[@]} > 0 )); then
  kill -TERM "${k3s_shim_pids[@]}" 2>/dev/null || true
  sleep 2
  for shim_pid in "${k3s_shim_pids[@]}"; do
    kill -KILL "$shim_pid" 2>/dev/null || true
  done
fi

# K3s may leave projected/PVC mounts below kubelet and container rootfs mounts
# below its runtime tree. Detach only these allowlisted targets, deepest first,
# so cleanup is safe and resumable.
mapfile -t k3s_mounts < <(
  findmnt -rn -o TARGET 2>/dev/null | sort -r || true
)
for mount_target in "${k3s_mounts[@]}"; do
  case "$mount_target" in
    /var/lib/kubelet/*|/run/k3s/*) umount --lazy -- "$mount_target" || true ;;
    *) continue ;;
  esac
done

# Remove only the CNI portmap plugin's host-port NAT state. Without this,
# rules from the erased cluster can precede new rules and forward loopback
# dashboard ports to pod IPs that no longer exist.
mapfile -t cni_dnat_chains < <(
  iptables -t nat -S 2>/dev/null | \
    awk '$1 == "-N" && $2 ~ /^CNI-DN-/ { print $2 }' || true
)
for chain in CNI-HOSTPORT-DNAT CNI-HOSTPORT-MASQ CNI-HOSTPORT-SETMARK "${cni_dnat_chains[@]}"; do
  iptables -t nat -F "$chain" 2>/dev/null || true
done
delete_nat_jump() {
  local parent_chain="$1"
  local target_chain="$2"
  local rule_number
  while rule_number="$(iptables -t nat -L "$parent_chain" --line-numbers -n 2>/dev/null | \
    awk -v target="$target_chain" '$2 == target { print $1; exit }')" && \
    [[ -n "$rule_number" ]]
  do
    iptables -t nat -D "$parent_chain" "$rule_number"
  done
}
delete_nat_jump PREROUTING CNI-HOSTPORT-DNAT
delete_nat_jump OUTPUT CNI-HOSTPORT-DNAT
delete_nat_jump POSTROUTING CNI-HOSTPORT-MASQ
for chain in "${cni_dnat_chains[@]}" CNI-HOSTPORT-DNAT CNI-HOSTPORT-MASQ CNI-HOSTPORT-SETMARK; do
  iptables -t nat -X "$chain" 2>/dev/null || true
done
ip link delete cni0 2>/dev/null || true
ip link delete flannel.1 2>/dev/null || true

echo 'Deleting application, CI, analysis, orchestration, monitoring, and database state...'
for path in "${wipe_paths[@]}"; do
  rm -rf --one-file-system -- "$path"
done

# Docker's system containerd can restart while orphaned K3s shims are being
# terminated. Reconnect dockerd deterministically before the required prune.
systemctl restart containerd docker
for _ in $(seq 1 30); do
  docker info >/dev/null 2>&1 && break
  sleep 2
done
docker info >/dev/null
docker system prune --all --force --volumes >/dev/null

echo 'Cloning the reviewed production source from GitHub...'
install -d -o azureuser -g azureuser -m 0750 "$deployment_root"
git clone --quiet --single-branch --branch "$branch" "$repository" "$deployment_root/bootstrap-repo"
project_root="$deployment_root/bootstrap-repo/campusmarket"
[[ -f "$project_root/Jenkinsfile" && -f "$project_root/backend/scripts/generate-production-env.sh" ]] || {
  echo 'Fresh GitHub checkout is incomplete.' >&2
  exit 1
}
chmod 0750 "$project_root"/backend/scripts/*.sh "$project_root"/k8s/scripts/*.sh

echo 'Recreating protected production configuration with rotated internal secrets...'
install -d -o azureuser -g azureuser -m 0750 "$deployment_root/shared"
SOURCE_ENV="$external_env" bash "$project_root/backend/scripts/generate-production-env.sh"
install -o root -g root -m 0600 \
  "$external_ai_env" "$deployment_root/shared/ai-provider.env"
CREDENTIALS_ONLY=true bash "$project_root/backend/scripts/provision-operator-accounts.sh"
shred -u "$external_env" 2>/dev/null || rm -f "$external_env"
shred -u "$external_ai_env" 2>/dev/null || rm -f "$external_ai_env"

echo 'Reinstalling and securing Jenkins from the pinned plugin manifest...'
START_JENKINS=false bash "$project_root/backend/scripts/install-jenkins-ubuntu.sh"
bash "$project_root/backend/scripts/bootstrap-jenkins.sh"

echo 'Reprovisioning K3s and host controls through Ansible on the VPS...'
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ansible
inventory_file="$bootstrap_state/inventory.ini"
cat >"$inventory_file" <<'INVENTORY'
[campustrade]
localhost ansible_connection=local ansible_python_interpreter=/usr/bin/python3
INVENTORY
ansible-playbook -i "$inventory_file" "$project_root/ansible/playbooks/provision-vps.yml"
chown root:campustrade-deploy "$deployment_root/shared/ai-provider.env"
chmod 0640 "$deployment_root/shared/ai-provider.env"
sudo -u jenkins test -r "$deployment_root/shared/ai-provider.env" || {
  echo 'Jenkins cannot read the canonical AI provider environment.' >&2
  exit 1
}

echo 'Starting a clean SonarQube instance and creating the Jenkins analysis credential...'
docker compose -p campusmarket \
  --env-file "$deployment_root/shared/backend.env" \
  -f "$project_root/backend/docker-compose.prod.yml" \
  up -d sonar-db sonarqube
bash "$project_root/backend/scripts/bootstrap-sonarqube.sh"

echo 'Creating the GitHub-backed Jenkins production job...'
install -o jenkins -g jenkins -m 0600 \
  "$deployment_root/shared/backend.env" "$jenkins_home/campustrade-prod.env"
install -o jenkins -g jenkins -m 0640 \
  "$project_root/backend/scripts/configure-jenkins-job.groovy" \
  "$jenkins_home/init.groovy.d/30-campustrade-job.groovy"
systemctl restart jenkins

# shellcheck disable=SC1090,SC1091
source "$deployment_root/shared/operator-credentials.env"
for _ in $(seq 1 90); do
  if curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    http://127.0.0.1:8080/job/campustrade-ci/api/json >/dev/null 2>&1
  then
    break
  fi
  sleep 3
done
curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
  http://127.0.0.1:8080/job/campustrade-ci/api/json >/dev/null
[[ ! -e "$jenkins_home/campustrade-prod.env" ]] || {
  echo 'Jenkins did not consume the staged production environments.' >&2
  exit 1
}

echo 'Waiting for the VPS-only Jenkins, test, SonarQube, scan, and deployment pipeline...'
build_number=''
for _ in $(seq 1 90); do
  build_number="$(curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    http://127.0.0.1:8080/job/campustrade-ci/lastBuild/api/json 2>/dev/null | jq -r '.number // empty' || true)"
  [[ -n "$build_number" ]] && break
  sleep 3
done
[[ -n "$build_number" ]] || { echo 'Jenkins did not start the clean production build.' >&2; exit 1; }

for _ in $(seq 1 300); do
  build_json="$(curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/${build_number}/api/json")"
  building="$(jq -r '.building' <<<"$build_json")"
  result="$(jq -r '.result // empty' <<<"$build_json")"
  [[ "$building" == true ]] || break
  sleep 20
done
[[ "${result:-}" == SUCCESS ]] || {
  echo "Clean Jenkins build ${build_number} failed with result ${result:-unknown}." >&2
  exit 1
}

echo 'Provisioning service operators and idempotent production demonstration data...'
bash "$deployment_root/current/backend/scripts/provision-operator-accounts.sh"
bash "$deployment_root/current/backend/scripts/seed-production-data.sh"
BASE_URL=http://127.0.0.1 bash "$deployment_root/current/backend/scripts/smoke-test-running.sh"

BUILD_NUMBER="$build_number" \
  EVIDENCE_DIR="$deployment_root/evidence/clean-rebuild-$(date -u +%Y%m%dT%H%M%SZ)" \
  bash "$deployment_root/current/k8s/scripts/capture-evidence.sh"

git -C "$deployment_root/bootstrap-repo" rev-parse HEAD >"$deployment_root/shared/clean-rebuild-commit"
date -u +'%Y-%m-%dT%H:%M:%SZ' >"$deployment_root/shared/clean-rebuild-completed-at"
chown root:root "$deployment_root/shared/clean-rebuild-"*
chmod 0600 "$deployment_root/shared/clean-rebuild-"*
rm -rf --one-file-system -- "$deployment_root/bootstrap-repo" "$bootstrap_state"
docker image prune --all --force >/dev/null

echo "Clean CampusTrade rebuild completed successfully with Jenkins build ${build_number}."
