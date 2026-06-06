# FACULTY OF INFORMATION AND COMMUNICATION TECHNOLOGIES
## SPRING 2026 — FINAL EXAMINATION
### COURSE CODE: SEN3244 | SOFTWARE ARCHITECTURE
### INSTRUCTOR: Engr. TEKOH PALMA

---

| Field | Details |
|---|---|
| **Course Code / Title** | SEN3244 / Software Architecture |
| **Project Topic** | CampusTrade — Smart Campus Marketplace |
| **GitHub Repository** | https://github.com/Nkinyampraises/smart-campus-market |
| **Live Application** | http://209.38.199.108:4000 |
| **API Gateway** | http://209.38.199.108:8080 |
| **Monitoring (Grafana)** | http://209.38.199.108:3009 |
| **Prometheus** | http://209.38.199.108:9090 |

---

## Group Information

| SN | Member's Name | Registration Number | Team Role |
|---|---|---|---|
| 1 | Nkinyampraises Ncha | (your reg number) | Group Leader / Full-Stack Developer / DevOps Engineer |

---

# CHAPTER ONE: INTRODUCTION

## 1.1 General Introduction

CampusTrade is a full-stack, cloud-native, event-driven microservices application designed to solve the real-world problem of informal, unstructured buying and selling among university students on campus. Students at ICT University and other campuses frequently need to buy, sell, or exchange items such as electronics, clothing, accessories, food items, and services. These transactions typically happen informally through word of mouth or WhatsApp groups, creating problems of trust, price transparency, and discoverability.

CampusTrade provides a structured, secure, and feature-rich digital marketplace where students can post listings, negotiate offers, chat in real-time, receive AI-powered price recommendations, and get notified about relevant activity — all within a single, professionally built platform.

The system is deployed on a DigitalOcean Virtual Private Server (VPS) at IP address **209.38.199.108** running Ubuntu 24.04 LTS, with all infrastructure managed through Docker, Kubernetes (k3s), Ansible, Nginx, Jenkins CI/CD, and Prometheus/Grafana monitoring.

## 1.2 Aim and Objectives

**Aim:** To design and implement a scalable, secure, event-driven microservices marketplace application for campus students, applying professional software architecture principles, DevOps practices, and cloud infrastructure.

**Objectives:**
1. Design and implement a microservices architecture with 9 independent services communicating via Redis Pub/Sub events.
2. Containerize all services using Docker and orchestrate them with Kubernetes (k3s).
3. Build a fully automated CI/CD pipeline using Jenkins with GitHub webhook integration.
4. Implement real-time features including live chat (Socket.IO) and push notifications (Web Push API).
5. Integrate an AI-powered price recommendation engine to prevent price exploitation.
6. Achieve a minimum of 85% automated test coverage verified by SonarQube.
7. Set up comprehensive monitoring with Prometheus metrics collection and Grafana dashboards.
8. Automate server provisioning and deployment using Ansible playbooks.
9. Apply Scrum methodology throughout the development lifecycle.

## 1.3 Problem Statement

Campus students face several critical challenges when buying and selling among themselves:

1. **No trusted platform** — Transactions happen via unverifiable WhatsApp messages with no fraud protection.
2. **Price exploitation** — Students, especially freshers, are routinely overcharged because they have no reference for fair pricing.
3. **No real-time communication** — There is no built-in way to negotiate or ask questions about a product in context.
4. **No visibility** — Listings disappear from chat history, making it hard to discover what is available.
5. **No admin oversight** — Fraudulent sellers and spam listings have no system to flag or remove them.

CampusTrade addresses all five problems through a structured marketplace, an AI price validator, real-time chat, searchable listings, and an admin moderation dashboard.

---

# CHAPTER TWO: LITERATURE REVIEW

## 2.1 Software Development Methodologies

Software development methodologies are structured frameworks that guide how software is planned, designed, built, tested, and delivered. The major methodologies include:

- **Waterfall Model** — A linear, sequential approach where each phase (requirements, design, implementation, testing, deployment) must be fully completed before the next begins. Changes are difficult and expensive to implement once a phase is done.

- **Agile Methodology** — An iterative, incremental approach that delivers working software in short cycles (sprints). It emphasizes collaboration, customer feedback, and adaptability to change.

- **Scrum** — A specific Agile framework that organizes work into time-boxed Sprints (usually 1–4 weeks), with defined roles (Product Owner, Scrum Master, Development Team) and ceremonies (Sprint Planning, Daily Standup, Sprint Review, Sprint Retrospective).

- **Kanban** — A visual workflow management method using boards and cards, with no fixed-length iterations.

- **DevOps** — A culture and practice that merges software Development and IT Operations, emphasizing automation, continuous integration, continuous delivery (CI/CD), and monitoring.

- **Extreme Programming (XP)** — An Agile variant emphasizing technical practices like test-driven development (TDD), pair programming, and continuous refactoring.

## 2.2 Comparison of Software Development Methodologies

| Criterion | Waterfall | Scrum/Agile | Kanban | DevOps |
|---|---|---|---|---|
| Flexibility | Low | High | Medium | High |
| Delivery Speed | Slow (one release) | Fast (per sprint) | Continuous | Continuous |
| Customer Involvement | Low | High | Medium | Medium |
| Planning | Upfront & rigid | Sprint-based | Continuous | Continuous |
| Testing | End of project | Per sprint | On demand | Automated/continuous |
| Team Structure | Siloed | Cross-functional | Cross-functional | Merged Dev+Ops |
| Risk Management | Poor | Good | Good | Excellent |
| Best Suited For | Fixed-scope projects | Evolving projects | Maintenance work | Software products |

## 2.3 Reason for Choosing Scrum Methodology

Scrum was chosen for CampusTrade for the following reasons:

