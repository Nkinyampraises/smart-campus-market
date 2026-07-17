# CampusTrade service failure, container, and Ansible command lab

This is the short command guide. Follow the steps in order. Do only one failure
exercise at a time and complete its recovery section before starting another.

## The flow you will demonstrate

```text
Confirm healthy
  -> stop one service/container
  -> observe the failure
  -> observe Prometheus when applicable
  -> start the service/container
  -> wait for readiness
  -> prove the system recovered
```

## 1. Connect to the VPS

Open PowerShell on Windows:

```powershell
ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" azureuser@4.168.192.5
```

On the VPS:

```bash
whoami
hostname
cd /srv/campustrade/current
```

Expected values:

```text
azureuser
campusmarket-test-vm
/srv/campustrade/current
```

## 2. Confirm everything is healthy before the lab

Copy and run:

```bash
sudo systemctl is-active docker k3s jenkins
sudo k3s kubectl get nodes
sudo k3s kubectl -n campustrade get deployments,statefulsets,pods
sudo k3s kubectl -n campustrade-observability get deployments,daemonsets,pods
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'
curl -fsS http://127.0.0.1/health
```

Do not continue unless:

- Docker, K3s, and Jenkins print `active`.
- The Kubernetes node prints `Ready`.
- Application and monitoring workloads are ready.
- SonarQube and `sonar-db` are running.
- The health request succeeds.

## 3. Kubernetes service failure lab: stop `auth-service`

Use `auth-service` for the first exercise. Do not use PostgreSQL, Redis,
`frontend`, or `api-gateway` for your first failure test.

Open these browser pages before starting:

- Application login: `http://4.168.192.5/login`
- Prometheus: `https://prometheus.4-168-192-5.sslip.io:80`
- Prometheus alerts: `https://prometheus.4-168-192-5.sslip.io:80/alerts`

### Step 1: Prove `auth-service` is healthy

```bash
sudo k3s kubectl -n campustrade get deployment auth-service
sudo k3s kubectl -n campustrade get pods \
  -l app.kubernetes.io/name=auth-service
```

Expected Deployment readiness: `1/1`.

Send an intentionally incomplete login request:

```bash
curl -sS -o /tmp/auth-response.json -w 'HTTP %{http_code}\n' \
  -X POST http://127.0.0.1/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{}'
cat /tmp/auth-response.json
rm -f /tmp/auth-response.json
```

Expected result while healthy:

```text
HTTP 400
{"error":"Email required"}
```

The 400 response is expected. It proves the gateway reached `auth-service`,
which validated the request.

Check Prometheus:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- \
  'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22auth-service%22%7D' \
  | jq -r '.data.result[0].value[1]'
```

Expected result: `1`.

### Step 2: Stop `auth-service`

This deliberately prevents new login and registration requests:

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=0
sudo k3s kubectl -n campustrade get deployment auth-service
sudo k3s kubectl -n campustrade get pods \
  -l app.kubernetes.io/name=auth-service
```

Expected Deployment readiness: `0/0`.

### Step 3: Observe the application failure

```bash
curl -sS -o /tmp/auth-response.json -w 'HTTP %{http_code}\n' \
  -X POST http://127.0.0.1/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{}'
cat /tmp/auth-response.json
rm -f /tmp/auth-response.json
```

Expected result:

```text
HTTP 502
{"error":"Service temporarily unavailable"}
```

Refresh the browser login page and attempt to sign in. The request should fail
because the authentication backend has no running Pod.

### Step 4: Observe Prometheus change from `1` to `0`

Run this after approximately 30 seconds:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- \
  'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22auth-service%22%7D' \
  | jq -r '.data.result[0].value[1]'
```

Expected result: `0`.

View the scrape error:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- http://127.0.0.1:9090/api/v1/targets \
  | jq -r '.data.activeTargets[]
    | select(.labels.job == "auth-service")
    | [.labels.job,.health,.lastError] | @tsv'
```

Expected health: `down`.

