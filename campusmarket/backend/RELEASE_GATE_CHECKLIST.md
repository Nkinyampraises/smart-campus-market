# Release Gate Checklist

## Build and Test Gates
- [ ] Backend service dependencies installed with `npm ci`
- [ ] Frontend build passes (`npm run build`)
- [ ] Backend syntax checks pass (`node --check`)
- [ ] Backend unit tests pass (`npm test -- --passWithNoTests`)

## Security Gates
- [ ] `npm audit --omit=dev --audit-level=high` passes for all backend services
- [ ] Container scan passes with no fixable CRITICAL findings (`trivy image`)
- [ ] Secrets are not hardcoded in repo
- [ ] `JWT_SECRET` is strong and environment-injected

## Runtime Reliability Gates
- [ ] All services expose `/health`
- [ ] Graceful shutdown hooks handle `SIGTERM` and `SIGINT`
- [ ] Redis event bus initializes and publishes/subscribes correctly
- [ ] Admin receives fraud flags from AI over `audit.channel`

## Deploy Gates
- [ ] `docker compose -f backend/docker-compose.prod.yml config` validates
- [ ] Smoke test script passes (`backend/scripts/smoke-test.sh`)
- [ ] Azure Compose rollout succeeds with all 16 declared services running
- [ ] Rollback command/procedure is documented and verified

## Post-Deploy Checks
- [ ] API gateway `/health` is green
- [ ] Public endpoint smoke checks pass (`/api/admin/public-stats`)
- [ ] Error rate and latency dashboards stable for 15+ minutes
- [ ] Alerting channels verified (PagerDuty/Slack/email)
- [ ] Prometheus reports every application and node-exporter target as healthy
- [ ] Grafana provisions the CampusTrade production dashboard
