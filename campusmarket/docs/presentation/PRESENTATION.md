% CampusTrade
% Software Architecture Project-Based Examination
% Spring 2026

# A trusted marketplace for campus life

- Buy, sell, discover, negotiate, and report in one campus context
- Production: `http://4.168.192.5`
- Nine backend capabilities behind one secured API gateway
- Deployed with K3s, Jenkins, Ansible, Prometheus, Grafana, and SonarQube

# Problem and users

**Problem**

- General marketplaces lack campus location, trust, and fast local discovery
- Negotiation and safety signals are fragmented
- Operators need evidence, not only working screens

**Users**

- Visitors and students
- Buyers and sellers
- Moderators and administrators
- DevOps/operator stakeholders

# Product capabilities

- Authentication, profiles, reviews, and transaction history
- Listings, images, campus zones, conditions, and wishlists
- Full-text search, suggestions, filters, and trending discovery
- Offers, counters, conversations, and real-time messages
- In-app/email/push notifications
- Reports, auto-hide rules, fraud flags, and moderation

# Innovation with human oversight

| Capability | Design |
|---|---|
| Price suggestion | Comparable transaction average × condition factor |
| Confidence | Comparable count plus ±10% price band |
| Fraud signals | Low/high price and seller spam-rate rules |
| Trending | Weighted views and recent wishlist intent |
| Similar listings | Category, condition, and price-band retrieval |

# Architecture

```text
Client → Traefik → Frontend / API Gateway
                         ↓
 Auth · User · Listing · Chat · Admin · AI · Search · Notification
                         ↓                 ↕
                    PostgreSQL          Redis
```

- API-gateway microservice architecture
- Event collaboration for notification, search indexing, and fraud workflows
- Shared relational store is a deliberate single-VPS trade-off

# Production Kubernetes topology

| Layer | Workloads |
|---|---|
| Edge | Frontend ×2, API gateway ×2, Traefik Ingress |
| Domain | Eight capability services |
| Data | PostgreSQL and Redis StatefulSets with PVCs |
| Reliability | Probes, resources, PDBs, HPAs, rolling updates |
| Observability | Prometheus, Grafana, node-exporter |

# Security architecture

- JWT authentication plus service-level role/ownership checks
- Allowlisted CORS, Helmet headers, request IDs, and rate limiting
- Parameterised SQL and generic production errors
- Numeric non-root application containers; privilege escalation disabled
- Baseline Pod Security for the application namespace
- Encrypted Jenkins credentials and protected VPS environment files
- Admin upstreams private and published through authenticated VPS TLS routes

# Ansible and reproducibility

**Provision playbook**

- Packages, kernel limits, groups, restricted Jenkins sudo rules
- Checksum-pinned K3s binary and systemd service
- Protected directories and readiness proof

**Deployment playbook**

- Reviewed source synchronisation
- Immutable image import
- Declarative rollout and evidence output

# Safe data cutover

1. Start K3s data StatefulSets while Compose remains live
2. Build ten application images on the VPS
3. Create timestamped custom PostgreSQL dump
4. Restore into the Kubernetes PVC
5. Stop Compose without deleting volumes
6. Roll out, probe, smoke-test, and mark cutover
7. Retain dump, volumes, and rollback script

# Jenkins CI/CD

```text
Checkout → Config validation → Frontend gate → Backend + coverage
→ SonarQube gate → Images → Trivy → K3s rollout → Smoke → Evidence
```

- Pipeline stored as `Jenkinsfile`
- GitHub polled every five minutes
- Main-branch production deploy only after every gate passes
- Artifacts: coverage, system information, documentation, deployment evidence

# Automated test result

| Metric | Aggregate |
|---|---:|
| Automated backend tests | 306 passing |
| Statements | 92.49% |
| Branches | 80.14% |
| Functions | 80.30% |
| Lines | 95.49% |

# Testing depth

- Real production Express applications—not test-only clones
- Unit, integration, contract, security, deployment, and resilience checks
- Tampered JWT, hostile CORS, brute-force rate limit, ownership, admin role
- Redis/DB/init failures, push cleanup, event handlers, graceful shutdown
- Hosted OpenAPI contract tested at `/api/docs/openapi.yaml`

# Observability

| Platform | Verified state |
|---|---|
| Prometheus | UP — 11/11 scrape targets |
| Grafana | UP — provisioned overview dashboard |
| node-exporter | Host CPU, memory, disk, load |
| SonarQube | UP — secured admin and Jenkins token |
| Jenkins report | K3s, platform health, host and build information |

# Scrum evidence

- Sprint 1: marketplace foundation — 79/79 points
- Sprint 2: production architecture — 110/110 points
- Product backlog, sprint backlogs, burndowns, reviews, retrospectives
- Definition of Done requires tests, security, documentation, deployment, evidence, rollback

Retrospective actions directly corrected production-route testing and deployment configuration precedence.

# Results and evidence

- Public application and API healthy on the VPS
- 10/10 application deployments available
- Frontend 2/2 and API gateway 2/2
- PostgreSQL and Redis persistent StatefulSets ready
- Prometheus 11/11, Grafana UP, SonarQube UP
- Evidence retained at `/srv/campustrade/evidence/production-20260714`
- OpenAPI, user, test, architecture, operations, and Scrum documentation complete

# Trade-offs and next steps

**Current trade-offs**

- One VPS cannot survive total host failure
- Shared database reduces cost but limits service data autonomy
- Redis pub/sub is non-durable

**Next steps**

- Domain + automated TLS
- Managed secrets and off-host backup/restore drill
- Multi-node Kubernetes
- Transactional outbox or durable broker

# Conclusion

CampusTrade is both a working marketplace and a production architecture project.

**Delivered:** Scrum + microservices + event workflows + security + 80% coverage + Docker + Ansible + Jenkins + Kubernetes + Prometheus/Grafana + SonarQube + API/user/operations documentation + rollback.

`http://4.168.192.5`