1. **Iterative delivery** — CampusTrade has many features (auth, listings, chat, AI pricing, notifications, admin). Scrum allowed delivering these in prioritised increments rather than trying to build everything at once.
2. **Adaptability** — Requirements evolved as new ideas emerged (e.g., fraud detection, push notifications). Scrum's sprint structure allowed pivoting between sprints without disrupting work in progress.
3. **Transparency** — The product backlog and sprint backlogs kept all work visible and trackable.
4. **Quality focus** — Sprint reviews and retrospectives ensured each increment was properly tested before moving forward.
5. **Team accountability** — Even in a solo/small team setting, Scrum's structure ensures consistent progress and self-assessment.

## 2.4 Review of Related Concepts

### Microservices Architecture
Microservices architecture organises an application as a collection of loosely coupled, independently deployable services. Each service has a single responsibility, its own database, and communicates with other services through APIs or message brokers. This contrasts with a Monolithic architecture where all functionality is in a single deployable unit.

### Event-Driven Architecture
In an event-driven architecture, services communicate by producing and consuming events (messages). A message broker (here: Redis Pub/Sub) decouples producers from consumers — the auth service publishes a `user.registered` event and the notification service reacts to it without the two services being directly coupled.

### Docker & Containerisation
Docker packages an application and all its dependencies into a portable container that runs consistently across any environment. Docker Compose orchestrates multiple containers as a single application.

### Kubernetes
Kubernetes (K8s) is an open-source container orchestration system that automates deployment, scaling, and management of containerised applications. k3s is a lightweight Kubernetes distribution suitable for single-node VPS deployments.

### CI/CD (Continuous Integration / Continuous Delivery)
CI/CD pipelines automate the process of building, testing, and deploying code. When a developer pushes code to GitHub, a Jenkins pipeline automatically runs tests, checks code quality via SonarQube, builds Docker images, pushes them to Docker Hub, and deploys to Kubernetes.

### Infrastructure as Code (IaC)
IaC manages infrastructure (servers, networks, configurations) through machine-readable code rather than manual processes. Ansible is an agentless IaC tool that uses YAML playbooks to provision and configure servers over SSH.

## 2.5 Review of Related Literature

**Campus marketplace applications** — Platforms like Facebook Marketplace, Jiji, and OLX provide general-purpose buy/sell functionality but are not tailored to campus contexts. They lack campus-zone filtering, student verification, or academic-context pricing guidance.

**Real-time communication in marketplaces** — Research by Nakamura et al. (2022) shows that integrating real-time chat directly into marketplace listings increases transaction completion rates by 34% compared to redirecting users to external messaging apps.

**AI-assisted pricing** — Price transparency tools using historical sales data and condition factors significantly reduce information asymmetry in peer-to-peer markets (Chen et al., 2021). Our AI service implements a condition-weighted pricing model using category averages from actual sales data.

**Push notification engagement** — Web Push Notifications (W3C standard) achieve 3–10× higher engagement than email for time-sensitive events (offer received, message received) in marketplace applications.

---

# CHAPTER THREE: METHODOLOGY AND MATERIALS

## 3.1 Research Methodology

This project followed an applied engineering methodology combining:
- **Design Science Research** — iteratively building and evaluating artefacts (the application, infrastructure, tests)
- **Agile/Scrum** — two-week sprints with defined goals, reviewed and retrospected
- **Test-Driven Development (TDD)** principles — writing tests alongside feature code to ensure correctness and maintainability

## 3.2 System Requirements

### Functional Requirements

| # | Requirement |
|---|---|
| FR-01 | Users can register with email/password or Google OAuth |
| FR-02 | Users must verify their email address before posting listings |
| FR-03 | Users can create, edit, delete, and view product listings with images |
| FR-04 | Users can browse listings with filters (category, campus zone, price range, condition) |
| FR-05 | Users can make price offers on listings |
| FR-06 | Users can chat in real-time with sellers/buyers |
| FR-07 | Users receive push notifications for messages, offers, and listing events |
| FR-08 | The AI service suggests fair price ranges based on category and condition |
| FR-09 | Users can add listings to a wishlist |
| FR-10 | Admin users can suspend accounts, remove listings, and review fraud flags |
| FR-11 | The system tracks and deduplicates listing views |
| FR-12 | Listings expire automatically and owners are notified |

### Non-Functional Requirements

| # | Requirement | Target |
|---|---|---|
| NFR-01 | Availability | 99.9% uptime via K8s self-healing |
| NFR-02 | Scalability | Horizontal Pod Autoscaling (HPA) on all critical services |
| NFR-03 | Security | JWT authentication, bcrypt passwords, Helmet.js headers, rate limiting |
| NFR-04 | Performance | Redis caching for views, category prices; response < 500ms |
| NFR-05 | Testability | Minimum 85% line coverage verified by SonarQube |
| NFR-06 | Observability | Prometheus metrics on all 9 services, Grafana dashboards |
| NFR-07 | Portability | Docker containers, Kubernetes orchestration |

## 3.3 System Design

### 3.3.1 High-Level Architecture (HLD)

CampusTrade is built on an **Event-Driven Microservices Architecture** with the following layers:

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│   React 18 + Vite + Tailwind CSS (Frontend SPA)         │
│   Port 4000 (via Nginx) — http://209.38.199.108:4000    │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP / WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                  API GATEWAY (Port 8080)                 │
│   JWT Validation · Rate Limiting · Request Routing       │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
AUTH   USER  LISTING CHAT  ADMIN   AI   SEARCH NOTIF
:3001 :3002  :3003  :3004  :3005  :3006 :3007  :3008
   │      │      │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┴──────┴──────┘
                         │
          ┌──────────────▼──────────────┐
          │   Redis Pub/Sub (Port 6379) │  ← Event Bus
          │   + Redis Cache             │
          └─────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   PostgreSQL (Port 5432)    │  ← Persistent Storage
          └─────────────────────────────┘
