# CampusTrade production operations runbook

This is the operator's command guide for the production VPS at `4.168.192.5`.
Application runtime, CI, tests, code analysis, monitoring, and data services run
on that VPS. The workstation is only an SSH client and browser.

## 1. Service map

| Service | What it does | Runtime | Access |
|---|---|---|---|
| CampusTrade frontend | React user interface | K3s, 2 replicas | `http://4.168.192.5` |
| API gateway | Routes and protects API requests | K3s, 2 replicas | `http://4.168.192.5/api` |
| Eight domain services | Authentication, users, listings, chat, administration, AI, search, notifications | K3s | Through the gateway only |
| PostgreSQL | Durable marketplace data | K3s StatefulSet + PVC | Cluster-private |
| Redis | Events, cache, and real-time coordination | K3s StatefulSet + PVC | Cluster-private |
| Traefik | Public HTTP ingress | K3s | Port 80 |
| Jenkins | CI/CD and remote test execution | systemd | `https://jenkins.4-168-192-5.sslip.io:80` |
| SonarQube | Static analysis, coverage display, and quality-gate enforcement | Docker Compose | `https://sonar.4-168-192-5.sslip.io:80` |
| Sonar PostgreSQL | SonarQube analysis history | Docker Compose volume | Private Docker network |
| Prometheus | Metrics collection and query engine | K3s | `https://prometheus.4-168-192-5.sslip.io:80` |
| Grafana | Authenticated dashboards over Prometheus | K3s | `https://grafana.4-168-192-5.sslip.io:80` |
| Node exporter | VPS operating-system metrics | K3s DaemonSet | Prometheus only |

The underlying ports remain bound to the VPS loopback or cluster network. Only
Traefik's TLS routes are public. Prometheus has no native human account, so its
public route requires the protected Prometheus edge credential.

## 2. Connect to the VPS

From PowerShell, replace the key path if it was moved:

```powershell
ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" azureuser@4.168.192.5
```

Become root only for operational commands:

```bash
sudo -i
cd /srv/campustrade/current
```

Do not copy the private SSH key to the VPS or repository.

## 3. Open the VPS dashboards

No workstation service or SSH tunnel is required. Open these VPS-hosted URLs:

| Interface | URL |
|---|---|
| Jenkins | `https://jenkins.4-168-192-5.sslip.io:80` |
| SonarQube | `https://sonar.4-168-192-5.sslip.io:80` |
| Prometheus | `https://prometheus.4-168-192-5.sslip.io:80` |
| Grafana | `https://grafana.4-168-192-5.sslip.io:80` |

Port `80` in these HTTPS URLs is intentional because the Azure perimeter does
not currently admit port 443. Traefik still terminates TLS and obtains the
certificates automatically. Jenkins, SonarQube, and Grafana enforce their own
logins; Prometheus is protected by Traefik BasicAuth.

## 4. Accounts and credential retrieval

| System | Username |
|---|---|
| Jenkins | `campustrade-admin` |
| Grafana | `campustrade-admin` |
| SonarQube | `campustrade-admin` |
| Prometheus | value of `PROMETHEUS_USERNAME` in the protected credential file |
| CampusTrade administrator | `admin@ictuniversity.edu.cm` |
| CampusTrade demonstration student | `demo.student@ictuniversity.edu.cm` |
| VPS SSH | `azureuser` with the private key |

Passwords are generated independently and stored only in this root-readable
file on the VPS:

```bash
sudo cat /srv/campustrade/shared/operator-credentials.env
```

Confirm that it remains protected:

```bash
sudo stat -c '%U:%G %a %n' /srv/campustrade/shared/operator-credentials.env
```

The expected ownership and mode are `root:root 600`. Database passwords, JWT
secrets, OAuth secrets, and the Grafana bootstrap password remain in
`/srv/campustrade/shared/backend.env`. The Jenkins Sonar analysis token is
encrypted in the Jenkins credential store. Never paste either secret file into
chat, screenshots, issues, or Git commits.

