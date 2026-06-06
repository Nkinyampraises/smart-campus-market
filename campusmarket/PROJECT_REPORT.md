# FACULTY OF INFORMATION AND COMMUNICATION TECHNOLOGIES
## SPRING 2026 — FINAL PROJECT REPORT
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
| **Jenkins CI/CD** | http://209.38.199.108:8090 |
| **SonarQube** | http://209.38.199.108:9000 |
| **Grafana** | http://209.38.199.108:3009 |
| **Prometheus** | http://209.38.199.108:9090 |

---

## Group Information

| SN | Member Name | Registration Number | Role |
|---|---|---|---|
| 1 | Praises Ncha (Nkinyampraises) | ICTU2023XXXX | Scrum Master — Design, Frontend, Testing, Jenkins, VPS, Grafana, Prometheus, SonarQube |
| 2 | Kongyu Jesse Ntani | ICTU20234195 | Product Owner — Backend, Microservices, Event-Driven Architecture, Documentation, PowerPoint, Architecture |

---

## Table of Contents

- CHAPTER ONE: INTRODUCTION
  - 1.1 General Introduction
  - 1.2 Aim and Objectives
  - 1.3 Problem Statement
- CHAPTER TWO: LITERATURE REVIEW
  - 2.1 Software Development Methodologies
  - 2.2 Comparison of Methodologies
  - 2.3 Reason for Choosing Scrum
  - 2.4 Review of Related Concepts
- CHAPTER THREE: METHODOLOGY AND MATERIALS
  - 3.1 Research Methodology
  - 3.2 System Requirements
  - 3.3 High-Level System Design
  - 3.4 Implemented Architectural Style
  - 3.5 Major Services and Responsibilities
  - 3.6 Database Design
  - 3.7 API Routes and Rate Limiting
  - 3.8 Rate Limit Calculations
  - 3.9 Capacity and Storage Calculations
  - 3.10 Algorithms
  - 3.11 Application of Scrum
  - 3.12 Scrum Artifacts
  - 3.13 Test Case Document
  - 3.14 Materials and Technologies Used
- CHAPTER FOUR: RESULTS AND DISCUSSIONS
  - 4.1 Infrastructure Setup
  - 4.2 Docker and Kubernetes Orchestration
  - 4.3 Jenkins CI/CD Pipeline
  - 4.4 Prometheus and Grafana Monitoring
  - 4.5 Ansible Infrastructure as Code
  - 4.6 API Request and Response Evidence
  - 4.7 Application Scenario Screenshots
  - 4.8 Discussion of Architecture Characteristics
  - 4.9 Pros and Cons of the Chosen Architecture
- CHAPTER FIVE: RECOMMENDATIONS, CHALLENGES AND CONCLUSION
  - 5.1 Recommendations
  - 5.2 Conclusion
- APPENDIX A: DIAGRAM DESIGN PROMPTS
- APPENDIX B: SAMPLE CONFIGURATION AND COMMANDS

---

# CHAPTER ONE: INTRODUCTION

## 1.1 General Introduction

CampusTrade is a full-stack, cloud-native, event-driven microservices marketplace application designed specifically for ICT University students. The platform enables students to buy, sell, and exchange items including electronics, clothing, accessories, food items, and services through a secure and structured digital environment.

Students at ICT University and campuses across Cameroon regularly need to trade items among themselves. These transactions currently happen informally through WhatsApp groups and word of mouth, creating serious problems around trust, pricing fairness, product discoverability, and transaction safety. There is no dedicated platform that understands the campus context, validates prices against market references, or allows real-time negotiation.

CampusTrade addresses this gap by providing a structured marketplace where students post listings with photos, receive AI-powered fair price guidance, negotiate through real-time chat, get browser push notifications, and where administrators can moderate content and flag suspicious listings. The system is deployed on a DigitalOcean Virtual Private Server (VPS) at IP address **209.38.199.108**, running Ubuntu 24.04 LTS, with infrastructure managed through Docker, Kubernetes (k3s), Ansible, Nginx, Jenkins CI/CD, and Prometheus/Grafana monitoring.

## 1.2 Aim and Objectives

**Aim:** To design and implement a scalable, secure, event-driven microservices marketplace for campus students, applying professional software architecture principles, DevOps practices, and cloud infrastructure that reflects real-world engineering standards.

**Objectives:**
1. Design and implement a microservices architecture with 9 independent services communicating via Redis Pub/Sub events.
2. Containerize all services using Docker and orchestrate them with Kubernetes (k3s) including Horizontal Pod Autoscaling.
3. Build a fully automated CI/CD pipeline using Jenkins with GitHub webhook integration.
4. Implement real-time features including live chat (Socket.IO) and browser push notifications (Web Push API).
5. Integrate an AI-powered price recommendation and fraud detection engine.
6. Achieve a minimum of 85% automated test coverage verified by SonarQube quality gates.
7. Set up comprehensive observability with Prometheus metrics collection and Grafana dashboards.
8. Automate server provisioning and deployment using Ansible Infrastructure as Code.
9. Apply Scrum methodology with sprint planning, backlogs, reviews, and retrospectives.

## 1.3 Problem Statement

Campus students face five critical challenges when trading among themselves:

1. **No trusted platform** — Transactions happen via unverifiable WhatsApp messages with no fraud protection, no dispute resolution, and no accountability.
2. **Price exploitation** — Students, especially new students, are routinely overcharged because there is no reference for fair market pricing in the campus context.
3. **No real-time communication** — There is no built-in contextual negotiation tool; students must switch to external apps and lose the context of the listing.
4. **No searchable inventory** — Listings disappear from group chat history making it impossible to discover what is available.
5. **No admin oversight** — Fraudulent sellers and spam listings have no mechanism to be flagged, reviewed, or removed.

CampusTrade directly solves all five problems through: a structured marketplace with categories and campus zones, an AI price validator with fraud detection, integrated real-time chat, full-text search, and an admin moderation dashboard.

---

# CHAPTER TWO: LITERATURE REVIEW

## 2.1 Software Development Methodologies

Software development methodologies are structured frameworks that guide how software is planned, designed, built, tested, and delivered. The major methodologies reviewed are:

**Waterfall Model** is a linear, sequential approach where each phase (requirements → design → implementation → testing → deployment → maintenance) must be fully completed before the next begins. Changes are very expensive once a phase is signed off. Best suited for projects with fixed, well-understood requirements.

**Agile Methodology** is an iterative, incremental approach that delivers working software in short cycles. It emphasizes collaboration, continuous customer feedback, and adaptability to change. The Agile Manifesto (2001) values individuals and interactions, working software, customer collaboration, and responding to change.

**Scrum** is a specific Agile framework organising work into time-boxed Sprints (1–4 weeks) with defined roles (Product Owner, Scrum Master, Development Team) and ceremonies (Sprint Planning, Daily Standup, Sprint Review, Sprint Retrospective). Scrum is the most widely adopted Agile framework in professional software teams.

**Kanban** is a visual workflow management method using boards and cards to track work items from "To Do" through "In Progress" to "Done", with no fixed iterations. It focuses on limiting work-in-progress to improve flow.

**DevOps** is a culture and practice that merges software Development and IT Operations, emphasizing automation, continuous integration, continuous delivery (CI/CD), infrastructure as code, and monitoring. It eliminates the traditional wall between development and operations teams.

**Extreme Programming (XP)** is an Agile variant emphasizing engineering practices including test-driven development (TDD), pair programming, continuous integration, and small releases.

## 2.2 Comparison of Methodologies

| Criterion | Waterfall | Scrum/Agile | Kanban | DevOps |
|---|---|---|---|---|
| Flexibility | Low — changes are expensive | High — changes welcome each sprint | Medium — continuous improvement | High — automated pipeline |
| Delivery Speed | Slow (one big release) | Fast (working software per sprint) | Continuous | Continuous |
| Customer Involvement | Low — mainly at start and end | High — sprint reviews each 2 weeks | Medium | Medium |
| Planning Style | Upfront and rigid | Sprint-based, adaptive | Continuous backlog | Automated continuous |
| Testing | At end of project | Per sprint, inside Definition of Done | On demand | Automated and continuous |
| Team Structure | Siloed by function | Cross-functional self-organising | Cross-functional | Dev + Ops merged |
| Risk Management | Poor — issues found late | Good — early and frequent feedback | Good | Excellent — automated gates |
| Best Suited For | Government, fixed-scope contracts | Evolving software products | Support/maintenance teams | Software products with CI/CD |
| Documentation | Heavy upfront | Light, just enough | Minimal | As code (Ansible, Terraform) |

## 2.3 Reason for Choosing Scrum Methodology

Scrum was selected as the primary methodology for CampusTrade for the following reasons:

1. **Iterative delivery** — CampusTrade has many distinct feature areas (authentication, listings, chat, AI pricing, notifications, admin dashboard). Scrum allowed prioritising and delivering these in increments rather than attempting to build everything simultaneously.

2. **Adaptability to changing requirements** — Several features evolved during development (e.g., fraud detection was enhanced with a high-price flag after testing; campus zones were updated to reflect real ICT University locations). Scrum's sprint boundary allowed incorporating these changes cleanly.

3. **Transparency and accountability** — The product backlog and sprint backlogs kept all work visible. Even with a small team, the discipline of sprint ceremonies ensured consistent progress tracking.

4. **Quality focus through Definition of Done** — Each user story was only marked "Done" when it had passing tests, met coverage requirements, and had been reviewed in the application. This prevented the accumulation of technical debt.

5. **Alignment with DevOps** — Scrum's short feedback cycles align naturally with the CI/CD pipeline (Jenkins), where every sprint ends with deployable code that is automatically tested, analysed, and deployed.

## 2.4 Review of Related Concepts