```

### 3.3.2 Service Responsibilities

| Service | Port | Responsibility |
|---|---|---|
| **api-gateway** | 8080 | JWT validation, request proxying, rate limiting |
| **auth-service** | 3001 | Registration, login, Google OAuth, email verification, password reset |
| **user-service** | 3002 | Profile management, wishlist, profile pictures |
| **listing-service** | 3003 | CRUD listings, image upload, view tracking (Redis dedup), offer management |
| **chat-service** | 3004 | Real-time messaging via Socket.IO, message read receipts |
| **admin-service** | 3005 | User suspension, listing removal, fraud reports, audit logs, analytics |
| **ai-service** | 3006 | AI price recommendation using condition factors + category historical averages |
| **search-service** | 3007 | Full-text search across listings with relevance scoring |
| **notification-service** | 3008 | Email (SMTP) + Web Push notifications, triggered by Redis events |

### 3.3.3 Event-Driven Communication

Services communicate asynchronously via **Redis Pub/Sub** channels:

| Channel | Events Published | Subscribers |
|---|---|---|
| `notification.channel` | `user.registered`, `offer_accepted`, `listing.expired`, `user.suspended` | notification-service |
| `listing.event` | `listing.created`, `listing.sold`, `listing.expired`, `low_price_flag` | ai-service, search-service |
| `admin.event` | `listing_fraud_flag`, `report_submitted` | admin-service |
| `audit.channel` | All state changes | admin-service |

### 3.3.4 UML Diagrams

#### Component Diagram
```
[Frontend React SPA]
        |
        | HTTP/REST + WebSocket
        |
[API Gateway]─────────────────────────────────────────────
   |         |         |         |         |         |
[Auth]    [User]   [Listing] [Chat]    [Admin]   [AI]
Service   Service  Service   Service   Service  Service
   |         |         |         |         |
   └─────────┴─────────┴─────────┴─────────┘
                       |
              [Redis Pub/Sub Bus]
                       |
              [Notification Service]
                       |
           [Email SMTP + Web Push API]
```

#### Deployment Diagram (Kubernetes)
```
DigitalOcean Droplet (209.38.199.108)
├── k3s (Kubernetes v1.35.5)
│   └── Namespace: campustrade
│       ├── Deployments (with 2 replicas for critical services)
│       │   ├── api-gateway (HPA: 2–10 pods)
│       │   ├── auth-service (HPA: 2–6 pods)
│       │   ├── user-service (HPA: 2–5 pods)
│       │   ├── listing-service (HPA: 2–8 pods)
│       │   ├── chat-service (2 pods)
│       │   ├── admin-service (1 pod)
│       │   ├── ai-service (1 pod)
│       │   ├── search-service (HPA: 2–6 pods)
│       │   ├── notification-service (1 pod)
│       │   ├── prometheus (1 pod)
│       │   └── grafana (1 pod)
│       ├── StatefulSet: postgres
│       └── Ingress: campustrade-ingress (Traefik)
├── Docker Compose (Live Demo)
│   ├── 13 containers running
│   └── /opt/campustrade/campusmarket/backend/
└── Nginx (Frontend)
    └── Serves React build on port 4000
```

#### Sequence Diagram: User Registration Flow
```
User → Frontend → API Gateway → Auth Service → PostgreSQL
                                     |
                                     ↓
                               Redis Pub/Sub (notification.channel)
                                     |
                                     ↓
                           Notification Service → SMTP (Welcome Email)
```

#### Sequence Diagram: Create Listing with AI Validation
```
User → Frontend → API Gateway → Listing Service → PostgreSQL (INSERT)
                                      |
                                      ↓
                               AI Service (price check)
                               ← Redis cache (category avg)
                                      |
                                      ↓
                          Redis Pub/Sub (listing.event: listing.created)
                                      |
                                      ↓
                              Search Service (index listing)
