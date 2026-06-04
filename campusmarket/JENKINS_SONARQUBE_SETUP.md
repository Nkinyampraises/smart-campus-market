# Jenkins + SonarQube CI/CD Setup Guide

## 1. Start SonarQube (run once)

```bash
cd campusmarket/docker
docker compose -f sonarqube-compose.yml up -d
```

Access SonarQube at: **http://localhost:9000**
- Default: admin / admin  
- Change password on first login

## 2. Configure SonarQube Projects

After logging in to SonarQube, create projects for each service:
- `campustrade-auth-service`
- `campustrade-listing-service`
- `campustrade-user-service`
- `campustrade-notification-service`
- `campustrade-frontend`

Generate tokens for each and save them.

## 3. Install Jenkins

```bash
# Run Jenkins via Docker
docker run -d \
  --name jenkins \
  -p 8090:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

Access Jenkins at: **http://localhost:8090**

## 4. Configure Jenkins

Install these plugins:
- GitHub Integration
- SonarQube Scanner
- Docker Pipeline
- Kubernetes CLI
- NodeJS

### Add Credentials:
- `github-credentials` — GitHub token
- `dockerhub-credentials` — Docker Hub credentials
- `sonarqube-token` — SonarQube token
- `kubeconfig` — Kubernetes config

### Configure SonarQube in Jenkins:
Manage Jenkins → Configure System → SonarQube servers:
- Name: `CampusTrade-SonarQube`
- URL: `http://localhost:9000`
- Token: (your SonarQube token)

## 5. Create Pipeline Job

1. New Item → Pipeline
2. Pipeline → Pipeline script from SCM
3. SCM: Git → Repository URL: `https://github.com/Nkinyampraises/smart-campus-market`
4. Script Path: `campusmarket/Jenkinsfile`
5. Add webhook in GitHub: `http://your-jenkins-ip:8090/github-webhook/`

## 6. Pipeline Stages

| Stage | Description |
|---|---|
| Checkout | Pulls latest code from GitHub |
| Install Dependencies | `npm install` for all services |
| Test | Runs Jest tests with coverage |
| SonarQube Analysis | Code quality scan on all services |
| Quality Gate | Waits for SonarQube pass/fail |
| Build Docker | Builds Docker images for all 9 services |
| Push to Registry | Pushes images to Docker Hub (main branch only) |
| Deploy to K8s | Rolling update on Kubernetes cluster |
| Smoke Test | Verifies API gateway health |

## 7. Service Ports

| Service | Port |
|---|---|
| API Gateway | 8080 |
| Auth Service | 3001 |
| User Service | 3002 |
| Listing Service | 3003 |
| Chat Service | 3004 |
| Admin Service | 3005 |
| AI Service | 3006 |
| Search Service | 3007 |
| Notification Service | 3008 |
| Prometheus | 9090 |
| Grafana | 3009 |
| SonarQube | 9000 |

## 8. Kubernetes Verification

```bash
# Apply all manifests
kubectl apply -f campusmarket/backend/k8s/

# Check all pods
kubectl get pods -n campustrade

# Check services (ports)
kubectl get services -n campustrade

# Check HPA (auto-scaling)
kubectl get hpa -n campustrade

# Rolling update example
kubectl set image deployment/auth-service auth-service=campustrade/auth-service:v2 -n campustrade
kubectl rollout status deployment/auth-service -n campustrade
```
