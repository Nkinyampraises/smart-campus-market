FROM jenkins/jenkins:lts-jdk21

# Pre-install plugins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Init scripts run on first boot
COPY init.groovy.d/ /usr/share/jenkins/ref/init.groovy.d/

USER root

# Install OS tools first (wget, unzip, curl, git, jq, docker)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl unzip git jq docker.io \
    && usermod -aG docker jenkins \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Node.js 20 (for running tests + frontend build)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && node --version && npm --version

# sonar-scanner 5.0.1 CLI (uses curl now that it's installed)
RUN curl -sSL "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip" \
        -o /tmp/sonar-scanner.zip \
    && unzip -q /tmp/sonar-scanner.zip -d /opt \
    && mv /opt/sonar-scanner-5.0.1.3006-linux /opt/sonar-scanner \
    && ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm -f /tmp/sonar-scanner.zip \
    && sonar-scanner --version 2>&1 | head -1

# kubectl v1.29
RUN curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl \
    && kubectl version --client

USER jenkins
