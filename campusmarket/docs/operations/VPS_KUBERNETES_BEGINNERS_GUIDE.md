# CampusTrade VPS and Kubernetes beginner's operations guide

This guide is written for a first-time operator. It explains exactly how to
connect to the production VPS, inspect the platform, start and stop each type of
service, use Kubernetes and Docker safely, run Ansible, deploy through Jenkins,
check SonarQube, and recover from common problems.

For deeper incident-response and recovery detail, also see
[`PLATFORM_OPERATIONS_RUNBOOK.md`](PLATFORM_OPERATIONS_RUNBOOK.md).

The production VPS is `4.168.192.5`. The application, databases, containers,
Kubernetes cluster, tests, code analysis, and monitoring all run on that VPS.
Your Windows computer is only used for the SSH client, browser, IDE, and Git.
Do not start a second local CampusTrade runtime.

## 1. Read these safety rules first

1. Run a status command before a start, stop, restart, or deployment command.
2. Make one change at a time, then check its status and logs.
3. Prefer a rolling restart over stopping a production workload.
4. Never delete a Kubernetes PVC during routine work. PVCs hold persistent data.
5. Never run `docker compose down -v`. The `-v` option deletes volumes.
6. Never commit `.env` files, passwords, tokens, SSH keys, backups, or kubeconfig.
7. Back up PostgreSQL before schema work or a risky deployment.
8. Do not stop Jenkins while a build is running.
9. Do not use `docker stop` for Kubernetes workloads. Kubernetes uses containerd
   and will recreate containers through their controllers.
10. Prefer GitHub to Jenkins to SonarQube to K3s for production releases.

Commands marked **causes downtime** should only be used deliberately.

## 2. Understand what runs where

| Component | Runtime/controller | Namespace or project | How to operate it |
|---|---|---|---|
| Frontend and API services | K3s Deployments | `campustrade` | `sudo k3s kubectl ...` |
| PostgreSQL and Redis | K3s StatefulSets + PVCs | `campustrade` | `sudo k3s kubectl ...` |
| Prometheus and Grafana | K3s Deployments | `campustrade-observability` | `sudo k3s kubectl ...` |
| Node exporter | K3s DaemonSet | `campustrade-observability` | `sudo k3s kubectl ...` |
| Traefik ingress | K3s system component | `kube-system` | `sudo k3s kubectl ...` |
| Jenkins | Linux systemd service | VPS host | `sudo systemctl ... jenkins` |
| SonarQube and Sonar database | Docker Compose | `campusmarket` | `sudo docker compose ...` |
| K3s itself | Linux systemd service | VPS host | `sudo systemctl ... k3s` |
| Docker itself | Linux systemd service | VPS host | `sudo systemctl ... docker` |
| Ansible | Command-line automation | Runs locally on the VPS | `ansible-playbook ...` |

Important vocabulary:

- A Kubernetes **Pod** is a running instance containing one or more containers.
- A **Deployment** keeps stateless Pods running and supports rolling updates.
- A **StatefulSet** manages stateful Pods with stable storage and names.
- A **DaemonSet** runs one Pod on each applicable node.
- A Kubernetes **Service** is a stable network address. It is not a process and
  cannot be started or stopped. Start or stop the Deployment/StatefulSet behind it.
- A **Namespace** separates groups of Kubernetes resources.
- A **PVC** is persistent storage. Deleting it can destroy data.

## 3. Connect to the VPS

### Step 1: Open PowerShell on Windows

Press the Windows key, type `PowerShell`, and open it.

### Step 2: Connect with the SSH key

```powershell
ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" azureuser@4.168.192.5
```

If Windows asks whether you trust the host, verify that you intended to connect
to `4.168.192.5`, type `yes`, and press Enter.

When connected, your prompt should contain `azureuser` and the VPS hostname.
Confirm the machine before doing anything:

```bash
whoami
hostname
pwd
```

Expected user: `azureuser`.

### Step 3: Go to the deployed release

```bash
cd /srv/campustrade/current
pwd
```

Expected path: `/srv/campustrade/current`.

