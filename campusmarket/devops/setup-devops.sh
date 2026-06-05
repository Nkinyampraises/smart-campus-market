#!/bin/bash
# =============================================================================
#  CampusTrade DevOps Stack Setup
#  Run this on your VPS as root:
#    bash /opt/campustrade/campusmarket/devops/setup-devops.sh
# =============================================================================
set -e

DEVOPS_DIR="/opt/campustrade/campusmarket/devops"
VPS_IP="209.38.199.108"
JENKINS_URL="http://${VPS_IP}:8090"
JENKINS_PASS="nkinyam2023"
SONAR_URL="http://${VPS_IP}:9000"
SONAR_OLD_PASS="admin"
SONAR_NEW_PASS="admin123"
GITHUB_REPO="https://github.com/Nkinyampraises/smart-campus-market.git"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         CampusTrade DevOps Stack — Full Setup                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: System kernel parameters required by SonarQube ────────────────────
echo "▶ [1/8] Setting kernel parameters for SonarQube (Elasticsearch)..."
sysctl -w vm.max_map_count=524288
sysctl -w fs.file-max=131072
grep -q "vm.max_map_count" /etc/sysctl.conf || echo "vm.max_map_count=524288" >> /etc/sysctl.conf
grep -q "fs.file-max=131072" /etc/sysctl.conf || echo "fs.file-max=131072" >> /etc/sysctl.conf

# ── Step 2: Open firewall ports ────────────────────────────────────────────────
echo "▶ [2/8] Opening firewall ports..."
ufw allow 8090/tcp comment 'Jenkins'  2>/dev/null || true
ufw allow 9000/tcp comment 'SonarQube' 2>/dev/null || true
ufw allow 50000/tcp comment 'Jenkins agents' 2>/dev/null || true
ufw reload 2>/dev/null || true

# ── Step 3: Fix k3s kubeconfig server URL for in-container kubectl ─────────────
echo "▶ [3/8] Fixing kubeconfig for Jenkins container access..."
if [ -f /etc/rancher/k3s/k3s.yaml ]; then
  cp /etc/rancher/k3s/k3s.yaml /etc/rancher/k3s/k3s.yaml.bak 2>/dev/null || true
  sed -i "s|https://127.0.0.1:6443|https://host.docker.internal:6443|g" /etc/rancher/k3s/k3s.yaml
  echo "   kubeconfig updated"
else
  echo "   k3s not found, skipping kubeconfig fix"
fi

# ── Step 4: Build Jenkins image and start the DevOps stack ────────────────────
echo "▶ [4/8] Building Jenkins image (this takes 3–5 minutes)..."
cd "$DEVOPS_DIR"
docker compose build --no-cache jenkins

echo "   Starting Jenkins + SonarQube..."
docker compose up -d

# ── Step 5: Wait for SonarQube to be ready ─────────────────────────────────────
echo "▶ [5/8] Waiting for SonarQube to start (up to 3 minutes)..."
for i in $(seq 1 36); do
  STATUS=$(curl -s "${SONAR_URL}/api/system/status" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ "$STATUS" = "UP" ]; then
    echo "   SonarQube is UP ✓"
    break
  fi
  echo "   Waiting... attempt ${i}/36 (status: ${STATUS:-not ready})"
  sleep 5
done

# ── Step 6: Configure SonarQube ────────────────────────────────────────────────
echo "▶ [6/8] Configuring SonarQube..."

# Change default password
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${SONAR_URL}/api/users/change_password" \
  -u "${SONAR_OLD_PASS}:${SONAR_OLD_PASS}" \
  -d "login=admin&password=${SONAR_NEW_PASS}&previousPassword=${SONAR_OLD_PASS}" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "   Admin password changed to '${SONAR_NEW_PASS}' ✓"
else
  echo "   Password already changed or SonarQube 10.x requires UI first (status: $HTTP_STATUS)"
fi

# Create projects for all 6 backend services
echo "   Creating SonarQube projects..."
for svc in auth-service user-service listing-service chat-service admin-service notification-service; do
  PROJ_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${SONAR_URL}/api/projects/create" \
    -u "admin:${SONAR_NEW_PASS}" \
    -d "name=CampusTrade ${svc}&project=campustrade-${svc}&visibility=public" 2>/dev/null || echo "000")
  if [ "$PROJ_STATUS" = "200" ]; then
    echo "   Created: campustrade-${svc} ✓"
  else
    echo "   Skipped (already exists): campustrade-${svc}"
  fi