The same credential file contains four seeded marketplace identities. Retrieve
their passwords only when a demonstration requires those accounts; do not copy
the file into a user home directory.

## 5. Fast health check

Run this after every restart or deployment:

```bash
sudo systemctl is-active docker k3s jenkins
curl --fail http://127.0.0.1/health
curl --fail http://127.0.0.1:9000/api/system/status
curl --fail http://127.0.0.1:9090/-/ready
curl --fail http://127.0.0.1:3009/api/health
sudo k3s kubectl get nodes
sudo k3s kubectl get pods -A
sudo k3s kubectl -n campustrade get deploy,statefulset,ingress,hpa
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Expected results:

- `docker`, `k3s`, and `jenkins` report `active`.
- Public health returns JSON with status `ok`.
- SonarQube reports `UP`.
- Prometheus and Grafana return HTTP 200.
- All non-job pods are `Running` and every deployment is available.
- Docker contains only SonarQube and its PostgreSQL database.

## 6. Start the complete platform

After a VPS reboot, systemd and K3s normally restore everything automatically.
If manual recovery is required, use this order:

```bash
sudo systemctl start docker
sudo systemctl start k3s
sudo systemctl start jenkins

cd /srv/campustrade/current
sudo docker compose -p campusmarket \
  --env-file backend/.env \
  -f backend/docker-compose.prod.yml \
  up -d sonar-db sonarqube

sudo k3s kubectl wait --for=condition=Ready node --all --timeout=180s
sudo k3s kubectl -n campustrade rollout status statefulset/postgres --timeout=300s
sudo k3s kubectl -n campustrade rollout status statefulset/redis --timeout=300s
sudo k3s kubectl -n campustrade wait --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl -n campustrade-observability wait \
  --for=condition=Available deployment --all --timeout=300s
```

Finish with the fast health check in section 5.

## 7. Stop and restart one application service

Valid deployment names are:

```text
frontend api-gateway auth-service user-service listing-service chat-service
admin-service ai-service search-service notification-service
```

A rolling restart preserves the desired replica count:

```bash
sudo k3s kubectl -n campustrade rollout restart deployment/auth-service
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
```

To deliberately stop a backend service that has no HPA:

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=0
sudo k3s kubectl -n campustrade get deployment/auth-service
```

Start it again:

```bash
sudo k3s kubectl -n campustrade scale deployment/auth-service --replicas=1
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
```

`frontend` and `api-gateway` are controlled by HPAs. Use a rolling restart for
them. Do not try to keep either at zero while its HPA exists.

## 8. Stop and restart all K3s workloads

This causes full application downtime:

```bash
sudo systemctl stop k3s
sudo systemctl status k3s --no-pager
```

Restart the cluster and wait for recovery:

```bash
sudo systemctl start k3s
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=180s
sudo k3s kubectl -n campustrade wait --for=condition=Available deployment --all --timeout=600s
sudo k3s kubectl get pods -A
```

Stopping K3s does not delete PVC data.

## 9. Operate Jenkins and run tests

Status and lifecycle:

```bash
sudo systemctl status jenkins --no-pager
sudo systemctl restart jenkins
sudo journalctl -u jenkins -n 200 --no-pager
```

Do not stop Jenkins while a production build is running. Check first:

```bash
sudo test -f /var/lib/jenkins/queue.xml && sudo grep -n campustrade-ci /var/lib/jenkins/queue.xml || true
latest=$(sudo awk '$1 == "lastCompletedBuild" {print $2}' \
  /var/lib/jenkins/jobs/campustrade-ci/builds/permalinks)
sudo tail -50 "/var/lib/jenkins/jobs/campustrade-ci/builds/$latest/log"
```

The normal release workflow is:

1. Commit and push reviewed changes to GitHub `main`.
2. Jenkins detects the commit within five minutes.
3. Open the VPS Jenkins URL and inspect `campustrade-ci`.
4. Confirm `DEPLOY_TO_VPS=true` and `RUN_SONARQUBE=true`.
5. Require every stage to be green before accepting the release.

