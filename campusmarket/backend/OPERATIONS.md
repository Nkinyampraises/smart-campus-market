# CampusTrade Test VM Operations

## Securely open Jenkins, Grafana, and Prometheus

Keep this SSH command running in a PowerShell window on your computer:

```powershell
ssh -i "C:\path\to\your-private-key.pem" `
  -L 8080:127.0.0.1:8080 `
  -L 3009:127.0.0.1:3009 `
  -L 9090:127.0.0.1:9090 `
  azureuser@<vm-public-ip>
```

Then open these local addresses:

- Jenkins: <http://localhost:8080>
- Grafana: <http://localhost:3009>
- Prometheus: <http://localhost:9090>

The traffic is encrypted inside SSH. Azure inbound rules are not required for
ports 8080, 3009, or 9090.

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

Only Jenkins connects to GitHub. Grafana reads Prometheus, and Prometheus
scrapes the running application and VM. The pipeline checks GitHub every five
minutes. It validates Compose, lints and
builds the frontend, tests every backend service, runs production dependency
audits, and builds the production images. Deployment runs only from `main` and
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