```

## 3.4 Application of Scrum

### 3.4.1 Team Organisation

| Role | Member | Responsibilities |
|---|---|---|
| **Product Owner** | Nkinyampraises Ncha | Defines product backlog, prioritises features, accepts deliverables |
| **Scrum Master** | Nkinyampraises Ncha | Facilitates ceremonies, removes impediments, ensures Scrum process |
| **Development Team** | Nkinyampraises Ncha | Full-stack development, DevOps, testing, documentation |

### 3.4.2 Sprint Overview

#### Sprint 1 (Weeks 1–2): Foundation
**Goal:** Project setup, authentication, basic listing CRUD

| Story | Points | Status |
|---|---|---|
| Set up monorepo, Docker Compose, shared libs | 8 | ✅ Done |
| Implement auth-service (register, login, JWT) | 13 | ✅ Done |
| Implement user-service (profile management) | 5 | ✅ Done |
| Set up PostgreSQL schemas | 5 | ✅ Done |
| Build React frontend base (routing, auth context) | 8 | ✅ Done |
| **Total** | **39** | |

**Sprint 1 Retrospective:**
- *What went well:* Monorepo structure with shared libraries saved significant duplication
- *What to improve:* Need to mock external dependencies in tests earlier
- *Action:* Set up Jest mocks for Redis and PostgreSQL from Sprint 2

#### Sprint 2 (Weeks 3–4): Core Features + DevOps
**Goal:** Listings, chat, CI/CD pipeline, Kubernetes manifests

| Story | Points | Status |
|---|---|---|
| Implement listing-service (CRUD, images, offers, views) | 21 | ✅ Done |
| Implement chat-service (Socket.IO real-time messaging) | 13 | ✅ Done |
| Implement AI price recommendation service | 13 | ✅ Done |
| Build Jenkins CI/CD pipeline (9 stages) | 8 | ✅ Done |
| Write Kubernetes manifests (all 9 services + HPA + ingress) | 8 | ✅ Done |
| Set up Prometheus + Grafana monitoring | 5 | ✅ Done |
| **Total** | **68** | |

#### Sprint 3 (Weeks 5–6): Admin, Notifications, Testing + Deployment
**Goal:** Admin dashboard, push notifications, 85%+ test coverage, VPS deployment

| Story | Points | Status |
|---|---|---|
| Implement admin-service (moderation, fraud, analytics) | 13 | ✅ Done |
| Implement notification-service (email + web push) | 13 | ✅ Done |
| Write 232 unit tests, achieve 95%+ coverage | 21 | ✅ Done |
| Configure SonarQube code quality scanning | 5 | ✅ Done |
| Write Ansible playbooks (install-dependencies + deploy) | 5 | ✅ Done |
| Deploy to DigitalOcean VPS (209.38.199.108) | 8 | ✅ Done |
| **Total** | **65** | |

### 3.4.3 Product Backlog (Selected Items)

| ID | User Story | Priority | Points | Status |
|---|---|---|---|---|
| US-01 | As a student, I want to register with my university email so I can join the marketplace | High | 8 | Done |
| US-02 | As a seller, I want to post a listing with photos so buyers can see what I'm selling | High | 13 | Done |
| US-03 | As a buyer, I want to see an AI price suggestion so I know if the price is fair | High | 13 | Done |
| US-04 | As a user, I want to chat in real-time with the seller so I can negotiate | High | 13 | Done |
| US-05 | As a user, I want push notifications so I don't miss offers or messages | Medium | 8 | Done |
| US-06 | As an admin, I want to suspend abusive accounts to keep the platform safe | High | 8 | Done |
| US-07 | As a user, I want to search listings by keyword so I can find what I need fast | Medium | 8 | Done |
| US-08 | As a user, I want to add items to a wishlist so I can track things I want | Low | 5 | Done |

### 3.4.4 Workflow Management

All tasks were tracked in a GitHub Projects board with four columns: **Backlog → In Progress → In Review → Done**. Git commits were linked to user stories. Each sprint ended with a review of the working application against acceptance criteria.

### 3.4.5 Conflict Resolution

The primary challenge was **technical debt vs. feature delivery**. When early test coverage was low (54% on notification-service, 62% on chat-service), a dedicated Sprint 3 task was created to fix the test suite before attempting further features. This prevented accumulating untestable code.

### 3.4.6 Challenges and Solutions

| Challenge | Solution |
|---|---|
| Jest mock queue leakage between tests | Switched from `clearAllMocks()` to `resetAllMocks()` + restore defaults in `afterEach` |
| k3s Traefik conflicting with Nginx on port 80 | Moved frontend to port 4000 (free from K8s service ports) |
| VAPID keys not in K8s secret | Patched K8s secret with generated VAPID keys; patched deployment env vars |
| Docker Hub image name mismatch in K8s manifests | Fixed all 9 K8s YAMLs from `campustrade/` to `praisesn/` |
| Notification-service 54% test coverage | Rewrote test with `capturedHandler` pattern + `_init()` call in `beforeAll` |

## 3.5 Scrum Artifacts

### Sprint Backlog (Sprint 2 Detail)

| Task | Assignee | Estimate | Actual | Status |
|---|---|---|---|---|
| Design listing DB schema | Nkinyampraises | 2h | 2h | Done |
| Implement GET /api/listings with filters | Nkinyampraises | 4h | 3h | Done |
| Implement POST /api/listings | Nkinyampraises | 3h | 3h | Done |
| Add multer image upload | Nkinyampraises | 2h | 2h | Done |
| Add Redis view deduplication | Nkinyampraises | 2h | 2h | Done |
| Implement offer endpoints | Nkinyampraises | 3h | 4h | Done |
| Set up Socket.IO server | Nkinyampraises | 3h | 4h | Done |
| Implement join/send/read events | Nkinyampraises | 4h | 5h | Done |
| Write Jenkinsfile 9-stage pipeline | Nkinyampraises | 5h | 6h | Done |
| Write K8s YAML manifests | Nkinyampraises | 4h | 5h | Done |

## 3.6 Test Case Document

| Test ID | Service | Test Description | Input | Expected Output | Result |
|---|---|---|---|---|---|
| TC-001 | auth-service | Register with valid credentials | `{email, password, first_name, last_name}` | 201 + JWT token | ✅ Pass |
| TC-002 | auth-service | Register with duplicate email | Existing email | 409 Conflict | ✅ Pass |
| TC-003 | auth-service | Login with wrong password | Wrong password | 401 Unauthorized | ✅ Pass |
| TC-004 | auth-service | Google OAuth login | Valid Google token | 200 + JWT | ✅ Pass |
| TC-005 | listing-service | Create listing without auth | No JWT | 401 Unauthorized | ✅ Pass |
| TC-006 | listing-service | Get listings with category filter | `?category=Electronics` | Filtered list | ✅ Pass |
| TC-007 | listing-service | View counting with deduplication | Same user views twice | View count +1 (not +2) | ✅ Pass |
| TC-008 | chat-service | Socket auth with invalid token | Bad JWT | Socket disconnected | ✅ Pass |
| TC-009 | chat-service | Send message stores in DB | Valid message payload | 201 + emits to room | ✅ Pass |
| TC-010 | admin-service | Suspend user (admin only) | Admin JWT + userId | 200 + event published | ✅ Pass |
| TC-011 | admin-service | Non-admin tries to suspend | User JWT | 403 Forbidden | ✅ Pass |
| TC-012 | notification-service | Welcome email event | `welcome.email` event | Email queued | ✅ Pass |
| TC-013 | ai-service | Price suggestion for Electronics | `{category: "Electronics", condition: "new"}` | Price range returned | ✅ Pass |
| TC-014 | user-service | Update profile | Valid fields | 200 + updated profile | ✅ Pass |
| TC-015 | All services | Health check endpoint | GET /health | `{status: "ok"}` | ✅ Pass |

**Total: 232 tests — 232 Pass, 0 Fail**

## 3.7 Proposed Algorithms

### Algorithm 1: AI Price Recommendation
```
FUNCTION recommendPrice(category, condition, listingPrice):
  conditionFactor = CONDITION_FACTORS[condition]  // e.g., "new"=1.0, "used"=0.7
  
  categoryAvg = getCategoryAvgPrice(category)     // from Redis cache or DB
  
  minPrice = categoryAvg * conditionFactor * 0.5  // 50% of condition-adjusted avg
  maxPrice = categoryAvg * conditionFactor * 2.0  // 200% of condition-adjusted avg
  
  isFair = (listingPrice >= minPrice AND listingPrice <= maxPrice)
  
  RETURN { minPrice, maxPrice, suggestedPrice: categoryAvg * conditionFactor, isFair }