### Step 5: Observe alert state

The `CampusTradeServiceDown` rule has `for: 2m`. The normal sequence is:

```text
inactive -> pending -> firing
```

Check every 15 seconds; press `Ctrl+C` when you have seen `firing`:

```bash
while true; do
  date -u
  sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
    wget -qO- http://127.0.0.1:9090/api/v1/rules \
    | jq -r '.data.groups[].rules[]
      | select(.name == "CampusTradeServiceDown")
      | "rule_state=" + .state,
        (.alerts[]?
          | select(.labels.job == "auth-service")
          | "job=" + .labels.job + " alert_state=" + .state)'
  sleep 15
done
```

Leave the service stopped for about three minutes to allow scrape and rule
evaluation delays. The Prometheus Alerts page should then show the alert firing
for `auth-service`.

### Step 6: Start `auth-service` again

Do not finish the exercise without running these commands:

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=1
sudo k3s kubectl -n campustrade rollout status \
  deployment/auth-service --timeout=300s
sudo k3s kubectl -n campustrade get deployment auth-service
sudo k3s kubectl -n campustrade get pods \
  -l app.kubernetes.io/name=auth-service
```

Expected Deployment readiness: `1/1`.

### Step 7: Prove application recovery

```bash
curl -sS -o /tmp/auth-response.json -w 'HTTP %{http_code}\n' \
  -X POST http://127.0.0.1/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{}'
cat /tmp/auth-response.json
rm -f /tmp/auth-response.json
```

Expected result again:

```text
HTTP 400
{"error":"Email required"}
```

### Step 8: Prove Prometheus recovery

Wait approximately 30 seconds, then run:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- \
  'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22auth-service%22%7D' \
  | jq -r '.data.result[0].value[1]'
```

Expected result: `1`.

Refresh Prometheus Alerts. `CampusTradeServiceDown` should return to `inactive`.

## 4. Kubernetes self-healing lab: delete one Pod

This exercise shows that a Deployment automatically replaces a deleted Pod.

### Step 1: Record the current Pod

```bash
old_pod=$(sudo k3s kubectl -n campustrade get pod \
  -l app.kubernetes.io/name=auth-service \
  -o jsonpath='{.items[0].metadata.name}')
echo "Old Pod: $old_pod"
```

### Step 2: Delete only the Pod

```bash
sudo k3s kubectl -n campustrade delete pod "$old_pod"
```

### Step 3: Watch Kubernetes create a replacement

```bash
sudo k3s kubectl -n campustrade get pods \
  -l app.kubernetes.io/name=auth-service --watch
```

Press `Ctrl+C` after the replacement Pod becomes `1/1 Running`.

### Step 4: Compare the new Pod name

```bash
new_pod=$(sudo k3s kubectl -n campustrade get pod \
  -l app.kubernetes.io/name=auth-service \
  -o jsonpath='{.items[0].metadata.name}')
echo "Old Pod: $old_pod"
echo "New Pod: $new_pod"
sudo k3s kubectl -n campustrade rollout status \
  deployment/auth-service --timeout=300s
```

The names should differ. The Deployment restored its desired replica count.

## 5. Stop and start a Docker container: SonarQube

Kubernetes workloads are not Docker containers. Use this exercise for the
standalone SonarQube container.

### Step 1: Confirm SonarQube is healthy

```bash
cd /srv/campustrade/current
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  ps sonar-db sonarqube
curl -fsS http://127.0.0.1:9000/api/system/status | jq .
```

Expected SonarQube status: `UP`.

### Step 2: Stop only the SonarQube container

First prove that Jenkins has no running or queued build. This must print `true`:

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/api/json?tree=inQueue,lastBuild[building]" \
    | jq -e "(.inQueue == false) and (.lastBuild.building == false)"
'
```

Then stop SonarQube:

```bash
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  stop sonarqube
```

### Step 3: Observe the stopped container and failed API

```bash
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  ps -a sonar-db sonarqube
curl -fsS http://127.0.0.1:9000/api/system/status \
  || echo "Expected: SonarQube is unavailable"
