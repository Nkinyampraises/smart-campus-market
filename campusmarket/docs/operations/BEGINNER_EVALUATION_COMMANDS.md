# CampusTrade beginner VPS and evaluation command sheet

This is the beginner guide for the real CampusTrade VPS. Run only the
command for the action you need; **do not run every row in a table**.

- **Shut down** leaves that component off until you run its **Start again** row.
- **Restart** briefly replaces or cycles the component and brings it back by
  itself; use this when you do not need to demonstrate a lasting failure.

## 1. Know where to type things

- **WINDOWS POWERSHELL**: PowerShell on your Windows computer.
- **VPS TERMINAL**: the Linux prompt after SSH connects.
- **BROWSER**: Chrome, Edge, or Firefox; URLs are not terminal commands.
- The application, tests, containers, Kubernetes, and monitoring run on the VPS.
  Windows is used only for SSH, Git, and the browser.

| Platform | How it runs | Where you control it |
|---|---|---|
| CampusTrade application | Kubernetes/K3s | VPS terminal with `k` |
| Prometheus and Grafana | Kubernetes/K3s | VPS terminal with `k` |
| SonarQube | Docker Compose | VPS terminal with `dc` |
| Jenkins | Linux systemd service | VPS terminal with `systemctl` |
| Ansible | VPS command-line tool | VPS terminal |

## 2. Open and organize your command-line windows

### Step 1 - open three PowerShell windows or tabs

The recommended number is **three**. They let you control, watch, and read logs
without blocking one another.

1. Press the **Windows** key on your keyboard.
2. Type `PowerShell`.
3. Open **Windows PowerShell** or **PowerShell**.
4. Repeat these steps until three windows are open. If you use Windows Terminal,
   click the arrow beside **+**, choose **PowerShell** twice, and keep all three
   PowerShell tabs open.
5. Keep the windows side by side if your screen has enough space.

| Window | Name it mentally | What it is for |
|---|---|---|
| PowerShell 1 | **CONTROL** | The only window allowed to stop, start, restart, scale, or deploy |
| PowerShell 2 | **WATCH** | Read-only status commands such as `get pods` or `watch` |
| PowerShell 3 | **LOGS** | Commands that follow logs and keep running until `Ctrl+C` |
| PowerShell 4, optional | **ANSIBLE** | Open only when demonstrating Ansible; do not deploy from CONTROL at the same time |

One window is enough for a very small task, but do not run a follow-logs command
there because it occupies the prompt. Three is the safest normal arrangement.
Four is the maximum recommended arrangement for the evaluation.

Your web browser is separate and does not count as a command-line window. Keep
it open for Jenkins, SonarQube, Prometheus, and Grafana while the terminals run.

### Step 2 - connect every PowerShell window to the VPS

Paste this same command into **each** PowerShell window:

```powershell
ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" azureuser@4.168.192.5
```

If the first connection asks whether to trust the host, type `yes` and press
Enter. A window becomes a **VPS TERMINAL** only after its prompt contains
`azureuser@campusmarket-test-vm`. Never run the Linux commands at a Windows
prompt such as `PS C:\...>`.

### Step 3 - prepare every connected VPS terminal

Paste these three lines into **each** connected terminal:

```bash
cd /srv/campustrade/current
alias k='sudo k3s kubectl'
alias dc='sudo docker compose -p campusmarket --env-file /srv/campustrade/current/backend/.env -f /srv/campustrade/current/backend/docker-compose.prod.yml'
```

`k` means Kubernetes. `dc` means production Docker Compose. Aliases belong only
to the terminal where you created them, so repeat this preparation after every
new SSH connection.

### Step 4 - start the read-only windows

In **WATCH**, show application Pods continuously:

```bash
watch -n 2 'sudo k3s kubectl -n campustrade get pods'
```

In **LOGS**, follow the service used in the exercise, for example auth:

```bash
k -n campustrade logs deployment/auth-service --follow
```

Press `Ctrl+C` to stop `watch` or log following. `Ctrl+C` here stops only the
display command; it does **not** stop the application service.

### Rules that prevent terminal interference

- Run state-changing commands only in **CONTROL**. WATCH and LOGS stay read-only.
- Do only one failure exercise at a time and restore it before stopping another
  service. Extra terminals are for observing, not for causing parallel failures.
- Never run Ansible, a Jenkins deployment, and manual stop/start commands at the
  same time.