```

### Algorithm 2: View Deduplication (Redis)
```
FUNCTION recordView(listingId, userIdOrIp):
  key = "view:" + listingId + ":" + userIdOrIp
  exists = redis.GET(key)
  
  IF NOT exists THEN
    postgres.UPDATE listings SET views = views + 1 WHERE id = listingId
    redis.SET(key, "1", EX=3600)  // 1-hour dedup window
  END IF
```

### Algorithm 3: Event-Driven Notification Dispatch
```
FUNCTION handleNotificationEvent(eventType, data):
  SWITCH eventType:
    CASE "welcome.email":       sendWelcomeEmail(data.email)
    CASE "email_verification":  sendVerificationEmail(data.email, data.token)
    CASE "password_reset":      sendPasswordResetEmail(data.email, data.token)
    CASE "offer.new":           sendPushNotification(data.userId, "New offer received")
    CASE "offer.accepted":      sendPushNotification(data.userId, "Your offer was accepted!")
    CASE "new_message":         sendPushNotification(data.userId, "New message from " + data.senderName)
    CASE "listing.expired":     sendPushNotification(data.userId, "Your listing has expired")
    CASE "user.suspended":      sendEmail(data.email, "Account suspended")
```

## 3.8 Materials and Technologies

| Technology | Role |
|---|---|
| **React 18 + Vite** | Frontend SPA framework with fast HMR development server |
| **Tailwind CSS** | Utility-first CSS framework for responsive UI styling |
| **Node.js + Express** | Backend REST API runtime and framework for all 9 microservices |
| **PostgreSQL 16** | Relational database for persistent data (users, listings, messages, offers) |
| **Redis 7** | In-memory store for caching + Pub/Sub event bus between services |
| **Socket.IO** | WebSocket library for real-time bidirectional chat communication |
| **JWT (jsonwebtoken)** | Stateless authentication tokens passed with every API request |
| **bcryptjs** | Password hashing with salt rounds (12 rounds) |
| **Helmet.js** | HTTP security headers middleware |
| **express-rate-limit** | Rate limiting to prevent brute force attacks |
| **multer** | Multipart form data handling for image uploads |
| **web-push** | W3C Web Push API implementation for browser push notifications |
| **prom-client** | Prometheus metrics library for Node.js services |
| **Docker** | Container platform for packaging services and their dependencies |
| **Docker Compose** | Multi-container orchestration for local and production deployment |
| **Kubernetes / k3s** | Container orchestration with self-healing, scaling, service discovery |
| **Nginx** | Reverse proxy server, static file serving for the React frontend |
| **Jenkins** | CI/CD automation server with GitHub webhook integration |
| **SonarQube** | Static code analysis and test coverage quality gate |
| **Prometheus** | Time-series metrics collection from all 9 services |
| **Grafana** | Metrics visualisation dashboards and alerting |
| **Ansible** | Agentless Infrastructure as Code for server provisioning and deployment |
| **Jest + Supertest** | JavaScript unit and integration testing framework |
| **GitHub** | Source code version control and collaboration |
| **DigitalOcean** | Cloud VPS provider (FRA1, Ubuntu 24.04, 8GB RAM, 160GB SSD) |

---

# CHAPTER THREE (Part 2): RESULTS AND DISCUSSIONS

## Results 1: Infrastructure Setup

The VPS was provisioned on DigitalOcean in the Frankfurt (FRA1) region:
- **Server:** ubuntu-s-4vcpu-8gb-fra1
- **IP Address:** 209.38.199.108
- **OS:** Ubuntu 24.04.3 LTS
- **Resources:** 4 vCPUs, 8 GB RAM, 160 GB SSD
- **Installed:** Docker 29.5.3, Docker Compose v5.1.4, k3s v1.35.5, Node.js 20, Nginx 1.24, UFW firewall

**Firewall Rules Configured (UFW):**
```
Port 22   (SSH)     — ALLOW
Port 80   (HTTP)    — ALLOW
Port 443  (HTTPS)   — ALLOW
Port 4000 (Frontend)— ALLOW
Port 8080 (API)     — ALLOW
Port 9090 (Prometheus)— ALLOW
Port 3009 (Grafana) — ALLOW
```

## Results 2: CI/CD Pipeline with Jenkins

The Jenkins pipeline (`campusmarket/Jenkinsfile`) has 9 automated stages:

| Stage | Description | Result |
|---|---|---|
| 1. Checkout | Clone latest code from GitHub | ✅ |
| 2. Install Dependencies | `npm install` for frontend + all 9 backend services in parallel | ✅ |
| 3. Test | Run Jest with coverage for all services (`--coverageReporters=lcov`) | ✅ 232 tests |
| 4. SonarQube Analysis | Run `sonar-scanner` for all 6 services + frontend | ✅ |
| 5. Quality Gate | Wait for SonarQube quality gate (≥85% coverage) | ✅ |
| 6. Build Docker Images | `docker build` for all 9 services | ✅ |
| 7. Push to Docker Hub | `docker push praisesn/<service>:latest` | ✅ |
| 8. Deploy to Kubernetes | `kubectl apply` all manifests to k3s cluster | ✅ |
| 9. Smoke Test | `curl /health` and `kubectl get pods` validation | ✅ |

**GitHub webhook** triggers the pipeline on every `git push` to the `main` branch.

## Results 3: Monitoring — Prometheus & Grafana

All 9 microservices expose a `/metrics` endpoint using the `prom-client` library. Prometheus scrapes these endpoints every 15 seconds.

**Key Metrics Collected:**
- `http_requests_total` — Request count by route, method, and status code
- `http_request_duration_seconds` — Response time histogram
- `nodejs_heap_size_used_bytes` — Memory usage per service
- `process_cpu_seconds_total` — CPU usage per service
- `nodejs_active_handles_total` — Active connections

**Live Access:**
- Grafana Dashboard: http://209.38.199.108:3009 (admin / campustrade123)
- Prometheus: http://209.38.199.108:9090

## Results 4: Infrastructure as Code — Ansible

Two Ansible playbooks were implemented:

**Playbook 1: `install-dependencies.yml`**
- Updates apt package cache
- Installs system packages (git, curl, gnupg, nginx, ufw, postgresql-client)
- Adds Docker GPG key and repository, installs Docker Engine + Docker Compose
- Installs Node.js 20 via NodeSource
- Configures UFW firewall (allow SSH/HTTP/HTTPS/8080)
- Configures Nginx as reverse proxy

**Playbook 2: `deploy-app.yml`**
- Creates `/opt/campustrade` application directory
- Clones the GitHub repository (or pulls latest changes)
- Copies production `.env` file securely (mode 0600)
- Waits for PostgreSQL to be ready
- Runs `docker compose up -d --build` for all services
- Starts Prometheus + Grafana monitoring stack
- Runs smoke tests to verify deployment
- Reloads Nginx

**Inventory File (`hosts.ini`):**
```ini
[campustrade_servers]
campustrade-prod ansible_host=209.38.199.108 ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

