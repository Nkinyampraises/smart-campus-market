# VPS deployment and observability evidence

## Production endpoint

- Application: `http://4.168.192.5`
- API health: `http://4.168.192.5/health`
- API documentation: `http://4.168.192.5/api/docs`
- OpenAPI contract: `http://4.168.192.5/api/docs/openapi.yaml`

The administrative services are deployed on the VPS but intentionally bind to loopback rather than the public network.

```bash
ssh -i campusmarket-test-key.pem \
  -L 8080:127.0.0.1:8080 \
  -L 3009:127.0.0.1:3009 \
  -L 9090:127.0.0.1:9090 \
  -L 9000:127.0.0.1:9000 \
  azureuser@4.168.192.5
```

After the tunnel is open:

- Jenkins: `http://127.0.0.1:8080`
- Grafana: `http://127.0.0.1:3009`
- Prometheus: `http://127.0.0.1:9090`
- SonarQube: `http://127.0.0.1:9000`

## Verified VPS inventory

| Item | Production value |
|---|---|
| Host | `campusmarket-test-vm` |
| Operating system | Ubuntu 24.04.4 LTS |
| CPU / RAM | 4 logical CPUs / 15 GiB |
| Kubernetes | K3s v1.36.1+k3s1 |
| Container runtime | containerd 2.2.3-k3s1 and Docker 29.1.3 |
| CI server | Jenkins with Pipeline, Git, and Credentials plugins |
| Code quality | SonarQube Community 26.7.0.124771 |
| Metrics | Prometheus 3.12.0 and node-exporter 1.11.1 |
| Dashboards | Grafana 13.0.2 |

## Kubernetes work tree

```text
campustrade (Pod Security: baseline)
├── edge
│   ├── frontend Deployment (2 replicas, HPA, PDB)
│   ├── api-gateway Deployment (2 replicas, HPA, PDB)
│   └── Traefik Ingress routes
├── services
│   ├── auth-service
│   ├── user-service
│   ├── listing-service
│   ├── chat-service
│   ├── admin-service
│   ├── ai-service
│   ├── search-service
│   └── notification-service
└── data
    ├── PostgreSQL StatefulSet + 10 GiB PVC
    └── Redis StatefulSet + 2 GiB PVC

campustrade-observability (isolated privileged monitoring namespace)
├── Prometheus Deployment + 5 GiB PVC
├── Grafana Deployment + 2 GiB PVC
└── node-exporter DaemonSet

host system services / protected Compose project
├── Jenkins (127.0.0.1:8080)
├── SonarQube (127.0.0.1:9000)
└── SonarQube PostgreSQL
```

## Cutover record

1. The reviewed source was transferred to the VPS without its local `.env`.
2. Ansible installed a checksum-pinned K3s binary, sysctls, groups, directories, and restricted Jenkins sudo rules.
3. The new PostgreSQL and Redis StatefulSets were started without stopping the existing Compose system.
4. Ten application images were built on the VPS and imported into K3s using immutable tag `exam-20260714`.
5. A custom-format PostgreSQL dump was written under `/srv/campustrade/backups/`.
6. The dump was restored into the K3s PostgreSQL PVC.
7. Compose application containers were stopped without deleting their volumes.
8. Kubernetes applications were rolled out and probed.
9. The first rollout stopped on readiness rather than falsely reporting success. Numeric container identities and environment precedence were corrected.
10. All application deployments, monitoring workloads, and public smoke tests passed.
11. SonarQube was started, its default password was replaced, and its Jenkins token was stored as an encrypted Jenkins credential.
12. Local Sonar containers and volumes were deleted and Docker Desktop was stopped.

## Current verified state

| Evidence | Result |
|---|---|
| Jenkins release | Build 24, `SUCCESS` |
| Deployed source | Commit `64bb3654ed23172b8dfdddac6db69a68ffdad6a1` |
| Immutable image tag | `64bb3654ed23` on all 10 application deployments |
| Automated tests | 310/310 passed on the VPS |
| Aggregate coverage | 92.59% statements, 80.28% branches, 80.60% functions, 95.56% lines |
| SonarQube quality gate | `OK`; zero open vulnerabilities at analysis time |
| Dependency audits | Zero reported vulnerabilities in all nine backend production dependency trees |
| Container scans | All 10 production images passed the Trivy `CRITICAL` gate |
| K3s node | Ready, control-plane |
| Application deployments | 10/10 available |
| Frontend replicas | 2/2 ready |
| API gateway replicas | 2/2 ready |
| Stateful workloads | PostgreSQL 1/1, Redis 1/1 |
| Prometheus targets | 11/11 up |
| Grafana health | UP |
| SonarQube health | UP |
| Public API | `status: ok` |

The destructive clean rebuild was revalidated on 15 July 2026. Its immutable
machine evidence is stored under
`/srv/campustrade/evidence/clean-rebuild-final-20260715T002951Z`; every Jenkins
build also archives its own evidence under
`/var/lib/jenkins/workspace/campustrade-ci/evidence/build-<number>`. The protected
files `/srv/campustrade/shared/clean-rebuild-commit` and
`/srv/campustrade/shared/clean-rebuild-completed-at` identify the accepted release
without putting source-control metadata in the production release directory.

The repository's 37-image Android and dashboard evidence catalog is documented
in `../evidence/screenshots/README.md`.

## Ansible evidence commands

```bash
cd /home/azureuser/campusmarket
ANSIBLE_CONFIG=ansible/ansible.cfg \
  ansible-playbook ansible/playbooks/provision-vps.yml

ANSIBLE_CONFIG=ansible/ansible.cfg \
  ansible-playbook ansible/playbooks/deploy-platform.yml \
  -e deployment_mode=full \
  -e image_tag=<verified-commit>
```

The provisioning play completed with 18 tasks, zero failures, and a Ready K3s node. The deployment play synchronizes reviewed source, preserves the protected environment, builds/imports images, applies the requested deployment mode, and prints resource status.

## Rollback

The accepted clean-rebuild topology has no legacy Compose application stack to
fall back to. Roll back by redeploying a previously accepted immutable Git
commit through Jenkins; restore PostgreSQL from the corresponding protected VPS
backup when a schema or data rollback is required. The clean-rebuild guard never
deletes paths outside its explicit CampusTrade allowlist.

## Network security

The public VPS exposes the application through ports 80/443 and SSH through port 22. Jenkins, Grafana, Prometheus, and SonarQube bind to VPS loopback. K3s requires UFW to remain disabled for overlay networking, so perimeter exposure is controlled by the Azure network security group and by avoiding public host listeners for administration services. The application namespace enforces the baseline Pod Security standard; host-level metrics are isolated into a separate observability namespace.
