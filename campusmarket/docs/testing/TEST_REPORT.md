# CampusTrade test and quality report

## Release decision

The backend release gate passes with **310 automated tests** across nine independently deployable services. Aggregate coverage is **92.59% statements, 80.28% branches, 80.60% functions, and 95.56% lines**, satisfying the project requirement that test coverage be at least 80%. Jenkins build 24 executed the tests on the VPS, SonarQube reported `QUALITY GATE STATUS: PASSED`, and only then did the pipeline proceed to production image creation.

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
| API gateway | 83.00% | 63.26% | 63.15% | 85.71% |
| Authentication | 95.67% | 85.71% | 80.95% | 98.30% |
| User and shared CORS policy | 88.70% | 71.79% | 75.00% | 93.75% |
| Listing | 92.34% | 85.89% | 75.00% | 94.80% |
| Chat | 92.57% | 79.76% | 88.00% | 96.61% |
| Administration | 93.54% | 71.87% | 78.26% | 97.36% |
| AI assistance | 94.90% | 76.25% | 85.00% | 97.20% |
| Search | 95.37% | 92.30% | 90.00% | 96.62% |
| Notification | 93.05% | 84.28% | 88.00% | 95.62% |
| **Aggregate** | **92.59%** | **80.28%** | **80.60%** | **95.56%** |

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

SonarQube imports the backend LCOV report, performs static analysis across the
backend, frontend, and operational scripts, and enforces the quality gate on the
VPS. The frontend is validated by its production compile, container smoke test,
and deployed-browser route suite rather than being misrepresented as Jest
coverage. At the build 24 analysis point, SonarQube reported zero open
vulnerabilities. Its pre-existing maintainability backlog remains visible in the
dashboard instead of being hidden from examiners.

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
- Administrative upstreams stay private and are reached through authenticated VPS TLS routes.

## Residual risks

The cluster is intentionally single-node because the exam scope provides one VPS; PodDisruptionBudgets and multiple edge replicas protect rolling updates but cannot survive total VM failure. TLS requires a project domain and certificate automation to replace the current IP-based HTTP endpoint. These are documented recommendations rather than hidden limitations.

SonarQube Community Build explicitly provides less advanced security analysis
than commercial editions. Its zero-open-vulnerability result is therefore one
layer, not a claim of exhaustive application-security proof. The release also
uses hostile-input/authentication tests, production dependency audits, non-root
container policies, secret scanning controls, and Trivy image scanning. A future
production budget should add a dedicated DAST/SAST security product and an
independent penetration test.
