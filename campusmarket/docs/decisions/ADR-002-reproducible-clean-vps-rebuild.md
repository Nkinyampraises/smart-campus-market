# ADR-002: Reproducible clean VPS rebuild and production seed

- Status: Accepted
- Date: 2026-07-14

## Context

CampusTrade must be recoverable without relying on configuration that exists
only on the current VPS. A destructive recovery also needs safeguards against
targeting the wrong host, leaking credentials, reinstalling an unsafe Jenkins
plugin graph, or leaving the rebuilt marketplace empty.

## Decision

GitHub `main` is the rebuild source of truth. A guarded root-run orchestrator
may delete only the allowlisted CampusTrade, Jenkins, K3s, SonarQube, Docker,
monitoring, and application data paths after both an exact confirmation token
and public-IP check pass. It does not change the operating system identity,
SSH configuration, deployment key, or base network access.

The rebuild generates new internal credentials, preserves only explicitly
external SMTP/OAuth settings, installs a checksum-verified Jenkins plugin
manager and fully pinned plugin closure, provisions K3s through Ansible, and
recreates SonarQube. Jenkins then runs tests and coverage on the VPS, submits
the results to SonarQube, enforces the quality gate, scans images, and deploys.

After a successful clean pipeline, credential-bearing demonstration users are
created through the application API. Parameterized, versioned SQL upserts a
deterministic marketplace data graph. A verifier checks identities, counts,
public API visibility, authentication, search, and remote image availability.
Running the seed repeatedly must not create duplicates.

## Consequences

- Recovery is slower than restoring an opaque VM snapshot, but is reviewable,
  repeatable, and exercises the real delivery path.
- Internal credentials rotate during every destructive rebuild; operators must
  retrieve the new values from the root-readable credential file.
- SonarQube remains the analysis and release-gate interface. Jenkins executes
  the actual tests because SonarQube is not a test runner.
- External image availability is an acceptance dependency for the seeded
  product gallery; the verifier fails if its representative image is missing.