done

# Create frontend project
curl -s -o /dev/null -X POST "${SONAR_URL}/api/projects/create" \
  -u "admin:${SONAR_NEW_PASS}" \
  -d "name=CampusTrade Frontend&project=campustrade-frontend&visibility=public" 2>/dev/null || true

# Generate analysis token for Jenkins
echo "   Generating SonarQube token for Jenkins..."
TOKEN_RESPONSE=$(curl -s -X POST "${SONAR_URL}/api/user_tokens/generate" \
  -u "admin:${SONAR_NEW_PASS}" \
  -d "name=jenkins-analysis-token&type=GLOBAL_ANALYSIS_TOKEN" 2>/dev/null || echo "{}")

SONAR_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || echo "")

if [ -n "$SONAR_TOKEN" ]; then
  echo "   SonarQube token generated ✓"
  echo "$SONAR_TOKEN" > /opt/campustrade/sonar_token.txt
  chmod 600 /opt/campustrade/sonar_token.txt
else
  echo "   Token generation failed — run manually in SonarQube UI under My Account → Security"
  SONAR_TOKEN="MANUAL_TOKEN_NEEDED"
fi

# ── Step 7: Configure Jenkins via Script Console ───────────────────────────────
echo "▶ [7/8] Configuring Jenkins (waiting for startup)..."
for i in $(seq 1 24); do
  JOB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${JENKINS_URL}/api/json" \
    -u "admin:${JENKINS_PASS}" 2>/dev/null || echo "000")
  if [ "$JOB_STATUS" = "200" ]; then
    echo "   Jenkins is UP ✓"
    break
  fi
  echo "   Waiting for Jenkins... attempt ${i}/24"
  sleep 5
done

# Get Jenkins crumb
CRUMB_JSON=$(curl -s "${JENKINS_URL}/crumbIssuer/api/json" \
  -u "admin:${JENKINS_PASS}" 2>/dev/null || echo "{}")
CRUMB_FIELD=$(echo "$CRUMB_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('crumbRequestField','Jenkins-Crumb'))" 2>/dev/null || echo "Jenkins-Crumb")
CRUMB_VALUE=$(echo "$CRUMB_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('crumb',''))" 2>/dev/null || echo "")
CRUMB_HEADER="${CRUMB_FIELD}:${CRUMB_VALUE}"

# Add SonarQube token credential to Jenkins
if [ "$SONAR_TOKEN" != "MANUAL_TOKEN_NEEDED" ]; then
  echo "   Adding SonarQube token to Jenkins credentials..."
  curl -s -o /dev/null -X POST \
    "${JENKINS_URL}/credentials/store/system/domain/_/createCredentials" \
    -u "admin:${JENKINS_PASS}" \
    -H "${CRUMB_HEADER}" \
    --data-urlencode "json={
      \"\": \"0\",
      \"credentials\": {
        \"scope\": \"GLOBAL\",
        \"id\": \"sonarqube-token\",
        \"description\": \"SonarQube Global Analysis Token\",
        \"secret\": \"${SONAR_TOKEN}\",
        \"\$class\": \"org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl\"
      }
    }" 2>/dev/null && echo "   SonarQube token added to Jenkins ✓" || echo "   Credential add failed (may already exist)"
fi

# Configure SonarQube server in Jenkins via Script Console
echo "   Configuring SonarQube server in Jenkins..."
GROOVY_SCRIPT="
import jenkins.model.*
import hudson.plugins.sonar.*
import hudson.plugins.sonar.model.*
import hudson.util.Secret

def instance = Jenkins.getInstance()
def sonarDesc = instance.getDescriptor(SonarGlobalConfiguration.class)
if (sonarDesc != null) {
  def installation = new SonarInstallation(
    'SonarQube',
    'http://sonarqube:9000',
    '',
    'sonarqube-token',
    null, '', '', ''
  )
  sonarDesc.setInstallations(installation)
  sonarDesc.save()
  println 'SonarQube server configured'
} else {
  println 'SonarQube plugin not ready yet'
}
"

