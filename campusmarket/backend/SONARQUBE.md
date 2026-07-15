# CampusTrade SonarQube setup

CampusTrade runs SonarQube Community Build and a dedicated PostgreSQL database
inside the existing Compose stack. The service is bound to the VM loopback
interface, just like Jenkins, Grafana, and Prometheus.

## Capacity and host prerequisites

Use a Linux VM with at least 4 GB of RAM available to SonarQube in addition to
the application and Jenkins workload. The Jenkins installer applies these host
settings:

```text
vm.max_map_count=524288
fs.file-max=131072
```

If Jenkins was installed before this change, rerun
`backend/scripts/install-jenkins-ubuntu.sh` or apply the settings manually
before starting SonarQube.

## Start the service

Set unique strong values for `SONAR_DB_USER`, `SONAR_DB_PASSWORD`, and
`SONAR_DB_NAME` in the protected `backend/.env`, then deploy normally:

```bash
docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml up -d sonar-db sonarqube
```

Check startup without printing secrets:

```bash
docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml ps sonar-db sonarqube
curl --fail http://127.0.0.1:9000/api/system/status
```

Do not use `docker compose down -v`: that deletes the SonarQube database and
analysis history.

## One-time secure bootstrap

1. Browse to the VPS-hosted interface at
   <https://sonar.4-168-192-5.sslip.io:80>.
2. Sign in with the initial SonarQube credentials shown by the product and
   immediately replace the initial password.
3. Create the `campusmarket` project using the project key already declared in
   `sonar-project.properties`.
4. Generate a project analysis token with the narrowest available scope.
5. In Jenkins, add the token as a **Secret text** credential named
   `campustrade-sonar-token`.
6. Run `campustrade-ci` with `RUN_SONARQUBE=true`.

Never put the analysis token in `.env`, `sonar-project.properties`, build
parameters, console commands, or screenshots.

## Pipeline behavior

Jenkins uses the pinned official SonarScanner container. Analysis runs after
the frontend and backend gates and waits up to five minutes for the SonarQube
quality-gate result. A failed gate fails the pipeline before production images
or deployment can proceed.

The repository configuration analyzes application and shared source while
excluding dependencies, build output, generated coverage, and minified files.
When real LCOV reports are introduced, the existing report paths will be
picked up automatically.

## Backup and upgrade

- Back up the `sonar_db_data` volume/database before upgrading.
- Keep `sonarqube_data`, `sonarqube_extensions`, and `sonarqube_logs` volumes.
- Review SonarQube upgrade notes before changing the pinned image.
- Validate the scanner/server compatibility and run one non-deploying Jenkins
  build before promoting an upgrade.