Use `sudo` only for an administrative command. Avoid staying in a root shell.

### Step 4: Disconnect when finished

```bash
exit
```

## 4. Important paths on the VPS

| Path | Purpose |
|---|---|
| `/home/azureuser/campusmarket` | Git source checkout used by Ansible |
| `/srv/campustrade/current` | Current deployed release used by Jenkins and operations |
| `/srv/campustrade/shared/backend.env` | Protected production application environment |
| `/srv/campustrade/shared/operator-credentials.env` | Protected dashboard and seeded-user credentials |
| `/srv/campustrade/backups` | Protected database backups |
| `/srv/campustrade/evidence` | Deployment and runtime evidence |
| `/var/lib/jenkins` | Jenkins configuration, builds, and artifacts |

Do not copy protected files into the Git repository or a public directory.

## 5. Public application and operations interfaces

| Interface | URL |
|---|---|
| CampusTrade | `http://4.168.192.5` |
| Jenkins | `https://jenkins.4-168-192-5.sslip.io:80` |
| SonarQube | `https://sonar.4-168-192-5.sslip.io:80` |
| Grafana | `https://grafana.4-168-192-5.sslip.io:80` |
| Prometheus | `https://prometheus.4-168-192-5.sslip.io:80` |

The HTTPS URLs intentionally use port `80` because of the current Azure network
perimeter. Traefik still terminates TLS. No local tunnel is required.

Retrieve credentials only while connected to the VPS:

```bash
sudo cat /srv/campustrade/shared/operator-credentials.env
```

Confirm that only root can read the file:

```bash
sudo stat -c '%U:%G %a %n' /srv/campustrade/shared/operator-credentials.env
```

Expected result: `root:root 600`.

Do not paste the credentials into chat, source code, screenshots, or Jenkins logs.

## 6. The five-minute daily health check

Run these commands after connecting:

```bash
sudo systemctl is-active docker k3s jenkins
sudo k3s kubectl get nodes -o wide
sudo k3s kubectl -n campustrade get pods
sudo k3s kubectl -n campustrade get deployments,statefulsets,hpa
sudo k3s kubectl -n campustrade-observability get pods
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'
curl --fail --silent --show-error http://127.0.0.1/health
```

Healthy results mean:

- `docker`, `k3s`, and `jenkins` say `active`.
- The Kubernetes node says `Ready`.
- Application and monitoring Pods say `Running`.
- Ready counts match desired counts, such as `1/1` or `2/2`.
- PostgreSQL and Redis StatefulSets are ready.
- `campusmarket-sonar-db-1` is healthy and SonarQube is running.
- The health endpoint returns a successful JSON response.

Watch changing Pod status continuously; press `Ctrl+C` to stop watching:

```bash
sudo k3s kubectl -n campustrade get pods --watch
```

## 7. Basic Kubernetes commands

This project uses the K3s-bundled kubectl command:

```bash
sudo k3s kubectl
```

The most useful read-only commands are:

```bash
# List every namespace
sudo k3s kubectl get namespaces

# List every Pod on the cluster
sudo k3s kubectl get pods -A -o wide

# List the application's main resources
sudo k3s kubectl -n campustrade get all

# List application storage
sudo k3s kubectl -n campustrade get pvc

# List recent events in chronological order
sudo k3s kubectl -n campustrade get events --sort-by=.lastTimestamp | tail -50

# Show full details and recent events for one Pod
sudo k3s kubectl -n campustrade describe pod POD_NAME

# Show one Deployment as YAML
sudo k3s kubectl -n campustrade get deployment auth-service -o yaml
```

Replace `POD_NAME` with a name printed by `get pods`. Do not type the literal
word `POD_NAME`.

## 8. Application service names

The Kubernetes application Deployments are:

```text
frontend
api-gateway
auth-service
user-service
listing-service
chat-service
admin-service
ai-service
search-service
notification-service
```

`frontend` and `api-gateway` have Horizontal Pod Autoscalers with a minimum of
two replicas. Kubernetes may undo a manual scale-to-zero for these two services.
Use rolling restarts for them instead of trying to keep them stopped.

