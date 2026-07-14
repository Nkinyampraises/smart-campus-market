# CampusTrade test and quality report

## Release decision

The backend release gate passes with **306 automated tests** across nine independently deployable services. Aggregate coverage is **92.49% statements, 80.14% branches, 80.30% functions, and 95.49% lines**, satisfying the project requirement that test coverage be at least 80%.

## Test strategy

| Level | Scope | Examples |
|---|---|---|
| Unit | Validation, middleware, algorithms, handlers | JWT attachment, price factors, trend scoring, input rules |
| Integration | Real Express applications with mocked infrastructure boundaries | Auth, listing, search, offers, notifications, moderation |
| Contract | Gateway route-to-service mapping and OpenAPI publication | All service prefixes, `/api/docs/openapi.yaml` |
| Security | Common abuse cases | Invalid/tampered JWT, brute force, hostile CORS origin, authorization |
| Deployment | Runtime health and service discovery | K3s probes, public API smoke, Prometheus targets |
| Resilience | Failure containment and lifecycle | Redis/init failure, DB failure, push cleanup, graceful shutdown |

## Coverage by service

| Service | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| API gateway | 82.10% | 62.74% | 58.82% | 84.88% |
| Authentication | 95.65% | 85.71% | 80.95% | 98.29% |
| User | 87.50% | 69.69% | 71.42% | 93.00% |
| Listing | 92.30% | 85.89% | 75.00% | 94.77% |
| Chat | 92.53% | 79.76% | 88.00% | 96.59% |
| Administration | 93.49% | 71.87% | 78.26% | 97.34% |
| AI assistance | 94.87% | 76.25% | 85.00% | 97.18% |
| Search | 95.32% | 92.30% | 90.00% | 96.59% |
| Notification | 93.00% | 84.28% | 88.00% | 95.58% |
| **Aggregate** | **92.49%** | **80.14%** | **80.30%** | **95.49%** |

The API gateway has lower function coverage because production-only process-signal and proxy error callbacks are deliberately excluded from destructive test invocation. Its user-visible routes, security headers, rate limits, CORS policy, request IDs, JWT behavior, service routing, and operational endpoints are covered. The aggregate gate remains fail-closed across all four metrics.

## Important quality correction

Earlier AI and search tests constructed test-only applications. Those tests could pass even if the production server changed. The services now export their production Express applications and explicit initialization/shutdown functions. Tests import those implementations directly, exercise real routes and event subscriptions, and cover failure containment. This is the strongest evidence that reported coverage corresponds to deployed behavior.

## Commands and reports

```bash
npm run install:backend
npm run build:backend
npm run test:backend
npm run coverage:backend
npm run audit:backend
```

The coverage runner writes:

- `coverage/summary.json` — machine-readable aggregate and per-service results.
- `coverage/index.html` — examiner-friendly report.
- `coverage/services/<service>/lcov.info` — SonarQube-compatible detail.

Jenkins archives these reports and blocks deployment when any aggregate metric is below 80%.

## Production acceptance checks

| Check | Expected | Verified result |
|---|---|---|
| Public frontend | HTTP 200 | Pass |
| Gateway health | JSON `status: ok` | Pass |
| Public statistics API | HTTP 200 JSON | Pass |
| K3s application deployments | All available | Pass |
| PostgreSQL and Redis | StatefulSets ready | Pass |
| Prometheus scrape targets | 11/11 up | Pass |
| Grafana health | `database: ok` | Pass |
| SonarQube status | `UP` | Pass |
| Jenkins service | Active | Pass |

## Security test coverage

- Authentication routes use a stricter rate limit and return 429 after the threshold.
- Tampered JWTs are never trusted by the gateway.
- Unauthorized origins are rejected by CORS.
- Protected service routes enforce authentication and ownership/role authorization.
- Error handlers return generic messages instead of database or credential details.
- SQL access uses parameter arrays rather than concatenating user values.
- Production containers run without privilege escalation; application containers use numeric non-root identities.
- Administrative tools bind to VPS loopback and are reached through SSH tunnelling.

## Residual risks

The cluster is intentionally single-node because the exam scope provides one VPS; PodDisruptionBudgets and multiple edge replicas protect rolling updates but cannot survive total VM failure. TLS requires a project domain and certificate automation to replace the current IP-based HTTP endpoint. These are documented recommendations rather than hidden limitations.