### 2.4.1 Microservices Architecture

Microservices architecture organises an application as a collection of small, independently deployable services each focused on a specific business capability. Each service has its own database, can be deployed independently, and communicates with other services through APIs or message brokers. This contrasts with a Monolithic architecture where all functionality is packaged into a single deployable unit.

Key principles: **Single Responsibility** (each service does one thing well), **Decentralised Data Management** (each service owns its data), **Design for Failure** (services must tolerate failures of dependencies).

### 2.4.2 API Gateway Pattern

An API Gateway acts as the single entry point for all client requests. It handles cross-cutting concerns including JWT token validation, request routing to the appropriate microservice, rate limiting, and request/response transformation. This prevents clients from needing to know about the internal service topology.

### 2.4.3 Event-Driven Communication

In event-driven architecture, services communicate by publishing and consuming events through a message broker. A producer (e.g., auth-service) publishes a `user.registered` event to a channel. All consumers (e.g., notification-service) subscribed to that channel receive and process it independently. Redis Pub/Sub was chosen as the message broker for CampusTrade due to its simplicity, high performance, and the fact it also serves as the application cache.

### 2.4.4 AI Price Recommendation

Price recommendation systems analyse historical sales data to compute fair market reference prices. Condition-based pricing models apply multipliers based on item state (new, used, old) to the reference price, providing sellers with a suggested price range and alerting buyers when a listed price deviates significantly from the market reference.

### 2.4.5 Fraud Detection

Automated fraud detection in marketplace systems uses rule-based or machine learning approaches to identify suspicious behaviour. Rule-based detection (used in CampusTrade) flags listings with prices outside acceptable bands relative to market reference prices, and flags sellers who post unusually high volumes of listings in a short period. Machine learning approaches use trained classifiers on historical fraud data but require large labelled datasets.

---

# CHAPTER THREE: METHODOLOGY AND MATERIALS

## 3.1 Research Methodology

This project applied an **Applied Engineering + Design Science Research** methodology:

- **Design Science** — Iteratively building, testing, and evaluating artefacts (the application, infrastructure, tests) against defined requirements
- **Scrum/Agile** — Three two-week sprints with defined goals, sprint planning, daily standups, sprint reviews, and retrospectives
- **Test-Driven Development (TDD) principles** — Tests written alongside features to verify correctness; coverage measured by Jest and reported by SonarQube

## 3.2 System Requirements

### 3.2.1 Functional Requirements Summary

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Students can register with email/password or Google OAuth | High |
| FR-02 | Users can create, edit, delete, and view listings with up to 5 photos | High |
| FR-03 | Users can browse listings by category, campus zone, price range, and condition | High |
| FR-04 | Sellers receive AI-generated fair price suggestions before posting | High |
| FR-05 | Buyers can make price offers on listings | High |
| FR-06 | Users can chat in real-time with sellers | High |
| FR-07 | Users receive push and email notifications for offers, messages, and listing events | Medium |
| FR-08 | Listings flagged as suspicious show a red fraud warning to all viewers | High |
| FR-09 | Admin users can suspend accounts, remove listings, and resolve fraud reports | High |
| FR-10 | Listings expire automatically after 30 days with seller notification | Medium |
| FR-11 | Users can save listings to a wishlist | Low |
| FR-12 | Full-text search across all active listings | Medium |

### 3.2.2 Non-Functional Requirements Summary

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Availability | 99.9% via Kubernetes self-healing and `restart: unless-stopped` |
| NFR-02 | Scalability | Kubernetes HPA scales pods 2→10 based on CPU utilisation |
| NFR-03 | Security | JWT auth, bcrypt (12 rounds), Helmet.js headers, rate limiting |
| NFR-04 | Performance | Redis caching for views and prices; API response < 500ms for cached data |
| NFR-05 | Testability | ≥ 85% line coverage verified by SonarQube quality gate |
| NFR-06 | Observability | Prometheus metrics + Grafana dashboards on all 9 services |
| NFR-07 | Portability | Docker containers, Kubernetes manifests, cloud-agnostic |
| NFR-08 | Maintainability | Shared libraries centralise common patterns; linting enforced |

## 3.3 High-Level System Design

### System Context Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           CAMPUSTRADE SYSTEM             │
                    │                                          │
  [Student/User] ───│──→ Browse, Buy, Sell, Chat, Wishlist   │
                    │                                          │
  [Admin User]  ────│──→ Moderate, Ban, Review Fraud          │
                    │                                          │
  [Google OAuth]────│──→ Third-Party Authentication           │
                    │                                          │
  [SMTP Server] ────│◄── Send Email Notifications             │
                    │                                          │
  [Web Browser] ────│◄── Receive Push Notifications           │
                    └─────────────────────────────────────────┘
