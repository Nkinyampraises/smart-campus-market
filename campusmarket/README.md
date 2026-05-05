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
- **Orchestration**: Kubernetes
- **CI/CD**: Jenkins
- **Monitoring**: Prometheus + Grafana
- **IaC**: Ansible

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

1. Build all services: `npm run build:all`
2. Deploy to Kubernetes: Use Ansible playbooks in `ansible/`
3. CI/CD: Jenkins pipeline in `Jenkinsfile`

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
├── k8s/                      # Kubernetes manifests
├── ansible/                  # Infrastructure as Code
├── docker/                   # Docker Compose for local dev
├── docs/                     # Documentation and diagrams
├── tests/                    # Integration tests
├── scripts/                  # Helper scripts for monorepo tasks
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