- Do not paste a command into a terminal currently showing moving logs. Press
  `Ctrl+C` or use CONTROL.
- A changed directory or alias in one terminal does not change another terminal.
- Closing a terminal does not restore a stopped service. Always run the recovery
  command and section 4 first.
- `exit` disconnects only that SSH terminal; it does not shut down the VPS.

## 3. Browser addresses and logins

| Platform | Address |
|---|---|
| CampusTrade | `http://4.168.192.5` |
| API documentation | `http://4.168.192.5/api/docs` |
| Jenkins login | `https://jenkins.4-168-192-5.sslip.io:80/login` |
| SonarQube | `https://sonar.4-168-192-5.sslip.io:80` |
| Grafana | `https://grafana.4-168-192-5.sslip.io:80` |
| Prometheus | `https://prometheus.4-168-192-5.sslip.io:80` |
| Prometheus targets | `https://prometheus.4-168-192-5.sslip.io:80/targets` |
| Prometheus alerts | `https://prometheus.4-168-192-5.sslip.io:80/alerts` |
| GitHub | `https://github.com/Nkinyampraises/smart-campus-market` |

Display the protected credentials in the **VPS TERMINAL**:

```bash
sudo cat /srv/campustrade/shared/operator-credentials.env
```

| Login | Use these two fields from the file |
|---|---|
| Jenkins | `JENKINS_USERNAME` and `JENKINS_PASSWORD` |
| Grafana | `GRAFANA_USERNAME` and `GRAFANA_PASSWORD` |
| Prometheus | `PROMETHEUS_USERNAME` and `PROMETHEUS_PASSWORD` |
| SonarQube | `SONAR_USERNAME` and `SONAR_PASSWORD` |
| CampusTrade administrator | `CAMPUSTRADE_ADMIN_EMAIL` and `CAMPUSTRADE_ADMIN_PASSWORD` |
| CampusTrade demo user | `CAMPUSTRADE_DEMO_EMAIL` and `CAMPUSTRADE_DEMO_PASSWORD` |

Never place these values in GitHub, screenshots, reports, issues, or chat.

## 4. Health check before and after every exercise

Type each row in the **VPS TERMINAL**. Repeat this table after restoring a
stopped service.

| Check | One-line command | Healthy result |
|---|---|---|
| Host services | `sudo systemctl is-active docker k3s jenkins` | Three `active` lines |
| Kubernetes node | `k get nodes` | `Ready` |
| Application Pods | `k -n campustrade get pods` | `Running`; READY values match, such as `1/1` |
| Monitoring Pods | `k -n campustrade-observability get pods` | `Running`; READY values match |
| SonarQube containers | `dc ps sonar-db sonarqube` | Both `Up`; database `healthy` |
| API gateway process health | `curl -fsS http://127.0.0.1/health` | JSON contains `"status":"ok"` |

The `/health` result proves that the API gateway process responds; it does not
prove every downstream service is healthy. Use the Pod checks, Prometheus target
count, and the affected API route together to prove full recovery.

Check all Prometheus targets with this single line:

```bash
k -n campustrade-observability exec deployment/prometheus -- wget -qO- http://127.0.0.1:9090/api/v1/targets | jq -r '[.data.activeTargets[]] as $all | [.data.activeTargets[] | select(.health == "up")] as $up | "\($up|length)/\($all|length) targets up"'
```

Healthy output is `11/11 targets up`.

## 5. Kubernetes application commands

Use only **CONTROL** for this section. `auth-service` is the safest first
failure demonstration. Restore the selected row before touching another row.

### Application services with one normal replica