```

The SonarQube public page should also be unavailable.

### Step 4: Start SonarQube again

```bash
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  up -d sonar-db sonarqube
```

### Step 5: Wait until SonarQube is ready

```bash
for attempt in $(seq 1 60); do
  status=$(curl -fsS http://127.0.0.1:9000/api/system/status 2>/dev/null \
    | jq -r '.status // empty' || true)
  echo "SonarQube status: ${status:-starting}"
  [ "$status" = "UP" ] && break
  sleep 5
done
[ "$status" = "UP" ]
```

### Step 6: Prove recovery

```bash
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  ps sonar-db sonarqube
curl -fsS http://127.0.0.1:9000/api/system/status | jq .
```

Never use `docker compose down -v`. It deletes persistent volumes.

## 6. Stop and start a Linux service: Jenkins

Jenkins is a systemd service.

### Step 1: Confirm that no build is running

This command must print `true` before you stop Jenkins:

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/api/json?tree=inQueue,lastBuild[building]" \
    | jq -e "(.inQueue == false) and (.lastBuild.building == false)"
'
```

### Step 2: Stop Jenkins

```bash
sudo systemctl stop jenkins
sudo systemctl is-active jenkins
```

Expected state: `inactive`.

### Step 3: Observe the failed interface

```bash
curl -fsS http://127.0.0.1:8080/login \
  || echo "Expected: Jenkins is unavailable"
```

### Step 4: Start Jenkins

```bash
sudo systemctl start jenkins
sudo systemctl status jenkins --no-pager
```

### Step 5: Wait and prove recovery

```bash
for attempt in $(seq 1 60); do
  curl -fsS http://127.0.0.1:8080/login >/dev/null && break
  echo "Jenkins is starting"
  sleep 2
done
curl -fsS http://127.0.0.1:8080/login >/dev/null \
  && echo "Jenkins is ready"
```

## 7. Optional full Kubernetes failure: stop and start K3s

This stops the entire application, PostgreSQL, Redis, Prometheus, and Grafana.
Run it only after completing the smaller exercises.

### Confirm Jenkins is idle and stop it for the exercise

This must print `true`:

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/api/json?tree=inQueue,lastBuild[building]" \
    | jq -e "(.inQueue == false) and (.lastBuild.building == false)"
'
sudo systemctl stop jenkins
```

### Stop the cluster

```bash
sudo systemctl stop k3s
sudo systemctl is-active k3s
curl -fsS http://127.0.0.1/health \
  || echo "Expected: CampusTrade Kubernetes application is unavailable"
```

### Start the cluster

```bash
sudo systemctl start k3s
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=180s
sudo k3s kubectl -n campustrade rollout status \
  statefulset/postgres --timeout=300s
sudo k3s kubectl -n campustrade rollout status \
  statefulset/redis --timeout=300s
sudo k3s kubectl -n campustrade wait \
  --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl -n campustrade-observability wait \
  --for=condition=Available deployment --all --timeout=300s
sudo k3s kubectl -n campustrade-observability rollout status \
  daemonset/node-exporter --timeout=180s
curl -fsS http://127.0.0.1/health
sudo systemctl start jenkins
```

## 8. Ansible playbook flow

Ansible has no web page and no Ansible username/password. It runs on the VPS
against `localhost` and uses `sudo` through the playbooks.

### Step 1: Open the Ansible source checkout

```bash
cd /home/azureuser/campusmarket
git status --short
git branch --show-current
```

Stop if `git status --short` prints unexpected changes.

### Step 2: Update to the reviewed GitHub `main`

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git log -1 --oneline
```

### Step 3: Load the correct Ansible configuration

```bash
export ANSIBLE_CONFIG="$PWD/ansible/ansible.cfg"
ansible-playbook --version
ansible-inventory --graph
ansible campustrade -m ping
```

Expected ping result: `SUCCESS` and `pong` for `localhost`.

