# Implementation Plan: Clean VPS Rebuild and Production Seed Data

## Overview

Rebuild the CampusTrade platform from an empty application state on the Azure
VPS while preserving only the operating system, SSH access, and externally
managed integration values that cannot be recreated. The rebuild will rotate
internal secrets, reinstall Jenkins and its plugins, recreate SonarQube and K3s
state, run every code/test/coverage gate on the VPS, enforce the SonarQube
quality gate, deploy immutable images, and populate repeatable demonstration
users and image-backed marketplace data.

## Architecture Decisions

- GitHub `main` is the only source of application and infrastructure code.
- Jenkins on the VPS runs lint, tests, coverage, audits, SonarQube analysis,
  image builds, Trivy scans, K3s deployment, and production smoke tests.
- SonarQube analyzes Jenkins-produced coverage; it does not replace the test
  runner.
- Internal database, JWT, Grafana, Jenkins, SonarQube, and demo credentials are
  regenerated. External SMTP/OAuth values may be carried forward without being
  printed.
- Seed provisioning is idempotent and uses authenticated application APIs for
  credential-bearing users. Versioned, parameterized SQL creates deterministic
  marketplace and relational demonstration records after those users exist.
- Destructive reset requires an exact confirmation token and deletes only
  CampusTrade/Jenkins/SonarQube/K3s state, never SSH or the base operating system.

## Task List

### Phase 1: Rebuild foundation

- [x] Add fail-closed production secret generation and a reproducible Jenkins
  plugin manifest/bootstrap.
- [x] Add a guarded VPS reset/rebuild orchestrator with post-reset readiness
  checks.

### Checkpoint: Foundation

- [x] Shell syntax and manifest checks pass on the VPS.
- [ ] Current Jenkins/SonarQube pipeline validates the rebuild automation before
  destructive execution.

### Phase 2: Production seed slice

- [x] Add idempotent demo-account and marketplace seed provisioning.
- [x] Seed multiple sellers, buyers, listings, images, wishlists, offers,
  conversations, messages, reviews, transactions, notifications, and moderation
  examples.
- [x] Add remote verification for counts, image URLs, API visibility, login, and
  role correctness.

### Checkpoint: Seed data

- [x] Seed verification fails before provisioning on a clean database.
- [x] Seed provisioning succeeds twice without duplicates.
- [x] Public listing APIs return populated image-backed results.

### Phase 3: Destructive rebuild

- [ ] Stop active services and remove K3s, Jenkins, SonarQube, application,
  monitoring, Docker image/cache, and database state.
- [ ] Reinstall/reconfigure Jenkins, SonarQube, K3s, protected credentials, and
  the GitHub-backed pipeline from the clean state.
- [ ] Run the complete VPS-only Jenkins pipeline with SonarQube and deployment
  enabled.

### Phase 4: Production acceptance

- [ ] Provision operator accounts and production seed data.
- [ ] Verify application flows, all service health, Prometheus targets, Grafana,
  SonarQube, Jenkins, TLS assets, and public links.
- [ ] Capture fresh evidence, update the operations runbook, and leave Git and
  the VPS synchronized with no local runtime services.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Losing SSH access | Critical | Never modify SSH users, keys, port 22, or base networking |
| Rebuild cannot recreate CI | High | Validate plugin/bootstrap automation in the current VPS before wiping |
| Secret leakage | High | Root-only files, `no_log`, no credential output, and pre-commit secret scan |
| Seed duplication | Medium | Deterministic identities, conflict-safe operations, and a second-run test |
| Third-party image failure | Medium | Use fixed HTTPS image URLs already supported by the production UI |
| Destructive command targets wrong host | Critical | Require the expected public IP, deployment root, and exact confirmation token |

## Approval

The user's explicit request to delete the existing VPS platform state, rebuild it,
deploy it, and seed production data authorizes execution of this plan within the
guardrails above.
