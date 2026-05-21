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
docker compose -f docker-compose.prod.yml up -d --build
```

Production entrypoint:
- Nginx: `http://<server-ip>:80`

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
