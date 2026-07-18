# CampusTrade Production Deployment Guide

## Architecture
- 9 microservices (auth, user, listing, chat, admin, ai, search, notification, api-gateway)
- PostgreSQL 16 + Redis 7
- Event-driven communication over Redis Pub/Sub
- Nginx reverse proxy at the edge

## Prerequisites
- Docker 24+ and Docker Compose v2
- A Linux server with firewall controls
- TLS termination (load balancer, ingress, or reverse proxy)

## Quick Start (Hardened Compose)

From the repository root, create separate shared and AI-provider environment
files. The provider file must contain only `ANTHROPIC_API_KEY` and
`ANTHROPIC_MODEL`:

```bash
cd backend
cp .env.example .env
cp ai-provider.env.example ai-provider.env
chmod 600 .env ai-provider.env
# Set strong shared secrets/SMTP values in .env and the Claude values only in
# ai-provider.env.
AI_PROVIDER_ENV_FILE="$PWD/ai-provider.env" \
  docker compose -p campusmarket --env-file .env \
  -f docker-compose.prod.yml -f docker-compose.ai.yml up -d --build
```

Windows PowerShell quick deploy:
```powershell
.\backend\scripts\deploy-prod.ps1 -AiProviderEnvFile backend/ai-provider.env
```

If your environment uses an intercepting proxy/custom CA and Docker image builds fail on npm TLS verification, use:
```powershell
.\backend\scripts\deploy-prod.ps1 -DisableStrictSsl
```

Production entrypoint:
- Nginx: `http://<server-ip>:80`

Administrative upstream ports remain bound to the VPS loopback or Kubernetes
network. Access them only through the TLS routes published by Traefik:

- Grafana: `https://grafana.4-168-192-5.sslip.io:80`
- Prometheus: `https://prometheus.4-168-192-5.sslip.io:80`
- Jenkins: `https://jenkins.4-168-192-5.sslip.io:80`
- SonarQube: `https://sonar.4-168-192-5.sslip.io:80`

Do not create public Azure inbound rules for ports 3009, 9090, 8080, or 9000.
Prometheus's Traefik route requires the protected edge credential.

Health checks:
```bash
AI_PROVIDER_ENV_FILE="$PWD/ai-provider.env" \
  docker compose -p campusmarket --env-file .env \
  -f docker-compose.prod.yml -f docker-compose.ai.yml ps
AI_PROVIDER_ENV_FILE="$PWD/ai-provider.env" \
  docker compose -p campusmarket --env-file .env \
  -f docker-compose.prod.yml -f docker-compose.ai.yml logs -f api-gateway
```

## Environment Variables (Required)

Set these shared values in `backend/.env`:
- `JWT_SECRET` (64+ random chars)
- `GOOGLE_CLIENT_ID` (the same OAuth web client ID used by the frontend)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `FRONTEND_URL` (real frontend origin)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` for browser push notifications
- `SONAR_DB_USER`, `SONAR_DB_PASSWORD`, `SONAR_DB_NAME` for SonarQube's isolated database

Set only these values in the separate `backend/ai-provider.env` file for a
Compose deployment:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

On the VPS, use the root-owned, `campustrade-deploy` group-readable mode `0640` file at
`/srv/campustrade/shared/ai-provider.env` instead. Set
`AI_PROVIDER_ENV_FILE` to its absolute path when invoking Compose. This path is
used by the dedicated `docker-compose.ai.yml` override and is not injected into
other containers. The provider file is attached with a service-level
`env_file` setting only on `ai-service`, so
the API key and model are unavailable to the gateway and every other service.
Never put either provider value in the shared backend environment or source
control.

Generate strong secrets:
```bash
openssl rand -base64 64
npx web-push generate-vapid-keys
```

## Database Setup

Run on first deploy:
```bash
psql -U <db_user> -d <db_name> -f backend/init.sql
```

## Deployment Target

The supported target is the Azure VPS: K3s runs the application, data, edge,
Grafana, and Prometheus workloads; Docker Compose runs only SonarQube and its
isolated PostgreSQL database; Jenkins runs as a secured systemd service. Ansible
provisions the VPS host controls.

## Production Hardening Included

- Health endpoints on all services (`/health`)
- Compose healthchecks wired with `depends_on: condition: service_healthy`
- Internal-only microservice exposure in `docker-compose.prod.yml`
- Restored shared event bus (`backend/shared/events.js`)
- Fixed fraud event flow (`ai-service` publishes to `audit.channel`, `admin-service` subscribes)
- Admin report notifications fan out to all admin users

## Final Security Checklist

- [ ] Enable TLS at the edge (LB/Ingress/Nginx)
- [ ] Restrict `FRONTEND_URL` to the real domain
- [ ] Use managed PostgreSQL with SSL
- [ ] Use managed Redis with AUTH and network isolation
- [ ] Store secrets in Vault or cloud secret manager
- [ ] Enable log shipping and alerting (e.g., Loki/ELK + PagerDuty)
- [ ] Run `npm audit` and image scanning in CI

## Monitoring

The production Compose stack includes:
- Prometheus 3.12 with 15-day/5 GB retention
- Grafana 13 with a provisioned Prometheus data source
- A provisioned CampusTrade production dashboard
- Node exporter for VM CPU, memory, filesystem, and network metrics
- SonarQube Community Build with an isolated PostgreSQL 17 database
- Alerts for service availability, HTTP errors, latency, disk, and memory

Start or update monitoring with the same deployment command:

```bash
docker compose -p campusmarket \
  --env-file /srv/campustrade/shared/backend.env \
  -f /srv/campustrade/current/backend/docker-compose.prod.yml \
  up -d sonar-db sonarqube
```

The alert rules are evaluated by Prometheus. Production notification delivery
still requires an Alertmanager destination such as email, Slack, or PagerDuty.

## Jenkins

Install the current Jenkins LTS package on Ubuntu 24.04:

```bash
chmod +x backend/scripts/install-jenkins-ubuntu.sh
backend/scripts/install-jenkins-ubuntu.sh
```

The installer binds Jenkins to `127.0.0.1:8080`, adds the Jenkins service user
to the Docker group, and creates `/srv/campustrade` for stable deployments.
See `OPERATIONS.md` for the one-time Jenkins UI configuration and
`SONARQUBE.md` for project/token setup. The Jenkins installer also applies the
host `vm.max_map_count` and file limits required by SonarQube.