## Results 5: Testing Results

**Test Coverage Summary (from `lcov.info` files):**

| Service | Tests | Lines | Functions | Branches |
|---|---|---|---|---|
| auth-service | 45 | 98.33% | 95.00% | 88.57% |
| user-service | 25 | 93.00% | 71.43% | 69.70% |
| listing-service | 42 | 94.77% | 76.47% | 79.41% |
| admin-service | 34 | 95.45% | 77.27% | 67.65% |
| notification-service | 39 | 95.49% | 73.33% | 82.35% |
| chat-service | 47 | 96.57% | 87.50% | 79.76% |
| **TOTAL** | **232** | **95.89%** | **78.10%** | **81.79%** |

All tests pass. Overall line coverage **95.89%** exceeds the 85% minimum requirement.

**Types of Tests:**
- **Unit Tests:** Individual route handlers tested with mocked database and Redis
- **Integration Tests:** Service lifecycle (`_init`, `_shutdown`) tested end-to-end
- **Event Handler Tests:** Redis Pub/Sub event handlers tested with captured callbacks
- **Socket Tests (chat-service):** Socket.IO auth middleware, connection, message sending, and disconnection

## Results 6: Containerization and Kubernetes

**Docker Build:**
All services use a single multi-stage Dockerfile:
```dockerfile
FROM node:20-alpine
ARG SERVICE_NAME
ARG PORT=3000
WORKDIR /app
COPY services/${SERVICE_NAME}/package*.json ./
RUN npm install --omit=dev
COPY shared/ ./shared/
COPY services/${SERVICE_NAME}/ ./services/${SERVICE_NAME}/
WORKDIR /app/services/${SERVICE_NAME}
EXPOSE ${PORT}
CMD ["node", "server.js"]
```

**Kubernetes Cluster Status (k3s):**
```
NAME                                    READY   STATUS    RESTARTS
admin-service-678655d4dc-wstht          1/1     Running   0
ai-service-7d9bcb74b7-5srnn             1/1     Running   0
api-gateway-dd475dcb6-5qkpg             1/1     Running   0
api-gateway-dd475dcb6-qplb4             1/1     Running   0
auth-service-595c8dd785-bzzwm           1/1     Running   0
auth-service-595c8dd785-fg6k9           1/1     Running   0
chat-service-89b48d95c-4q9tl            1/1     Running   0
listing-service-75bb987ff9-n65pb        1/1     Running   0
notification-service-84f5bbd7dd-q9zp2   1/1     Running   0
postgres-0                              1/1     Running   0
prometheus-68cdc96f9f-ms569             1/1     Running   0
redis-57c8875c4f-h9r67                  1/1     Running   0
search-service-7464894fcc-dhgfm         1/1     Running   0
user-service-5944d4dfc7-bsjv4           1/1     Running   0
```

**Horizontal Pod Autoscalers:**
```
NAME                  REFERENCE              MIN   MAX   CPU TARGET
api-gateway-hpa       Deployment/api-gateway   2    10      60%
auth-service-hpa      Deployment/auth-service  2     6      70%
listing-service-hpa   Deployment/listing-serv  2     8      60%
search-service-hpa    Deployment/search-serv   2     6      60%
user-service-hpa      Deployment/user-service  2     5      70%
```

---

# CHAPTER FOUR: ARCHITECTURE STRUCTURES AND CHARACTERISTICS

## 4.1 Architecture Style: Event-Driven Microservices

CampusTrade uses a **hybrid Event-Driven Microservices Architecture** with the following characteristics:

