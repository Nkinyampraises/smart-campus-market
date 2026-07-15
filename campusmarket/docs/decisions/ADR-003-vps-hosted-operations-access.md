# ADR-003: VPS-hosted operations access

## Status

Accepted

## Date

2026-07-15

## Context

CampusTrade must not depend on workstation processes. The previous access model
kept operational services on the VPS but required local SSH port-forward
listeners. That was secure, but it did not meet the explicit requirement that
every usable interface be deployed and reachable on the VPS itself.

## Decision

Keep Jenkins, SonarQube, Grafana, and Prometheus upstream ports private. Publish
four distinct `sslip.io` hostnames through the VPS Traefik ingress and terminate
TLS at the edge. Jenkins, SonarQube, and Grafana retain native authentication.
Protect Prometheus with Traefik BasicAuth because it has no native interactive
login. Generate the BasicAuth secret from the protected production environment
during every deployment; never store a password or password hash in Git.

Jenkins and SonarQube continue to bind to loopback. A minimal non-root,
read-only Nginx pod uses the VPS host network to proxy only those two services
to Traefik. Grafana and Prometheus remain ordinary Kubernetes services. No
workstation tunnel or local listener is part of the production architecture.

The Azure perimeter currently permits port 80 but not port 443. Traefik therefore
serves TLS on public port 80 and ACME manages the certificates. The public URLs
include `:80` until the Azure network security group admits port 443.

## Consequences

- Operators can use every interface from its VPS URL without starting software locally.
- Native service ports remain unavailable from the public network.
- Prometheus metrics require an additional edge credential.
- The nonstandard TLS port must remain documented until Azure port 443 is opened.
- Jenkins smoke tests reject a release if any VPS dashboard route is unavailable.