## 9. Inspect, restart, stop, and start one Kubernetes application

The examples use `auth-service`. Replace it with another valid Deployment name.

### Check status

```bash
sudo k3s kubectl -n campustrade get deployment auth-service
sudo k3s kubectl -n campustrade get pods -l app.kubernetes.io/name=auth-service
```

### Read logs

```bash
sudo k3s kubectl -n campustrade logs deployment/auth-service --tail=200
```

Follow new log messages live; press `Ctrl+C` to stop:

```bash
sudo k3s kubectl -n campustrade logs deployment/auth-service --follow
```

If a container restarted, inspect its previous logs:

```bash
pod=$(sudo k3s kubectl -n campustrade get pod \
  -l app.kubernetes.io/name=auth-service \
  -o jsonpath='{.items[0].metadata.name}')
sudo k3s kubectl -n campustrade logs "$pod" --previous --tail=200
```

### Safely restart it

This is the preferred operation:

```bash
sudo k3s kubectl -n campustrade rollout restart deployment/auth-service
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
```

### Stop it — causes service-specific downtime

Only use this for backend Deployments without an HPA:

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=0
sudo k3s kubectl -n campustrade get deployment auth-service
```

Expected ready count while stopped: `0/0`.

### Start it again

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=1
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
sudo k3s kubectl -n campustrade get pods -l app.kubernetes.io/name=auth-service
```

### Recreate one bad Pod

Deleting a Pod does not delete the Deployment. The Deployment creates a replacement:

```bash
sudo k3s kubectl -n campustrade delete pod POD_NAME
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
```

Do not repeatedly delete Pods without reading their events and logs first.

## 10. Work with a container inside a Kubernetes Pod

Kubernetes containers are not listed by `docker ps`; K3s uses containerd.

List the container names inside a Pod:

```bash
sudo k3s kubectl -n campustrade get pod POD_NAME \
  -o jsonpath='{.spec.containers[*].name}{"\n"}'
```

Open a shell inside a running container:

```bash
sudo k3s kubectl -n campustrade exec -it POD_NAME -- sh
```

Leave the container shell:

```bash
exit
```

Run one command without opening a shell:

```bash
sudo k3s kubectl -n campustrade exec deployment/auth-service -- node --version
```

You do not directly start or stop a Kubernetes container. Operate its Deployment,
StatefulSet, or DaemonSet so Kubernetes keeps the declared state consistent.

## 11. Start or restart the whole K3s cluster

### Check K3s

```bash
sudo systemctl status k3s --no-pager
```

### Restart K3s

This briefly interrupts Kubernetes workloads:

```bash
sudo systemctl restart k3s
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=180s
sudo k3s kubectl get pods -A
```

### Stop K3s — causes complete Kubernetes downtime

```bash
sudo systemctl stop k3s
sudo systemctl is-active k3s
```

Expected state: `inactive`.

### Start K3s again

```bash
sudo systemctl start k3s
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=180s
sudo k3s kubectl -n campustrade wait \
  --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl -n campustrade-observability wait \
  --for=condition=Available deployment --all --timeout=300s
sudo k3s kubectl get pods -A
```

Stopping K3s does not delete PVC data. If you manually scaled a Deployment to
zero before stopping K3s, it remains at zero after K3s starts; scale it back up.

## 12. Start every Kubernetes workload after manual scale-down

Normally K3s restores the saved replica counts automatically. If workloads were
manually scaled to zero, restore them explicitly:

```bash
sudo k3s kubectl -n campustrade scale statefulset/postgres --replicas=1
sudo k3s kubectl -n campustrade scale statefulset/redis --replicas=1

sudo k3s kubectl -n campustrade scale deployment \
  auth-service user-service listing-service chat-service admin-service \
  ai-service search-service notification-service --replicas=1

sudo k3s kubectl -n campustrade scale deployment \
  frontend api-gateway --replicas=2

sudo k3s kubectl -n campustrade-observability scale deployment \
  prometheus grafana platform-edge-proxy --replicas=1
```