| Service | Shut down | Start again | Restart without shutting down first |
|---|---|---|---|
| Auth | `k -n campustrade scale deployment/auth-service --replicas=0` | `k -n campustrade scale deployment/auth-service --replicas=1 && k -n campustrade rollout status deployment/auth-service --timeout=300s` | `k -n campustrade rollout restart deployment/auth-service && k -n campustrade rollout status deployment/auth-service --timeout=300s` |
| User | `k -n campustrade scale deployment/user-service --replicas=0` | `k -n campustrade scale deployment/user-service --replicas=1 && k -n campustrade rollout status deployment/user-service --timeout=300s` | `k -n campustrade rollout restart deployment/user-service && k -n campustrade rollout status deployment/user-service --timeout=300s` |
| Listing | `k -n campustrade scale deployment/listing-service --replicas=0` | `k -n campustrade scale deployment/listing-service --replicas=1 && k -n campustrade rollout status deployment/listing-service --timeout=300s` | `k -n campustrade rollout restart deployment/listing-service && k -n campustrade rollout status deployment/listing-service --timeout=300s` |
| Chat | `k -n campustrade scale deployment/chat-service --replicas=0` | `k -n campustrade scale deployment/chat-service --replicas=1 && k -n campustrade rollout status deployment/chat-service --timeout=300s` | `k -n campustrade rollout restart deployment/chat-service && k -n campustrade rollout status deployment/chat-service --timeout=300s` |
| Admin | `k -n campustrade scale deployment/admin-service --replicas=0` | `k -n campustrade scale deployment/admin-service --replicas=1 && k -n campustrade rollout status deployment/admin-service --timeout=300s` | `k -n campustrade rollout restart deployment/admin-service && k -n campustrade rollout status deployment/admin-service --timeout=300s` |
| AI | `k -n campustrade scale deployment/ai-service --replicas=0` | `k -n campustrade scale deployment/ai-service --replicas=1 && k -n campustrade rollout status deployment/ai-service --timeout=300s` | `k -n campustrade rollout restart deployment/ai-service && k -n campustrade rollout status deployment/ai-service --timeout=300s` |
| Search | `k -n campustrade scale deployment/search-service --replicas=0` | `k -n campustrade scale deployment/search-service --replicas=1 && k -n campustrade rollout status deployment/search-service --timeout=300s` | `k -n campustrade rollout restart deployment/search-service && k -n campustrade rollout status deployment/search-service --timeout=300s` |
| Notification | `k -n campustrade scale deployment/notification-service --replicas=0` | `k -n campustrade scale deployment/notification-service --replicas=1 && k -n campustrade rollout status deployment/notification-service --timeout=300s` | `k -n campustrade rollout restart deployment/notification-service && k -n campustrade rollout status deployment/notification-service --timeout=300s` |

Read or follow a service's logs by replacing `auth-service` with its exact name:

```bash
k -n campustrade logs deployment/auth-service --tail=100
k -n campustrade logs deployment/auth-service --follow
```

### Autoscaled frontend and API gateway

These two Deployments normally have two replicas. Kubernetes puts their existing
Horizontal Pod Autoscalers into maintenance mode while the desired replica count
is zero, then reactivates autoscaling when you manually restore two replicas.
Run the complete **Start again** command before another exercise.
Stopping either one creates a public application outage, so these are
**instructor-only, high-impact commands**. For an ordinary demonstration, use
the restart column or the controlled auth-service exercise instead.

| Service | Shut down | Start again | Restart without shutting down first |
|---|---|---|---|
| API gateway | `k -n campustrade scale deployment/api-gateway --replicas=0` | `k -n campustrade scale deployment/api-gateway --replicas=2 && k -n campustrade rollout status deployment/api-gateway --timeout=300s` | `k -n campustrade rollout restart deployment/api-gateway && k -n campustrade rollout status deployment/api-gateway --timeout=300s` |
| Frontend | `k -n campustrade scale deployment/frontend --replicas=0` | `k -n campustrade scale deployment/frontend --replicas=2 && k -n campustrade rollout status deployment/frontend --timeout=300s` | `k -n campustrade rollout restart deployment/frontend && k -n campustrade rollout status deployment/frontend --timeout=300s` |

### PostgreSQL and Redis data services - instructor-only exercises

Stopping either StatefulSet affects several application services. Scaling to
zero keeps its persistent volume; deleting its PVC would destroy data and is
forbidden. Never stop PostgreSQL and Redis together, and never stop either one
while Jenkins or Ansible is deploying.

| Data service | Shut down | Start again | Restart without shutting down first |
|---|---|---|---|
| PostgreSQL | `k -n campustrade scale statefulset/postgres --replicas=0` | `k -n campustrade scale statefulset/postgres --replicas=1 && k -n campustrade rollout status statefulset/postgres --timeout=300s` | `k -n campustrade rollout restart statefulset/postgres && k -n campustrade rollout status statefulset/postgres --timeout=300s` |
| Redis | `k -n campustrade scale statefulset/redis --replicas=0` | `k -n campustrade scale statefulset/redis --replicas=1 && k -n campustrade rollout status statefulset/redis --timeout=300s` | `k -n campustrade rollout restart statefulset/redis && k -n campustrade rollout status statefulset/redis --timeout=300s` |

