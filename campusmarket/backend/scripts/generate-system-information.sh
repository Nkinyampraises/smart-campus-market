#!/usr/bin/env bash
set -uo pipefail

report_dir="${1:-ci-reports}"
mkdir -p "$report_dir"

prometheus_url="${PROMETHEUS_URL:-http://127.0.0.1:9090}"
grafana_url="${GRAFANA_URL:-http://127.0.0.1:3009}"
sonar_url="${SONAR_HOST_URL:-http://127.0.0.1:9000}"
jenkins_url="${JENKINS_URL:-http://127.0.0.1:8080}"
generated_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

html_escape() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g'
}

probe() {
  local url="$1"
  local code
  code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 4 "$url" 2>/dev/null || true)"
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    printf 'UP'
  elif [[ -n "$code" && "$code" != '000' ]]; then
    printf 'HTTP %s' "$code"
  else
    printf 'UNREACHABLE'
  fi
}

jenkins_status="RUNNING"
grafana_status="$(probe "$grafana_url/api/health")"
prometheus_status="$(probe "$prometheus_url/-/ready")"
sonar_payload="$(curl --silent --max-time 4 "$sonar_url/api/system/status" 2>/dev/null || true)"
sonarqube_status='UNREACHABLE'
if command -v jq >/dev/null 2>&1 && [[ -n "$sonar_payload" ]]; then
  sonarqube_status="$(printf '%s' "$sonar_payload" | jq -r '.status // "UNKNOWN"' 2>/dev/null || printf 'UNKNOWN')"
elif [[ -n "$sonar_payload" ]]; then
  sonarqube_status="$(printf '%s' "$sonar_payload" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')"
  sonarqube_status="${sonarqube_status:-UNKNOWN}"
fi

hostname_value="$(hostname 2>/dev/null || printf 'unknown')"
kernel_value="$(uname -sr 2>/dev/null || printf 'unknown')"
uptime_value="$(uptime -p 2>/dev/null || uptime 2>/dev/null || printf 'unknown')"
cpu_count="$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf 'unknown')"
load_value="$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || printf 'unknown')"
memory_value="$(free -h 2>/dev/null | awk '/^Mem:/ {print $3 " / " $2}' || true)"
memory_value="${memory_value:-unknown}"
disk_value="$(df -h / 2>/dev/null | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}' || true)"
disk_value="${disk_value:-unknown}"
docker_version="$(docker version --format '{{.Server.Version}}' 2>/dev/null || printf 'unavailable')"
container_count="$(docker ps --format '{{.Names}}' 2>/dev/null | awk 'END {print NR+0}')"
kubernetes_status='UNAVAILABLE'
kubernetes_nodes='unknown'
kubernetes_pods='unknown'
if command -v k3s >/dev/null 2>&1; then
  if sudo -n k3s kubectl get --raw=/readyz >/dev/null 2>&1; then
    kubernetes_status='UP'
    kubernetes_nodes="$(sudo -n k3s kubectl get nodes --no-headers 2>/dev/null | awk 'END {print NR+0}')"
    kubernetes_pods="$(sudo -n k3s kubectl -n campustrade get pods --field-selector=status.phase=Running --no-headers 2>/dev/null | awk 'END {print NR+0}')"
  elif k3s kubectl get --raw=/readyz >/dev/null 2>&1; then
    kubernetes_status='UP'
    kubernetes_nodes="$(k3s kubectl get nodes --no-headers 2>/dev/null | awk 'END {print NR+0}')"
    kubernetes_pods="$(k3s kubectl -n campustrade get pods --field-selector=status.phase=Running --no-headers 2>/dev/null | awk 'END {print NR+0}')"
  fi
fi
build_value="${BUILD_TAG:-local-run}"
commit_value="$(git rev-parse --short HEAD 2>/dev/null || printf 'unknown')"

prometheus_up='unknown'
prometheus_total='unknown'
if command -v jq >/dev/null 2>&1 && [[ "$prometheus_status" == 'UP' ]]; then
  targets_json="$(curl --silent --max-time 4 "$prometheus_url/api/v1/targets" 2>/dev/null || true)"
  prometheus_up="$(printf '%s' "$targets_json" | jq '[.data.activeTargets[]? | select(.health == "up")] | length' 2>/dev/null || printf 'unknown')"
  prometheus_total="$(printf '%s' "$targets_json" | jq '[.data.activeTargets[]?] | length' 2>/dev/null || printf 'unknown')"