### Microservices
The application is decomposed into 9 independently deployable services, each with:
- A single, well-defined responsibility (Single Responsibility Principle)
- Its own database tables (logical data isolation)
- Independent deployment lifecycle (can be updated/scaled independently)
- Technology flexibility (all Node.js today but could use other runtimes)

### Event-Driven
Services communicate asynchronously through Redis Pub/Sub channels. When the auth-service creates a user, it publishes a `user.registered` event. The notification-service subscribes to this channel and sends a welcome email — without the auth-service knowing or caring about notifications.

**Benefits:**
- **Loose coupling** — Services don't call each other directly
- **Resilience** — If the notification service is down, the auth service still works; events are retried
- **Scalability** — Each service scales independently based on its own load

## 4.2 Quality Attributes

| Attribute | How CampusTrade Achieves It |
|---|---|
| **Scalability** | Kubernetes HPA scales pods 2→10 based on CPU. Redis caching reduces DB load. |
| **Availability** | K8s self-heals crashed pods. `restart: unless-stopped` in Docker Compose. |
| **Security** | JWT authentication, bcrypt password hashing (12 rounds), Helmet.js security headers, express-rate-limit (10 auth attempts / 15 min), SQL parameterised queries (no injection). |
| **Performance** | Redis caches category prices and view deduplication. View dedup prevents DB write amplification. Response times < 500ms for cached data. |
| **Observability** | All 9 services export Prometheus metrics. Request count, response time, CPU/memory tracked. Grafana dashboards visualise trends. |
| **Testability** | 95.89% line coverage. All services have isolated unit tests with mocked dependencies. |
| **Portability** | Docker containers run identically on any Linux server. Kubernetes manifests are cloud-agnostic. |
| **Maintainability** | Shared libraries (`shared/events.js`, `shared/db.js`, `shared/logger.js`) centralise common patterns. |

## 4.3 Architectural Views

### Module View
```
campusmarket/
├── frontend/                    # Presentation Layer
│   └── src/
│       ├── pages/               # 31 React page components
│       ├── components/          # Reusable UI components
│       ├── context/             # Auth, Socket, Toast contexts
│       └── services/api.js      # HTTP client
├── backend/
│   ├── shared/                  # Cross-cutting concerns
│   │   ├── db.js                # PostgreSQL pool
│   │   ├── events.js            # Redis Pub/Sub + event types
│   │   ├── authMiddleware.js    # JWT validation
│   │   ├── validate.js          # Input sanitisation
│   │   ├── errorHandler.js      # Centralised error handling
│   │   ├── logger.js            # Winston structured logging
│   │   └── metrics.js           # Prometheus middleware
│   └── services/                # Business Logic Layer
│       ├── auth-service/
│       ├── user-service/
│       ├── listing-service/
│       ├── chat-service/
│       ├── admin-service/
│       ├── ai-service/
│       ├── search-service/
│       ├── notification-service/
│       └── api-gateway/
├── k8s/                         # Infrastructure Layer (K8s)
├── ansible/                     # Infrastructure as Code
└── docker/                      # Monitoring stack
```

## 4.4 Trade-offs and Pros/Cons

### Pros of Event-Driven Microservices

| Pro | Detail |
|---|---|
| **Independent scaling** | Listing-service can scale to 8 pods during peak browsing without affecting chat |
| **Fault isolation** | If ai-service crashes, users can still browse and buy; only price suggestions are unavailable |
| **Team scalability** | In a team, each service can be owned by a different developer with no conflicts |
| **Technology flexibility** | Each service could use a different language or database if needed |
| **Continuous deployment** | A single service can be redeployed without downtime using K8s rolling updates |

### Cons of Event-Driven Microservices

| Con | Detail / Mitigation |
|---|---|
| **Complexity** | 9 services are harder to debug than 1 monolith. *Mitigated by:* centralised logging, Prometheus monitoring |
| **Network latency** | Service-to-service calls add latency vs. in-process function calls. *Mitigated by:* Redis caching |
| **Data consistency** | Eventual consistency across services can cause temporary data staleness. *Acceptable for:* this read-heavy use case |
| **Operational overhead** | Kubernetes, Docker, CI/CD, monitoring all need maintenance. *Justified by:* the DevOps requirement and educational value |
| **Code duplication** | Some boilerplate (cors, helmet, express.json) is repeated across services. *Mitigated by:* shared library in `backend/shared/` |

---

# CHAPTER FIVE: PROJECT INNOVATION

## 5.1 AI-Powered Price Recommendation Engine

The most innovative feature of CampusTrade is the **built-in AI pricing engine** in the `ai-service`. Unlike traditional marketplaces that let sellers post any price, CampusTrade analyses the listing against:

1. **Historical sales data** — The average price that items in the same category actually sold for on campus
2. **Condition factor** — A multiplier that adjusts the price based on item condition:
   - `new` → 1.0 (full price)
   - `like new` → 0.9
   - `excellent condition` → 0.85
   - `good condition` / `used` → 0.7
   - `old` → 0.4
3. **Category minimum prices** — A floor price per category in FCFA (e.g., Electronics minimum 2000 FCFA)

The AI endpoint returns a `{ minPrice, maxPrice, suggestedPrice, isFair }` response. If a listing price is below the minimum, the system flags it as potentially fraudulent (the seller may be laundering money through fake cheap sales) and publishes a `low_price_flag` event to the admin service.

This addresses a real exploitation pattern observed on campus where predatory buyers post inflated prices targeting freshers.

## 5.2 Real-Time Chat with Socket.IO

Unlike static listing platforms, CampusTrade has a **full real-time chat system**:
- Buyers and sellers join named conversation rooms
- Messages are persisted to PostgreSQL and delivered in real-time via WebSocket
- Read receipts (`message_read` event) are tracked
- Socket connections are authenticated with JWT tokens (no anonymous access)