Jenkins runs the backend tests and coverage plus the frontend production build
on the VPS inside pinned containers. It sends source and LCOV coverage to
SonarQube, waits for the quality gate, scans production images with Trivy,
deploys K3s, runs smoke tests, and archives system evidence. Browser evidence is
captured against the deployed public VPS rather than a local development server.

Follow a build directly on the VPS:

```bash
latest=$(sudo awk '$1 == "lastCompletedBuild" {print $2}' \
  /var/lib/jenkins/jobs/campustrade-ci/builds/permalinks)
sudo tail -f "/var/lib/jenkins/jobs/campustrade-ci/builds/$latest/log"
```

Inspect the archived test and infrastructure reports from the Jenkins build
page under **Artifacts**, or directly on the VPS:

```bash
successful=$(sudo awk '$1 == "lastSuccessfulBuild" {print $2}' \
  /var/lib/jenkins/jobs/campustrade-ci/builds/permalinks)
sudo find "/var/lib/jenkins/jobs/campustrade-ci/builds/$successful/archive" \
  -maxdepth 4 -type f | sort
sudo grep -E 'Tests:|Aggregate coverage|QUALITY GATE STATUS|Finished:' \
  "/var/lib/jenkins/jobs/campustrade-ci/builds/$successful/log"
```

Use the latest successful Jenkins build as the release authority. Its Git SHA,
immutable image tag, SonarQube quality gate, Trivy results, and evidence archive
must all agree before the release is accepted.

## 10. Use SonarQube correctly

SonarQube analyzes code and imported test/coverage results; it does not replace
the Jest test runner. Jenkins executes Jest remotely on the VPS and SonarQube
supplies the integrated quality interface and release gate. No production
qualification depends on tests run on the workstation.

Using the VPS-hosted SonarQube URL:

1. Sign in at `https://sonar.4-168-192-5.sslip.io:80`.
2. Open the `CampusTrade` project (`campusmarket` project key).
3. Review **Overview**, **Issues**, **Security Hotspots**, **Measures**, and
   **Activity**.
4. Confirm the latest analysis matches the latest Git commit.
5. Confirm the quality gate is green before accepting deployment.

Lifecycle and logs:

```bash
cd /srv/campustrade/current
sudo docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml ps sonar-db sonarqube
sudo docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml logs --tail=200 sonarqube
sudo docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml restart sonarqube
```

Stop and start SonarQube without deleting data:

```bash
sudo docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml stop sonarqube
sudo docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml up -d sonar-db sonarqube
```

Never run `docker compose down -v`; `-v` deletes analysis data and history.

## 11. Operate Grafana and Prometheus

Status and logs:

```bash
sudo k3s kubectl -n campustrade-observability get pods,svc
sudo k3s kubectl -n campustrade-observability logs deployment/grafana --tail=200
sudo k3s kubectl -n campustrade-observability logs deployment/prometheus --tail=200
```

Restart either dashboard service:

```bash
sudo k3s kubectl -n campustrade-observability rollout restart deployment/grafana
sudo k3s kubectl -n campustrade-observability rollout status deployment/grafana --timeout=300s
sudo k3s kubectl -n campustrade-observability rollout restart deployment/prometheus
sudo k3s kubectl -n campustrade-observability rollout status deployment/prometheus --timeout=300s
```

Deliberately stop and start one:

```bash
sudo k3s kubectl -n campustrade-observability scale deployment/grafana --replicas=0
sudo k3s kubectl -n campustrade-observability scale deployment/grafana --replicas=1
```

Check Prometheus targets:

```bash
sudo k3s kubectl -n campustrade-observability exec deployment/prometheus -- \
  wget -qO- http://127.0.0.1:9090/api/v1/targets | \
  jq -r '.data.activeTargets[] | [.labels.job,.health,.scrapeUrl] | @tsv'
```