```

### Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAMPUSTRADE PLATFORM                         │
│                                                                   │
│  ┌─────────────────┐    HTTP/REST    ┌──────────────────────┐   │
│  │ React 18 SPA    │───────────────→ │   API Gateway         │   │
│  │ (Nginx :4000)   │                 │   (Express :8080)     │   │
│  │ 31 Pages        │ ←─────────────  │   JWT Validation      │   │
│  └─────────────────┘  JSON Responses │   Rate Limiting       │   │
│                                      └────────┬─────────────┘   │
│                                               │ Proxies to:      │
│                        ┌──────────────────────┼─────────────┐   │
│                        ▼          ▼           ▼             ▼   │
│               ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────┐  │
│               │  Auth    │ │  User    │ │Listing  │ │ Chat │  │
│               │  :3001   │ │  :3002   │ │  :3003  │ │:3004 │  │
│               └────┬─────┘ └────┬─────┘ └────┬────┘ └──┬───┘  │
│                    │            │             │          │       │
│               ┌────┴─────┐ ┌───┴──────┐ ┌───┴────┐    │       │
│               │  Admin   │ │  Search  │ │  AI    │    │       │
│               │  :3005   │ │  :3007   │ │  :3006 │    │       │
│               └──────────┘ └──────────┘ └────────┘    │       │
│                                                         ▼       │
│                              ┌──────────────────────────────┐  │
│                              │   Notification Service :3008  │  │
│                              │   Email (SMTP) + Web Push     │  │
│                              └──────────────────────────────┘  │
│                                                                   │
│   ┌────────────────────────────────────────────────────────┐    │
│   │             SHARED INFRASTRUCTURE                        │    │
│   │  PostgreSQL :5432   Redis :6379 (Cache + Pub/Sub)       │    │
│   └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 3.4 Implemented Architectural Style

CampusTrade implements an **Event-Driven Microservices Architecture** with three communication patterns:

1. **Synchronous REST** — Frontend calls API Gateway which proxies to individual services. Used for: user requests, listing queries, chat message history.

2. **WebSocket (Socket.IO)** — Real-time bidirectional connection between frontend and chat-service for live message delivery.

3. **Asynchronous Events (Redis Pub/Sub)** — Services publish events to named channels; other services subscribe independently. Used for: fraud detection triggers, email notifications, push notifications, search indexing.

### Event Channels

| Channel | Publisher | Subscriber | Events |
|---|---|---|---|
| `listing.event` | listing-service | ai-service, search-service | `listing.created`, `listing.sold`, `listing.expired` |
| `notification.channel` | auth, listing, admin services | notification-service | `welcome.email`, `offer.accepted`, `listing.expired` |
| `audit.channel` | ai-service | admin-service | `low_price_flag`, `high_price_flag`, `spam_rate_flag` |
| `admin.event` | admin-service | listing-service | `listing.removed`, `user.suspended` |

## 3.5 Major Services and Responsibilities

| Service | Port | Key Responsibilities |
|---|---|---|
| **api-gateway** | 8080 | JWT validation, request proxying, rate limiting (100 req/min per IP) |
| **auth-service** | 3001 | Register, login, Google OAuth, email verification, forgot/reset password |
| **user-service** | 3002 | Profile management, avatar upload, seller ratings, wishlist CRUD |
| **listing-service** | 3003 | Create/edit/delete listings, image upload (5 per listing), view tracking (Redis dedup), offer CRUD, automatic expiry |
| **chat-service** | 3004 | Socket.IO rooms, message persistence, read receipts |
| **admin-service** | 3005 | User suspension, listing removal, fraud flag management, reports, analytics |
| **ai-service** | 3006 | Price suggestion (condition-weighted category avg), fraud detection (low/high/spam flags), trending algorithm |
| **search-service** | 3007 | Full-text search with PostgreSQL ILIKE, category/price/condition/zone filters |
| **notification-service** | 3008 | SMTP email delivery, Web Push (VAPID), event-driven dispatch |

## 3.6 Database Design

All services share one PostgreSQL instance with logically separated tables per service domain.

### Core Tables

**users** (auth-service + user-service)
```
id           UUID PRIMARY KEY
email        VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255)
first_name   VARCHAR(100)
last_name    VARCHAR(100)
role         VARCHAR(20) DEFAULT 'user'  -- 'user' | 'admin'
is_verified  BOOLEAN DEFAULT false
is_suspended BOOLEAN DEFAULT false
avatar_url   TEXT
campus_zone  VARCHAR(100)
created_at   TIMESTAMP DEFAULT NOW()
```

**listings** (listing-service)
```
id           UUID PRIMARY KEY
seller_id    UUID REFERENCES users(id)
title        VARCHAR(200) NOT NULL
description  TEXT
category     VARCHAR(100) NOT NULL
price_fcfa   INTEGER NOT NULL
condition    VARCHAR(50)
campus_zone  VARCHAR(100)
status       VARCHAR(20) DEFAULT 'active'  -- 'active' | 'sold' | 'expired'
views        INTEGER DEFAULT 0
images       TEXT[]
tags         TEXT[]
created_at   TIMESTAMP DEFAULT NOW()
expires_at   TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
```

**messages** (chat-service)
```
id              UUID PRIMARY KEY
conversation_id UUID NOT NULL
sender_id       UUID REFERENCES users(id)
content         TEXT NOT NULL
is_read         BOOLEAN DEFAULT false
created_at      TIMESTAMP DEFAULT NOW()
```

**conversations** (chat-service)
```
id          UUID PRIMARY KEY
buyer_id    UUID REFERENCES users(id)
seller_id   UUID REFERENCES users(id)
listing_id  UUID REFERENCES listings(id)
created_at  TIMESTAMP DEFAULT NOW()
```

**offers** (listing-service)
```
id          UUID PRIMARY KEY
listing_id  UUID REFERENCES listings(id)
buyer_id    UUID REFERENCES users(id)
amount_fcfa INTEGER NOT NULL
status      VARCHAR(20) DEFAULT 'pending'  -- 'pending' | 'accepted' | 'declined'
created_at  TIMESTAMP DEFAULT NOW()
```

**transactions** (listing-service)
```
id           UUID PRIMARY KEY
listing_id   UUID REFERENCES listings(id)
buyer_id     UUID REFERENCES users(id)
seller_id    UUID REFERENCES users(id)
final_price  INTEGER NOT NULL
completed_at TIMESTAMP DEFAULT NOW()
```

**fraud_flags** (admin-service)
```
id          UUID PRIMARY KEY
listing_id  UUID REFERENCES listings(id)
seller_id   UUID REFERENCES users(id)
type        VARCHAR(50)   -- 'low_price_flag' | 'high_price_flag' | 'spam_rate_flag'
rule        TEXT          -- Human-readable explanation
resolved    BOOLEAN DEFAULT false
resolved_at TIMESTAMP
created_at  TIMESTAMP DEFAULT NOW()
```

**wishlist** (user-service)
```
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id)
listing_id UUID REFERENCES listings(id)
added_at   TIMESTAMP DEFAULT NOW()
```

**push_subscriptions** (notification-service)
```
id           UUID PRIMARY KEY
user_id      UUID REFERENCES users(id)
endpoint     TEXT NOT NULL
p256dh_key   TEXT
auth_key     TEXT
created_at   TIMESTAMP DEFAULT NOW()
```

### Entity Relationship Diagram (ERD)

```
USERS ||──< LISTINGS       (one user posts many listings)
USERS ||──< OFFERS         (one user makes many offers)
USERS ||──< MESSAGES       (one user sends many messages)
USERS ||──< WISHLIST       (one user has many wishlist items)
USERS ||──< TRANSACTIONS   (one user completes many transactions)
LISTINGS ||──< OFFERS      (one listing receives many offers)
LISTINGS ||──< MESSAGES    (one listing generates many conversations)
LISTINGS ||──< FRAUD_FLAGS (one listing can have multiple flags)
LISTINGS ||──< TRANSACTIONS(one listing completes in one transaction)
CONVERSATIONS ||──< MESSAGES (one conversation has many messages)
```

## 3.7 API Routes and Rate Limiting

### Rate Limiting Strategy

| Endpoint Group | Limit | Window | Reason |
|---|---|---|---|
| POST /api/auth/login | 10 requests | 15 minutes | Brute force protection |
| POST /api/auth/register | 5 requests | 60 minutes | Spam account prevention |
| POST /api/auth/forgot-password | 3 requests | 60 minutes | Email abuse prevention |
| General API | 100 requests | 1 minute | General DoS protection |
| File upload | 10 uploads | 10 minutes | Storage abuse prevention |

### 3.8 Rate Limit Calculations

**Base assumption:** 1,800 active students (ICT University estimate)

| Scenario | Calculation | Result |
|---|---|---|
| Peak login load | 1,800 users × 10% login at 9:00 AM over 5 min | 360 logins / 300s = 1.2 req/sec |
| Browse listings (peak) | 1,800 users × 30% browsing × 2 pages/min | 1,080 req/min = 18 req/sec |
| Chat messages (peak) | 500 active chats × 1 msg/30s | 16.7 msg/sec |
| Image uploads (peak) | 200 listings/day × 3 images = 600 uploads/day | 0.007 uploads/sec (negligible) |
| API gateway total | Sum of above | ~40 req/sec at peak |

The 4 vCPU / 8 GB DigitalOcean droplet can comfortably handle ~2,000 req/sec for Node.js services, giving a **50× safety margin** at current scale.

### 3.9 Capacity and Storage Calculations

| Resource | Calculation | Estimated Usage |
|---|---|---|
| Listing images | 200 listings/day × 3 images × 500KB avg | 300 MB/day |
| PostgreSQL data | 1,800 users × 5 listings avg × 2KB | ~18 MB for listings table |
| Redis memory | 1,800 active sessions × 2KB JWT cache | ~3.6 MB |
| Log files | 9 services × 50MB/day logs | 450 MB/day |
| **Total 90-day storage** | (300 + 0.2 + 450) MB × 90 days | ~67.5 GB / 90 days |

The 160 GB SSD provides adequate capacity. Log rotation is configured to retain 7 days.

## 3.10 Algorithms

### 3.10.1 AI Price Suggestion Algorithm

```
INPUT: category (string), condition (string)

STEP 1: Map condition to factor
  conditionFactors = {
    "new":               1.00,
    "like new":          0.90,
    "excellent":         0.85,
    "good condition":    0.70,
    "used":              0.70,
    "old":               0.40
  }
  factor = conditionFactors[condition]  // default 0.70

STEP 2: Get category average price from Redis cache (6-hour TTL)
  cacheKey = "ai:category_avg:" + category
  IF cache hit: avgPrice = cached value
  ELSE: avgPrice = AVG(final_price) FROM transactions
        WHERE category = category AND completed_at > NOW() - 90 days
        STORE in cache

STEP 3: Compute price range
  refPrice = MAX(avgPrice, CATEGORY_MIN_PRICES[category])
  suggestedPrice = ROUND(refPrice × factor)
  minPrice = ROUND(suggestedPrice × 0.90)
  maxPrice = ROUND(suggestedPrice × 1.10)

OUTPUT: { suggested: suggestedPrice, range: {min: minPrice, max: maxPrice} }
```

### 3.10.2 Fraud Detection Algorithm

```
INPUT: listingId, category, price_fcfa, sellerId

STEP 1: Get reference price
  avgPrice = getCategoryAvgPrice(category)
  refPrice = MAX(avgPrice, CATEGORY_MIN_PRICES[category])

STEP 2: Rule 1 — Low price check
  IF price_fcfa < refPrice × 0.60 THEN
    publishFlag(LOW_PRICE_FLAG,
      "Price is only X% of market reference for [category]")

STEP 3: Rule 2 — High price check
  IF price_fcfa > refPrice × 8 THEN
    publishFlag(HIGH_PRICE_FLAG,
      "Price is X% above market reference for [category]")

STEP 4: Rule 3 — Spam rate check
  recentCount = COUNT listings WHERE seller_id = sellerId
                AND created_at > NOW() - 60 minutes
  IF recentCount > 10 THEN
    publishFlag(SPAM_RATE_FLAG,
      "Seller posted N listings in 60 minutes")

STEP 5: All flags published to AUDIT Redis channel
        admin-service subscribes and persists to fraud_flags table
```

### 3.10.3 Trending Score Algorithm

```
INPUT: All active listings

FOR EACH listing:
  views7d = listing.views  (proxy for 7-day views)
  wish7d  = COUNT wishlist additions WHERE listing_id = listing.id
            AND added_at > NOW() - 7 days

  trendScore = (views7d × 0.6) + (wish7d × 0.4)

SORT listings by trendScore DESC
RETURN top 10 listings

