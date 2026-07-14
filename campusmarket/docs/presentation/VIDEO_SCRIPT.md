# CampusTrade seven-minute demonstration script

## Recording setup

Open the public application and an SSH tunnel for Jenkins, Grafana, Prometheus, and SonarQube. Use a 1920×1080 recording, keep browser zoom at 100%, hide credentials, and show the current production URLs rather than local development servers.

## 0:00–0:35 — Problem and outcome

“CampusTrade is a campus-focused marketplace for discovering, selling, negotiating, and moderating goods and services. The production system is running on an Azure VPS. In this demonstration I will show the user value, the architecture, the Kubernetes deployment, the automated pipeline, monitoring, code quality, and test evidence.”

Show the public home/explore screen and the browser address bar with `http://4.168.192.5`.

## 0:35–1:35 — Core user flow

Show registration/sign-in, marketplace search and filters, a listing detail screen, the sell flow, wishlist, offers, conversation, and notifications. Explain that owners alone can modify listings, buyers cannot offer on their own items, and messages are limited to conversation participants.

## 1:35–2:10 — Moderation and innovation

Show the administrator statistics/report/fraud views. Explain auto-hiding after repeated reports, human resolution of automated flags, history-based price suggestions, low/high-price flags, spam-rate flags, similar listings, and weighted trending discovery.

## 2:10–2:55 — Architecture

Open the architecture diagram. Explain the Traefik edge, two frontend and gateway replicas, nine backend capabilities, PostgreSQL consistency, Redis cache/events, and asynchronous notification/index/fraud workflows. State the trade-off: a shared database is economical for one VPS, while service and event boundaries allow later database ownership.

## 2:55–3:45 — Kubernetes and Ansible

Show `kubectl get nodes` and both namespaces. Show Deployments, StatefulSets, Services, Ingresses, HPAs, PDBs, and PVCs. Explain readiness/liveness/startup probes, requests/limits, numeric non-root users, rolling updates, DNS service discovery, persistent PostgreSQL/Redis, and the isolated observability namespace. Briefly open the two Ansible playbooks and the successful provisioning evidence.

## 3:45–4:35 — Jenkins CI/CD

Open the latest Jenkins build and stage graph. Walk through checkout, system information, configuration validation, frontend gate, backend gate, SonarQube quality gate, production image build, Trivy scan, K3s rollout, smoke checks, and archived evidence. Open `system-information.html` to show K3s, Grafana, Prometheus, SonarQube, host CPU, memory, disk, build, and commit information.

## 4:35–5:25 — Monitoring and code quality

Open Grafana and show the overview dashboard. Open Prometheus targets and show 11/11 `UP`; briefly show alert rules. Open SonarQube and show project analysis/quality status. Mention that all administrative tools are bound to VPS loopback and reached through an SSH tunnel.

## 5:25–6:10 — Testing

Open the Jenkins coverage artifact. State: “The backend has 306 passing tests. Aggregate coverage is 92.49% statements, 80.14% branches, 80.30% functions, and 95.49% lines.” Show service rows and explain production-route tests, security abuse cases, lifecycle/failure tests, and the fail-closed 80% threshold.

## 6:10–6:40 — API and rollback

Open `/api/docs` and the OpenAPI YAML. Show the timestamped database backup/evidence directory without revealing secrets. Explain the first-time dump/restore cutover, the cutover marker, rolling-update path, and the Compose rollback script with preserved volumes.

## 6:40–7:00 — Conclusion

“CampusTrade delivers the full marketplace experience and the production engineering around it: Scrum evidence, explicit architecture, automated tests, Ansible, Jenkins, Kubernetes, observability, SonarQube, documentation, and rollback. The system is deployed on the VPS, the public API is healthy, and Prometheus currently reports all 11 targets up.”

End on the production home screen or the Kubernetes/Grafana health overview.

## Privacy checklist before submission

- No passwords, tokens, `.env` contents, or private keys appear in the recording.
- Browser password managers and notification previews are hidden.
- Jenkins console sections containing credential binding are not expanded.
- Only the public IP, repository URL, and documented tunnel endpoints are shown.