Opening the public Prometheus root URL redirects to a pre-populated `up` query.
Every healthy scrape target must appear with value `1`. The Query page is a
query workbench, not a dashboard; use Grafana for the visual system overview.

On the Alerts page, `inactive` is the healthy state: the rule is loaded and its
condition is currently false. `pending` means the condition is true but has not
yet remained true for the configured `for` duration. `firing` means the alert
condition and duration have both been met and require investigation.

Useful production queries:

| Purpose | PromQL |
|---|---|
| Scrape health | `up` |
| Unhealthy targets | `up == 0` |
| Request rate by service | `sum by (job) (rate(http_requests_total[5m]))` |
| 5xx rate by service | `sum by (job) (rate(http_requests_total{status_code=~"5.."}[5m]))` |
| Host memory use percent | `100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)` |
| Filesystem free percent | `100 * node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}` |

Grafana and Prometheus are hosted on the VPS through distinct TLS hostnames.
Grafana serves its own application files from its configured public root URL;
Prometheus requires HTTP Basic authentication at Traefik. Confirm both routes
without exposing credentials in shell history:

```bash
curl -fsS https://grafana.4-168-192-5.sslip.io:80/api/health
sudo bash -c 'source /srv/campustrade/shared/operator-credentials.env; \
  curl -fsS -u "$PROMETHEUS_USERNAME:$PROMETHEUS_PASSWORD" \
  https://prometheus.4-168-192-5.sslip.io:80/-/ready'
```

Both commands must return successfully. The Grafana health response must report
`database: ok`, and Prometheus must return `Prometheus Server is Ready`.

## 12. Operate PostgreSQL and Redis safely

Status:

```bash
sudo k3s kubectl -n campustrade get statefulset postgres redis
sudo k3s kubectl -n campustrade get pvc
```

Rolling restart one data service:

```bash
sudo k3s kubectl -n campustrade rollout restart statefulset/postgres
sudo k3s kubectl -n campustrade rollout status statefulset/postgres --timeout=300s
```

Back up PostgreSQL before schema work:

```bash
sudo -i
source /srv/campustrade/shared/backend.env
backup="/srv/campustrade/backups/campustrade-$(date -u +%Y%m%dT%H%M%SZ).dump"
k3s kubectl -n campustrade exec postgres-0 -- \
  pg_dump -Fc -U "$DB_USER" -d "$DB_NAME" >"$backup"
chmod 0600 "$backup"
ls -lh "$backup"
```

Never delete the PostgreSQL or Redis PVCs during routine operations.

## 13. Deploy, inspect, and roll back

The preferred deployment path is GitHub to Jenkins. For an emergency manual
re-apply from the reviewed source already on the VPS:

```bash
cd /srv/campustrade/current
sudo IMAGE_TAG=production ENV_FILE=backend/.env bash k8s/scripts/deploy.sh full
sudo BASE_URL=http://127.0.0.1 bash backend/scripts/smoke-test-running.sh
```

Inspect a failure:

```bash
sudo k3s kubectl -n campustrade get events --sort-by=.lastTimestamp | tail -50
sudo k3s kubectl -n campustrade describe pod POD_NAME
sudo k3s kubectl -n campustrade logs POD_NAME --all-containers --tail=200
sudo k3s kubectl -n campustrade logs POD_NAME --all-containers --previous --tail=200
```

Roll a deployment back to its previous ReplicaSet:

```bash
sudo k3s kubectl -n campustrade rollout history deployment/auth-service
sudo k3s kubectl -n campustrade rollout undo deployment/auth-service
sudo k3s kubectl -n campustrade rollout status deployment/auth-service --timeout=300s
```

After any rollback, rerun health and smoke tests and record the incident.

## 14. Common troubleshooting

### Public site returns 502 or 503