Cache result in Redis with 15-minute TTL
```

## 3.11 Application of Scrum

### 3.11.1 Team Organisation

| Role | Member | Responsibilities |
|---|---|---|
| **Product Owner** | Kongyu Jesse Ntani | Backend microservices and event-driven architecture, documentation, project architecture, PowerPoint presentation |
| **Scrum Master** | Praises Ncha | Facilitates ceremonies, removes blockers; design, frontend, testing, Jenkins CI/CD, VPS deployment, Grafana, Prometheus, SonarQube |

### 3.11.2 Sprint Overview

#### Sprint 1 (Weeks 1–2): Foundation

**Goal:** Project setup, authentication, basic listing CRUD, React frontend scaffolding

| User Story | Points | Status |
|---|---|---|
| Set up monorepo, Docker Compose, shared libraries | 8 | ✅ Done |
| Implement auth-service (register, login, JWT, Google OAuth) | 13 | ✅ Done |
| Implement user-service (profile, wishlist) | 5 | ✅ Done |
| Design and create all PostgreSQL schemas | 5 | ✅ Done |
| Build React frontend base (routing, auth context, Topbar) | 8 | ✅ Done |
| **Total** | **39** | **All Done** |

**Retrospective:** Monorepo with shared libraries was the right call — saved 2+ days of code duplication. Should have set up Jest mocks for Redis and PostgreSQL from day one.

#### Sprint 2 (Weeks 3–4): Core Features + DevOps

**Goal:** Listings, chat, AI pricing, CI/CD, Kubernetes manifests, monitoring

| User Story | Points | Status |
|---|---|---|
| listing-service: CRUD, images, offers, view deduplication | 21 | ✅ Done |
| chat-service: Socket.IO real-time messaging, read receipts | 13 | ✅ Done |
| ai-service: price recommendation and fraud detection | 13 | ✅ Done |
| Jenkins 9-stage CI/CD pipeline with GitHub webhook | 8 | ✅ Done |
| Kubernetes manifests (9 services, HPA, ingress, secrets) | 8 | ✅ Done |
| Prometheus + Grafana monitoring stack | 5 | ✅ Done |
| **Total** | **68** | **All Done** |

**Retrospective:** Socket.IO integration took longer than estimated (+1 hour). Jest mock leakage found in chat tests. K8s image names needed correction from `campustrade/` to `praisesn/`. VAPID keys needed to be patched into K8s secrets.

#### Sprint 3 (Weeks 5–6): Admin, Notifications, Testing, Deployment

**Goal:** Admin dashboard, push notifications, 85%+ coverage, VPS deployment, Ansible IaC

| User Story | Points | Status |
|---|---|---|
| admin-service (moderation, fraud, analytics dashboard) | 13 | ✅ Done |
| notification-service (email + web push notifications) | 13 | ✅ Done |
| 232 unit tests, achieve 95%+ coverage across all services | 21 | ✅ Done |
| SonarQube quality scanning and quality gate setup | 5 | ✅ Done |
| Ansible playbooks: install-dependencies + deploy-app | 5 | ✅ Done |
| VPS deployment to DigitalOcean 209.38.199.108 | 8 | ✅ Done |
| **Total** | **65** | **All Done** |

**Retrospective:** notification-service coverage was 54% before dedicated Sprint 3 fix. The `capturedHandler` pattern for testing Redis event subscribers was the key breakthrough.

### 3.11.3 Conflict Resolution

**Technical Conflict — Jest Mock Leakage:**
When chat-service tests ran in sequence, mocked values from one test leaked into the next. Resolved by switching from `jest.clearAllMocks()` to `jest.resetAllMocks()` in `afterEach`, and explicitly restoring mock implementations.

**Infrastructure Conflict — k3s Traefik vs Nginx:**
k3s ships with Traefik ingress controller which bound port 80, conflicting with our Nginx installation. Resolved by serving the React frontend on port 4000 (not port 80), which was not claimed by Traefik.

## 3.12 Scrum Artifacts

### 3.12.1 Product Backlog

| ID | User Story | Priority | Points | Status |
|---|---|---|---|---|
| US-01 | As a student, I want to register with my university email so I can join the marketplace | Must | 8 | Done |
| US-02 | As a student, I want to log in with Google so I don't have to remember a password | Should | 5 | Done |
| US-03 | As a seller, I want to post a listing with photos so buyers can see what I'm selling | Must | 13 | Done |
| US-04 | As a buyer, I want to see an AI price suggestion so I know if the price is fair | Must | 13 | Done |
| US-05 | As a buyer, I want to see a fraud warning so I know if a listing looks suspicious | Must | 8 | Done |
| US-06 | As a user, I want to chat in real-time with the seller so I can negotiate directly | Must | 13 | Done |
| US-07 | As a user, I want push notifications so I don't miss offers or messages | Should | 8 | Done |
| US-08 | As an admin, I want to suspend abusive accounts to keep the platform safe | Must | 8 | Done |
| US-09 | As a user, I want to search listings by keyword so I can find things quickly | Should | 8 | Done |
| US-10 | As a user, I want to save items to a wishlist so I can track things I might buy | Could | 5 | Done |
| US-11 | As a seller, I want my listings to expire after 30 days to keep inventory fresh | Should | 5 | Done |
| US-12 | As a user, I want to view the team's About page to know who built the platform | Could | 3 | Done |

### 3.12.2 Sprint Plan and Burndown Summary

| Sprint | Planned Points | Completed Points | Completion % |
|---|---|---|---|
| Sprint 1 (Foundation) | 39 | 39 | 100% |
| Sprint 2 (Core + DevOps) | 68 | 68 | 100% |
| Sprint 3 (Admin + QA + Deploy) | 65 | 65 | 100% |
| **Total** | **172** | **172** | **100%** |

## 3.13 Test Case Document

| Test ID | Service | Description | Input | Expected | Result |
|---|---|---|---|---|---|
| TC-001 | auth-service | Register with valid data | `{email, password, first_name, last_name}` | 201 + userId | ✅ Pass |
| TC-002 | auth-service | Register duplicate email | Existing email | 409 Conflict | ✅ Pass |
| TC-003 | auth-service | Login correct credentials | Correct password | 200 + JWT token | ✅ Pass |
| TC-004 | auth-service | Login wrong password | Wrong password | 401 Unauthorized | ✅ Pass |
| TC-005 | auth-service | Access protected route no token | No Authorization header | 401 Unauthorized | ✅ Pass |
| TC-006 | auth-service | Google OAuth flow | Valid Google ID token | 200 + JWT | ✅ Pass |
| TC-007 | listing-service | Create listing authenticated | Valid JWT + listing data | 201 + listingId | ✅ Pass |
| TC-008 | listing-service | Create listing no auth | No JWT | 401 Unauthorized | ✅ Pass |
| TC-009 | listing-service | Get listings with filter | `?category=Electronics` | Filtered array | ✅ Pass |
| TC-010 | listing-service | View deduplication | Same user views same listing twice in 1 hour | Views +1, not +2 | ✅ Pass |
| TC-011 | listing-service | Make offer valid | JWT + `{amount_fcfa: 5000}` | 201 + offerId | ✅ Pass |
| TC-012 | listing-service | Accept offer | Seller JWT + offerId | 200 + offer status=accepted | ✅ Pass |
| TC-013 | chat-service | Socket auth valid JWT | Valid JWT in socket handshake | Connected | ✅ Pass |
| TC-014 | chat-service | Socket auth invalid JWT | Bad JWT | Socket disconnected | ✅ Pass |
| TC-015 | chat-service | Send message | Valid message payload | 201 + message emitted to room | ✅ Pass |
| TC-016 | admin-service | Suspend user (admin) | Admin JWT + userId | 200 + event published | ✅ Pass |
| TC-017 | admin-service | Suspend user (non-admin) | User JWT + userId | 403 Forbidden | ✅ Pass |
| TC-018 | admin-service | Get fraud flags (admin) | Admin JWT | 200 + flags array | ✅ Pass |
| TC-019 | ai-service | Price suggestion Electronics | `{category: "Electronics", condition: "new"}` | 200 + `{suggestion, range}` | ✅ Pass |
| TC-020 | ai-service | Fraud check low price | price_fcfa = 50 (ref = 2000) | `{flagged: true, type: "low_price_flag"}` | ✅ Pass |
| TC-021 | ai-service | Fraud check high price | price_fcfa = 500000 (ref = 2000) | `{flagged: true, type: "high_price_flag"}` | ✅ Pass |
| TC-022 | notification-service | Welcome email event | Redis `welcome.email` event | Email queued via SMTP | ✅ Pass |
| TC-023 | user-service | Update profile | Valid fields + JWT | 200 + updated profile | ✅ Pass |
| TC-024 | user-service | Add to wishlist | JWT + listingId | 201 + wishlist entry | ✅ Pass |
| TC-025 | All services | Health check | GET /health | `{status: "ok"}` | ✅ Pass |

**Total: 232 automated tests — 232 Pass, 0 Fail — 95.89% average line coverage**

## 3.14 Materials and Technologies Used

| Technology | Version | Role |
|---|---|---|
| React | 18.3.1 | Frontend SPA framework |
| Vite | 5.4.21 | Frontend build tool and dev server |
| Tailwind CSS | 3.4.x | Utility-first CSS styling |
| React Router | 6.x | Client-side routing (31 pages) |
| Node.js | 20 LTS | Backend runtime for all 9 services |
| Express.js | 4.x | REST API framework |
| PostgreSQL | 16 | Relational database for persistent data |
| Redis | 7 | In-memory cache + Pub/Sub event bus |
| Socket.IO | 4.x | Real-time WebSocket chat |
| jsonwebtoken | 9.x | JWT creation and verification |
| bcryptjs | 2.x | Password hashing (12 salt rounds) |
| Helmet.js | 7.x | HTTP security headers |
| express-rate-limit | 7.x | Request rate limiting |
| multer | 1.x | Multipart image upload handling |
| web-push | 3.x | W3C Web Push API / VAPID |
| prom-client | 15.x | Prometheus metrics for Node.js |
| Jest | 29.x | Unit and integration testing |
| Supertest | 6.x | HTTP endpoint testing |
| Docker | 29.5.3 | Containerisation |
| Docker Compose | 5.1.4 | Multi-container orchestration |
| Kubernetes / k3s | v1.35.5 | Container orchestration + HPA |
| Nginx | 1.24 | Reverse proxy + static file serving |
| Jenkins | LTS + JDK21 | CI/CD automation server |
| SonarQube | Community Edition | Static code analysis and coverage |
| sonar-scanner | 5.0.1 | SonarQube analysis CLI |
| Prometheus | latest | Metrics collection (15s scrape) |
| Grafana | 11.4.0 | Metrics visualisation dashboards |
| Ansible | 2.x | Infrastructure as Code (IaC) |
| GitHub | — | Source control + webhook trigger |
| DigitalOcean | FRA1 | Cloud VPS provider (Ubuntu 24.04) |

---

# CHAPTER FOUR: RESULTS AND DISCUSSIONS

## 4.1 Infrastructure Setup

The production VPS was provisioned on DigitalOcean in the Frankfurt (FRA1) region with the following specifications:

| Resource | Detail |
|---|---|
| Provider | DigitalOcean |
| Plan | ubuntu-s-4vcpu-8gb-fra1-01 |
| IP Address | 209.38.199.108 |
| Operating System | Ubuntu 24.04.3 LTS |
| CPU | 4 vCPUs |
| Memory | 8 GB RAM |
| Storage | 160 GB NVMe SSD |
| Network | 4 TB transfer bandwidth |

**Installed Software Stack:**
- Docker Engine 29.5.3 + Docker Compose 5.1.4
- Kubernetes k3s v1.35.5 (single-node cluster)
- Node.js 20 LTS (for frontend builds)
- Nginx 1.24 (frontend static file server on port 4000)
- UFW Firewall (ports 22, 80, 443, 4000, 8080, 8090, 9000, 9090, 3009 open)

**Firewall Configuration:**
```
Port 22   — SSH access
Port 4000 — Frontend (React app via Nginx)
Port 8080 — API Gateway
Port 8090 — Jenkins CI/CD
Port 9000 — SonarQube code quality
Port 9090 — Prometheus metrics
Port 3009 — Grafana monitoring
Port 6379 — Redis (internal only)
Port 5432 — PostgreSQL (internal only)
```

## 4.2 Docker and Kubernetes Orchestration

### Docker Compose (Production Live Demo)

All 15 containers run under Docker Compose from `/opt/campustrade/campusmarket/backend/docker-compose.yml`:

```
NAMES                            PORTS
backend-api-gateway-1            0.0.0.0:8080->3000/tcp
backend-auth-service-1           0.0.0.0:3001->3001/tcp
backend-user-service-1           0.0.0.0:3002->3002/tcp
backend-listing-service-1        0.0.0.0:3003->3003/tcp
backend-chat-service-1           0.0.0.0:3004->3004/tcp
backend-admin-service-1          0.0.0.0:3005->3005/tcp
backend-ai-service-1             0.0.0.0:3006->3006/tcp
backend-search-service-1         0.0.0.0:3007->3007/tcp
backend-notification-service-1   0.0.0.0:3008->3008/tcp
backend-postgres-1               0.0.0.0:5432->5432/tcp
backend-redis-1                  0.0.0.0:6379->6379/tcp
backend-prometheus-1             0.0.0.0:9090->9090/tcp
backend-grafana-1                0.0.0.0:3009->3000/tcp
campustrade-jenkins              0.0.0.0:8090->8080/tcp
campustrade-sonarqube            0.0.0.0:9000->9000/tcp
```

### Kubernetes Cluster Status

The k3s single-node cluster runs all 9 services as Kubernetes Deployments:

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

| HPA Name | Min Pods | Max Pods | CPU Target | Current |
|---|---|---|---|---|
| api-gateway-hpa | 2 | 10 | 60% | 2 |
| auth-service-hpa | 2 | 6 | 70% | 2 |
| listing-service-hpa | 2 | 8 | 60% | 1 |
| search-service-hpa | 2 | 6 | 60% | 1 |
| user-service-hpa | 2 | 5 | 70% | 1 |

## 4.3 Jenkins CI/CD Pipeline

**Jenkins:** http://209.38.199.108:8090  
**Pipeline:** CampusTrade-Pipeline (triggered by GitHub webhook on every `git push`)

| Stage | Description | Typical Duration |
|---|---|---|
| 1. Checkout | Clone latest code from GitHub (main branch) | 8s |
| 2. Install Dependencies | `npm ci` for frontend + 6 backend services (parallel) | 45s |
| 3. Lint | ESLint check on all service files | 12s |
| 4. Run Tests | Jest with coverage for all 6 services | 90s |
| 5. Generate Coverage | `lcov.info` report generation per service | 5s |
| 6. SonarQube Analysis | sonar-scanner for all services + frontend | 60s |
| 7. Quality Gate | Wait for SonarQube quality gate pass (≥85%) | 20s |
| 8. Build Docker Images | `docker build` for all 9 services | 180s |
| 9. Push to Docker Hub | `docker push praisesn/<service>:latest` | 120s |
| 10. Deploy to K8s | `kubectl apply` all manifests + rolling restart | 30s |
| 11. Smoke Test | `curl /health` on all services + `kubectl get pods` | 15s |
| **Total** | **Full pipeline duration** | **~10 minutes** |

**GitHub Webhook Setup:**
- Payload URL: `http://209.38.199.108:8090/github-webhook/`
- Content type: `application/json`
- Trigger: Push events to `main` branch

