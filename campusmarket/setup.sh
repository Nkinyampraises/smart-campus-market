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
echo "[1/8] Pulling latest code from GitHub..."
cd /opt/campustrade
git pull origin main

# ── 2. Write .env file ────────────────────────────────────────────────────────
echo ""
echo "[2/8] Writing .env file..."
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

# ── 3. Write Nginx config (with 20MB body limit for image uploads) ────────────
echo ""
echo "[3/8] Writing Nginx config..."
cat > /etc/nginx/sites-available/campustrade << 'NGINXEOF'
server {
    listen 4000 default_server;
    server_name _;

    # Allow large uploads (base64 images in JSON)
    client_max_body_size 20m;

    root /var/www/html;
    index index.html;

    # Serve React SPA — all routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy all API calls to the API gateway
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        client_max_body_size 20m;
    }

    # Proxy Socket.IO for real-time chat
    location /socket.io/ {
        proxy_pass http://localhost:3004/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/campustrade /etc/nginx/sites-enabled/campustrade
rm -f /etc/nginx/sites-enabled/default
nginx -t && echo "Nginx config OK"

# ── 4. Start all containers ───────────────────────────────────────────────────
echo ""
echo "[4/8] Starting Docker containers..."
cd "$BACKEND_DIR"
docker compose down --remove-orphans
docker compose up -d --build
echo "Waiting 25 seconds for postgres to be ready..."
sleep 25

# ── 5. Run database schema ────────────────────────────────────────────────────
echo ""
echo "[5/8] Creating database tables..."
cat "$BACKEND_DIR/init.sql" | docker compose exec -T postgres psql -U campustrade -d campustrade
echo "Database schema applied."

# ── 6. Create admin user ──────────────────────────────────────────────────────
echo ""
echo "[6/8] Creating admin user..."
docker compose exec auth-service node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ host:'postgres', user:'campustrade', password:'campustrade_pass', database:'campustrade' });
bcrypt.hash('Admin123456', 12).then(async (hash) => {
  await pool.query(
    'INSERT INTO users (email,password_hash,first_name,last_name,role,is_verified,campus_zone,bio) VALUES (\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8) ON CONFLICT (email) DO UPDATE SET role=\$5, is_verified=\$6, password_hash=\$2',
    ['admin12@gmail.com', hash, 'Admin', 'CampusTrade', 'admin', true, 'Admin Office', 'CampusTrade platform administrator']
  );
  console.log('Admin user ready: admin12@gmail.com / Admin123456');
  await pool.end();
}).catch(e => { console.error(e.message); process.exit(1); });
"

# ── 7. Build and deploy frontend ──────────────────────────────────────────────
echo ""
echo "[7/8] Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
mkdir -p /var/www/html
cp -r dist/* /var/www/html/
echo "Frontend deployed."

# ── 8. Reload Nginx ───────────────────────────────────────────────────────────
echo ""
echo "[8/8] Reloading Nginx..."
nginx -s reload

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "  Live site:   http://209.38.199.108:4000"
echo "  API:         http://209.38.199.108:8080"
echo "  Grafana:     http://209.38.199.108:3009"
echo "  Prometheus:  http://209.38.199.108:9090"
echo ""
echo "  Admin login: admin12@gmail.com / Admin123456"
echo ""
echo "  Google OAuth (use this URL):"
echo "  http://209.38.199.108.nip.io:4000"
echo "=========================================="