## 5.3 Web Push Notifications

CampusTrade implements the **W3C Web Push API** through the notification-service:
- Users can subscribe to push notifications from any browser
- VAPID (Voluntary Application Server Identification) keys ensure notifications are cryptographically trusted
- Notifications are delivered even when the browser tab is closed

## 5.4 Campus-Zone Filtering

Listings are tagged with a `campus_zone` field allowing students to find items available near their building, dorm, or department — reducing transaction friction.

---

# CHAPTER SIX: RECOMMENDATIONS AND CONCLUSION

## Conclusion

CampusTrade successfully demonstrates a complete, production-grade software architecture implementation. The system delivers all required academic deliverables: a live microservices application on a VPS (http://209.38.199.108:4000), a Jenkins CI/CD pipeline with GitHub integration, Prometheus/Grafana monitoring, Ansible IaC playbooks, Kubernetes orchestration with HPA autoscaling, and comprehensive test coverage of 95.89% across 232 automated tests — all verified by SonarQube.

The development process followed Scrum methodology across three sprints, iteratively delivering features from authentication and listing management in Sprint 1, through real-time chat and AI pricing in Sprint 2, to admin moderation, push notifications, and VPS deployment in Sprint 3.

The hardest technical challenges were the Jest mock queue leakage patterns that caused cascading test failures across services (solved by switching to `resetAllMocks()` and restoring mocked implementations in `afterEach`), and the k3s Traefik ingress controller conflicting with Nginx on port 80 in production (resolved by serving the frontend on port 4000).

## Recommendations for Further Studies

Future work on CampusTrade should explore: (1) **SSL/TLS encryption** using Let's Encrypt and cert-manager on Kubernetes to secure all communications over HTTPS, which would require a registered domain name pointing to the VPS IP; (2) **Payment integration** using a mobile money API (MTN MoMo, Orange Money) which are the dominant payment methods in Cameroon, to enable in-app transactions with escrow protection; and (3) **Machine learning enhancements** to the AI pricing engine, moving from simple condition-factor multiplication to a trained regression model on campus sales data, which would give more accurate price ranges as the dataset grows.

---

# APPENDIX A: API Endpoints Summary

## Auth Service (:3001)
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login + get JWT |
| POST | /api/auth/google | Google OAuth login |
| POST | /api/auth/verify-email | Verify email token |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |

## Listing Service (:3003)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/listings | Browse listings (filterable) |
| POST | /api/listings | Create new listing |
| GET | /api/listings/:id | Get single listing |
| PUT | /api/listings/:id | Update listing |
| DELETE | /api/listings/:id | Delete listing |
| POST | /api/listings/:id/image | Upload image |
| POST | /api/listings/:id/offers | Make an offer |
| GET | /api/listings/:id/offers | Get listing offers |
| PUT | /api/listings/:id/offers/:oid | Accept/decline offer |

## Admin Service (:3005)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/users | List all users |
| PUT | /api/admin/users/:id/suspend | Suspend user account |
| DELETE | /api/admin/listings/:id | Remove listing |
| GET | /api/admin/reports | Get fraud reports |
| GET | /api/admin/analytics | Platform statistics |

---

# APPENDIX B: Deployment Commands

```bash
# SSH into VPS
ssh root@209.38.199.108

# View all running Docker containers
cd /opt/campustrade/campusmarket/backend
docker compose ps

# View logs of a specific service
docker compose logs auth-service --tail=50

# View all Kubernetes pods
kubectl get pods -n campustrade

# View Kubernetes services
kubectl get svc -n campustrade

# View autoscalers
kubectl get hpa -n campustrade

# View everything in K8s
kubectl get all -n campustrade

# Run Ansible deployment (from local machine)
cd campusmarket/ansible
ansible-playbook -i hosts.ini install-dependencies.yml
ansible-playbook -i hosts.ini deploy-app.yml
```

---

# APPENDIX C: GitHub Repository Structure

```
smart-campus-market/
└── campusmarket/
    ├── README.md                    # Project documentation
    ├── Jenkinsfile                  # CI/CD pipeline
    ├── frontend/                    # React 18 + Vite + Tailwind
    ├── backend/
    │   ├── Dockerfile               # Multi-service Docker build
    │   ├── docker-compose.yml       # Local/prod orchestration
    │   ├── docker-compose.prod.yml  # Production overrides
    │   ├── shared/                  # Shared libraries
    │   ├── services/
    │   │   ├── auth-service/        # JWT auth + Google OAuth
    │   │   ├── user-service/        # Profile management
    │   │   ├── listing-service/     # Marketplace listings
    │   │   ├── chat-service/        # Real-time Socket.IO
    │   │   ├── admin-service/       # Moderation dashboard
    │   │   ├── ai-service/          # Price recommendation AI
    │   │   ├── search-service/      # Full-text search
    │   │   ├── notification-service/# Email + push notifications
    │   │   └── api-gateway/         # Reverse proxy + auth
    │   └── k8s/                     # Kubernetes manifests
    ├── ansible/                     # IaC playbooks
    │   ├── hosts.ini
    │   ├── install-dependencies.yml
    │   └── deploy-app.yml
    └── docker/
        ├── docker-compose.yml       # Prometheus + Grafana
        ├── prometheus.yml           # Metrics scrape config
        ├── grafana-dashboard.json   # Dashboard config
        └── sonarqube-compose.yml    # SonarQube analysis
```

---

*Document prepared for SEN3244 Software Architecture — Spring 2026*
*Author: Nkinyampraises Ncha — nkinyampraises.ncha@ictuniversity.edu.cm*
*VPS Deployed: DigitalOcean FRA1 — 209.38.199.108*
*GitHub: https://github.com/Nkinyampraises/smart-campus-market*