After any database recovery, repeat section 4. If application Pods do not
recover their connections, restart the affected application Deployment using
the correct row above.

### Required Kubernetes evaluation flow

Run these rows in order. The evaluation requires scaling, rolling updates, and
service discovery.

| Step | One-line VPS command |
|---|---|
| 1. Scale to two Pods | `k -n campustrade scale deployment/auth-service --replicas=2` |
| 2. Wait for both Pods | `k -n campustrade rollout status deployment/auth-service --timeout=300s` |
| 3. Show two ready Pods | `k -n campustrade get pods -l app.kubernetes.io/name=auth-service` |
| 4. Restore one Pod | `k -n campustrade scale deployment/auth-service --replicas=1 && k -n campustrade rollout status deployment/auth-service --timeout=300s` |
| 5. Start a rolling update | `k -n campustrade rollout restart deployment/auth-service` |
| 6. Prove rollout success | `k -n campustrade rollout status deployment/auth-service --timeout=300s` |
| 7. Show service discovery | `k -n campustrade get services -o wide` |
| 8. Show autoscaling | `k -n campustrade get hpa` |

Take screenshots at steps 3, 6, 7, and 8.

### Controlled failure and monitoring flow

1. Prove auth is healthy in the **VPS TERMINAL**:

```bash
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' -X POST http://127.0.0.1/api/auth/login -H 'Content-Type: application/json' --data '{}'
```

Healthy output is `HTTP 400`: the service received the deliberately empty form.

2. Stop auth:

```bash
k -n campustrade scale deployment/auth-service --replicas=0
```

3. Repeat the first `curl` command. Failed output should be `HTTP 502`.

4. In the **BROWSER**, open Prometheus and execute `up{job="auth-service"}`.
   It changes from `1` to `0`. Open **Alerts**; after about 2-3 minutes the
   service-down alert fires. Open Grafana and show the service-health dashboard.

5. Restore auth and wait:

```bash
k -n campustrade scale deployment/auth-service --replicas=1
k -n campustrade rollout status deployment/auth-service --timeout=300s
```

6. Repeat the first `curl`; it must return `HTTP 400` again. Repeat section 4
   before leaving the exercise.

## 6. Docker containers and Linux host services

Use only **CONTROL** for stop/start/restart. Confirm no Jenkins build is active
before touching Docker, SonarQube, or K3s.

### SonarQube Docker containers

`sonarqube` depends on `sonar-db`. The database recovery commands therefore
recover both containers in the correct order.

| Container or group | Shut down | Start again | Restart without shutting down first |
|---|---|---|---|
| SonarQube only | `dc stop sonarqube` | `dc up -d sonar-db sonarqube` | `dc restart sonarqube` |
| Sonar database and SonarQube | `dc stop sonarqube && dc stop sonar-db` | `dc up -d sonar-db sonarqube` | `dc stop sonarqube && dc stop sonar-db && dc up -d sonar-db sonarqube` |

| What you want | Read-only VPS command |
|---|---|
| List both containers | `dc ps -a sonar-db sonarqube` |
| Read SonarQube logs | `dc logs --tail=100 sonarqube` |
| Follow SonarQube logs | `dc logs --follow sonarqube` |
| Check SonarQube readiness | `curl -fsS http://127.0.0.1:9000/api/system/status` |

SonarQube can take 1-2 minutes to report `UP`. Wait automatically with:

```bash
until curl -fsS http://127.0.0.1:9000/api/system/status | jq -e '.status == "UP"' >/dev/null; do sleep 5; done
```

Never run `docker compose down -v`; that would delete persistent data. Also
never run plain `dc up -d` without the two service names: this production file
still describes legacy containers that must not run beside K3s.

### Docker, Jenkins, and K3s Linux services

| Host service | Shut down | Start again | Restart without shutting down first |
|---|---|---|---|
| Docker engine | `sudo systemctl stop docker.service docker.socket` | `sudo systemctl start docker.socket docker.service` | `sudo systemctl restart docker.service` |
| Jenkins | `sudo systemctl stop jenkins` | `sudo systemctl start jenkins` | `sudo systemctl restart jenkins` |
| K3s control plane/API | `sudo systemctl stop k3s` | `sudo systemctl start k3s` | `sudo systemctl restart k3s` |