## 4.4 Prometheus and Grafana Monitoring

**Prometheus:** http://209.38.199.108:9090  
**Grafana:** http://209.38.199.108:3009 (admin / campustrade123)

All 9 services expose `/metrics` using `prom-client`. Prometheus scrapes every 15 seconds.

**Key Metrics Collected per Service:**

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | Counter | Total HTTP requests by route, method, status |
| `http_request_duration_seconds` | Histogram | Response time distribution |
| `nodejs_heap_size_used_bytes` | Gauge | JavaScript heap memory usage |
| `process_cpu_seconds_total` | Counter | CPU time consumed |
| `nodejs_active_handles_total` | Gauge | Active network connections |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop latency (performance indicator) |

**Grafana Dashboard Panels:**
- HTTP Request Rate per Service (requests/min graph)
- 95th Percentile Response Time per Service
- Node.js Heap Memory per Service
- CPU Usage per Service
- Total Active Connections
- Service Health Status (up/down indicator)

## 4.5 Ansible Infrastructure as Code

Two Ansible playbooks automate the complete server setup and deployment:

**Playbook 1: `install-dependencies.yml`**
Tasks: Update apt, install Docker + Docker Compose, install Node.js 20, install Nginx, configure UFW firewall, configure Nginx reverse proxy, install k3s Kubernetes.

**Playbook 2: `deploy-app.yml`**
Tasks: Create `/opt/campustrade` directory, clone/pull GitHub repository, copy production `.env` file (mode 0600), wait for PostgreSQL readiness, run `docker compose up -d --build`, start monitoring stack, run smoke tests (`curl /health`), reload Nginx.

**Inventory (`hosts.ini`):**
```ini
[campustrade_servers]
campustrade-prod ansible_host=209.38.199.108
                  ansible_user=root
                  ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

**Run commands:**
```bash
ansible-playbook -i ansible/hosts.ini ansible/install-dependencies.yml
ansible-playbook -i ansible/hosts.ini ansible/deploy-app.yml
```

## 4.6 API Request and Response Evidence

**POST /api/auth/register**
```json
Request:
{
  "email": "student@ictuniversity.edu.cm",
  "password": "SecurePass123",
  "first_name": "Praises",
  "last_name": "Ncha"
}

Response 201:
{
  "message": "Registration successful",
  "userId": "a3b2c1d0-e5f6-7890-abcd-ef1234567890"
}
```

**POST /api/listings (Create Listing)**
```json
Request Headers: Authorization: Bearer <JWT>
Request Body:
{
  "title": "Casio Scientific Calculator",
  "description": "FX-991EX, perfect for engineering students",
  "category": "Electronics",
  "price_fcfa": 12000,
  "condition": "like new",
  "campus_zone": "Computer Lab"
}

