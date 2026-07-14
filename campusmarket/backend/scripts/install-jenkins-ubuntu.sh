#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

$SUDO apt update
$SUDO apt install -y ca-certificates curl fontconfig git jq openjdk-21-jre rsync wget

$SUDO tee /etc/sysctl.d/99-sonarqube.conf >/dev/null <<'EOF'
vm.max_map_count=524288
fs.file-max=131072
EOF
$SUDO sysctl --system >/dev/null

$SUDO install -d -m 0755 /etc/apt/keyrings
$SUDO wget -qO /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  | $SUDO tee /etc/apt/sources.list.d/jenkins.list >/dev/null

$SUDO apt update
$SUDO apt install -y jenkins

$SUDO usermod -aG docker jenkins
$SUDO install -d -o jenkins -g docker -m 0750 /srv/campustrade
$SUDO install -d -o root -g root -m 0755 /etc/systemd/system/jenkins.service.d

$SUDO tee /etc/systemd/system/jenkins.service.d/override.conf >/dev/null <<'EOF'
[Service]
Environment="JAVA_OPTS=-Djava.awt.headless=true -Xms512m -Xmx2g"
Environment="JENKINS_OPTS=--httpListenAddress=127.0.0.1 --httpPort=8080"
EOF

$SUDO chmod 0600 /etc/systemd/system/jenkins.service.d/override.conf
$SUDO systemctl daemon-reload
$SUDO systemctl enable --now jenkins
$SUDO systemctl restart jenkins

echo "Jenkins is running on the VM loopback interface at http://127.0.0.1:8080."
echo "The host kernel limits required by SonarQube have been applied."
echo "Use an SSH tunnel from your computer; do not open Azure port 8080."
