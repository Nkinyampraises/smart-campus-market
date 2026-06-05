#!/bin/bash
set -e

echo "=========================================="
echo "  CampusTrade Full Setup Script"
echo "=========================================="

APP_DIR="/opt/campustrade/campusmarket"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
ENV_FILE="$BACKEND_DIR/.env"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo ""
echo "[1/7] Pulling latest code from GitHub..."
cd /opt/campustrade
git pull origin main

# ── 2. Write .env file ────────────────────────────────────────────────────────
echo ""
echo "[2/7] Writing .env file..."
cat > "$ENV_FILE" << 'ENVEOF'
DB_HOST=postgres
DB_PORT=5432
DB_USER=campustrade
DB_PASSWORD=campustrade_pass
DB_NAME=campustrade
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=campustrade_super_secret_jwt_key_2026_production
FRONTEND_URL=http://209.38.199.108:4000,http://209.38.199.108.nip.io:4000
GOOGLE_CLIENT_ID=81640689481-v4fppdfndv88nee0f1kh23civ41ik16p.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=Sasp0331@gmail.com
SMTP_PASS=tkibemqcpvqqdjsh
FROM_EMAIL=Sasp0331@gmail.com
VAPID_PUBLIC_KEY=BF4IXOV45rHfkZXdKF3PwpEF7IIVAJGP0wid1VPSuec-yr7E6QX957ic0OucfCn5JLHxakV3xBOGbFLbtPaJqA0
VAPID_PRIVATE_KEY=yr7E6QX957ic0OucfCn5JLHxakV3xBOGbFLbtPaJqA0
VAPID_EMAIL=mailto:nkinyampraises.ncha@ictuniversity.edu.cm
GRAFANA_USER=admin
GRAFANA_PASS=campustrade123
ENVEOF

echo ".env written successfully."

# ── 3. Start all containers ───────────────────────────────────────────────────
echo ""
echo "[3/7] Starting Docker containers..."
cd "$BACKEND_DIR"
docker compose down --remove-orphans
docker compose up -d --build
echo "Waiting 20 seconds for services to be ready..."
sleep 20

# ── 4. Run database schema ────────────────────────────────────────────────────
echo ""
echo "[4/7] Creating database tables..."
cat "$BACKEND_DIR/init.sql" | docker compose exec -T postgres psql -U campustrade -d campustrade
echo "Database schema applied."

# ── 5. Create admin user ──────────────────────────────────────────────────────
echo ""
echo "[5/7] Creating admin user (admin12@gmail.com / Admin123456)..."
docker compose exec auth-service node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres',
  user: 'campustrade',
  password: 'campustrade_pass',
  database: 'campustrade'
});
bcrypt.hash('Admin123456', 12).then(async (hash) => {
  await pool.query(
    \`INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified)
     VALUES ('admin12@gmail.com', '\` + hash + \`', 'Admin', 'CampusTrade', 'admin', true)
     ON CONFLICT (email) DO UPDATE
     SET role='admin', is_verified=true, password_hash=EXCLUDED.password_hash\`
  );
  console.log('Admin user created successfully.');
  await pool.end();
}).catch(e => { console.error(e.message); process.exit(1); });
"

# ── 6. Build frontend ─────────────────────────────────────────────────────────
echo ""
echo "[6/7] Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
mkdir -p /var/www/html
cp -r dist/* /var/www/html/
echo "Frontend deployed to /var/www/html/"

# ── 7. Reload Nginx ───────────────────────────────────────────────────────────
echo ""
echo "[7/7] Reloading Nginx..."
nginx -s reload

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "  Frontend:  http://209.38.199.108:4000"
echo "  API:       http://209.38.199.108:8080"
echo "  Grafana:   http://209.38.199.108:3009  (admin / campustrade123)"
echo "  Prometheus:http://209.38.199.108:9090"
echo ""
echo "  Admin login: admin12@gmail.com / Admin123456"
echo ""
echo "  For Google OAuth, open:"
echo "  http://209.38.199.108.nip.io:4000"
echo "=========================================="
