#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

namespace=campustrade
build_id="${BUILD_NUMBER:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"
evidence_dir="${EVIDENCE_DIR:-evidence/$build_id}"
kubectl="${KUBECTL:-sudo k3s kubectl}"
mkdir -p "$evidence_dir"

fetch_with_retry() {
  local url="$1"
  local output_file="$2"
  local temporary_file="${output_file}.tmp"
  for _ in $(seq 1 60); do
    if curl --fail --silent --show-error "$url" >"$temporary_file"; then
      mv "$temporary_file" "$output_file"
      return 0
    fi
    sleep 5
  done
  rm -f "$temporary_file"
  echo "Evidence endpoint did not become ready: $url" >&2
  return 1
}

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

fetch_with_retry http://127.0.0.1/health "$evidence_dir/api-health.json"
fetch_with_retry http://127.0.0.1:9090/api/v1/targets "$evidence_dir/prometheus-targets.json"
fetch_with_retry http://127.0.0.1:3009/api/health "$evidence_dir/grafana-health.json"
fetch_with_retry http://127.0.0.1:9000/api/system/status "$evidence_dir/sonarqube-status.json"

for _ in $(seq 1 60); do
  if jq -e '
    .status == "success" and
    (.data.activeTargets | length) >= 11 and
    all(.data.activeTargets[]; .health == "up")
  ' "$evidence_dir/prometheus-targets.json" >/dev/null
  then
    break
  fi
  sleep 5
  fetch_with_retry http://127.0.0.1:9090/api/v1/targets \
    "$evidence_dir/prometheus-targets.json"
done
jq -e '
  .status == "success" and
  (.data.activeTargets | length) >= 11 and
  all(.data.activeTargets[]; .health == "up")
' "$evidence_dir/prometheus-targets.json" >/dev/null
bash backend/scripts/generate-system-information.sh "$evidence_dir"

echo "Evidence captured in $evidence_dir"
