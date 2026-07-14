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
| Jenkins | CI/CD and remote test execution | systemd | SSH tunnel to port 8080 |
| SonarQube | Static analysis, coverage display, and quality-gate enforcement | Docker Compose | SSH tunnel to port 9000 |
| Sonar PostgreSQL | SonarQube analysis history | Docker Compose volume | Private Docker network |
| Prometheus | Metrics collection and query engine | K3s | SSH tunnel to port 9090 |
| Grafana | Authenticated dashboards over Prometheus | K3s | SSH tunnel to port 3009 |
| Node exporter | VPS operating-system metrics | K3s DaemonSet | Prometheus only |

Prometheus has no native human account. It is bound to the VPS loopback path,
and Grafana is the authenticated interface for normal monitoring.

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

## 3. Open the private dashboards

Run this in a separate PowerShell window and leave it open:

```powershell
ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" -N `
  -L 18080:127.0.0.1:8080 `
  -L 19000:127.0.0.1:9000 `
  -L 19090:127.0.0.1:9090 `
  -L 13009:127.0.0.1:3009 `
  azureuser@4.168.192.5
```

Then open:

| Interface | URL |
|---|---|
| Jenkins | `http://127.0.0.1:18080` |
| SonarQube | `http://127.0.0.1:19000` |
| Prometheus | `http://127.0.0.1:19090` |
| Grafana | `http://127.0.0.1:13009` |

These tools are deliberately not exposed on the public network.

## 4. Accounts and credential retrieval

| System | Username |
|---|---|
| Jenkins | `campustrade-admin` |
| Grafana | `campustrade-admin` |
| SonarQube | `campustrade-admin` |
| CampusTrade administrator | `admin@campustrade.local` |
| CampusTrade demonstration student | `demo.student@campustrade.local` |
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
3. Open Jenkins through the tunnel and inspect `campustrade-ci`.
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

The verified 14 July 2026 release is Jenkins build 24, commit
`64bb3654ed23172b8dfdddac6db69a68ffdad6a1`, immutable image tag
`64bb3654ed23`: 310 tests passed, all four coverage measures exceeded 80%, the
SonarQube gate passed with zero open vulnerabilities, all ten images passed the
Trivy critical-vulnerability gate, and all 11 Prometheus targets were up.

## 10. Use SonarQube correctly

SonarQube analyzes code and imported test/coverage results; it does not replace
the Jest test runner. Jenkins executes Jest remotely on the VPS and SonarQube
supplies the integrated quality interface and release gate. No production
qualification depends on tests run on the workstation.

After opening the tunnel:

1. Sign in at `http://127.0.0.1:19000`.
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
curl -fsS http://127.0.0.1:9090/api/v1/targets | \
  jq -r '.data.activeTargets[] | [.labels.job,.health,.scrapeUrl] | @tsv'
```

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

### Dashboard tunnel does not open

Confirm the SSH process is still running, then check the VPS endpoints:

```bash
curl -I http://127.0.0.1:8080/login
curl http://127.0.0.1:3009/api/health
curl http://127.0.0.1:9090/-/ready
curl http://127.0.0.1:9000/api/system/status
```

## 15. Security rules

- Keep Jenkins, Grafana, Prometheus, and SonarQube behind SSH tunnels.
- Do not commit `.env`, tokens, passwords, private keys, kubeconfig, or backups.
- Do not print secret files in Jenkins logs.
- Do not use `docker compose down -v` or delete K3s PVCs in routine work.
- Create only trusted Jenkins users: the current authorization strategy grants
  full control to authenticated users and blocks anonymous access.
- Back up data before database, SonarQube, or Kubernetes upgrades.
- Make production changes through GitHub and the green Jenkins pipeline.