Wait for recovery:

```bash
sudo k3s kubectl -n campustrade rollout status statefulset/postgres --timeout=300s
sudo k3s kubectl -n campustrade rollout status statefulset/redis --timeout=300s
sudo k3s kubectl -n campustrade wait \
  --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl -n campustrade-observability wait \
  --for=condition=Available deployment --all --timeout=300s
```

Node exporter is a DaemonSet and automatically returns when K3s returns.

## 13. Operate Jenkins

Jenkins is a normal Linux systemd service, not a Kubernetes Deployment.

### Status and logs

```bash
sudo systemctl status jenkins --no-pager
sudo journalctl -u jenkins -n 200 --no-pager
```

### Start, stop, or restart

Check that no build is running before stopping Jenkins.

```bash
sudo systemctl start jenkins
sudo systemctl stop jenkins
sudo systemctl restart jenkins
```

Wait until Jenkins responds after a start or restart:

```bash
for attempt in $(seq 1 60); do
  curl -fsS http://127.0.0.1:8080/login >/dev/null && break
  sleep 2
done
curl -fsS http://127.0.0.1:8080/login >/dev/null && echo "Jenkins is ready"
```

### Check the latest build from the VPS

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/lastBuild/api/json?tree=number,building,result,url" \
    | jq .
'
```

### Read the latest build console

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -fsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    http://127.0.0.1:8080/job/campustrade-ci/lastBuild/consoleText
' | tail -100
```

For normal operation, open the Jenkins web interface, select `campustrade-ci`,
and use **Build with Parameters** with both options enabled:

- `DEPLOY_TO_VPS=true`
- `RUN_SONARQUBE=true`

## 14. Operate Docker and SonarQube containers

Docker Compose is used only for SonarQube and its PostgreSQL database in the
production topology.

Always begin in the release directory:

```bash
cd /srv/campustrade/current
```

To avoid retyping the long Compose command, define a temporary shell function:

```bash
campus_compose() {
  sudo docker compose -p campusmarket \
    --env-file backend/.env \
    -f backend/docker-compose.prod.yml "$@"
}
```

This function lasts only until you disconnect.

### List containers

```bash
campus_compose ps sonar-db sonarqube
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

### Read SonarQube logs

```bash
campus_compose logs --tail=200 sonarqube
campus_compose logs --follow sonarqube
```

Press `Ctrl+C` to stop following logs.

### Restart SonarQube

```bash
campus_compose restart sonarqube
campus_compose ps sonar-db sonarqube
```

### Stop SonarQube without deleting data

```bash
campus_compose stop sonarqube
campus_compose ps sonar-db sonarqube
```

### Start SonarQube and its database

```bash
campus_compose up -d sonar-db sonarqube
campus_compose ps sonar-db sonarqube
```

Wait for the SonarQube API:

```bash
for attempt in $(seq 1 60); do
  status=$(curl -fsS http://127.0.0.1:9000/api/system/status 2>/dev/null \
    | jq -r '.status // empty' || true)
  [ "$status" = "UP" ] && break
  sleep 5
done
[ "$status" = "UP" ] && echo "SonarQube is ready"
```

You can use Docker directly for an emergency container operation:

```bash
sudo docker stop campusmarket-sonarqube-1
sudo docker start campusmarket-sonarqube-1
```

Compose is preferred because it understands the service configuration and
dependency on `sonar-db`.

Never run:

```text
docker compose down -v
docker volume rm ...
```

## 15. Operate Prometheus and Grafana

Both run in the `campustrade-observability` Kubernetes namespace.

### Status

```bash
sudo k3s kubectl -n campustrade-observability get deployments,pods,svc
```

### Logs

```bash
sudo k3s kubectl -n campustrade-observability \
  logs deployment/prometheus --tail=200
sudo k3s kubectl -n campustrade-observability \
  logs deployment/grafana --tail=200
```

### Restart

```bash
sudo k3s kubectl -n campustrade-observability \
  rollout restart deployment/prometheus
sudo k3s kubectl -n campustrade-observability \
  rollout status deployment/prometheus --timeout=300s

