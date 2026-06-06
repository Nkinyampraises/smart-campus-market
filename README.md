# CampusTrade — Smart Campus Marketplace

> A production-grade microservices marketplace for ICT University students to buy and sell items on campus.
> Built for SEN3244 Software Architecture · ICT University · 2026

---

## Live Application

| Service | URL |
|---|---|
| **Frontend App** | http://209.38.199.108:4000 |
| **API Gateway** | http://209.38.199.108:8080 |
| **Jenkins CI/CD** | http://209.38.199.108:8090 |
| **SonarQube** | http://209.38.199.108:9000 |
| **Grafana** | http://209.38.199.108:3009 |
| **Prometheus** | http://209.38.199.108:9090 |

---

## Team

| Name | Role | Responsibilities |
|---|---|---|
| **Praises Ncha** | Scrum Master | Design, Frontend, Testing, Jenkins, VPS, Grafana, Prometheus, SonarQube |
| **Kongyu Jesse Ntani** (ICTU20234195) | Product Owner | Backend, Microservices, Event-Driven Architecture, Documentation, PowerPoint, Architecture |

---

## Project Overview

CampusTrade is a full-stack marketplace platform that allows ICT University students to:
- Post items for sale (textbooks, electronics, clothing, food, services, etc.)
- Browse and search listings by category
- Make offers and negotiate prices
- Chat directly with sellers
- Receive real-time notifications
- Pay and track transactions
- Report suspicious listings

The system includes an **AI-powered fraud detection engine** that automatically flags listings with suspicious prices (too low or too high compared to market reference) and warns buyers in real time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18)                   │
│                  Nginx · Port 4000                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│                   API GATEWAY                            │
│              Express.js · Port 8080                      │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────┘
   │      │      │      │      │      │      │      │
┌──▼─┐ ┌──▼─┐ ┌──▼─┐ ┌──▼─┐ ┌──▼─┐ ┌──▼─┐ ┌──▼─┐ ┌▼──────┐
│Auth│ │User│ │List│ │Chat│ │Admin│ │ AI │ │Srch│ │Notify │
│3001│ │3002│ │3003│ │3004│ │3005 │ │3006│ │3007│ │ 3008  │
└──┬─┘ └──┬─┘ └──┬─┘ └──┬─┘ └──┬──┘ └──┬─┘ └──┬─┘ └──┬────┘
   └──────┴──────┴──────┴──────┴───────┴──────┴──────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌────▼────┐          ┌─────▼────┐
         │PostgreSQL│          │  Redis   │
         │  :5432   │          │  :6379   │
         └──────────┘          └──────────┘
```

**Event-Driven Communication:**
Services communicate asynchronously via Redis Pub/Sub channels:
- `LISTING` channel — listing created/updated/sold/expired
- `AUDIT` channel — fraud flags (low price, high price, spam)
- `NOTIFICATION` channel — emails, push notifications
- `USER` channel — registration, verification, suspension
- `ADMIN` channel — reports, moderation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js 20, Express.js |
| Database | PostgreSQL 16 |
| Cache / Events | Redis 7 |
| Auth | JWT, Google OAuth 2.0 |
| File Uploads | Multer (local storage) |
| Containerisation | Docker, Docker Compose |
| Orchestration | Kubernetes (k3s) |
| CI/CD | Jenkins (pipeline from Jenkinsfile) |
| Code Quality | SonarQube Community Edition |
| Monitoring | Prometheus + Grafana |
| Web Server | Nginx |
| VPS | DigitalOcean (Ubuntu 22.04, 4 vCPU, 8 GB RAM) |

---

## Project Structure

```
smart-campus-market/
└── campusmarket/
    ├── frontend/                    ← React 18 SPA
    │   ├── src/
    │   │   ├── pages/               ← 31 pages (Home, Browse, Listing, Chat, Admin…)
    │   │   ├── components/          ← Topbar, Sidebar, Modals…
    │   │   ├── context/             ← AuthContext, ToastContext, SocketContext
    │   │   ├── services/api.js      ← All API calls
    │   │   └── App.jsx              ← Routes
    │   └── vite.config.js
    │
    ├── backend/
    │   ├── services/
    │   │   ├── auth-service/        ← JWT login, Google OAuth, email verify
    │   │   ├── user-service/        ← Profiles, avatars, ratings
    │   │   ├── listing-service/     ← CRUD listings, image upload, expiry
    │   │   ├── chat-service/        ← Real-time messaging (Socket.io)
    │   │   ├── admin-service/       ← Dashboard, reports, fraud flags
    │   │   ├── ai-service/          ← Fraud detection, price suggestions, trending
    │   │   ├── search-service/      ← Full-text search with filters
    │   │   ├── notification-service/← Email + push notifications
    │   │   └── api-gateway/         ← Single entry point, JWT validation
    │   ├── shared/                  ← db.js, events.js, logger.js, metrics.js
    │   ├── monitoring/
    │   │   ├── prometheus.yml       ← Scrape config for all 9 services
    │   │   └── grafana/             ← Provisioned datasource + dashboard
    │   └── docker-compose.yml       ← All services + postgres + redis + monitoring
    │
    ├── devops/
    │   ├── docker-compose.yml       ← Jenkins + SonarQube + sonar-db
    │   └── jenkins/
    │       ├── Dockerfile           ← Jenkins + Node.js + sonar-scanner + kubectl
    │       └── plugins.txt          ← Jenkins plugins list
    │
    ├── Jenkinsfile                  ← 13-stage CI/CD pipeline
    └── COMMANDS.md                  ← All VPS commands reference
