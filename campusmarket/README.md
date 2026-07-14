# CampusTrade - Smart Campus Marketplace

A full-stack microservices application for campus-based buying and selling.

## Architecture

- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Backend**: Event-driven microservices under `backend/services/`
- **Database**: PostgreSQL with separate schemas per service
- **Cache/Message Broker**: Redis for caching and pub/sub
- **Real-time**: Socket.IO for chat functionality
- **Communication**: Redis Pub/Sub events for async service coordination
- **Containerization**: Docker
- **Orchestration**: Docker Compose on the Azure test VM
- **CI/CD**: Jenkins with dependency, container, and SonarQube quality gates
- **Monitoring**: Prometheus + Grafana, with Jenkins system-status reports
- **Code quality**: SonarQube Community Build

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and update values if needed
3. Run `npm install:all` to install dependencies
4. Start local development environment: `npm run start:dev`
5. Access the application at http://localhost:3000

## Development

- Frontend: `cd frontend && npm run dev`
- Backend services: `cd backend/services/<service-name> && npm run start:dev`
- Tests: `npm run test:all`

## Deployment

The deployed Azure environment is defined by
`backend/docker-compose.prod.yml`. Jenkins uses the root `Jenkinsfile` to pull
the repository from GitHub, run the release gates, and optionally update the
Azure test VM from `main`.

See `backend/PRODUCTION.md` for deployment, `backend/OPERATIONS.md` for
Jenkins/Grafana/Prometheus/SonarQube access, and `backend/SONARQUBE.md` for the
one-time quality-gate setup.

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
