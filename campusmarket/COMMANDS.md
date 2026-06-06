# CampusTrade — Complete Command Reference

> All commands run on the VPS unless marked **[LOCAL]** (run on your Windows laptop)

---

## 1. Connect to the VPS

```bash
# [LOCAL] Open PowerShell or CMD on your laptop and run:
ssh root@209.38.199.108
```

---

## 2. Project Location

```
/opt/campustrade/campusmarket/
├── backend/          ← All microservices + Docker Compose
├── frontend/         ← React app (built with Vite)
├── devops/           ← Jenkins + SonarQube Docker Compose
└── COMMANDS.md       ← This file
```

---

## 3. Port Reference

| Service              | URL                              |
|----------------------|----------------------------------|
| Frontend (App)       | http://209.38.199.108:4000       |
| API Gateway          | http://209.38.199.108:8080       |
| Jenkins CI           | http://209.38.199.108:8090       |
| SonarQube            | http://209.38.199.108:9000       |
| Grafana              | http://209.38.199.108:3009       |
| Prometheus           | http://209.38.199.108:9090       |

---

## 4. Pull Latest Code from GitHub

```bash
cd /opt/campustrade
git pull
```

---

## 5. Frontend — Build & Deploy

```bash
# Build the React app
cd /opt/campustrade/campusmarket/frontend
npm run build

# Copy build to nginx (makes it live)
cp -r dist/* /var/www/html/

# Reload nginx
nginx -s reload
```

**One-liner (pull + build + deploy):**
```bash
cd /opt/campustrade && git pull && cd campusmarket/frontend && npm run build && cp -r dist/* /var/www/html/ && nginx -s reload
```

---

## 6. Backend — Docker Compose Commands

```bash
# Go to backend folder
cd /opt/campustrade/campusmarket/backend

# Start all backend services
docker compose up -d

# Stop all backend services
docker compose down

# Restart all backend services
docker compose restart

# Rebuild and restart all services (after code changes)
docker compose up -d --build

# Rebuild ONE specific service only
docker compose up -d --build auth-service
docker compose up -d --build ai-service
docker compose up -d --build admin-service
docker compose up -d --build listing-service
```

---

## 7. Individual Container — Stop / Start

### See all running containers and ports:
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

### Stop one container (others keep running):
```bash
docker stop backend-grafana-1
docker stop backend-prometheus-1
docker stop campustrade-jenkins
docker stop campustrade-sonarqube
docker stop backend-auth-service-1
docker stop backend-user-service-1
docker stop backend-listing-service-1
docker stop backend-chat-service-1
docker stop backend-admin-service-1
docker stop backend-ai-service-1
docker stop backend-search-service-1
docker stop backend-notification-service-1
docker stop backend-api-gateway-1
docker stop backend-postgres-1
docker stop backend-redis-1
```

### Start a stopped container back:
```bash
docker start backend-grafana-1
docker start campustrade-jenkins
docker start campustrade-sonarqube
# (replace name with whichever container you stopped)
```

### Stop the frontend (nginx):
```bash
systemctl stop nginx
```

### Start the frontend back:
```bash
systemctl start nginx
```

---

## 8. Jenkins

**URL:** http://209.38.199.108:8090
**Login:** admin / nkinyam2023

```bash
# Go to Jenkins folder
cd /opt/campustrade/campusmarket/devops

# Start Jenkins
docker compose up -d jenkins

# Stop Jenkins
docker stop campustrade-jenkins

# Start Jenkins back
docker start campustrade-jenkins

# View Jenkins logs
docker logs campustrade-jenkins --tail 50
```

---

## 9. SonarQube

**URL:** http://209.38.199.108:9000
**Login:** admin / Admin@1234567

```bash
# Start SonarQube
docker start campustrade-sonarqube

# Stop SonarQube
docker stop campustrade-sonarqube

# View SonarQube logs
docker logs campustrade-sonarqube --tail 50

# Check SonarQube is up
curl -s http://localhost:9000/api/system/status | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

---

## 10. Grafana

**URL:** http://209.38.199.108:3009
**Login:** admin / campustrade123

```bash
# Start Grafana
docker start backend-grafana-1

# Stop Grafana
docker stop backend-grafana-1

# View Grafana logs
docker logs backend-grafana-1 --tail 30
```

---

## 11. Prometheus

**URL:** http://209.38.199.108:9090

```bash
# Start Prometheus
docker start backend-prometheus-1

# Stop Prometheus
docker stop backend-prometheus-1

# Check Prometheus is running
curl -s http://localhost:9090/-/healthy
```

---

## 12. Full System — Start Everything

```bash
# Start backend (all microservices + databases + monitoring)
cd /opt/campustrade/campusmarket/backend
docker compose up -d

# Start DevOps stack (Jenkins + SonarQube)
cd /opt/campustrade/campusmarket/devops
docker compose up -d

# Start frontend
systemctl start nginx
```

---

## 13. Full System — Stop Everything

```bash
# Stop backend
cd /opt/campustrade/campusmarket/backend
docker compose down

# Stop DevOps stack
cd /opt/campustrade/campusmarket/devops
docker compose down

