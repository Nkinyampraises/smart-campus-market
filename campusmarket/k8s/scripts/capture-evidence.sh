#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

namespace=campustrade
build_id="${BUILD_NUMBER:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"
evidence_dir="${EVIDENCE_DIR:-evidence/$build_id}"
kubectl="${KUBECTL:-sudo k3s kubectl}"
mkdir -p "$evidence_dir"

{
  echo "Captured: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo
  $kubectl version
  echo
  $kubectl get nodes -o wide
  echo
  $kubectl -n "$namespace" get deploy,statefulset,daemonset,pods,svc,ingress,hpa,pdb -o wide
  echo
  $kubectl -n campustrade-observability get deploy,daemonset,pods,svc,pvc -o wide
  echo
  $kubectl -n "$namespace" top pods 2>/dev/null || true
} >"$evidence_dir/kubernetes-status.txt"

curl --fail --silent --show-error http://127.0.0.1/health >"$evidence_dir/api-health.json"
curl --fail --silent --show-error http://127.0.0.1:9090/api/v1/targets >"$evidence_dir/prometheus-targets.json"
curl --fail --silent --show-error http://127.0.0.1:3009/api/health >"$evidence_dir/grafana-health.json"
curl --fail --silent --show-error http://127.0.0.1:9000/api/system/status >"$evidence_dir/sonarqube-status.json"
bash backend/scripts/generate-system-information.sh "$evidence_dir"

echo "Evidence captured in $evidence_dir"