sudo k3s kubectl -n campustrade-observability \
  rollout restart deployment/grafana
sudo k3s kubectl -n campustrade-observability \
  rollout status deployment/grafana --timeout=300s
```

### Stop and start one — causes monitoring downtime

```bash
sudo k3s kubectl -n campustrade-observability \
  scale deployment/prometheus --replicas=0
sudo k3s kubectl -n campustrade-observability \
  scale deployment/prometheus --replicas=1
sudo k3s kubectl -n campustrade-observability \
  rollout status deployment/prometheus --timeout=300s
```

Replace `prometheus` with `grafana` to operate Grafana.

### Check all Prometheus targets

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- http://127.0.0.1:9090/api/v1/targets \
  | jq -r '.data.activeTargets[] | [.labels.job,.health,.lastError] | @tsv'
```

Healthy production currently has 11/11 targets `up`.

On Prometheus's Alerts page:

- `inactive` means healthy: the alert condition is false.
- `pending` means the condition is true but has not lasted long enough.
- `firing` means the condition and duration have been met.

Prometheus is a query workbench. Grafana is the visual dashboard.

## 16. Operate PostgreSQL and Redis safely

PostgreSQL and Redis are StatefulSets with PVC storage.

### Status and storage

```bash
sudo k3s kubectl -n campustrade get statefulset postgres redis
sudo k3s kubectl -n campustrade get pods postgres-0 redis-0
sudo k3s kubectl -n campustrade get pvc
```

### Logs

```bash
sudo k3s kubectl -n campustrade logs statefulset/postgres --tail=200
sudo k3s kubectl -n campustrade logs statefulset/redis --tail=200
```

### Rolling restart

```bash
sudo k3s kubectl -n campustrade rollout restart statefulset/postgres
sudo k3s kubectl -n campustrade rollout status statefulset/postgres --timeout=300s
```

Replace `postgres` with `redis` for Redis.

### Stop and start — causes application downtime

Back up PostgreSQL first. Then:

```bash
sudo k3s kubectl -n campustrade scale statefulset/postgres --replicas=0
sudo k3s kubectl -n campustrade scale statefulset/postgres --replicas=1
sudo k3s kubectl -n campustrade rollout status statefulset/postgres --timeout=300s
```

Scaling does not delete the PVC. Never add `kubectl delete pvc` to these steps.

### Back up PostgreSQL

```bash
sudo bash -c '
  set -euo pipefail
  source /srv/campustrade/shared/backend.env
  backup="/srv/campustrade/backups/campustrade-$(date -u +%Y%m%dT%H%M%SZ).dump"
  k3s kubectl -n campustrade exec postgres-0 -- \
    pg_dump -Fc -U "$DB_USER" -d "$DB_NAME" >"$backup"
  chmod 0600 "$backup"
  test -s "$backup"
  ls -lh "$backup"
'
```

The backup must exist and have a non-zero size before risky database work.

## 17. Run the Ansible playbooks

Ansible has no website and no separate username or password. It runs on the VPS
and uses `sudo` locally through this inventory entry:

```ini
[campustrade]
localhost ansible_connection=local
```

### Step 1: Connect and open the reviewed source checkout

```bash
cd /home/azureuser/campusmarket
git status --short
git branch --show-current
```

Do not continue if `git status --short` shows unexpected changes.

### Step 2: Update from GitHub safely

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git log -1 --oneline
```

### Step 3: Select the project Ansible configuration

```bash
export ANSIBLE_CONFIG="$PWD/ansible/ansible.cfg"
ansible-playbook --version
```

### Step 4: Validate playbook syntax

```bash
ansible-playbook ansible/playbooks/provision-vps.yml --syntax-check
ansible-playbook ansible/playbooks/deploy-platform.yml --syntax-check
```

### Step 5: Provision or repair VPS prerequisites

The provisioning playbook installs packages, configures kernel settings and
permissions, installs the pinned K3s binary, starts K3s, checks node readiness,
and restarts Jenkins after group changes.

Because this playbook restarts Jenkins at the end, first confirm in the Jenkins
interface that no build is running. The following check must print `false`:

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/lastBuild/api/json?tree=building" \
    | jq -r .building
'
```