### Step 4: Validate both playbooks

```bash
ansible-playbook ansible/playbooks/provision-vps.yml --syntax-check
ansible-playbook ansible/playbooks/deploy-platform.yml --syntax-check
```

### Step 5: Confirm Jenkins is not building

The provisioning playbook restarts Jenkins. This command must print `true`:

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/api/json?tree=inQueue,lastBuild[building]" \
    | jq -e "(.inQueue == false) and (.lastBuild.building == false)"
'
```

### Step 6: Run the VPS provisioning playbook

```bash
ansible-playbook ansible/playbooks/provision-vps.yml
```

This installs and repairs VPS prerequisites, permissions, kernel configuration,
the pinned K3s binary, K3s readiness, and Jenkins group membership.

### Step 7: Select a previously green commit for manual deployment

Manual Ansible deployment does not replace Jenkins tests, SonarQube, coverage,
or Trivy. Only deploy a commit that already passed Jenkins.

```bash
git log -1 --oneline
image_tag=$(git rev-parse --short=12 HEAD)
echo "Deploying image tag: $image_tag"
```

### Step 8: Run the full deployment playbook

```bash
ansible-playbook ansible/playbooks/deploy-platform.yml \
  -e deployment_mode=full \
  -e image_tag="$image_tag"
```

This flow performs:

```text
Synchronize reviewed source
  -> preserve protected environment
  -> build and import images
  -> apply Kubernetes resources
  -> set immutable image tags
  -> wait for StatefulSets and Deployments
  -> print Kubernetes status
```

### Step 9: Verify the Ansible deployment

```bash
sudo k3s kubectl get nodes
sudo k3s kubectl -n campustrade get deployments,statefulsets,pods
sudo k3s kubectl -n campustrade-observability get deployments,daemonsets,pods
curl -fsS http://127.0.0.1/health
```

Check Prometheus:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- http://127.0.0.1:9090/api/v1/targets \
  | jq -r '[.data.activeTargets[]] as $all
    | [.data.activeTargets[] | select(.health == "up")] as $up
    | "\($up|length)/\($all|length) targets up"'
```

Expected production result: `11/11 targets up`.

### Step 10: Use Ansible to restore declared state after a scale-down

If you deliberately left `auth-service` at zero, the full deployment playbook
reapplies the declared replica count:

```bash
ansible-playbook ansible/playbooks/deploy-platform.yml \
  -e deployment_mode=full \
  -e image_tag="$image_tag"
sudo k3s kubectl -n campustrade rollout status \
  deployment/auth-service --timeout=300s
```

For a quick recovery, scaling directly back to one is faster:

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=1
sudo k3s kubectl -n campustrade rollout status \
  deployment/auth-service --timeout=300s
```

## 9. Final proof that you restored everything

Always finish every exercise with this block:

```bash
sudo systemctl is-active docker k3s jenkins
sudo k3s kubectl get nodes
sudo k3s kubectl -n campustrade wait \
  --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl -n campustrade rollout status \
  statefulset/postgres --timeout=300s
sudo k3s kubectl -n campustrade rollout status \
  statefulset/redis --timeout=300s
sudo k3s kubectl -n campustrade-observability wait \
  --for=condition=Available deployment --all --timeout=300s
sudo k3s kubectl -n campustrade-observability rollout status \
  daemonset/node-exporter --timeout=180s
curl -fsS http://127.0.0.1/health
```

Then confirm SonarQube:

```bash
cd /srv/campustrade/current
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  ps sonar-db sonarqube
curl -fsS http://127.0.0.1:9000/api/system/status | jq .
```

Finally confirm all Prometheus targets:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- http://127.0.0.1:9090/api/v1/targets \
  | jq -r '[.data.activeTargets[]] as $all
    | [.data.activeTargets[] | select(.health == "up")] as $up
    | "\($up|length)/\($all|length) targets up"'
```

Do not disconnect until all services are restored and Prometheus reports
`11/11 targets up`.