| What you want | Read-only VPS command |
|---|---|
| Docker status | `sudo systemctl status docker.service docker.socket --no-pager` |
| Docker logs | `sudo journalctl -u docker -n 100 --no-pager` |
| Jenkins status | `sudo systemctl status jenkins --no-pager` |
| Jenkins logs | `sudo journalctl -u jenkins -n 100 --no-pager` |
| K3s status | `sudo systemctl status k3s --no-pager` |
| K3s logs | `sudo journalctl -u k3s -n 100 --no-pager` |

Do not run `dc` commands while the Docker engine is stopped, and do not operate
the host `containerd` service separately because K3s manages its own container
runtime. Stopping the K3s service makes `kubectl` and the control plane
unavailable, but existing Pod containers continue running. It is therefore not
a service-failure test and not a complete application shutdown. After starting
K3s, run the next command and then repeat section 4:

```bash
k wait --for=condition=Ready node --all --timeout=180s
```

Do not stop Traefik, CoreDNS, metrics-server, or local-path-provisioner one by
one. They are K3s-managed cluster internals and are not part of a service-failure
exercise.

## 7. Jenkins, Prometheus, and Grafana

### BROWSER - run the required Jenkins pipeline

1. Open the Jenkins login URL from section 3 and sign in.
2. Open `campustrade-ci`, then click **Build with Parameters**.
3. Keep `DEPLOY_TO_VPS=true` and `RUN_SONARQUBE=true`.
4. Click **Build** and wait for **SUCCESS**.
5. Show build, unit/integration tests, coverage, SonarQube, security, deployment,
   and smoke-test stages. Jenkins polling may take up to five minutes when a
   GitHub push starts the build automatically.

Do not run application tests on Windows. Jenkins runs them on the VPS and sends
coverage/static-analysis results to SonarQube. SonarQube supports the evidence;
it does not replace the required tests or minimum 80% coverage.

### VPS TERMINAL - monitoring operations

| Monitoring service | Shut down | Start again | Restart without shutting down first |
|---|---|---|---|
| Prometheus | `k -n campustrade-observability scale deployment/prometheus --replicas=0` | `k -n campustrade-observability scale deployment/prometheus --replicas=1 && k -n campustrade-observability rollout status deployment/prometheus --timeout=300s` | `k -n campustrade-observability rollout restart deployment/prometheus && k -n campustrade-observability rollout status deployment/prometheus --timeout=300s` |
| Grafana | `k -n campustrade-observability scale deployment/grafana --replicas=0` | `k -n campustrade-observability scale deployment/grafana --replicas=1 && k -n campustrade-observability rollout status deployment/grafana --timeout=300s` | `k -n campustrade-observability rollout restart deployment/grafana && k -n campustrade-observability rollout status deployment/grafana --timeout=300s` |
| Jenkins/Sonar edge proxy | `k -n campustrade-observability scale deployment/platform-edge-proxy --replicas=0` | `k -n campustrade-observability scale deployment/platform-edge-proxy --replicas=1 && k -n campustrade-observability rollout status deployment/platform-edge-proxy --timeout=300s` | `k -n campustrade-observability rollout restart deployment/platform-edge-proxy && k -n campustrade-observability rollout status deployment/platform-edge-proxy --timeout=300s` |

Stopping Prometheus pauses metric collection and alert evaluation. Stopping
Grafana hides dashboards but does not stop collection. Stopping the edge proxy
hides only the public Jenkins and SonarQube routes; those services keep running,
and the public Prometheus and Grafana routes continue working directly.

The node exporter is a DaemonSet rather than a Deployment. Its instructor-only
shutdown command temporarily asks it to run only on a deliberately nonexistent
node label; the start command removes that selector. Kubernetes may print a
Pod Security warning during the patch because node exporter reads host metrics.

| Node exporter action | One-line VPS command |
|---|---|
| Shut down | `k -n campustrade-observability patch daemonset/node-exporter --type=merge -p '{"spec":{"template":{"spec":{"nodeSelector":{"campustrade.io/maintenance":"disabled"}}}}}'` |
| Start again | `k -n campustrade-observability patch daemonset/node-exporter --type=merge -p '{"spec":{"template":{"spec":{"nodeSelector":null}}}}' && k -n campustrade-observability rollout status daemonset/node-exporter --timeout=300s` |
| Restart | `k -n campustrade-observability rollout restart daemonset/node-exporter && k -n campustrade-observability rollout status daemonset/node-exporter --timeout=300s` |