```

---

## Microservices

### 1. Auth Service — Port 3001
- Register with email + password
- Login with JWT tokens
- Google OAuth 2.0
- Email verification
- Forgot/reset password

### 2. User Service — Port 3002
- User profiles
- Avatar uploads
- Seller ratings & reviews

### 3. Listing Service — Port 3003
- Create / edit / delete listings
- Image uploads (up to 5 per listing)
- Category filtering
- Automatic listing expiry after 30 days
- Publishes `LISTING_CREATED` event to trigger AI fraud check

### 4. Chat Service — Port 3004
- Real-time messaging between buyer and seller
- Socket.io WebSocket connections
- Conversation history

### 5. Admin Service — Port 3005
- Admin dashboard statistics
- User management (suspend/activate)
- Fraud flag management
- Report resolution
- Public endpoint: `GET /api/admin/listing-flags/:id` — shows fraud flags per listing

### 6. AI Service — Port 3006
- **Fraud Detection** — flags listings with suspicious prices:
  - `LOW_PRICE_FLAG` — price below 60% of market reference
  - `HIGH_PRICE_FLAG` — price above 8× market reference
  - `SPAM_RATE_FLAG` — more than 10 listings in 60 minutes
- **Price Suggestion** — recommends fair price based on category + condition
- **Trending Feed** — scores listings by views and wishlist adds

### 7. Search Service — Port 3007
- Full-text search across listings
- Filter by category, price range, condition, campus zone

### 8. Notification Service — Port 3008
- Email notifications (SMTP)
- Web push notifications (VAPID)
- Events: welcome email, offer received, listing sold, reports

### 9. API Gateway — Port 8080
- Single entry point for all frontend requests
- JWT validation
- Routes to appropriate microservice

---

## Key Features

- **AI Fraud Detection** — red warning banner appears on any listing flagged as suspicious
- **Real-time Chat** — Socket.io messaging between buyers and sellers
- **Google OAuth** — sign in with Google
- **Push Notifications** — browser push notifications for offers and messages
- **Admin Dashboard** — full visibility of users, listings, reports, fraud flags
- **Chaos-resilient** — stopping any one service does not affect the others
- **95%+ test coverage** — 232 automated tests across all 6 tested services
- **CI/CD Pipeline** — 13-stage Jenkins pipeline auto-triggers on every GitHub push

---

## CI/CD Pipeline (Jenkins — 13 Stages)

```
Checkout → Install Deps → Lint → Unit Tests → Coverage Report →
SonarQube Analysis → Quality Gate → Build Docker Images →
Push Images → Deploy to VPS → Health Check → Notify → Done
```

Every `git push` to the `main` branch triggers the pipeline automatically via GitHub webhook.

---

## Test Coverage

| Service | Coverage |
|---|---|
| auth-service | 95%+ |
| user-service | 95%+ |
| listing-service | 95%+ |
| chat-service | 95%+ |
| admin-service | 95%+ |
| ai-service | 95%+ |
| **Total tests** | **232 passing** |

---

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Nkinyampraises/smart-campus-market.git
cd smart-campus-market
```

### 2. Start the backend (all microservices)

```bash
cd campusmarket/backend
docker compose up -d
```

This starts:
- All 9 microservices
- PostgreSQL database
- Redis
- Prometheus
- Grafana

### 3. Start the frontend (development)

```bash
cd campusmarket/frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### 4. Start the DevOps stack (Jenkins + SonarQube)

```bash
cd campusmarket/devops
docker compose up -d
```

- Jenkins: `http://localhost:8090` — admin / nkinyam2023
- SonarQube: `http://localhost:9000` — admin / Admin@1234567

---

## VPS Deployment

### Connect to VPS
```bash
ssh root@209.38.199.108
```

### Pull latest code
```bash
cd /opt/campustrade
git pull
```

### Deploy backend changes
```bash
cd /opt/campustrade/campusmarket/backend
docker compose up -d --build
```

### Deploy frontend changes
```bash
cd /opt/campustrade/campusmarket/frontend
npm run build
cp -r dist/* /var/www/html/
nginx -s reload
```

### Deploy everything (one command)
```bash
cd /opt/campustrade && git pull && \
  cd campusmarket/backend && docker compose up -d --build && \
  cd ../frontend && npm run build && cp -r dist/* /var/www/html/ && nginx -s reload
```

---

## Container Management

### See all running containers
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Stop one service (others keep running)
```bash
docker stop backend-grafana-1
docker stop backend-auth-service-1
docker stop campustrade-jenkins
# etc.
```

