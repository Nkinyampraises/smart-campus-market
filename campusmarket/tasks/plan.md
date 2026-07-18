# Implementation Plan: Claude AI and ICT University Identity Policy

## Outcome

Deploy a production-safe CampusTrade release that uses Anthropic Claude for
on-demand listing price guidance, accepts only `@ictuniversity.edu.cm`
application identities, migrates all existing users without losing related
data, refreshes durable demonstration data, and leaves Jenkins, SonarQube,
Kubernetes, monitoring, and the application healthy on the VPS.

## Safety and Architecture Decisions

- Perform all runtime tests, database work, builds, SonarQube analysis, and
  deployments on the VPS. The local workspace is source editing only.
- Use two ordered releases. First ship and execute the backward-compatible
  identity/seed migration. Only then deploy strict domain enforcement.
- Update users in place so UUID-backed listings, messages, roles, password
  hashes, and transactions remain intact. Back up PostgreSQL and the protected
  credential file before migration.
- Store the Anthropic key only in a root-protected VPS file and a dedicated
  Kubernetes Secret mounted by `ai-service`; never place it in Git, logs,
  screenshots, the shared application Secret, or other pods.
- Keep deterministic market calculations as the numerical guardrail. Claude
  produces a bounded explanation from sanitized category, condition, and price
  aggregates. Claude is never the authority for fraud enforcement or SQL.
- Invoke Claude only through an explicit UI action, with rate limiting, a short
  timeout, bounded retries/output, response validation, and honest failure UI.
- Refresh the Jenkins production file credential whenever canonical protected
  configuration changes, so a later pipeline cannot restore stale settings.
- Restart components in dependency order with readiness checks; do not perform
  an uncoordinated full outage.

## Delivery Phases

### Phase 1: Backward-compatible migration release

- [ ] Add failing VPS tests for exact domain normalization, identity migration,
  durable seeds, and active/search-index invariants.
- [ ] Add an idempotent university-email migration that creates a root-only
  audit mapping, updates known credential emails atomically, and preserves all
  user relationships.
- [ ] Change new operator and seed defaults to the ICT University domain.
- [ ] Add at least three completed Electronics comparisons, long-lived demo
  expiries, images, and matching search-index records.
- [ ] Pass targeted VPS tests, full Jenkins/SonarQube gates, review, commit, and
  deploy the migration release.
- [ ] Back up production, execute migration, reseed, and verify all application
  users are normalized ICT University accounts before enforcement.

### Phase 2: Strict authentication and Claude release

- [ ] Add failing VPS tests for backend, Google OAuth, event-consumer, database,
  gateway, and frontend acceptance behavior.
- [ ] Enforce the exact university domain across registration, login, recovery,
  Google OAuth, user events, and database constraints; fix normalized login
  responses and client guidance.
- [ ] Implement a validated Claude client and protected price-guidance endpoint,
  rate limiting, timeout/error handling, and configuration health metadata.
- [ ] Connect both listing creation journeys to an explicit “Ask Claude” action
  with accessible loading, success, unavailable, and retry states.
- [ ] Create a dedicated AI-provider Kubernetes Secret and update environment,
  deploy, smoke-test, and operations contracts without exposing the key.
- [ ] Pass targeted VPS tests, complete Jenkins/SonarQube/security gates, code
  review, commit, and deploy.

### Phase 3: Production acceptance

- [ ] Verify university registration/login/recovery and Google-domain rejection.
- [ ] Run an authenticated Claude canary and verify provider/model metadata,
  bounded output, seed-backed comparisons, and rate-limit behavior.
- [ ] Run seed verification twice to prove idempotency and zero search drift.
- [ ] Perform controlled Kubernetes/service restarts and verify rollouts,
  database/Redis persistence, Prometheus targets, Grafana, Jenkins, SonarQube,
  public routes, and application health.
- [ ] Confirm the Git worktree, GitHub main branch, deployed revision, and
  production evidence are synchronized with no local runtime services.

## Acceptance Criteria

- Every `users.email` is lowercase, normalized, unique, and ends exactly in
  `@ictuniversity.edu.cm`; no old-domain or Gmail application account remains.
- Existing user IDs, roles, password hashes, and relationship counts are
  unchanged by migration, except for intentional new seed records.
- External-domain registration/login and Google OAuth fail before password or
  database work; university accounts and operator credentials still work.
- Price guidance makes a real Anthropic request from `ai-service`, returns
  validated FCFA guidance and a short Claude explanation, and fails clearly
  without mislabeling a deterministic fallback as Claude.
- Only the AI pod can read the Anthropic key, and secret scans/log inspection
  find no committed or printed key material.
- Jenkins is green, SonarQube quality gate passes, smoke/seed/canary checks pass,
  and all production links and monitoring targets are healthy after restart.

## Rollback

- Restore the protected credential backup and database snapshot if migration
  verification fails before strict enforcement.
- Keep the previous immutable application images and Kubernetes revisions; use
  `kubectl rollout undo` per deployment if the second release fails.
- Remove only the dedicated AI Secret and roll back `ai-service` if Claude
  integration fails; authentication and marketplace data remain independent.