```bash
ansible-playbook ansible/playbooks/provision-vps.yml
```

This playbook is intended to be idempotent: running it again should keep the
machine in the declared state.

### Step 6: Deploy the full platform manually

The Jenkins pipeline is preferred. Use this Ansible path only for deliberate
manual deployment from a commit that already passed Jenkins and SonarQube. The
manual Ansible command deploys the platform but does not replace the pipeline's
test, coverage, quality-gate, or Trivy evidence.

```bash
image_tag=$(git rev-parse --short=12 HEAD)
ansible-playbook ansible/playbooks/deploy-platform.yml \
  -e deployment_mode=full \
  -e image_tag="$image_tag"
```

`full` synchronizes source, preserves the protected environment, builds and
imports immutable images, applies all K3s resources, waits for rollouts, and
prints resource status.

Deploy only PostgreSQL and Redis resources when explicitly required:

```bash
ansible-playbook ansible/playbooks/deploy-platform.yml \
  -e deployment_mode=data-only
```

Do not use `data-only` as a normal application release; it intentionally omits
the application and monitoring workloads.

### Step 7: Verify after Ansible

```bash
sudo k3s kubectl get nodes
sudo k3s kubectl -n campustrade get pods,svc,ingress,hpa -o wide
sudo k3s kubectl -n campustrade-observability get pods
curl -fsS http://127.0.0.1/health
```

## 18. The professional production release workflow

This is the exact platform flow to use for normal changes:

```text
IDE/source change
    -> Git review and commit
    -> GitHub main
    -> Jenkins on the VPS
    -> configuration validation
    -> frontend tests/lint/audit
    -> backend build/tests/coverage/audit
    -> SonarQube analysis and quality gate
    -> production container image build
    -> Trivy critical-vulnerability gate
    -> K3s deployment
    -> public smoke tests
    -> archived evidence and system-information report
```

### Step 1: Review source changes on the workstation

From PowerShell in the repository:

```powershell
cd "C:\Users\kongy\Documents\smart-campus-market\campusmarket"
git status --short
git diff --check
git diff
```

This does not run the application locally. It only reviews source files.

### Step 2: Commit and push

```powershell
git add PATH_TO_CHANGED_FILE
git commit -m "Describe the production change clearly"
git push origin main
```

Replace `PATH_TO_CHANGED_FILE` with the real file path. Do not use `git add .`
until you have reviewed every untracked and modified file.

### Step 3: Let Jenkins detect the commit

Jenkins polls GitHub approximately every five minutes. Open:

`https://jenkins.4-168-192-5.sslip.io:80/job/campustrade-ci/`

Or select **Build with Parameters** manually and leave both production gates true.

### Step 4: Watch the Jenkins stages

Every required stage must be green:

1. Checkout
2. System Information
3. Validate Configuration
4. Frontend Quality Gate
5. Backend Quality Gate
6. SonarQube Quality Gate
7. Build Production Images
8. Container Security Gate
9. Deploy Production K3s

Do not accept a release if Jenkins says unstable, failed, aborted, or still running.

### Step 5: Review SonarQube

Open `https://sonar.4-168-192-5.sslip.io:80`, select the CampusTrade project,
and confirm:

- the analysis commit matches the Jenkins commit;
- the Quality Gate is passed;
- new bugs, vulnerabilities, and security hotspots are reviewed;
- coverage information is present.

Jenkins runs the tests on the VPS. SonarQube analyzes the code and imported
coverage and enforces the quality gate; it does not replace the Jest test runner.

### Step 6: Verify K3s and public services

```bash
sudo k3s kubectl -n campustrade get deployments,statefulsets,pods
sudo k3s kubectl -n campustrade-observability get deployments,daemonsets,pods
curl -fsS http://127.0.0.1/health

sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -fsS -u "$PROMETHEUS_USERNAME:$PROMETHEUS_PASSWORD" \
    https://prometheus.4-168-192-5.sslip.io:80/-/ready
'
```

