# CampusTrade beginner VPS and evaluation command sheet

This is the short beginner guide for the real CampusTrade VPS. Run only the
command for the action you need; **do not run every row in a table**.

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

## 2. Start every session this way

### WINDOWS POWERSHELL - connect to the VPS

```powershell
ssh -i "C:\Users\kongy\Downloads\campusmarket-test-key.pem" azureuser@4.168.192.5
```

Wait until the prompt contains `azureuser@campusmarket-test-vm`, then type the
next three lines in the **VPS TERMINAL**:

```bash
cd /srv/campustrade/current
alias k='sudo k3s kubectl'
alias dc='sudo docker compose -p campusmarket --env-file /srv/campustrade/current/backend/.env -f /srv/campustrade/current/backend/docker-compose.prod.yml'
```

`k` is the short name for Kubernetes. `dc` is the short name for production
Docker Compose. Create the aliases again whenever you reconnect.

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
| Application health | `curl -fsS http://127.0.0.1/health` | JSON contains `"status":"ok"` |

Check all Prometheus targets with this single line:

```bash
k -n campustrade-observability exec deployment/prometheus -- wget -qO- http://127.0.0.1:9090/api/v1/targets | jq -r '[.data.activeTargets[]] as $all | [.data.activeTargets[] | select(.health == "up")] as $up | "\($up|length)/\($all|length) targets up"'
```

Healthy output is `11/11 targets up`.

## 5. Kubernetes application commands

Use `auth-service` for demonstrations. Do not stop `frontend` or `api-gateway`;
their autoscalers maintain multiple Pods.

| What you want | One-line VPS command |
|---|---|
| List application Pods | `k -n campustrade get pods` |
| Stop auth service | `k -n campustrade scale deployment/auth-service --replicas=0` |
| Start auth service | `k -n campustrade scale deployment/auth-service --replicas=1` |
| Restart auth service | `k -n campustrade rollout restart deployment/auth-service` |
| Wait until auth is ready | `k -n campustrade rollout status deployment/auth-service --timeout=300s` |
| Read the last 100 log lines | `k -n campustrade logs deployment/auth-service --tail=100` |
| Follow live logs | `k -n campustrade logs deployment/auth-service --follow` |

Press `Ctrl+C` to stop following logs.

### Required Kubernetes evaluation flow

Run these rows in order. The evaluation requires scaling, rolling updates, and
service discovery.

| Step | One-line VPS command |
|---|---|
| 1. Scale to two Pods | `k -n campustrade scale deployment/auth-service --replicas=2` |
| 2. Wait for both Pods | `k -n campustrade rollout status deployment/auth-service --timeout=300s` |
| 3. Show two ready Pods | `k -n campustrade get pods -l app.kubernetes.io/name=auth-service` |
| 4. Restore one Pod | `k -n campustrade scale deployment/auth-service --replicas=1` |
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

## 6. SonarQube container and host-service commands

### SonarQube Docker container

| What you want | One-line VPS command |
|---|---|
| List SonarQube containers | `dc ps -a sonar-db sonarqube` |
| Stop SonarQube | `dc stop sonarqube` |
| Start SonarQube | `dc up -d sonar-db sonarqube` |
| Restart SonarQube | `dc restart sonarqube` |
| Read logs | `dc logs --tail=100 sonarqube` |
| Follow logs | `dc logs --follow sonarqube` |
| Check its API | `curl -fsS http://127.0.0.1:9000/api/system/status` |

Confirm Jenkins is not building before stopping SonarQube. It can take 1-2
minutes to become ready after starting. Never run `docker compose down -v`.

### Jenkins and K3s Linux services

| What you want | One-line VPS command |
|---|---|
| Jenkins status | `sudo systemctl status jenkins --no-pager` |
| Stop Jenkins | `sudo systemctl stop jenkins` |
| Start Jenkins | `sudo systemctl start jenkins` |
| Restart Jenkins | `sudo systemctl restart jenkins` |
| Jenkins logs | `sudo journalctl -u jenkins -n 100 --no-pager` |
| K3s status | `sudo systemctl status k3s --no-pager` |
| Stop K3s | `sudo systemctl stop k3s` |
| Start K3s | `sudo systemctl start k3s` |
| Restart K3s | `sudo systemctl restart k3s` |
| K3s logs | `sudo journalctl -u k3s -n 100 --no-pager` |

Do not stop Jenkins during a build. Stopping K3s stops the entire application
and monitoring stack. After starting K3s, run this and then repeat section 4:

```bash
k wait --for=condition=Ready node --all --timeout=180s
```

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

| What you want | One-line VPS command |
|---|---|
| Monitoring status | `k -n campustrade-observability get pods` |
| Stop Prometheus | `k -n campustrade-observability scale deployment/prometheus --replicas=0` |
| Start Prometheus | `k -n campustrade-observability scale deployment/prometheus --replicas=1` |
| Restart Prometheus | `k -n campustrade-observability rollout restart deployment/prometheus` |
| Prometheus logs | `k -n campustrade-observability logs deployment/prometheus --tail=100` |
| Stop Grafana | `k -n campustrade-observability scale deployment/grafana --replicas=0` |
| Start Grafana | `k -n campustrade-observability scale deployment/grafana --replicas=1` |
| Restart Grafana | `k -n campustrade-observability rollout restart deployment/grafana` |
| Grafana logs | `k -n campustrade-observability logs deployment/grafana --tail=100` |

For evidence, show 11/11 Prometheus targets, alert rules, and Grafana panels for
availability, traffic, errors, latency, CPU, memory, and disk.

## 8. The two required Ansible playbooks

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
docker volume rm ...
k delete pvc ...
rm -rf /srv/campustrade
git reset --hard
```

Disconnect from the VPS with:

```bash
exit
```