```bash
sudo k3s kubectl -n campustrade get pods
sudo k3s kubectl -n campustrade get endpoints
sudo k3s kubectl -n kube-system logs deployment/traefik --tail=200
```

### Jenkins cannot deploy

```bash
id jenkins
sudo -u jenkins test -w /srv/campustrade/current && echo writable
sudo journalctl -u jenkins -n 200 --no-pager
```

The Jenkins account must remain in the `docker` and `k3s` groups.

### SonarQube quality gate fails

Open the SonarQube project and fix the reported issue. Do not disable
`RUN_SONARQUBE` or weaken the gate to force a deployment.

### A VPS dashboard does not open

Check the edge routes and their private upstreams directly on the VPS:

```bash
curl -I http://127.0.0.1:8080/login
curl http://127.0.0.1:3009/api/health
curl http://127.0.0.1:9090/-/ready
curl http://127.0.0.1:9000/api/system/status
sudo k3s kubectl -n campustrade-observability get ingressroute,pods,svc
```

If Grafana alone shows "failed to load its application files", verify
`GF_SERVER_ROOT_URL` on the Grafana deployment and request the public
`/api/health` URL. Grafana uses its own VPS hostname, not a subpath.

## 15. Security rules

- Keep ports 8080, 9000, 9090, and 3009 private; publish only through Traefik.
- Keep native authentication enabled and the Prometheus BasicAuth middleware attached.
- Do not commit `.env`, tokens, passwords, private keys, kubeconfig, or backups.
- Do not print secret files in Jenkins logs.
- Do not use `docker compose down -v` or delete K3s PVCs in routine work.
- Create only trusted Jenkins users: the current authorization strategy grants
  full control to authenticated users and blocks anonymous access.
- Back up data before database, SonarQube, or Kubernetes upgrades.
- Make production changes through GitHub and the green Jenkins pipeline.

## 16. Verify or refresh production demonstration data

The production seed contains six usable identities, 12 product/service
listings, 13 HTTPS product images, wishlists, offers, chat messages, a completed
transaction, a review, notifications, and moderation examples. It is safe to
run repeatedly:

```bash
sudo bash /srv/campustrade/current/backend/scripts/seed-production-data.sh
sudo bash /srv/campustrade/current/backend/scripts/verify-production-seed.sh
```

The verifier checks fixed record counts, exactly one account per expected
email, public listings and images, search, representative logins, and remote
image delivery. A passing run prints counts but never credentials.

## 17. Perform a clean platform rebuild

This is a disaster-recovery operation, not routine maintenance. It deletes all
CampusTrade application/database data, K3s state, Jenkins configuration and
history, SonarQube data, monitoring data, and Docker images/volumes. It preserves
the operating system, SSH access, the `azureuser` account, and base networking.

First confirm the reviewed changes are on GitHub `main` and validate the target
without changing it:

```bash
cd /srv/campustrade/current
sudo env \
  CONFIRM_RESET=DELETE_CAMPUSTRADE_PLATFORM \
  EXPECTED_PUBLIC_IP=4.168.192.5 \
  PUBLIC_IP_OVERRIDE=4.168.192.5 \
  DRY_RUN=true \
  bash backend/scripts/rebuild-vps-from-scratch.sh
```

Read the printed allowlist carefully. For an authorized rebuild, omit the dry
run variables:

```bash
cd /srv/campustrade/current
sudo env \
  CONFIRM_RESET=DELETE_CAMPUSTRADE_PLATFORM \
  EXPECTED_PUBLIC_IP=4.168.192.5 \
  bash backend/scripts/rebuild-vps-from-scratch.sh
```

The command verifies the VPS public IP independently, rotates internal secrets,
reinstalls the pinned Jenkins plugin closure, provisions K3s and SonarQube,
waits for the clean Jenkins/SonarQube pipeline, deploys, seeds, smoke-tests, and
captures evidence. A nonzero exit means the rebuild did not meet acceptance;
inspect the last command output and the relevant service logs before retrying.