Finally, open the public CampusTrade, Jenkins, SonarQube, Grafana, and Prometheus
URLs in a browser.

### Step 7: Record the accepted release

```bash
sudo bash -c '
  source /srv/campustrade/shared/operator-credentials.env
  curl -gfsS -u "$JENKINS_USERNAME:$JENKINS_PASSWORD" \
    "http://127.0.0.1:8080/job/campustrade-ci/lastSuccessfulBuild/api/json?tree=number,result,timestamp,actions[lastBuiltRevision[SHA1]]" \
    | jq .
'
```

The Git SHA, Jenkins build, SonarQube analysis, K3s image tag, and evidence should
refer to the same release.

## 19. What was done for the Prometheus home-page improvement

This real change demonstrates the full professional workflow:

1. The reported blank page was reproduced through the public authenticated URL.
2. Prometheus APIs were checked from the VPS: all 11 scrape targets were healthy.
3. Rule groups were checked: five alert rules were loaded and none were firing.
4. Prometheus logs were inspected: no errors or warnings were present.
5. A fresh browser check showed that `/query` was the normal empty query workspace.
6. The `up` query was executed and returned 11 series with value `1`.
7. A Traefik middleware was added so the public root opens the populated `up` query.
8. A production smoke assertion was added for that redirect.
9. The operator runbook was updated to explain Prometheus and alert states.
10. The change was reviewed, committed as `4393162`, and pushed to GitHub.
11. Jenkins build 8 ran validation, tests, coverage, SonarQube, image build,
    Trivy, K3s deployment, smoke tests, and evidence capture on the VPS.
12. Jenkins completed successfully and reported 11/11 Prometheus targets up.
13. A final public browser test confirmed the root opened the populated table
    with no console errors or failed network requests.

Use this same evidence-driven order for future incidents: reproduce, inspect,
identify the root cause, add a guard, deploy through the pipeline, and verify in
the real public environment.

## 20. Roll back one Kubernetes Deployment

List previous revisions:

```bash
sudo k3s kubectl -n campustrade rollout history deployment/auth-service
```

Roll back one revision:

```bash
sudo k3s kubectl -n campustrade rollout undo deployment/auth-service
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
```

Then rerun the health check and record why the rollback occurred. For a complete
release rollback, redeploy a previously accepted Git commit through Jenkins.

## 21. Troubleshooting decision guide

### A Pod is not Running

```bash
sudo k3s kubectl -n campustrade get pods -o wide
sudo k3s kubectl -n campustrade describe pod POD_NAME
sudo k3s kubectl -n campustrade logs POD_NAME --all-containers --tail=200
sudo k3s kubectl -n campustrade logs POD_NAME --all-containers --previous --tail=200
sudo k3s kubectl -n campustrade get events --sort-by=.lastTimestamp | tail -50
```

Common statuses:

- `Pending`: scheduling, storage, or resource problem.
- `ImagePullBackOff`: image name or availability problem.
- `CrashLoopBackOff`: application starts and repeatedly crashes; inspect logs.
- `0/1 Running`: readiness probe is failing; inspect `describe` and application logs.
- `Evicted`: node resource pressure; inspect node and events.

### The public application returns 502 or 503

```bash
sudo k3s kubectl -n campustrade get pods,svc,endpoints
sudo k3s kubectl -n kube-system get pods -l app.kubernetes.io/name=traefik
sudo k3s kubectl -n kube-system logs deployment/traefik --tail=200
curl -v http://127.0.0.1/health
```

### Jenkins does not open

```bash
sudo systemctl status jenkins --no-pager
sudo journalctl -u jenkins -n 200 --no-pager
curl -I http://127.0.0.1:8080/login
```

If inactive:

```bash
sudo systemctl start jenkins
```

### SonarQube does not open

```bash
cd /srv/campustrade/current

campus_compose() {
  sudo docker compose -p campusmarket \
    --env-file backend/.env \
    -f backend/docker-compose.prod.yml "$@"
}

campus_compose ps sonar-db sonarqube
campus_compose logs --tail=200 sonar-db sonarqube
curl -fsS http://127.0.0.1:9000/api/system/status | jq .
```

