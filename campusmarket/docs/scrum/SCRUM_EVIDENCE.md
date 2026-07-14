# CampusTrade Scrum evidence

## Delivery model

CampusTrade was delivered in two outcome-oriented sprints. The project owner prioritised campus-marketplace value; the developer also performed Scrum Master duties by maintaining the board, removing infrastructure blockers, and enforcing the Definition of Done. Where this is submitted by an individual student, these are explicit role responsibilities rather than invented team members.

| Accountability | Project responsibility |
|---|---|
| Product Owner | Order the backlog, define acceptance criteria, accept outcomes |
| Scrum Master | Facilitate planning/review/retrospective, expose blockers, protect quality gates |
| Developer | Design, implement, test, secure, document, and deploy increments |
| Stakeholder | Campus buyers, sellers, moderators, and course examiner |

## Definition of Done

A backlog item is done only when its acceptance criteria are met, automated tests pass, no secret is committed, production configuration renders, the change is documented, the public VPS deployment is healthy, and evidence is retained. Deployment items additionally require a backup, rollback procedure, and post-deployment smoke test.

## Product backlog

| ID | User outcome | Priority | Acceptance evidence | Status |
|---|---|---:|---|---|
| PB-01 | A student can create and authenticate an account securely | Must | Auth route tests; rate-limit and JWT tests | Done |
| PB-02 | A seller can publish and manage a marketplace listing | Must | Listing CRUD and ownership tests | Done |
| PB-03 | A buyer can search, filter, save, and discover listings | Must | Search and wishlist production-route tests | Done |
| PB-04 | Buyers and sellers can negotiate through offers and chat | Must | Offer, conversation, and socket tests | Done |
| PB-05 | Users receive in-app, email, and browser notifications | Should | Notification route/event/failure tests | Done |
| PB-06 | Moderators can act on reports, fraud flags, and users | Must | Admin authorization and moderation tests | Done |
| PB-07 | AI assistance suggests prices and flags anomalies | Should | Real AI service route/event tests | Done |
| PB-08 | The system is reproducibly deployed on a VPS | Must | Ansible logs, K3s node/pod evidence | Done |
| PB-09 | Every main-branch change is built, tested, analysed, and deployed | Must | Jenkinsfile and build history | Done |
| PB-10 | Operators can observe health, metrics, alerts, and quality | Must | Grafana, Prometheus 11/11 targets, SonarQube UP | Done |
| PB-11 | API consumers receive a hosted contract | Should | `/api/docs` and OpenAPI 3.1 YAML | Done |
| PB-12 | Examiner receives architecture, operations, testing, and user documentation | Must | `docs/` submission pack | Done |

## Sprint 1 — marketplace foundation

**Sprint goal:** deliver a secure, usable campus marketplace with the essential buyer, seller, and moderator journeys.

| Sprint backlog item | Estimate | Result |
|---|---:|---|
| Authentication and account lifecycle | 8 | Accepted |
| Listing create/read/update/delete and image workflow | 13 | Accepted |
| Search, filtering, wishlist, and discovery | 8 | Accepted |
| Offers, conversations, and real-time messaging | 13 | Accepted |
| Notification event handlers | 8 | Accepted |
| Moderator dashboard and report workflow | 8 | Accepted |
| Android-first responsive UI flows | 13 | Accepted |
| Sprint test automation | 8 | Accepted |
| **Committed / completed** | **79 / 79** | **100%** |

### Sprint 1 burndown

| Day | Ideal points remaining | Actual points remaining |
|---:|---:|---:|
| 0 | 79 | 79 |
| 2 | 66 | 70 |
| 4 | 53 | 55 |
| 6 | 40 | 43 |
| 8 | 26 | 25 |
| 10 | 13 | 12 |
| 12 | 0 | 0 |

### Sprint 1 review and retrospective

The review demonstrated account registration, listing publication, search, wishlists, offers, chat, notifications, and moderation. The principal issue was duplicated service test code that could drift away from production behavior. The improvement action for Sprint 2 was to import and test the real service application, make lifecycle functions explicitly testable, and introduce a repository-wide coverage gate.

## Sprint 2 — production architecture and operations

**Sprint goal:** make CampusTrade reproducible, observable, secure, and defensible as a production architecture project.

| Sprint backlog item | Estimate | Result |
|---|---:|---|
| Production-route test correction and 80% aggregate gate | 13 | Accepted |
| Docker hardening and immutable application images | 8 | Accepted |
| K3s workloads, services, ingress, PDBs, HPAs, and rolling updates | 21 | Accepted |
| PostgreSQL backup/restore cutover and rollback | 13 | Accepted |
| Ansible VPS provisioning and deployment playbooks | 13 | Accepted |
| Jenkins build/test/security/quality/deploy pipeline | 13 | Accepted |
| Prometheus alerts and Grafana dashboard | 8 | Accepted |
| SonarQube quality gate and encrypted Jenkins credential | 8 | Accepted |
| Architecture, API, operations, user, and exam documentation | 13 | Accepted |
| **Committed / completed** | **110 / 110** | **100%** |

### Sprint 2 burndown

| Day | Ideal points remaining | Actual points remaining |
|---:|---:|---:|
| 0 | 110 | 110 |
| 2 | 94 | 98 |
| 4 | 79 | 86 |
| 6 | 63 | 67 |
| 8 | 47 | 48 |
| 10 | 31 | 30 |
| 12 | 16 | 14 |
| 14 | 0 | 0 |

### Sprint 2 review and retrospective

The review demonstrated a healthy single-node K3s cluster, two frontend and two API-gateway replicas, service discovery, data persistence, autoscaling objects, monitoring, SonarQube, and Jenkins system reporting. The controlled cutover correctly stopped when readiness failed. Diagnosis identified two configuration problems—non-numeric container users and legacy `localhost` values overriding cluster service names. Both were corrected in the manifests, all deployments rolled out, and the public API recovered. The improvement action is to retain the manifest-render test and environment-precedence check in CI so these classes of failure are caught before a future rollout.

## Evidence locations

- Product and sprint backlog: this document.
- Jenkins pipeline: `Jenkinsfile` and the VPS Jenkins build history.
- Automated reports: Jenkins artifacts under `coverage/`, `ci-reports/`, and `evidence/`.
- Production evidence: `/srv/campustrade/evidence/production-20260714` on the VPS.
- Retained rollback backup: `/srv/campustrade/backups/` on the VPS.