curl -s -o /dev/null -X POST "${JENKINS_URL}/scriptText" \
  -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_HEADER}" \
  --data-urlencode "script=${GROOVY_SCRIPT}" 2>/dev/null && echo "   SonarQube server configured in Jenkins ✓"

# Create the pipeline job
echo "   Creating CampusTrade pipeline job..."
JOB_XML='<?xml version="1.1" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <description>CampusTrade full CI/CD pipeline</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <com.coravy.hudson.plugins.github.GithubProjectProperty plugin="github">
      <projectUrl>https://github.com/Nkinyampraises/smart-campus-market/</projectUrl>
      <displayName></displayName>
    </com.coravy.hudson.plugins.github.GithubProjectProperty>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.jenkins.GitHubPushTrigger plugin="github">
          <spec></spec>
        </com.cloudbees.jenkins.GitHubPushTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/Nkinyampraises/smart-campus-market.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>campusmarket/Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers/>
</flow-definition>'

CREATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${JENKINS_URL}/createItem?name=CampusTrade-Pipeline" \
  -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_HEADER}" \
  -H "Content-Type: application/xml" \
  -d "$JOB_XML" 2>/dev/null || echo "000")

if [ "$CREATE_STATUS" = "200" ] || [ "$CREATE_STATUS" = "201" ]; then
  echo "   Pipeline job created ✓"
elif [ "$CREATE_STATUS" = "400" ]; then
  echo "   Pipeline job already exists ✓"
else
  echo "   Pipeline job creation returned HTTP ${CREATE_STATUS} — create manually in Jenkins UI"
fi

# Trigger first build
echo "   Triggering initial build..."
curl -s -o /dev/null -X POST \
  "${JENKINS_URL}/job/CampusTrade-Pipeline/build" \
  -u "admin:${JENKINS_PASS}" \
  -H "${CRUMB_HEADER}" 2>/dev/null && echo "   Build triggered ✓" || echo "   Trigger failed — run manually"

# ── Step 8: Verify Grafana + Prometheus (in main backend stack) ────────────────
echo "▶ [8/8] Checking Grafana + Prometheus..."
MAIN_DIR="/opt/campustrade/campusmarket/backend"
if [ -d "$MAIN_DIR" ]; then
  cd "$MAIN_DIR"
  GRAFANA_UP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3009/api/health" 2>/dev/null || echo "000")
  if [ "$GRAFANA_UP" = "200" ]; then
    echo "   Grafana is already running ✓"
    # Force Grafana to re-provision dashboards by restarting it
    docker compose restart grafana 2>/dev/null && echo "   Grafana restarted to reload provisioning ✓" || true
  else
    echo "   Grafana not running — starting backend stack..."
    docker compose up -d grafana prometheus 2>/dev/null || true
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                     ✅  SETUP COMPLETE                              ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║                                                                      ║"
echo "║  JENKINS                                                             ║"
echo "║    URL:      http://${VPS_IP}:8090                          ║"
echo "║    Login:    admin / nkinyam2023                                     ║"
echo "║    Pipeline: CampusTrade-Pipeline                                    ║"
echo "║                                                                      ║"
echo "║  SONARQUBE                                                           ║"
echo "║    URL:      http://${VPS_IP}:9000                          ║"
echo "║    Login:    admin / admin123                                        ║"
echo "║                                                                      ║"
echo "║  GRAFANA                                                             ║"
echo "║    URL:      http://${VPS_IP}:3009                          ║"
echo "║    Login:    admin / campustrade123                                  ║"
echo "║                                                                      ║"
echo "║  PROMETHEUS                                                          ║"
echo "║    URL:      http://${VPS_IP}:9090                          ║"
echo "║                                                                      ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  GitHub Webhook (add in GitHub repo Settings → Webhooks):           ║"
echo "║    URL: http://${VPS_IP}:8090/github-webhook/               ║"
echo "║    Content-type: application/json                                    ║"
echo "║    Events: Just the push event                                       ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
if [ -f /opt/campustrade/sonar_token.txt ]; then
echo "║  SonarQube Token (saved at /opt/campustrade/sonar_token.txt):        ║"
SAVED_TOK=$(cat /opt/campustrade/sonar_token.txt 2>/dev/null | head -c 40)
echo "║    ${SAVED_TOK}...                           ║"
fi
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Next step: Add the GitHub webhook URL to your GitHub repo."
echo "  Then push any commit to trigger the pipeline automatically."
echo ""
