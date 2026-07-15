# CampusTrade Test VM Operations

## Open Jenkins, Grafana, Prometheus, and SonarQube on the VPS

No workstation service or SSH tunnel is required:

- Jenkins: <https://jenkins.4-168-192-5.sslip.io:80>
- Grafana: <https://grafana.4-168-192-5.sslip.io:80>
- Prometheus: <https://prometheus.4-168-192-5.sslip.io:80>
- SonarQube: <https://sonar.4-168-192-5.sslip.io:80>

Traefik terminates TLS on the VPS. The Azure perimeter does not currently
admit port 443, so HTTPS intentionally uses public port 80 while upstream ports
8080, 3009, 9090, and 9000 remain private.

## Jenkins operations view

Every pipeline run probes Jenkins, Grafana, Prometheus, and SonarQube, then
places a concise status line directly in the Jenkins build description. Open
the archived `ci-reports/system-information.html` artifact for the full host
view: service readiness, Prometheus target count, containers, kernel, uptime,
CPU/load, memory, disk, and Docker Engine version.

The report does not contain credentials. `UNREACHABLE` means the service could
not be contacted from the Jenkins host at capture time; it does not silently
turn a failed probe green.

## First Jenkins login

Read the one-time password inside the SSH session:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Do not send or screenshot this password. Paste it into the Jenkins page, select
**Install suggested plugins**, and create a new administrator account.

## Create the production environment credential

1. Open **Manage Jenkins > Credentials**.
2. Select the global domain and choose **Add Credentials**.
3. Choose **Secret file**.
4. Upload the production `backend/.env` file from a secure local location.
5. Set the credential ID to `campustrade-prod-env`.

Never commit `backend/.env` to Git.

## Create the SonarQube credential

Complete the one-time SonarQube bootstrap in `SONARQUBE.md`, then add its
project analysis token in **Manage Jenkins > Credentials** as **Secret text**
with credential ID `campustrade-sonar-token`. The pipeline masks the token and
passes it only to the short-lived official scanner container.

## GitHub-connected pipeline

The Azure VM can install the version-controlled job definition at
`backend/scripts/configure-jenkins-job.groovy`. It creates the
`campustrade-ci` job, points it at GitHub, and loads the protected production
environment as the `campustrade-prod-env` secret-file credential. The manual
steps below are the fallback if the job has not been provisioned.

`backend/scripts/jenkins-campustrade.conf` selects the branch Jenkins checks.
Change it to `*/main` after the release branch is merged, then reload systemd
and restart Jenkins.

1. Select **New Item**.
2. Name it `campustrade-ci`.
3. Choose **Pipeline**.
4. Under **Pipeline**, select **Pipeline script from SCM**.
5. Choose **Git** and enter the GitHub repository URL.
6. Set the branch specifier to `*/main` (or the release branch before it is
   merged).
7. Set the script path to `campusmarket/Jenkinsfile`.
8. Save, then choose **Build Now**.

Only Jenkins connects to GitHub. Grafana reads Prometheus, Prometheus scrapes
the running application and VM, and Jenkins submits source analysis to the
loopback-only SonarQube service. The pipeline checks GitHub every five
minutes. It validates Compose, lints and
builds the frontend, tests every backend service, runs production dependency
audits, enforces the SonarQube quality gate, and builds the production images.
Deployment runs only from `main` and
only when the `DEPLOY_TO_TEST` parameter is explicitly enabled.

## Grafana

Sign in with `GRAFANA_USER` and `GRAFANA_PASS` from the production environment
file. Open **Dashboards > CampusTrade > CampusTrade Production Overview**.

The dashboard is version controlled. Edit
`monitoring/grafana/dashboards/campustrade-overview.json` rather than changing
the provisioned dashboard in the Grafana UI.

## Routine checks

To synchronize a reviewed GitHub branch to the current Azure test deployment,
run `backend/scripts/sync-and-deploy-azure.sh`. The script accepts the branch
name as its first argument, preserves `backend/.env`, rebuilds the Compose
stack, reapplies the idempotent database initialization, and runs smoke tests.

From the deployment directory on the VM:

```bash
cd /srv/campustrade
docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml ps
backend/scripts/smoke-test-running.sh
```

Check logs for one service:

```bash
docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml logs --tail=200 api-gateway
```

## Before real production use

- Attach a domain and enable HTTPS.
- Configure working SMTP delivery and test verification/reset emails.
- Restrict Azure SSH access to the administrator's current public IP.
- Store secrets in Azure Key Vault rather than a long-lived environment file.
- Configure database backups and test restoration.
- Add Alertmanager and a real notification destination.
- Move PostgreSQL and Redis to managed/private services when usage becomes real.
