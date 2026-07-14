# Environment Variable Matrix

This matrix documents variables actually used by code.

## Global/Core
- `JWT_SECRET` (required): auth token signing/verification across services.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (required): PostgreSQL connection.
- `DB_SSL` (optional): set `true` for TLS DB connections.
- `REDIS_URL` (optional): full redis URL, overrides host/port.
- `REDIS_HOST`, `REDIS_PORT` (required if `REDIS_URL` not set): Redis event bus.
- `FRONTEND_URL` (required for email links + CORS for gateway/chat/notification).

## Gateway
- `PORT` (optional, default `3000`)
- `SERVICE_NAME` (optional, logging tag)
- `AUTH_SERVICE_URL`, `USER_SERVICE_URL`, `LISTING_SERVICE_URL`, `CHAT_SERVICE_URL`, `ADMIN_SERVICE_URL`, `AI_SERVICE_URL`, `SEARCH_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` (required in non-default deployments)

## Auth Service
- `PORT` (optional, default `3001`)
- `SERVICE_NAME` (optional)
- `JWT_SECRET` (required)
- DB + Redis vars (required)

## User Service
- `PORT` (optional, default `3002`)
- `SERVICE_NAME` (optional)
- `JWT_SECRET` (required)
- DB + Redis vars (required)

## Listing Service
- `PORT` (optional, default `3003`)
- `SERVICE_NAME` (optional)
- `JWT_SECRET` (required)
- DB + Redis vars (required)

## Chat Service
- `PORT` (optional, default `3004`)
- `SERVICE_NAME` (optional)
- `JWT_SECRET` (required)
- `FRONTEND_URL` (required for Socket.IO CORS)
- DB + Redis vars (required)

## Admin Service
- `PORT` (optional, default `3005`)
- `SERVICE_NAME` (optional)
- `JWT_SECRET` (required)
- DB + Redis vars (required)

## AI Service
- `PORT` (optional, default `3006`)
- `SERVICE_NAME` (optional)
- `JWT_SECRET` (required)
- DB + Redis vars (required)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optional, currently unused by code; reserved for future LLM-backed features)

## Search Service
- `PORT` (optional, default `3007`)
- `SERVICE_NAME` (optional)
- DB + Redis vars (required)

## Notification Service
- `PORT` (optional, default `3008`)
- `SERVICE_NAME` (optional)
- `FRONTEND_URL` (required for verification/reset links)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` (required for real email delivery)
- DB + Redis vars (required)

## Frontend
- `VITE_API_URL` (required for non-default API gateway URL)

## Observability and code quality
- `GRAFANA_USER`, `GRAFANA_PASS` (required): Grafana administrator credentials.
- `SONAR_DB_USER`, `SONAR_DB_PASSWORD`, `SONAR_DB_NAME` (required): credentials for SonarQube's isolated PostgreSQL database.
- `SONAR_HOST_URL` (optional for scripts, default `http://127.0.0.1:9000`): URL Jenkins uses for analysis and system status.
- `PROMETHEUS_URL`, `GRAFANA_URL`, `JENKINS_URL` (optional): link/probe overrides for the Jenkins system-information report.

`SONAR_TOKEN` is deliberately absent from environment templates. Store it as
the Jenkins Secret Text credential `campustrade-sonar-token`; never place it in
an `.env` file or commit it.
