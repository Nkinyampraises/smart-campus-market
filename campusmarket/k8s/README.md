# CampusTrade K3s deployment

The production application runs in the `campustrade` namespace on the Azure VPS.
K3s provides Kubernetes scheduling, DNS-based service discovery, rolling
updates, metrics-server, Traefik ingress, and local-path persistent storage.

## Workloads

- Two frontend and two API-gateway replicas with HPAs and disruption budgets.
- Eight bounded-context backend Deployments.
- PostgreSQL and Redis StatefulSets with persistent volumes.
- Prometheus, Grafana, and node exporter with provisioned configuration.
- Public Traefik ingress for `/`, `/api`, `/health`, and `/socket.io`.

## Production sequence

The sequence is automated by Jenkins and the scripts in `k8s/scripts`:

1. Back up the existing PostgreSQL deployment.
2. Build and import immutable images into K3s containerd.
3. Start the Kubernetes data layer and restore the database.
4. Stop the Compose application without deleting its volumes.
5. Apply the full Kubernetes base and wait for every rollout.
6. Run public smoke tests and capture evidence.

Rollback scales Kubernetes workloads to zero and restarts the preserved Compose
deployment. Never remove Compose volumes until the Kubernetes backup and
restore have been independently verified.

## Administrative access

Grafana, Prometheus, Jenkins, and SonarQube bind only to VPS loopback ports and
are reached through the SSH tunnel documented in `backend/OPERATIONS.md`.
