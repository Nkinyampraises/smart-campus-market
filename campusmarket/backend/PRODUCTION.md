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

```bash
cd backend
cp .env.example .env
# set strong secrets and real SMTP credentials
docker compose -p campusmarket -f docker-compose.prod.yml up -d --build
```

Windows PowerShell quick deploy:
```powershell
.\backend\scripts\deploy-prod.ps1
```

If your environment uses an intercepting proxy/custom CA and Docker image builds fail on npm TLS verification, use:
```powershell
.\backend\scripts\deploy-prod.ps1 -DisableStrictSsl
```

Production entrypoint:
- Nginx: `http://<server-ip>:80`

Administrative services are deliberately bound to the VM loopback interface:
- Grafana: `http://127.0.0.1:3009`
- Prometheus: `http://127.0.0.1:9090`
- Jenkins: `http://127.0.0.1:8080`

Do not create public Azure inbound rules for these ports. Use the SSH tunnel
documented in `OPERATIONS.md`.

Health checks:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api-gateway
```

## Environment Variables (Required)

Set these in `backend/.env`:
- `JWT_SECRET` (64+ random chars)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `FRONTEND_URL` (real frontend origin)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`

Generate strong secrets:
```bash
openssl rand -base64 64
```

## Database Setup

Run on first deploy:
```bash
psql -U <db_user> -d <db_name> -f backend/init.sql
```

## Kubernetes Deployment (Optional)

```bash
kubectl apply -f backend/k8s/namespace.yml
kubectl apply -f backend/k8s/configmap.yml
kubectl apply -f backend/k8s/secret.yml
kubectl apply -f backend/k8s/auth-service.yml
kubectl apply -f backend/k8s/user-service.yml
kubectl apply -f backend/k8s/listing-service.yml
kubectl apply -f backend/k8s/chat-service.yml
kubectl apply -f backend/k8s/search-service.yml
kubectl apply -f backend/k8s/notification-service.yml
kubectl apply -f backend/k8s/admin-service.yml
kubectl apply -f backend/k8s/ai-service.yml
kubectl apply -f backend/k8s/api-gateway.yml
kubectl apply -f backend/k8s/ingress.yml
```

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
- Alerts for service availability, HTTP errors, latency, disk, and memory

Start or update monitoring with the same deployment command:

```bash
docker compose -p campusmarket --env-file backend/.env \
  -f backend/docker-compose.prod.yml up -d
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
See `OPERATIONS.md` for the one-time Jenkins UI configuration.
