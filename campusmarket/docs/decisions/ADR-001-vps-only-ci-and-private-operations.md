# ADR-001: VPS-only CI and private operations interfaces

## Status

Superseded by ADR-003

## Date

2026-07-14

## Context

CampusTrade must demonstrate an online, production-like architecture without
depending on a developer workstation. Jenkins, SonarQube, Prometheus, and
Grafana contain privileged operational information and should not be exposed
directly to the public internet.

## Decision

Run application workloads, data services, CI tests, coverage, code analysis,
container scanning, monitoring, and deployment on the Azure VPS. Expose only
the CampusTrade HTTP application publicly. Bind or route operational tools to
VPS loopback and access them through authenticated accounts over SSH tunnels.
Store human credentials in a root-only VPS file and machine credentials in
protected service stores.

Jenkins executes Jest tests and coverage on the VPS. SonarQube imports and
displays those results, analyzes the source, and blocks releases through its
quality gate. SonarQube is not treated as a replacement test runner.

## Alternatives considered

### Run qualification tests on the workstation

Rejected because results would depend on local state and would not prove the
deployed CI environment.

### Publish every dashboard on the VPS public interface

Rejected because it increases the attack surface and exposes sensitive system
metadata. SSH tunnels provide access without additional public listeners.

### Give every system one shared password

Rejected because a single disclosure would compromise every control plane.
Passwords are independently generated for each human account.

## Consequences

- A release is accepted only after the VPS Jenkins/SonarQube pipeline is green.
- Operators need the SSH key and the root-readable credential vault.
- Dashboard access requires an SSH tunnel.
- The VPS needs enough capacity for K3s, Jenkins, SonarQube, tests, and builds.
- Operational recovery is documented in the platform operations runbook.