### Start it back
```bash
docker start backend-grafana-1
```

### View logs
```bash
docker logs backend-ai-service-1 --tail 50
docker logs campustrade-jenkins --tail 50
```

---

## Container Names Reference

| Container | Port |
|---|---|
| `backend-api-gateway-1` | 8080 |
| `backend-auth-service-1` | 3001 |
| `backend-user-service-1` | 3002 |
| `backend-listing-service-1` | 3003 |
| `backend-chat-service-1` | 3004 |
| `backend-admin-service-1` | 3005 |
| `backend-ai-service-1` | 3006 |
| `backend-search-service-1` | 3007 |
| `backend-notification-service-1` | 3008 |
| `backend-postgres-1` | 5432 |
| `backend-redis-1` | 6379 |
| `backend-prometheus-1` | 9090 |
| `backend-grafana-1` | 3009 |
| `campustrade-jenkins` | 8090 |
| `campustrade-sonarqube` | 9000 |

---

## AI Fraud Detection

When a listing is created, the system automatically:
1. Checks the price against a 90-day category average
2. Compares against hardcoded market reference prices
3. Flags if price is below 60% of reference → `LOW_PRICE_FLAG`
4. Flags if price is above 8× reference → `HIGH_PRICE_FLAG`
5. Flags if seller posts more than 10 listings in 60 minutes → `SPAM_RATE_FLAG`

Flagged listings show a red **"AI Fraud Detection Alert"** banner to all users viewing the listing.

### Re-run fraud check on existing listings
```bash
cat > /tmp/recheck.sh << 'EOF'
#!/bin/bash
docker exec backend-postgres-1 psql -U campustrade -d campustrade -t -c \
  "SELECT id, seller_id, category, price_fcfa FROM listings WHERE status='active'" | \
while IFS='|' read -r id seller_id category price_fcfa; do
  id=$(echo $id | xargs); seller_id=$(echo $seller_id | xargs)
  category=$(echo $category | xargs); price_fcfa=$(echo $price_fcfa | xargs)
  [ -z "$id" ] && continue
  echo "Checking: $category — $price_fcfa FCFA"
  curl -s -X POST http://localhost:8080/api/ai/fraud-check \
    -H "Content-Type: application/json" \
    -d "{\"listingId\":\"$id\",\"category\":\"$category\",\"price_fcfa\":$price_fcfa,\"sellerId\":\"$seller_id\"}" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print('  FLAGGED:', d['flags'][0]['type'] if d['flagged'] else 'clean')" 2>/dev/null
done
EOF
bash /tmp/recheck.sh
```

---

## Health Check — All Services

```bash
echo "App:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000
echo "API:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/health
echo "Jenkins:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8090
echo "SonarQube:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9000
echo "Grafana:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3009
echo "Prometheus:" && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9090
```

---

## Database Access

```bash
# Open PostgreSQL shell
docker exec -it backend-postgres-1 psql -U campustrade -d campustrade

# Useful queries:
SELECT * FROM listings ORDER BY created_at DESC LIMIT 10;
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
SELECT * FROM fraud_flags WHERE resolved=false;
SELECT COUNT(*) FROM listings;
\q   # exit
```

---

## Trigger Jenkins Build Manually

```bash
CRUMB=$(curl -s "http://admin:nkinyam2023@localhost:8090/crumbIssuer/api/json" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['crumb'])")
curl -s -X POST "http://admin:nkinyam2023@localhost:8090/job/CampusTrade-Pipeline/build" \
  -H "Jenkins-Crumb: $CRUMB"
echo "Build triggered"
```

---

## Chaos Engineering (Fault Tolerance Demo)

This system demonstrates **Chaos Monkey** resilience — stopping one service does not break the others:

```bash
# Kill the auth service
docker stop backend-auth-service-1

# App, marketplace, chat, monitoring all still work
docker ps --format "table {{.Names}}\t{{.Status}}"

# Bring it back
docker start backend-auth-service-1
```

This proves the microservices architecture is fault-tolerant — each service is fully independent.

---

## Environment Variables

The backend uses these environment variables (set in docker-compose.yml):

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT signing |
| `DB_HOST` | PostgreSQL host |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `REDIS_HOST` | Redis host |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret (never in GitHub) |
| `FRONTEND_URL` | Frontend URL for CORS and redirects |
| `SMTP_HOST` | Email server host |
| `SMTP_USER` | Email username |
| `SMTP_PASS` | Email password |
| `VAPID_PUBLIC_KEY` | Web push public key |
| `VAPID_PRIVATE_KEY` | Web push private key |

---

## Full Command Reference

See [campusmarket/COMMANDS.md](campusmarket/COMMANDS.md) for the complete list of all commands to run, manage, deploy, and troubleshoot the system.

---

## Course Information

- **Course:** SEN3244 — Software Architecture
- **Institution:** ICT University, Cameroon
- **Year:** 2026
- **GitHub:** https://github.com/Nkinyampraises/smart-campus-market

---

*Built with dedication by Praises Ncha & Kongyu Jesse Ntani*
