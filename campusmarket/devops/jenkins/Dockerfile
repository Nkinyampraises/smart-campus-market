FROM jenkins/jenkins:lts-jdk21

# Pre-install plugins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Init scripts run on first boot
COPY init.groovy.d/ /usr/share/jenkins/ref/init.groovy.d/

USER root

# Node.js 20 (for running tests + frontend build)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && node --version && npm --version

# Docker CLI (reuses host socket so no daemon needed)
RUN apt-get install -y docker.io \
    && usermod -aG docker jenkins

# sonar-scanner 5.0.1 CLI
RUN wget -q "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip" \
    && unzip -q sonar-scanner-cli-5.0.1.3006-linux.zip -d /opt \
    && mv /opt/sonar-scanner-5.0.1.3006-linux /opt/sonar-scanner \
    && ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm -f sonar-scanner-cli-5.0.1.3006-linux.zip \
    && sonar-scanner --version 2>&1 | head -1

# kubectl v1.29
RUN curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl \
    && kubectl version --client

# Extra tools
RUN apt-get install -y curl git unzip jq

USER jenkins