### Prometheus or Grafana does not open

```bash
sudo k3s kubectl -n campustrade-observability get pods,svc,ingressroute
sudo k3s kubectl -n campustrade-observability logs deployment/prometheus --tail=200
sudo k3s kubectl -n campustrade-observability logs deployment/grafana --tail=200
sudo k3s kubectl -n kube-system logs deployment/traefik --tail=200
```

### Ansible fails

Read the first failed task, not only the last summary. Then check:

```bash
cd /home/azureuser/campusmarket
git status --short
export ANSIBLE_CONFIG="$PWD/ansible/ansible.cfg"
ansible-inventory --graph
ansible campustrade -m ping
sudo -n true && echo "Passwordless sudo is available"
```

Run the failing playbook with more detail:

```bash
ansible-playbook ansible/playbooks/provision-vps.yml -vv
```

Do not blindly rerun destructive cleanup commands from an error message.

## 22. Start the complete platform after a VPS reboot

Systemd normally starts Docker, K3s, and Jenkins automatically. If manual
recovery is necessary, use this order:

```bash
sudo systemctl start docker
sudo systemctl start k3s

cd /srv/campustrade/current
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  up -d sonar-db sonarqube

sudo systemctl start jenkins

sudo k3s kubectl wait --for=condition=Ready node --all --timeout=180s
sudo k3s kubectl -n campustrade wait \
  --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl -n campustrade-observability wait \
  --for=condition=Available deployment --all --timeout=300s
```

Then run the daily health check from section 6.

## 23. Deliberately stop the complete platform

This causes complete downtime. Confirm that no Jenkins build is running and that
a recent database backup exists.

```bash
sudo systemctl stop jenkins

cd /srv/campustrade/current
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  stop sonarqube sonar-db

sudo systemctl stop k3s
```

Docker may remain active; an active Docker daemon alone does not expose the
stopped CampusTrade platform. Stop Docker only for host maintenance:

```bash
sudo systemctl stop docker
```

Start the platform again using section 22 in the documented order.

## 24. Quick command cheat sheet

Commands using `campus_compose` require the temporary function defined in
section 14. Define it again after reconnecting to the VPS.

| Goal | Command |
|---|---|
| Connect | `ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" azureuser@4.168.192.5` |
| List all Pods | `sudo k3s kubectl get pods -A` |
| Application status | `sudo k3s kubectl -n campustrade get pods` |
| Restart app service | `sudo k3s kubectl -n campustrade rollout restart deployment/auth-service` |
| Stop backend service | `sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=0` |
| Start backend service | `sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=1` |
| App logs | `sudo k3s kubectl -n campustrade logs deployment/auth-service --tail=200` |
| Restart K3s | `sudo systemctl restart k3s` |
| Restart Jenkins | `sudo systemctl restart jenkins` |
| SonarQube status | `campus_compose ps sonar-db sonarqube` |
| Restart SonarQube | `campus_compose restart sonarqube` |
| Monitoring status | `sudo k3s kubectl -n campustrade-observability get pods` |
| Kubernetes events | `sudo k3s kubectl -n campustrade get events --sort-by=.lastTimestamp` |
| Ansible syntax | `ansible-playbook ansible/playbooks/provision-vps.yml --syntax-check` |
| Provision VPS | `ansible-playbook ansible/playbooks/provision-vps.yml` |
| Full Ansible deploy | `ansible-playbook ansible/playbooks/deploy-platform.yml -e deployment_mode=full -e image_tag="$image_tag"` |

## 25. Final operating discipline

For every production action, follow this loop:

```text
Check status
    -> read logs and events
    -> make one controlled change
    -> wait for readiness
    -> run health and smoke checks
    -> verify dashboards
    -> record the build/commit and result
```

If you are unsure, stop before a destructive command. Status, logs, `describe`,
and events are safe places to begin. Production data deletion is never a normal
troubleshooting step.
