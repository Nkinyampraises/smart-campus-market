# CampusTrade

CampusTrade is a campus marketplace built as a React frontend with nine Node.js
microservices, PostgreSQL, Redis, and real-time chat.

## Live Azure test environment

- Application: <http://4.168.192.5>
- Platform: Ubuntu 24.04 Azure VM
- Runtime: K3s with Traefik ingress, persistent PostgreSQL and Redis, and horizontal autoscaling
- CI/CD: Jenkins pulling this GitHub repository every five minutes
- Quality: remote tests and coverage in Jenkins with a SonarQube quality gate
- Monitoring: Prometheus and Grafana through a private SSH tunnel

The canonical application deployment is `campusmarket/k8s/base`. K3s runs the
frontend, API gateway, eight domain services, PostgreSQL, Redis, Prometheus,
Grafana, and node exporter. Docker Compose is retained only for the isolated
SonarQube and Sonar PostgreSQL services. Jenkins runs as a loopback-bound
system service on the same VPS.

## Repository

- Application overview: [`campusmarket/README.md`](campusmarket/README.md)
- Production deployment: [`campusmarket/backend/PRODUCTION.md`](campusmarket/backend/PRODUCTION.md)
- VM operations: [`campusmarket/backend/OPERATIONS.md`](campusmarket/backend/OPERATIONS.md)
- Full operator runbook: [`campusmarket/docs/operations/PLATFORM_OPERATIONS_RUNBOOK.md`](campusmarket/docs/operations/PLATFORM_OPERATIONS_RUNBOOK.md)
- CI pipeline: [`campusmarket/Jenkinsfile`](campusmarket/Jenkinsfile)

## Local development

```bash
cd campusmarket
npm run install:all
npm run start:dev
```

Copy the appropriate `.env.example` files before starting. Never commit real
credentials or private environment files.

## Production verification

The Jenkins pipeline validates Compose, lints and builds the frontend, tests
the backend services, audits production dependencies, builds all application
images, and scans them for fixable critical vulnerabilities before deployment
is allowed.