fi

status_class() {
  if [[ "$1" == 'UP' || "$1" == 'RUNNING' ]]; then
    printf 'good'
  else
    printf 'bad'
  fi
}

cat >"$report_dir/system-information.html" <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CampusTrade system information</title>
  <style>
    :root{color-scheme:dark;--bg:#0b1220;--panel:#111c2f;--line:#263653;--text:#edf4ff;--muted:#9eb0ca;--good:#55d98b;--bad:#ff7a90;--accent:#72a7ff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:42px 24px 70px}h1{margin:0;font-size:clamp(28px,5vw,46px);letter-spacing:-.04em}p{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:28px}.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px}.label{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.value{display:block;margin-top:6px;font-size:20px;font-weight:700}.good{color:var(--good)}.bad{color:var(--bad)}table{width:100%;border-collapse:collapse;margin-top:30px;background:var(--panel);border:1px solid var(--line)}th,td{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-weight:600}a{color:var(--accent)}code{font-size:12px;color:var(--muted)}
  </style>
</head>
<body><main>
  <h1>CampusTrade system information</h1>
  <p>Generated by Jenkins at <code>$(html_escape "$generated_at")</code>. Administrative links require the documented SSH tunnel.</p>
  <div class="grid">
    <div class="card"><span class="label">Jenkins</span><span class="value $(status_class "$jenkins_status")">$(html_escape "$jenkins_status")</span></div>
    <div class="card"><span class="label">Grafana</span><span class="value $(status_class "$grafana_status")">$(html_escape "$grafana_status")</span></div>
    <div class="card"><span class="label">Prometheus</span><span class="value $(status_class "$prometheus_status")">$(html_escape "$prometheus_status")</span></div>
    <div class="card"><span class="label">SonarQube</span><span class="value $(status_class "$sonarqube_status")">$(html_escape "$sonarqube_status")</span></div>
    <div class="card"><span class="label">Prometheus targets</span><span class="value">$(html_escape "$prometheus_up") / $(html_escape "$prometheus_total") up</span></div>
    <div class="card"><span class="label">Containers</span><span class="value">$(html_escape "$container_count") running</span></div>
    <div class="card"><span class="label">Kubernetes API</span><span class="value $(status_class "$kubernetes_status")">$(html_escape "$kubernetes_status")</span></div>
    <div class="card"><span class="label">K3s workloads</span><span class="value">$(html_escape "$kubernetes_nodes") node · $(html_escape "$kubernetes_pods") pods</span></div>
  </div>
  <table>
    <tr><th>Host</th><td>$(html_escape "$hostname_value")</td></tr>
    <tr><th>Kernel</th><td>$(html_escape "$kernel_value")</td></tr>
    <tr><th>Uptime</th><td>$(html_escape "$uptime_value")</td></tr>
    <tr><th>CPU</th><td>$(html_escape "$cpu_count") logical CPUs · load $(html_escape "$load_value")</td></tr>
    <tr><th>Memory</th><td>$(html_escape "$memory_value")</td></tr>
    <tr><th>Root disk</th><td>$(html_escape "$disk_value")</td></tr>
    <tr><th>Docker Engine</th><td>$(html_escape "$docker_version")</td></tr>
    <tr><th>Jenkins build</th><td>$(html_escape "$build_value")</td></tr>
    <tr><th>Git commit</th><td>$(html_escape "$commit_value")</td></tr>
  </table>
  <p><a href="$(html_escape "$jenkins_url")">Jenkins</a> · <a href="$(html_escape "$grafana_url")">Grafana</a> · <a href="$(html_escape "$prometheus_url")">Prometheus</a> · <a href="$(html_escape "$sonar_url")">SonarQube</a></p>
</main></body></html>
EOF

printf 'Grafana %s · Prometheus %s · SonarQube %s · targets %s/%s\n' \
  "$grafana_status" "$prometheus_status" "$sonarqube_status" "$prometheus_up" "$prometheus_total"
