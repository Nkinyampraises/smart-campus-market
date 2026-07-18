#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

namespace=campustrade
monitoring_namespace=campustrade-observability
env_file="${ENV_FILE:-backend/.env}"
ai_env_file="${AI_ENV_FILE:-}"
image_tag="${IMAGE_TAG:-production}"
mode="${1:-full}"
kubectl="${KUBECTL:-sudo k3s kubectl}"
provider_validator="$root_dir/backend/scripts/validate-ai-provider-env.sh"

[[ -f "$env_file" ]] || { echo "Missing protected environment file: $env_file" >&2; exit 1; }
[[ "$mode" == "full" || "$mode" == "data-only" ]] || { echo "Usage: $0 [full|data-only]" >&2; exit 2; }

if [[ "$mode" == full ]]; then
  [[ -n "$ai_env_file" && -f "$ai_env_file" ]] || {
    echo 'A protected AI_ENV_FILE is required for a full deployment.' >&2
    exit 1
  }
  bash "$provider_validator" "$env_file" "$ai_env_file"
else
  bash "$provider_validator" "$env_file"
fi

$kubectl apply -f k8s/base/namespace.yaml
$kubectl apply -f k8s/base/observability-namespace.yaml
$kubectl -n "$namespace" create secret generic campustrade-secrets \
  --from-env-file="$env_file" --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$monitoring_namespace" create secret generic campustrade-secrets \
  --from-env-file="$env_file" --dry-run=client -o yaml | $kubectl apply -f -
if [[ "$mode" == full ]]; then
  $kubectl -n "$namespace" create secret generic ai-provider-secrets \
    --from-env-file="$ai_env_file" --dry-run=client -o yaml | $kubectl apply -f -
  ai_provider_checksum="$(sha256sum "$ai_env_file" | awk '{print $1}')"
fi

# Prometheus has no native interactive authentication. Reuse the protected
# Grafana bootstrap credential at Traefik without ever writing it to source.
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
: "${GRAFANA_USER:?GRAFANA_USER is required for Prometheus edge authentication}"
: "${GRAFANA_PASS:?GRAFANA_PASS is required for Prometheus edge authentication}"
prometheus_users="$(mktemp)"
trap 'rm -f "$prometheus_users"' EXIT
printf '%s:%s\n' "$GRAFANA_USER" "$(openssl passwd -apr1 "$GRAFANA_PASS")" >"$prometheus_users"
$kubectl -n "$monitoring_namespace" create secret generic prometheus-web-auth \
  --from-file=users="$prometheus_users" --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$namespace" create configmap campustrade-db-init \
  --from-file=init.sql=backend/init.sql --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$monitoring_namespace" create configmap prometheus-config \
  --from-file=prometheus.yml=k8s/config/prometheus.yml --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$monitoring_namespace" create configmap prometheus-alerts \
  --from-file=alert-rules.yml=backend/monitoring/alert-rules.yml --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$monitoring_namespace" create configmap grafana-datasource \
  --from-file=prometheus.yml=backend/monitoring/grafana/provisioning/datasources/prometheus.yml --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$monitoring_namespace" create configmap grafana-dashboard-provider \
  --from-file=dashboards.yml=backend/monitoring/grafana/provisioning/dashboards/dashboards.yml --dry-run=client -o yaml | $kubectl apply -f -
$kubectl -n "$monitoring_namespace" create configmap grafana-dashboard \
  --from-file=campustrade-overview.json=backend/monitoring/grafana/dashboards/campustrade-overview.json --dry-run=client -o yaml | $kubectl apply -f -

if [[ "$mode" == "data-only" ]]; then
  $kubectl apply -f k8s/base/configmap.yaml
  $kubectl apply -f k8s/base/data.yaml
  $kubectl -n "$namespace" rollout status statefulset/postgres --timeout=240s
  $kubectl -n "$namespace" rollout status statefulset/redis --timeout=180s
  exit 0
fi

$kubectl apply -k k8s/base
$kubectl -n "$namespace" delete ingress campustrade --ignore-not-found
$kubectl -n "$namespace" annotate deployment/ai-service \
  campustrade.io/ai-provider-secret-sha256="$ai_provider_checksum" --overwrite

services=(frontend api-gateway auth-service user-service listing-service chat-service admin-service ai-service search-service notification-service)
for service in "${services[@]}"; do
  $kubectl -n "$namespace" set image "deployment/$service" \
    "$service=campustrade/$service:$image_tag"
done

$kubectl -n "$namespace" rollout status statefulset/postgres --timeout=240s
$kubectl -n "$namespace" rollout status statefulset/redis --timeout=180s
for service in "${services[@]}"; do
  $kubectl -n "$namespace" rollout status "deployment/$service" --timeout=300s
done
$kubectl -n "$monitoring_namespace" rollout status deployment/prometheus --timeout=300s
$kubectl -n "$monitoring_namespace" rollout status deployment/grafana --timeout=300s
$kubectl -n "$monitoring_namespace" rollout status deployment/platform-edge-proxy --timeout=180s
$kubectl -n "$monitoring_namespace" rollout status daemonset/node-exporter --timeout=180s

$kubectl -n "$namespace" delete deployment,service,pvc prometheus grafana node-exporter --ignore-not-found

echo "CampusTrade K3s rollout completed with image tag $image_tag."