# Stop frontend
systemctl stop nginx
```

---

## 14. Check All Services Are Running

```bash
# Shows all containers with status and ports
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check what is listening on which port
ss -tlnp | grep LISTEN
```

---

## 15. View Logs for Any Service

```bash
# Replace <container-name> with the name from docker ps
docker logs <container-name> --tail 50

# Examples:
docker logs backend-auth-service-1 --tail 50
docker logs backend-ai-service-1 --tail 50
docker logs backend-api-gateway-1 --tail 50
docker logs campustrade-jenkins --tail 50
docker logs campustrade-sonarqube --tail 100

# Follow logs in real time (Ctrl+C to stop)
docker logs backend-auth-service-1 -f
```

---

## 16. Database (PostgreSQL)

```bash
# Open database shell
docker exec -it backend-postgres-1 psql -U campustrade -d campustrade

# Useful SQL queries inside the shell:
SELECT * FROM listings ORDER BY created_at DESC LIMIT 10;   -- see latest listings
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;      -- see latest users
SELECT * FROM fraud_flags WHERE resolved=false;             -- see unresolved fraud flags
SELECT COUNT(*) FROM listings;                              -- count all listings
\q                                                          -- exit the shell
```

---

## 17. AI Fraud Detection — Re-run on Existing Listings

```bash
cat > /tmp/recheck.sh << 'EOF'
#!/bin/bash
docker exec backend-postgres-1 psql -U campustrade -d campustrade -t -c \
  "SELECT id, seller_id, category, price_fcfa FROM listings WHERE status='active'" | \
while IFS='|' read -r id seller_id category price_fcfa; do
  id=$(echo $id | xargs)
  seller_id=$(echo $seller_id | xargs)
  category=$(echo $category | xargs)
  price_fcfa=$(echo $price_fcfa | xargs)
  [ -z "$id" ] && continue
  echo "Checking: $category — $price_fcfa FCFA"
  curl -s -X POST http://localhost:8080/api/ai/fraud-check \
    -H "Content-Type: application/json" \
    -d "{\"listingId\":\"$id\",\"category\":\"$category\",\"price_fcfa\":$price_fcfa,\"sellerId\":\"$seller_id\"}" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print('  FLAGGED:', d['flags'][0]['type'] if d['flagged'] else 'clean')" 2>/dev/null
done
EOF
bash /tmp/recheck.sh
```

---

## 18. Firewall (UFW)

```bash
# Check firewall status and open ports
ufw status numbered

# Open a port
ufw allow 4000/tcp
ufw allow 8090/tcp
ufw allow 9000/tcp
ufw allow 3009/tcp
ufw allow 9090/tcp

# Reload firewall
ufw reload
```

---

## 19. Git — Push Code Changes

```bash
# [LOCAL] Run on your Windows laptop in PowerShell:

# See what changed
cd "C:\Users\MATRIX TECHNOLOGY\Documents\smart campus market"
git status

# Stage and commit changes
git add .
git commit -m "Your commit message here"

# Push to GitHub
git push
```

---

## 20. After Pushing Code — Redeploy on VPS

```bash
# Backend change (e.g. changed ai-service or admin-service):
cd /opt/campustrade && git pull && cd campusmarket/backend && docker compose up -d --build

# Frontend change (e.g. changed a React page):
cd /opt/campustrade && git pull && cd campusmarket/frontend && npm run build && cp -r dist/* /var/www/html/ && nginx -s reload

# Both backend and frontend changed:
cd /opt/campustrade && git pull && \
  cd campusmarket/backend && docker compose up -d --build && \
  cd ../frontend && npm run build && cp -r dist/* /var/www/html/ && nginx -s reload
```

---

## 21. Jenkins Pipeline — Trigger a Build

1. Open http://209.38.199.108:8090
2. Login: admin / nkinyam2023
3. Click **CampusTrade-Pipeline**
4. Click **Build Now**

Or via command line:
```bash
CRUMB=$(curl -s "http://admin:nkinyam2023@localhost:8090/crumbIssuer/api/json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['crumb'])")
curl -s -X POST "http://admin:nkinyam2023@localhost:8090/job/CampusTrade-Pipeline/build" \
  -H "Jenkins-Crumb: $CRUMB"
echo "Build triggered"
```

---

## 22. Quick Health Check — All Services

```bash
echo "=== App ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:4000
echo ""
echo "=== API Gateway ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
echo ""
echo "=== Jenkins ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:8090
echo ""
echo "=== SonarQube ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:9000
echo ""
echo "=== Grafana ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:3009
echo ""
echo "=== Prometheus ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:9090
echo ""
```

---

## 23. Restart a Crashed Service

```bash
# If a container keeps restarting or crashes:
docker stop <container-name>
docker rm <container-name>
cd /opt/campustrade/campusmarket/backend
docker compose up -d <service-name>

# Example — restart grafana:
docker stop backend-grafana-1
docker rm backend-grafana-1
docker compose up -d grafana
```

---

*CampusTrade — ICT University SEN3244 Software Architecture, 2026*
*Team: Praises Ncha (Scrum Master) & Kongyu Jesse Ntani (Product Owner)*