| What you want | Read-only VPS command |
|---|---|
| Monitoring status | `k -n campustrade-observability get deployments,daemonsets,pods` |
| Prometheus logs | `k -n campustrade-observability logs deployment/prometheus --tail=100` |
| Grafana logs | `k -n campustrade-observability logs deployment/grafana --tail=100` |
| Jenkins/Sonar proxy logs | `k -n campustrade-observability logs deployment/platform-edge-proxy --tail=100` |
| Node exporter logs | `k -n campustrade-observability logs daemonset/node-exporter --tail=100` |

For evidence, show 11/11 Prometheus targets, alert rules, and Grafana panels for
availability, traffic, errors, latency, CPU, memory, and disk.

## 8. CampusTrade's two Ansible playbooks for the required evidence

The evaluation requires at least two playbooks. The following two files are the
playbooks implemented by CampusTrade to satisfy that requirement.

The provisioning playbook restarts Jenkins, so both playbooks require the safety
check below.

| Preparation step | One-line VPS command |
|---|---|
| Refresh GitHub `main` source | `bash /srv/campustrade/current/backend/scripts/sync-ansible-source.sh` |
| Go to the Ansible checkout | `cd /home/azureuser/campusmarket` |
| Show the exact source commit | `cat .source-commit` |
| Select Ansible configuration | `export ANSIBLE_CONFIG="$PWD/ansible/ansible.cfg"` |
| Show inventory | `ansible-inventory --graph` |
| Test the connection | `ansible campustrade -m ping` |
| Check playbook 1 | `ansible-playbook --syntax-check ansible/playbooks/provision-vps.yml` |
| Check playbook 2 | `ansible-playbook --syntax-check ansible/playbooks/deploy-platform.yml` |

**Stop before running either playbook.** In the Jenkins browser, open the latest
successful `campustrade-ci` build and confirm its Git revision starts with the
same 12 characters printed by `cat .source-commit`. Also confirm no build is
currently running. Continue only when both checks pass.

Run playbook 1 and save its evidence log:

```bash
set -o pipefail; ansible-playbook ansible/playbooks/provision-vps.yml 2>&1 | tee "/srv/campustrade/evidence/ansible-provision-$(date -u +%Y%m%dT%H%M%SZ).log"
```

After playbook 1 finishes with `failed=0`, run playbook 2:

```bash
set -o pipefail; image_tag="$(cat .source-commit)" && ansible-playbook ansible/playbooks/deploy-platform.yml -e deployment_mode=full -e image_tag="$image_tag" 2>&1 | tee "/srv/campustrade/evidence/ansible-deploy-$(date -u +%Y%m%dT%H%M%SZ).log"
```

Take screenshots of both play recaps showing `failed=0`, then return to the
deployed release with `cd /srv/campustrade/current` and repeat section 4.

## 9. Evaluation evidence checklist

| Evaluation area | What to show |
|---|---|
| VPS infrastructure | Infrastructure diagram; cloud VM; `hostname`, `ip address`, `k get nodes -o wide`; networking/firewall rules; Traefik reverse proxy; public URL |
| Scrum | Roles, product backlog, sprint backlogs, planning, retrospectives, and burndown charts for two sprints |
| Jenkins CI/CD | GitHub source integration and one successful build/test/deploy pipeline |
| Prometheus/Grafana | 11/11 targets, alert rules, dashboard screenshots, and key-metric explanation |
| Ansible | Both playbook files and both execution logs with `failed=0` |
| Testing | Unit/integration results and at least 80% coverage from Jenkins; SonarQube is supporting evidence |
| Kubernetes | Pods, Services, HPA, scaling, rolling update, service discovery, and CLI screenshots |
| Architecture | Component, deployment, and module views; technologies/trade-offs; quality attributes; pros/cons; design-process report |
| Innovation | AI guidance, fraud detection, notifications, and marketplace workflows |
| Documentation | GitHub README, API docs, user manual, project report, screenshots, and live links |

Submission also requires a printed report, a seven-minute video, at most 20
slides, and a ZIP containing the required deliverables.

## 10. Finish safely

Repeat section 4 and do not leave until everything is healthy. Never run these
commands during a normal demonstration:

```text
docker compose down -v
dc up -d
docker volume rm ...
k delete pvc ...
rm -rf /srv/campustrade
git reset --hard
```

Disconnect from the VPS with:

```bash
exit
```