Response 201:
{
  "message": "Listing created",
  "listingId": "b4c3d2e1-f6a7-8901-bcde-f12345678901"
}
```

**GET /api/admin/listing-flags/:id (Fraud Check Result)**
```json
Response 200:
{
  "flagged": true,
  "flags": [
    {
      "id": "c5d4e3f2-a7b8-9012-cdef-123456789012",
      "type": "low_price_flag",
      "rule": "Price is only 14% of market reference for Liquid Soap (ref: 2,000 FCFA) — suspiciously low",
      "created_at": "2026-06-06T01:30:00.000Z"
    }
  ]
}
```

## 4.7 Application Scenario Screenshots

The live application demonstrates the following flows accessible at **http://209.38.199.108:4000**:

1. **Home Page** — Landing page with featured listings, categories, and stats (verified users, active listings, total transactions)
2. **Browse Page** — Grid of all active listings with sidebar category filter and sort options
3. **Create Listing** — Form with AI price suggestion widget showing fair price range
4. **Listing Detail** — Full listing view with fraud warning banner (red) when AI flags suspicious price
5. **Chat** — Real-time messaging interface with read receipts between buyer and seller
6. **Admin Dashboard** — Statistics, user management, fraud flags with resolution workflow
7. **About Page** — Team profiles showing Praises Ncha (Scrum Master) and Kongyu Jesse Ntani (Product Owner)
8. **Jenkins Pipeline** — 9-stage pipeline view with build history and console output
9. **SonarQube Dashboard** — Code quality report showing 95%+ coverage, 0 critical issues, quality gate PASSED
10. **Grafana Dashboard** — Real-time metrics for all 9 services with HTTP request rates and response times

## 4.8 Discussion of Architecture Characteristics

### Fault Tolerance (Chaos Engineering)

The system demonstrates fault tolerance by design. Stopping any single service container does not affect the others. This was tested by running `docker stop backend-auth-service-1` — the marketplace browsing, chat, and admin functions continued operating normally. Only login/registration was temporarily unavailable. This is the **Chaos Monkey principle** applied to microservices.

### Scalability

Kubernetes Horizontal Pod Autoscaler (HPA) was configured for all critical services. Under simulated load (Apache JMeter), the api-gateway scaled from 2 pods to 4 pods when CPU exceeded 60%, demonstrating elastic horizontal scaling.

### Security

- All passwords hashed with bcrypt (12 salt rounds — 2^12 = 4,096 hashing iterations)
- JWT tokens expire after 24 hours (configurable)
- All SQL queries use parameterised statements (no SQL injection possible)
- Helmet.js sets 12 security-related HTTP headers (XSS protection, HSTS, frame options, etc.)
- Rate limiting prevents brute force on auth endpoints

## 4.9 Pros and Cons of the Chosen Architecture

### Pros

| Advantage | Detail |
|---|---|
| **Independent scaling** | listing-service can scale to 8 pods during peak hours without affecting chat-service |
| **Fault isolation** | If ai-service crashes, users can still browse and buy; only price suggestions become unavailable |
| **Independent deployment** | A bug in notification-service can be fixed and redeployed without touching any other service |
| **Technology flexibility** | Each service could use a different language/database if the team's needs evolve |
| **Developer productivity** | In a larger team, each service can be owned by a dedicated developer without merge conflicts |

### Cons

| Disadvantage | Mitigation Used |
|---|---|
| **Distributed system complexity** | Centralised structured logging (Winston), Prometheus monitoring, correlation IDs |
| **Network latency between services** | Redis caching for frequent queries; kept critical paths to 1–2 service hops |
| **Eventual consistency** | Acceptable for read-heavy marketplace use case; critical writes (transactions) are synchronous |
| **Operational overhead** | Ansible IaC automates provisioning; Jenkins CI/CD automates deployment; Docker Compose simplifies local dev |
| **Testing complexity** | Jest mocks for Redis and PostgreSQL; isolated service tests; shared test utilities |

---

# CHAPTER FIVE: RECOMMENDATIONS, CHALLENGES AND CONCLUSION

## 5.1 Recommendations

Based on the experience building and deploying CampusTrade, the following improvements are recommended for future iterations:

1. **HTTPS/SSL** — Implement Let's Encrypt certificates via cert-manager on Kubernetes to encrypt all traffic. This requires a registered domain name pointing to the VPS IP (e.g., campustrade.cm). Without HTTPS, browser push notifications are blocked on some browsers.

2. **Mobile Money Payment Integration** — Integrate MTN Mobile Money and Orange Money APIs (dominant payment methods in Cameroon) to enable in-app escrow transactions. This would complete the full marketplace transaction lifecycle without requiring in-person cash exchange.

3. **Machine Learning Pricing** — Migrate from the rule-based price suggestion (condition factor × category average) to a trained regression model (Random Forest or Gradient Boosting) that learns from completed transactions. As the dataset grows, this would give significantly more accurate price ranges.

4. **Email Verification Enforcement** — Re-enable mandatory email verification before users can post listings. Currently disabled for demo purposes, but it prevents spam accounts and ensures seller accountability.

5. **CDN for Images** — Move listing image storage from local VPS storage to a CDN (Cloudflare R2 or AWS S3) to reduce VPS storage costs and improve image load times across Cameroon.

6. **Multi-campus Expansion** — Parameterise the campus zone system to support multiple universities. Other campuses in Cameroon (University of Buea, University of Yaoundé) could deploy their own instances.

## 5.2 Challenges

| Challenge | Description | Resolution |
|---|---|---|
| Jest Mock Leakage | Mocked Redis/PostgreSQL values from one test leaked into subsequent tests, causing cascading failures | Switched from `clearAllMocks()` to `resetAllMocks()` + explicit `mockImplementation()` restore in `afterEach` |
| k3s vs Nginx Port Conflict | k3s Traefik ingress controller bound to port 80, conflicting with Nginx frontend server | Moved React frontend to port 4000 (free from Kubernetes service ports) |
| VAPID Key Configuration | Web Push VAPID keys not available in K8s secrets during first deployment; push notifications silently failed | Generated VAPID keys with `web-push generate-vapid-keys`; patched K8s secret and deployment env vars |
| Docker Image Name Mismatch | Kubernetes manifests referenced `campustrade/<service>` but Docker Hub images were pushed as `praisesn/<service>` | Corrected all 9 K8s YAML deployment files to use correct Docker Hub username |
| Notification Test Coverage 54% | notification-service event handlers were never called in tests because Redis subscriptions happen inside `init()` | Implemented `capturedHandler` pattern: mock Redis `subscribe` to capture the callback, call it directly in tests |
| Grafana Crash Loop | Grafana v12 broke Prometheus plugin provisioning — container kept restarting | Pinned Grafana image to v11.4.0; removed conflicting env variables |
| Bracketed Paste Mode on VPS | Terminal added `^[[200~` prefix when pasting commands, breaking variable assignments | Wrote commands to temp files with `cat > /tmp/script.sh << 'EOF'` and executed with `bash /tmp/script.sh` |
| SonarQube Empty Dashboard | Pipeline ran without valid sonarqube-token so analysis results were rejected by SonarQube server | Generated token via SonarQube UI → added to Jenkins credentials with ID `sonarqube-token` → re-ran pipeline |

## 5.3 Conclusion

CampusTrade successfully demonstrates a complete, production-grade software architecture implementation following all requirements of the SEN3244 course. The system delivers:

- A **live microservices application** accessible at http://209.38.199.108:4000 with 9 independently running services
- A **Jenkins CI/CD pipeline** that automatically tests, analyses, builds, and deploys on every GitHub push
- **95.89% test coverage** across 232 automated tests, verified by SonarQube (exceeds 85% minimum)
- **Kubernetes orchestration** with Horizontal Pod Autoscaling running on a live DigitalOcean VPS
- **Prometheus + Grafana monitoring** with real-time metrics dashboards for all 9 services
- **Ansible Infrastructure as Code** playbooks for automated server provisioning and deployment
- **Event-Driven Architecture** using Redis Pub/Sub for asynchronous service communication
- **AI-powered fraud detection** flagging suspicious listings with visible warnings to users

The development applied Scrum methodology across three two-week sprints, iteratively delivering features from the foundation (authentication, listings) through core features (chat, AI pricing, DevOps) to production hardening (admin moderation, push notifications, VPS deployment, 95%+ test coverage).

The most valuable architectural insight gained from this project is that the complexity of microservices is justified only when the system genuinely benefits from independent scalability and fault isolation. For CampusTrade — with its distinct domains of authentication, marketplace, chat, AI, and admin — the microservices boundary gave clear benefits in fault tolerance (demonstrated through Chaos Monkey testing) and independent deployment (all 9 services can be updated separately without downtime).

---

# APPENDIX A: DIAGRAM DESIGN PROMPTS

## Use Case Diagram

```
                     CAMPUSTRADE USE CASE DIAGRAM
                     ============================

         ┌─────────────────────────────────────────────────────┐
         │                   CAMPUSTRADE SYSTEM                  │
         │                                                        │
         │   ┌─────────────────┐    ┌──────────────────────┐   │
         │   │  Authentication  │    │     Marketplace       │   │
         │   │                  │    │                        │   │
         │   │ ◯ Register       │    │ ◯ Browse Listings      │   │
         │   │ ◯ Login          │    │ ◯ Search Listings      │   │
         │   │ ◯ Google OAuth   │    │ ◯ View Listing Detail  │   │
         │   │ ◯ Reset Password │    │ ◯ Create Listing       │   │
         │   └─────────────────┘    │ ◯ Edit/Delete Listing  │   │
         │                           │ ◯ Upload Images        │   │
         │                           │ ◯ Make Offer           │   │
[Student]──────────────────────────→│ ◯ Accept/Decline Offer │   │
[User]   │                           │ ◯ Add to Wishlist      │   │
         │                           └──────────────────────┘   │
         │                                                        │
         │   ┌─────────────────┐    ┌──────────────────────┐   │
         │   │  Communication   │    │   AI & Fraud          │   │
         │   │                  │    │                        │   │
         │   │ ◯ Send Message   │    │ ◯ Get Price Suggestion │   │
         │   │ ◯ Read Messages  │    │ ◯ View Fraud Warning   │   │
         │   │ ◯ View Chat Hist │    │ ◯ Report Listing       │   │
         │   │ ◯ Push Notify    │    └──────────────────────┘   │
         │   │ ◯ Email Notify   │                                 │
         │   └─────────────────┘                                 │
         │                                                        │
         │   ┌──────────────────────────────────────────────┐   │
         │   │             Admin Management                   │   │
         │   │                                                │   │
[Admin]──────│──→ ◯ View Dashboard Statistics                │   │
[User]   │   │    ◯ Manage Users (Suspend/Activate)          │   │
         │   │    ◯ Remove Listings                           │   │
         │   │    ◯ Review Fraud Flags                        │   │
         │   │    ◯ Resolve Reports                           │   │
         │   └──────────────────────────────────────────────┘   │
         │                                                        │
         │   ┌────────────────────────────────────────────┐     │
         │   │            System (Automated)               │     │
[System] ────│──→ ◯ Auto-Expire Listings (30 days)         │     │
         │   │    ◯ Send Welcome Email                       │     │
         │   │    ◯ Flag Suspicious Prices (AI)              │     │
         │   │    ◯ Deduplicate View Counts                   │     │
         │   └────────────────────────────────────────────┘     │
         └─────────────────────────────────────────────────────┘

ACTORS:
  [Student/User]  — Any registered student of ICT University
  [Admin User]    — Platform administrator (role = 'admin')
  [System]        — Automated background processes
```

## Class Diagram

```
                    CAMPUSTRADE CLASS DIAGRAM
                    =========================

┌──────────────────────────┐
│          User             │
├──────────────────────────┤
│ - id: UUID               │
│ - email: String          │
│ - passwordHash: String   │
│ - firstName: String      │
│ - lastName: String       │
│ - role: String           │ ← 'user' | 'admin'
│ - isVerified: Boolean    │
│ - isSuspended: Boolean   │
│ - avatarUrl: String      │
│ - campusZone: String     │
│ - createdAt: DateTime    │
├──────────────────────────┤
│ + register()             │
│ + login()                │
│ + updateProfile()        │
│ + suspend()              │
│ + generateJWT()          │
└──────────┬───────────────┘
           │ 1
           │ posts many
           │ *
┌──────────▼───────────────┐        ┌──────────────────────────┐
│         Listing           │        │          Offer            │
├──────────────────────────┤        ├──────────────────────────┤
│ - id: UUID               │        │ - id: UUID               │
│ - sellerId: UUID (FK)    │        │ - listingId: UUID (FK)   │
│ - title: String          │        │ - buyerId: UUID (FK)     │
│ - description: String    │        │ - amountFCFA: Integer    │
│ - category: String       │        │ - status: String         │ ← 'pending'|'accepted'|'declined'
│ - priceFCFA: Integer     │        │ - createdAt: DateTime    │
│ - condition: String      │        ├──────────────────────────┤
│ - campusZone: String     │◄───────│ + makeOffer()            │
│ - status: String         │ 1    * │ + accept()               │
│ - views: Integer         │        │ + decline()              │
│ - images: String[]       │        └──────────────────────────┘
│ - tags: String[]         │
│ - createdAt: DateTime    │        ┌──────────────────────────┐
│ - expiresAt: DateTime    │        │       Transaction         │
├──────────────────────────┤        ├──────────────────────────┤
│ + create()               │        │ - id: UUID               │
│ + update()               │        │ - listingId: UUID (FK)   │
│ + delete()               │        │ - buyerId: UUID (FK)     │
│ + incrementView()        │◄───────│ - sellerId: UUID (FK)    │
│ + expire()               │ 1    1 │ - finalPrice: Integer    │
│ + uploadImage()          │        │ - completedAt: DateTime  │
└──────────┬───────────────┘        ├──────────────────────────┤
           │ 1                      │ + complete()             │
           │ has many               └──────────────────────────┘
           │ *
┌──────────▼───────────────┐        ┌──────────────────────────┐
│        FraudFlag          │        │       Conversation        │
├──────────────────────────┤        ├──────────────────────────┤
│ - id: UUID               │        │ - id: UUID               │
│ - listingId: UUID (FK)   │        │ - buyerId: UUID (FK)     │
│ - sellerId: UUID (FK)    │        │ - sellerId: UUID (FK)    │
│ - type: String           │        │ - listingId: UUID (FK)   │
│ - rule: String           │        │ - createdAt: DateTime    │
│ - resolved: Boolean      │        ├──────────────────────────┤
│ - createdAt: DateTime    │        │ + start()                │
├──────────────────────────┤        │ + getHistory()           │
│ + flag()                 │        └──────────┬───────────────┘
│ + resolve()              │                   │ 1
└──────────────────────────┘                   │ has many
                                               │ *
                                    ┌──────────▼───────────────┐
┌──────────────────────────┐        │         Message           │
│       Wishlist            │        ├──────────────────────────┤
├──────────────────────────┤        │ - id: UUID               │
│ - id: UUID               │        │ - conversationId: UUID   │
│ - userId: UUID (FK)      │        │ - senderId: UUID (FK)    │
│ - listingId: UUID (FK)   │        │ - content: String        │
│ - addedAt: DateTime      │        │ - isRead: Boolean        │
├──────────────────────────┤        │ - createdAt: DateTime    │
│ + add()                  │        ├──────────────────────────┤
│ + remove()               │        │ + send()                 │
│ + getAll()               │        │ + markRead()             │
└──────────────────────────┘        └──────────────────────────┘

SERVICE CLASSES:
┌──────────────────────────┐        ┌──────────────────────────┐
│        AIService          │        │    NotificationService    │
├──────────────────────────┤        ├──────────────────────────┤
│ - categoryMinPrices: Map │        │ - smtpTransporter        │
│ - conditionFactors: Map  │        │ - vapidKeys: Object      │
├──────────────────────────┤        ├──────────────────────────┤
│ + getPriceSuggestion()   │        │ + sendEmail()            │
│ + runFraudCheck()        │        │ + sendPushNotification() │
│ + getTrendingListings()  │        │ + subscribe()            │
│ + getCategoryAvgPrice()  │        │ + handleEvent()          │
└──────────────────────────┘        └──────────────────────────┘
```

## Sequence Diagram

### Sequence Diagram 1: User Registration and Welcome Email

```
  Student     Frontend    API-Gateway  Auth-Service  PostgreSQL    Redis       Notification-Service   SMTP
    │            │              │            │             │          │                │                │
    │ Fill form  │              │            │             │          │                │                │
    │──────────→│              │            │             │          │                │                │
    │           │ POST /register│            │             │          │                │                │
    │           │──────────────→            │             │          │                │                │
    │           │              │ POST /auth/register       │          │                │                │
    │           │              │───────────→│             │          │                │                │
    │           │              │            │ Check email │          │                │                │
    │           │              │            │─────────────→          │                │                │
    │           │              │            │ Email free  │          │                │                │
    │           │              │            │←─────────────          │                │                │
    │           │              │            │ INSERT user │          │                │                │
    │           │              │            │─────────────→          │                │                │
    │           │              │            │ userId      │          │                │                │
    │           │              │            │←─────────────          │                │                │
    │           │              │            │ PUBLISH welcome.email  │                │                │
    │           │              │            │──────────────────────→ │                │                │
    │           │              │            │                         │ welcome.email event             │
    │           │              │            │                         │────────────────→               │
    │           │              │            │                         │                │ sendEmail()   │
    │           │              │            │                         │                │──────────────→│
    │           │              │            │ 201 + userId            │                │               │
    │           │              │←───────────│                         │                │               │
    │           │ 201 success  │            │                         │                │               │
    │           │←─────────────             │                         │                │               │
    │ Redirect  │              │            │                         │                │               │
    │←──────────│              │            │                         │                │               │
```

### Sequence Diagram 2: Create Listing with AI Fraud Check

```
  Seller      Frontend    API-Gateway  Listing-Service  AI-Service   Redis    Admin-Service  PostgreSQL
    │            │              │              │              │          │            │            │
    │ Fill form  │              │              │              │          │            │            │
    │──────────→│              │              │              │          │            │            │
    │           │ POST /listings│              │              │          │            │            │
    │           │──────────────→              │              │          │            │            │
    │           │              │ POST /listings│              │          │            │            │
    │           │              │─────────────→│              │          │            │            │
    │           │              │              │ INSERT listing│          │            │            │
    │           │              │              │──────────────────────────────────────────────────→
    │           │              │              │ listingId    │          │            │            │
    │           │              │              │←──────────────────────────────────────────────────
    │           │              │              │ PUBLISH listing.created │            │            │
    │           │              │              │──────────────────────→ │            │            │
    │           │              │              │              │ subscribe listing.event             │
    │           │              │              │              │ getCategoryAvgPrice(category)       │
    │           │              │              │              │←────────│            │            │
    │           │              │              │              │ Check price vs refPrice             │
    │           │              │              │              │          │            │            │
    │           │              │              │              │ price < 60% refPrice               │
    │           │              │              │              │ PUBLISH audit.low_price_flag       │
    │           │              │              │              │──────────────────────→│            │
    │           │              │              │              │          │ INSERT fraud_flag       │
    │           │              │              │              │          │────────────────────────→
    │           │              │              │ 201 + listingId         │            │            │
    │           │              │←─────────────│              │          │            │            │
    │           │ Show listing │              │              │          │            │            │
    │           │←─────────────              │              │          │            │            │
    │ Redirect  │              │              │              │          │            │            │
    │←──────────│              │              │              │          │            │            │
```

### Sequence Diagram 3: Real-Time Chat Flow

```
  Buyer       Frontend    API-Gateway   Chat-Service    PostgreSQL    Seller
    │            │              │              │              │          │
    │ Click Chat │              │              │              │          │
    │──────────→│              │              │              │          │
    │           │ POST /conversations           │              │          │
    │           │──────────────→              │              │          │
    │           │              │ POST /conversations           │          │
    │           │              │─────────────→│              │          │
    │           │              │              │ Find/Create conversation │
    │           │              │              │──────────────→          │
    │           │              │              │ conversationId│          │
    │           │              │              │←──────────────          │
    │           │              │ conversationId│              │          │
    │           │              │←─────────────│              │          │
    │           │ Redirect /chat/:id           │              │          │
    │           │←─────────────              │              │          │
    │           │              │              │              │          │
    │           │ WS Connect (JWT in handshake)│              │          │
    │           │──────────────────────────→  │              │          │
    │           │              │              │ Verify JWT   │          │
    │           │              │              │ Join room(conversationId)│
    │           │              │              │              │          │
    │           │──────────────────────────→  │              │          │
    │           │ Emit send_message event      │              │          │
    │           │              │              │ INSERT message│          │
    │           │              │              │──────────────→          │
    │           │              │              │ Emit receive_message to room
    │           │              │              │──────────────────────────→
    │           │              │              │              │ Receive  │
    │           │              │              │              │ message  │
    │           │              │              │              │          │
```

### Sequence Diagram 4: Buyer Makes Offer → Seller Accepts → Both Notified

```
  Buyer       Frontend    API-Gateway  Listing-Service   Redis (Pub/Sub)  Notification-Service  Seller
    │            │              │              │                │                  │               │
    │ Click Offer│              │              │                │                  │               │
    │──────────→│              │              │                │                  │               │
    │           │ POST /listings/:id/offers    │                │                  │               │
    │           │──────────────→              │                │                  │               │
    │           │              │ POST /offers │                │                  │               │
    │           │              │─────────────→│                │                  │               │
    │           │              │              │ INSERT offer → PostgreSQL          │               │
    │           │              │              │ PUBLISH offer.created              │               │
    │           │              │              │───────────────→│                  │               │
    │           │              │              │                │ offer.created event               │
    │           │              │              │                │──────────────────→               │
    │           │              │              │                │                  │ sendPush(seller)
    │           │              │              │                │                  │──────────────→│
    │           │              │              │                │                  │ "New offer    │
    │           │              │ 201 + offerId│                │                  │  received!"   │
    │           │              │←─────────────│                │                  │               │
    │           │ Show success │              │                │                  │               │
    │←──────────│              │              │                │                  │               │
    │           │              │              │                │                  │               │
    │           │              │      ─ ─ Seller reviews offer in dashboard ─ ─  │               │
    │           │              │              │                │                  │               │
    │           │              │              │  PUT /offers/:offerId/accept       │               │
    │           │              │──────────────────────────────→│                  │               │
    │           │              │              │ UPDATE offer status = 'accepted'   │               │
    │           │              │              │ UPDATE listing status = 'sold'     │               │
    │           │              │              │ INSERT transaction                 │               │
    │           │              │              │ PUBLISH offer.accepted             │               │
    │           │              │              │───────────────→│                  │               │
    │           │              │              │                │ offer.accepted event              │
    │           │              │              │                │──────────────────→               │
    │           │              │              │                │                  │ sendPush(buyer)│
    │           │              │              │                │                  │──────────────→│
    │           │              │              │                │                  │ "Offer        │
    │←─────────────── push notification ────────────────────────────────────────────── accepted!"│
    │           │              │ 200 + offer  │                │                  │               │
    │           │              │←─────────────│                │                  │               │
    │           │ Toast: "Offer│              │                │                  │               │
    │           │  accepted"   │              │                │                  │               │
    │←──────────│              │              │                │                  │               │
```

### Sequence Diagram 5: Admin Resolves Fraud Flag

```
  Admin       Frontend    API-Gateway  Admin-Service   PostgreSQL    Redis (Pub/Sub)  Listing-Service
    │            │              │              │              │               │               │
    │ Open Admin │              │              │              │               │               │
    │──────────→│              │              │              │               │               │
    │           │ GET /admin/fraud-flags        │              │               │               │
    │           │──────────────→              │              │               │               │
    │           │              │ GET /flags   │              │               │               │
    │           │              │─────────────→│              │               │               │
    │           │              │              │ SELECT fraud_flags WHERE resolved=false       │
    │           │              │              │──────────────→               │               │
    │           │              │              │ flags array  │               │               │
    │           │              │              │←──────────────               │               │
    │           │              │ 200 + flags  │              │               │               │
    │           │              │←─────────────│              │               │               │
    │           │ Show flags   │              │              │               │               │
    │←──────────│              │              │              │               │               │
    │           │              │              │              │               │               │
    │ Click Resolve             │              │              │               │               │
    │──────────→│              │              │              │               │               │
    │           │ PUT /admin/fraud-flags/:id/resolve          │               │               │
    │           │──────────────→              │              │               │               │
    │           │              │─────────────→│              │               │               │
    │           │              │              │ UPDATE fraud_flags SET resolved=true          │
    │           │              │              │──────────────→               │               │
    │           │              │              │ PUBLISH listing.unflagged     │               │
    │           │              │              │───────────────────────────────→              │
    │           │              │              │              │               │ UPDATE listing │
    │           │              │              │              │               │ (optional tag) │
    │           │              │ 200 OK       │              │               │               │
    │           │              │←─────────────│              │               │               │
    │           │ Flag resolved│              │              │               │               │
    │←──────────│              │              │              │               │               │
```

---

## Prompt 1: System Context Diagram
Draw a System Context Diagram (C4 Level 1) showing CampusTrade in the centre with external actors: Student/User, Admin, Google OAuth provider, SMTP Email Server, and Web Push notification endpoints. Show directional arrows indicating the type of interaction (browse/buy/sell, moderate, OAuth token, send email, push notification).

## Prompt 2: Container Diagram
Draw a Container Diagram (C4 Level 2) with the React SPA, API Gateway, 9 microservices (auth, user, listing, chat, admin, ai, search, notification, api-gateway), PostgreSQL database, Redis cache/message broker, Nginx, Prometheus, and Grafana. Use distinct boxes for each container with technology labels. Show synchronous HTTP arrows and asynchronous Redis Pub/Sub event arrows in different colours/styles.

## Prompt 3: Backend Component Diagram
Draw a Component Diagram (C4 Level 3) for the backend showing the shared modules (db.js, events.js, authMiddleware.js, logger.js, metrics.js, validate.js, errorHandler.js) and how each microservice depends on them. Show the event publishing from listing-service → Redis → ai-service → Redis → admin-service chain.

## Prompt 4: Deployment Diagram
Draw a UML Deployment Diagram showing: DigitalOcean Droplet (209.38.199.108) as the execution node, with Docker Engine running 15 containers grouped into: Backend Stack, DevOps Stack (Jenkins + SonarQube), and Monitoring Stack (Prometheus + Grafana). Show k3s Kubernetes as a separate layer. Show the client browser connecting over HTTP to Nginx on port 4000.

## Prompt 5: Entity Relationship Diagram with Cardinalities
Draw a full ERD with crow's foot notation showing: users, listings, offers, transactions, messages, conversations, wishlist, fraud_flags, push_subscriptions, and reports tables. Include all foreign key relationships with correct cardinalities (one-to-many, many-to-many via junction tables).

## Prompt 6: Listing Publication Sequence Diagram
Draw a UML Sequence Diagram for the "Create Listing with AI Fraud Detection" flow. Participants: Seller Browser, React Frontend, API Gateway, Listing Service, PostgreSQL, Redis (Pub/Sub), AI Service, Admin Service. Show the synchronous path for listing creation and the asynchronous event path for fraud checking.

## Prompt 7: Offer, Chat, and Notification Sequence Diagram
Draw a UML Sequence Diagram for the "Buyer Makes Offer → Seller Accepts → Both Notified" flow. Show WebSocket events for chat, REST API calls for offer creation/acceptance, and Redis Pub/Sub events triggering push notifications to both parties.

## Prompt 8: CI/CD and Monitoring Diagram
Draw a pipeline diagram showing: Developer pushes to GitHub → GitHub webhook → Jenkins → Install Deps → Lint → Test (Jest) → SonarQube Quality Gate → Build Docker Images → Push Docker Hub → Deploy K8s → Smoke Test → All services emit /metrics → Prometheus scrapes → Grafana dashboards.

## Prompt 9: Infrastructure Diagram
Draw a cloud infrastructure diagram showing: DigitalOcean Droplet with UFW firewall, internal Docker network (bridge), k3s cluster with namespaces, Nginx reverse proxy on port 4000, and the external internet accessing different ports. Include the GitHub repository and Docker Hub registry as external systems.

## Prompt 10: Scrum Burndown Chart
Draw a Sprint Burndown Chart for Sprint 2 (68 story points over 10 working days). Show the ideal burndown line (straight diagonal from 68 to 0) and the actual burndown line showing: Day 1: 68pts, Day 2: 60pts, Day 3: 52pts, Day 4: 45pts, Day 5: 38pts, Day 6: 28pts, Day 7: 20pts, Day 8: 12pts, Day 9: 5pts, Day 10: 0pts.

---

# APPENDIX B: SAMPLE CONFIGURATION AND COMMANDS

## B.1 Example Dockerfile Pattern

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
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1
CMD ["node", "server.js"]
```

## B.2 Example Jenkinsfile Outline

```groovy
pipeline {
  agent any
  environment {
    SONAR_HOST_URL = 'http://sonarqube:9000'
    DOCKER_HUB = 'praisesn'
  }
  stages {
    stage('Checkout')         { steps { checkout scm } }
    stage('Install Deps')     { steps { sh 'npm ci' } }
    stage('Run Tests')        { steps { sh 'npm test -- --coverage' } }
    stage('SonarQube')        { steps { sh 'sonar-scanner' } }
    stage('Quality Gate')     { steps { waitForQualityGate abortPipeline: true } }
    stage('Build Images')     { steps { sh 'docker compose build' } }
    stage('Push Images')      { steps { sh 'docker compose push' } }
    stage('Deploy K8s')       { steps { sh 'kubectl apply -f k8s/' } }
    stage('Smoke Test')       { steps { sh 'curl -f http://localhost:8080/health' } }
  }
}
```

## B.3 Example Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: campustrade
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

## B.4 Example Prometheus Alert Rules

```yaml
groups:
- name: campustrade-alerts
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.job }} is down"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate on {{ $labels.job }}"
```

## B.5 Key VPS Commands Reference

```bash
# Connect to VPS
ssh root@209.38.199.108

# Pull latest code
cd /opt/campustrade && git pull

# Rebuild and deploy backend
cd campusmarket/backend && docker compose up -d --build

# Rebuild and deploy frontend
cd campusmarket/frontend && npm run build && cp -r dist/* /var/www/html/ && nginx -s reload

# View all container statuses
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View logs of a service
docker logs backend-ai-service-1 --tail 50

# Re-run fraud detection on existing listings
docker exec backend-postgres-1 psql -U campustrade -d campustrade \
  -c "SELECT id, category, price_fcfa FROM listings WHERE status='active'"

# Check all Kubernetes pods
kubectl get pods -n campustrade

# View autoscalers
kubectl get hpa -n campustrade

# Access PostgreSQL
docker exec -it backend-postgres-1 psql -U campustrade -d campustrade

# Trigger Jenkins build manually
CRUMB=$(curl -s "http://admin:nkinyam2023@localhost:8090/crumbIssuer/api/json" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['crumb'])")
curl -X POST "http://admin:nkinyam2023@localhost:8090/job/CampusTrade-Pipeline/build" \
  -H "Jenkins-Crumb: $CRUMB"
```

---

*Document prepared for SEN3244 Software Architecture — Spring 2026*
*ICT University — Faculty of Information and Communication Technologies*
*Instructor: Engr. TEKOH PALMA*

**Authors:**
- Praises Ncha — nkinyampraises.ncha@ictuniversity.edu.cm — Scrum Master
- Kongyu Jesse Ntani — ICTU20234195 — Product Owner

**GitHub:** https://github.com/Nkinyampraises/smart-campus-market
**Live App:** http://209.38.199.108:4000
