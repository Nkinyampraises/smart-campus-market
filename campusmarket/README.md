# CampusTrade - Smart Campus Marketplace

A full-stack microservices application for campus-based buying and selling.

## Architecture

- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Backend**: Event-driven microservices under `backend/services/`
- **Database**: PostgreSQL with separate schemas per service
- **Cache/Message Broker**: Redis for caching and pub/sub
- **Real-time**: Socket.IO for chat functionality
- **Communication**: Redis Pub/Sub events for async service coordination
- **Containerization**: Docker images built and scanned on the VPS
- **Orchestration**: K3s on the Azure VPS, with immutable release tags
- **CI/CD**: Jenkins with dependency, container, and SonarQube quality gates
- **Monitoring**: Prometheus + Grafana, with Jenkins system-status reports
- **Code quality**: SonarQube Community Build

## Production access

- CampusTrade: `http://4.168.192.5`
- API health: `http://4.168.192.5/health`
- API documentation: `http://4.168.192.5/api/docs`
- Jenkins: `https://jenkins.4-168-192-5.sslip.io:80`
- SonarQube: `https://sonar.4-168-192-5.sslip.io:80`
- Prometheus: `https://prometheus.4-168-192-5.sslip.io:80`
- Grafana: `https://grafana.4-168-192-5.sslip.io:80`

The deployed application, CI tests, SonarQube analysis, container builds,
monitoring, and databases all run on the VPS. Use the workstation only for Git,
SSH, and a browser. Start with the
[beginner evaluation command sheet](docs/operations/BEGINNER_EVALUATION_COMMANDS.md)
for exact locations and one-line commands. Use the
[production operations runbook](docs/operations/PLATFORM_OPERATIONS_RUNBOOK.md)
for deeper troubleshooting and backup procedures.

## Development

- Frontend: `cd frontend && npm run dev`
- Backend services: `cd backend/services/<service-name> && npm run start:dev`
- Tests: `npm run test:all`

## Deployment

Jenkins uses the root `Jenkinsfile` to pull `main`, run 310 backend tests and
coverage on the VPS, enforce the SonarQube gate, audit dependencies, build and
Trivy-scan ten images, import them into K3s, perform a rolling deployment, run
public smoke tests, and archive evidence. Failed tests, sub-80% aggregate
coverage, a failed SonarQube gate, or critical image vulnerabilities block the
deployment.

See the [deployment evidence](docs/operations/VPS_DEPLOYMENT_EVIDENCE.md),
[test report](docs/testing/TEST_REPORT.md), and
[screenshot catalog](docs/evidence/screenshots/README.md) for the verified
release record.

## Project Structure

```
campus-trade/
├── frontend/                 # React application
├── backend/                  # Event-driven microservices
│   └── services/
│       ├── auth-service/
│       ├── user-service/
│       ├── listing-service/
│       ├── chat-service/
│       ├── admin-service/
│       ├── ai-service/
│       ├── search-service/
│       └── notification-service/
├── Jenkinsfile               # CI/CD pipeline
└── README.md
```

## API Documentation

API endpoints are documented with Swagger/OpenAPI. Access at `/api/docs` for each service.

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `npm test`
4. Submit pull request

## License

MIT
# Webhook test Thu Jun  4 21:27:09 WCAST 2026
