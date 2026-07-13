# CampusTrade

CampusTrade is a campus marketplace built as a React frontend with nine Node.js
microservices, PostgreSQL, Redis, and real-time chat.

## Live Azure test environment

- Application: <http://4.168.192.5>
- Platform: Ubuntu 24.04 Azure VM
- Runtime: Docker Compose
- CI/CD: Jenkins pulling this GitHub repository every five minutes
- Monitoring: Prometheus and Grafana through a private SSH tunnel

The canonical deployment is
`campusmarket/backend/docker-compose.prod.yml`. It runs the frontend, edge
Nginx, API gateway, eight domain services, PostgreSQL, Redis, Prometheus,
Grafana, and node exporter. Kubernetes, Ansible, and a second containerized
Jenkins stack are not deployment targets for this environment.

## Repository

- Application overview: [`campusmarket/README.md`](campusmarket/README.md)
- Production deployment: [`campusmarket/backend/PRODUCTION.md`](campusmarket/backend/PRODUCTION.md)
- VM operations: [`campusmarket/backend/OPERATIONS.md`](campusmarket/backend/OPERATIONS.md)
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
