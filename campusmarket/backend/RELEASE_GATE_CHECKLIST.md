# Release Gate Checklist

## Build and Test Gates
- [ ] Backend service dependencies installed with `npm ci`
- [ ] Frontend build passes (`npm run build`)
- [ ] Backend syntax checks pass (`node --check`)
- [ ] Backend unit tests pass (`npm test -- --passWithNoTests`)

## Security Gates
- [ ] `npm audit --omit=dev --audit-level=high` passes for all backend services
- [ ] Container scan passes with no fixable CRITICAL findings (`trivy image`)
- [ ] SonarQube analysis completes and the project quality gate passes
- [ ] Secrets are not hardcoded in repo
- [ ] `JWT_SECRET` is strong and environment-injected

## Runtime Reliability Gates
- [ ] All services expose `/health`
- [ ] Graceful shutdown hooks handle `SIGTERM` and `SIGINT`
- [ ] Redis event bus initializes and publishes/subscribes correctly
- [ ] Admin receives fraud flags from AI over `audit.channel`

## Deploy Gates
- [ ] `docker compose -f backend/docker-compose.prod.yml config --quiet` validates
      without rendering provider secrets; never archive production Compose config output
- [ ] Smoke test script passes (`backend/scripts/smoke-test.sh`)
- [ ] Azure Compose rollout succeeds with all 18 declared services running
- [ ] Rollback command/procedure is documented and verified

## Post-Deploy Checks
- [ ] API gateway `/health` is green
- [ ] Public endpoint smoke checks pass (`/api/admin/public-stats`)
- [ ] Error rate and latency dashboards stable for 15+ minutes
- [ ] Alerting channels verified (PagerDuty/Slack/email)
- [ ] Prometheus reports every application and node-exporter target as healthy
- [ ] Grafana provisions the CampusTrade production dashboard
- [ ] SonarQube reports `UP` and Jenkins archives `ci-reports/system-information.html`
