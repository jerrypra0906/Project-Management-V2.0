## AliCloud Production Deployment Guide

This document describes how to deploy **Project-Management-V2.0** to production on AliCloud with:

- **Backend + Postgres DB** on: `172.28.80.51` (Private) / `147.139.176.70:1819` (Public)
- **Frontend (Nginx + static files)** on: `172.28.80.50` (Private) / `147.139.176.70:1818` (Public)

Assumptions:

- Docker & Docker Compose are **already installed** on both servers.
- You have **sudo** or equivalent privileges.
- Outbound internet is allowed to GitHub, SMTP, and (optionally) Google Sheets.
- All commands below are executed as a non‑root user that is in the `docker` group.

---

## 1. Code checkout / update (both servers)

### 1.1. Initial clone

On **each** server (`172.28.80.51` and `172.28.80.50`):

```bash
cd /opt
git clone https://github.com/jerrypra0906/Project-Management-V2.0.git
cd Project-Management-V2.0
```

If `/opt` is not suitable, choose another directory (but keep paths consistent for these docs).

### 1.2. Updating to a new version

Whenever you deploy a new version:

```bash
cd /opt/Project-Management-V2.0
git pull origin main
```

Then follow the service‑specific restart steps below.

---

## 2. Backend + Database (172.28.80.51)

This server runs:

- Postgres database
- Node.js backend API (Express) and background jobs

### 2.1. Environment configuration

On **172.28.80.51**:

```bash
cd /opt/Project-Management-V2.0
```

Create or edit `.env`:

```bash
cat > .env << 'EOF'
# -----------------------
# Database (Postgres)
# -----------------------
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=project_management_v2

# -----------------------
# Node backend
# -----------------------
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT + initial admin user (used by seed script)
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=StrongAdmin123!
ADMIN_NAME=Administrator

# Frontend URL (Public URL users will access)
FRONTEND_URL=http://147.139.176.70:1818

# -----------------------
# Email / SMTP
# -----------------------
EMAIL_FROM=noreply@energi-up.com
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_REJECT_UNAUTHORIZED=true

# -----------------------
# Google Sheets (optional)
# -----------------------
SHEET_ID=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY
GID=1287888772
CR_GID=355802550
EOF
```

Notes:

- Keep `.env` **only on the server**; do not commit to Git.
- Adjust SMTP values and admin credentials to your environment.
- Set `FRONTEND_URL` to whatever URL users will open (e.g. `https://pm.yourcompany.com`).

### 2.2. Start Postgres + backend services

The main `docker-compose.yml` contains three services: `postgres`, `backend`, `frontend`.
On the backend server we only run **postgres** and **backend**:

```bash
cd /opt/Project-Management-V2.0

# Build images (first time or after code changes)
docker compose build postgres backend

# Start DB + backend in detached mode
docker compose up -d postgres backend
```

Check containers:

```bash
docker ps
docker logs project_management_db --tail 50
docker logs project_management_backend --tail 50
```

### 2.3. Database migrations

The project uses SQL migrations in the `migrations/` folder.  
Apply them inside the Postgres container so you don’t need `psql` on the host.

From `/opt/Project-Management-V2.0`:

```bash
# Copy migration files into the DB container (one‑time or when new migrations are added)
docker cp migrations/001_initial_schema.sql project_management_db:/001_initial_schema.sql
docker cp migrations/002_add_notifications_table.sql project_management_db:/002_add_notifications_table.sql
docker cp migrations/003_update_users_and_initiatives.sql project_management_db:/003_update_users_and_initiatives.sql

# Run migrations inside the DB container
docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /001_initial_schema.sql

docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /002_add_notifications_table.sql

docker exec -it project_management_db \
  psql -U postgres -d project_management_v2 -f /003_update_users_and_initiatives.sql
```

All migrations are written to be **idempotent** (`IF NOT EXISTS`), so re‑running them is safe.

#### Optional: Role migration

If you need to normalize historical roles (`ITPIC` → `IT`, etc.), run:

```bash
docker exec -it project_management_backend node backend/migrate_user_roles.js
```

### 2.4. Health checks

From **172.28.80.51**:

```bash
curl http://localhost:3000/health
```

You should receive: `{"ok":true}`

**Note:** The `/api/dashboard` and `/api/initiatives` endpoints require authentication, so they will return `{"error":"Authentication required"}` without a valid JWT token. This is expected behavior. The `/health` endpoint is public and confirms the backend is running.

### 2.5. Restart / update backend

When deploying new backend code:

```bash
cd /opt/Project-Management-V2.0
git pull origin main

docker compose build backend
docker compose up -d backend
```

If migrations changed, re‑run the new migration file via `docker exec` as shown above.

---

## 3. Frontend (172.28.80.50)

This server runs:

- Nginx serving the static frontend
- Nginx proxying API requests to the backend server `172.28.80.51:3000`

### 3.1. Configure Nginx proxy

On **172.28.80.50**:

```bash
cd /opt/Project-Management-V2.0
```

Edit `frontend/nginx.conf` and set the `proxy_pass` targets to the backend IP:

```nginx
location /api/ {
    proxy_pass http://147.139.176.70:1819;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location /docs/ {
    proxy_pass http://147.139.176.70:1819;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Leave the rest of the file (static asset caching, security headers, SPA routing) as is.

### 3.2. Frontend‑only Docker Compose file

To avoid running backend/DB here, create `/opt/Project-Management-V2.0/docker-compose.frontend.yml`:

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: project_management_frontend
    ports:
      - "80:80"   # application will be served on port 80
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
      - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
```

### 3.3. Start frontend

```bash
cd /opt/Project-Management-V2.0

docker compose -f docker-compose.frontend.yml build frontend
docker compose -f docker-compose.frontend.yml up -d frontend
```

Check:

```bash
docker ps
docker logs project_management_frontend --tail 50
```

Open in a browser:

- **Public URL**: `http://147.139.176.70:1818` → Project & Change Request Management UI
- **Private URL** (from within same VPC): `http://172.28.80.50:1818`

You should be able to log in using the admin credentials configured on the backend.

### 3.4. Restart / update frontend

When deploying an updated frontend:

```bash
cd /opt/Project-Management-V2.0
git pull origin main

docker compose -f docker-compose.frontend.yml build frontend
docker compose -f docker-compose.frontend.yml up -d frontend
```

---

## 4. Networking, firewall, and DNS

### 4.1. Server Configuration Summary

**Frontend Server (172.28.80.50):**
- Private IP: `172.28.80.50`
- Public IP: `147.139.176.70`
- Public Port: `1818`
- Container Port: `80`

**Backend Server (172.28.80.51):**
- Private IP: `172.28.80.51`
- Public IP: `147.139.176.70`
- Public Port: `1819`
- Container Port: `3000`

### 4.2. Firewall Configuration

**On backend server (172.28.80.51):**
- Allow port **3000/tcp** from **172.28.80.50** only (for internal API access).
- Do **not** expose Postgres (5432/5434) publicly; only allow internal access if needed.

**On frontend server (172.28.80.50):**
- Allow port **1818/tcp** from end‑user networks (public access).
- Allow port **80/tcp** internally (if needed for health checks).

On Ubuntu with UFW you could do:

```bash
# On backend server
sudo ufw allow from 172.28.80.50 to any port 3000 proto tcp

# On frontend server
sudo ufw allow 1818/tcp
```

### 4.3. AliCloud Security Groups

If you use AliCloud security groups / VPC ACLs, configure equivalent rules:

**Frontend Server (172.28.80.50):**
- Allow inbound **1818/tcp** from `0.0.0.0/0` (or specific IP ranges) for public access

**Backend Server (172.28.80.51):**
- Allow inbound **3000/tcp** from `172.28.80.50/32` (frontend private IP only)
- Do **not** expose port 3000 publicly (frontend proxies all requests)

**Port Mapping in AliCloud:**
- Configure NAT Gateway or EIP port forwarding if needed:
  - `147.139.176.70:1818` → `172.28.80.50:1818` (Frontend)
  - `147.139.176.70:1819` → `172.28.80.51:3000` (Backend, optional direct access)

### 4.4. Optional DNS Configuration

- Point `pm.yourcompany.com` → `147.139.176.70`
- Update `FRONTEND_URL` in backend `.env` to `http://pm.yourcompany.com:1818` (or `https://...` once TLS is enabled).
- Consider using a reverse proxy (nginx/Apache) on the frontend server to map port 80 → 1818 if you want standard HTTP port access.

---

## 5. Health checks and monitoring

### 5.1. Manual checks

- Backend health:

  ```bash
  curl http://172.28.80.51:3000/health
  ```

  Should return: `{"ok":true}`

- Frontend health:

  ```bash
  # From frontend server (private)
  curl http://localhost:1818/health
  
  # From external (public)
  curl http://147.139.176.70:1818/health
  ```
  
  Should return: `healthy`

- Container logs:

  ```bash
  # Backend server
  docker logs -f project_management_backend
  docker logs -f project_management_db

  # Frontend server
  docker logs -f project_management_frontend
  ```

### 5.2. Simple status script (optional)

Create `/usr/local/bin/pm-status.sh` (on each server):

```bash
#!/usr/bin/env bash
echo \"=== Docker containers ===\"
docker ps
echo
echo \"=== Backend health ===\"
curl -sS http://localhost:3000/health || echo \"backend not reachable\"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/pm-status.sh
```

Run as needed:

```bash
pm-status.sh
```

You can also integrate these checks into AliCloud CloudMonitor or your own monitoring system.

---

## 6. Backups and rollback

### 6.1. Database backups

On the backend server, create a backup directory:

```bash
sudo mkdir -p /var/backups/project_management
sudo chown $USER:$USER /var/backups/project_management
```

Add a daily cron job to dump the DB (run `crontab -e`):

```cron
0 2 * * * docker exec project_management_db pg_dump -U postgres project_management_v2 > /var/backups/project_management/pm_$(date +\%F).sql
```

Rotate / clean up old backups periodically (e.g. via another cron or logrotate).

### 6.2. Restoring from backup

Copy the chosen `.sql` file to the backend server (if not already there), then:

```bash
docker exec -i project_management_db psql -U postgres -d project_management_v2 < /path/to/backup.sql
```

### 6.3. Code rollback

If a deployment causes issues:

```bash
cd /opt/Project-Management-V2.0
git log --oneline   # find previous stable commit
git checkout <COMMIT_HASH>

# Rebuild & restart backend and/or frontend as in sections 2.5 / 3.4
```

(Optionally you can create release tags in Git to simplify this.)

---

## 7. Quick deployment checklist

**Backend / DB (172.28.80.51):**

- [ ] Repo cloned and on correct commit (`git pull origin main`).
- [ ] `.env` created with correct secrets and SMTP/FRONTEND_URL.
- [ ] Containers running: `project_management_db`, `project_management_backend`.
- [ ] Migrations `001`, `002`, `003` executed successfully.
- [ ] `curl http://localhost:3000/health` returns `{"ok":true}`.

**Frontend (172.28.80.50):**

- [ ] Repo cloned and on correct commit.
- [ ] `frontend/nginx.conf` proxies `/api` and `/docs` to `http://147.139.176.70:1819` (or `172.28.80.51:3000` if using private network).
- [ ] `docker-compose.frontend.yml` exists and configured with port `1818:80`.
- [ ] `project_management_frontend` container is running.
- [ ] Firewall allows port `1818/tcp` (and AliCloud security group configured).
- [ ] Accessing `http://147.139.176.70:1818` in the browser shows the app and allows login.

Once all boxes are checked, the application should be fully live in production on AliCloud. 

---

## 8. Troubleshooting

### 8.1. Frontend not accessible (http://147.139.176.70:1818)

If the frontend site can't be reached, check the following:

#### Step 1: Verify container is running

On **172.28.80.50**:

```bash
cd /opt/Project-Management-V2.0
docker ps
```

You should see `project_management_frontend` in the list. If not:

```bash
docker compose -f docker-compose.frontend.yml up -d frontend
```

#### Step 2: Check container logs

```bash
docker logs project_management_frontend --tail 50
```

Look for errors like:
- Nginx configuration errors
- Port binding issues
- File permission errors

#### Step 3: Verify port 80 is listening

```bash
# Check if container is listening on port 1818
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep frontend

# Should show: 0.0.0.0:1818->80/tcp

# Test locally from the server
curl http://localhost:1818/health
# Should return: healthy
```

#### Step 4: Check firewall rules

```bash
# Ubuntu/Debian with UFW
sudo ufw status | grep 1818

# If port 1818 is not open, add it:
sudo ufw allow 1818/tcp
sudo ufw reload
```

#### Step 5: Check AliCloud Security Group

In AliCloud console:
1. Go to **ECS** → **Instances**
2. Find instance `172.28.80.50`
3. Click **Security Groups**
4. Check if port **1818/tcp** is allowed for inbound traffic
5. If not, add a rule:
   - **Type**: Custom TCP
   - **Port Range**: 1818/1818
   - **Authorization Object**: 0.0.0.0/0 (or specific IP ranges)
   - **Action**: Allow
   
**Note**: If you're using the same public IP for both frontend and backend, ensure both ports are configured:
- Port **1818** for frontend
- Port **1819** for backend (if direct backend access is needed)

#### Step 6: Verify nginx configuration

```bash
# Test nginx configuration inside container
docker exec project_management_frontend nginx -t

# Should show: "syntax is ok" and "test is successful"
```

If configuration is invalid, check `frontend/nginx.conf` and restart:

```bash
docker compose -f docker-compose.frontend.yml restart frontend
```

#### Step 7: Check frontend files exist

```bash
# Verify frontend files are present
ls -la /opt/Project-Management-V2.0/frontend/

# Should see: index.html, main.js, styles.css, nginx.conf
```

If files are missing:

```bash
cd /opt/Project-Management-V2.0
git pull origin main
docker compose -f docker-compose.frontend.yml restart frontend
```

#### Step 8: Test from backend server

From **172.28.80.51** (backend server):

```bash
# Test frontend via private IP
curl http://172.28.80.50:1818/health
curl http://172.28.80.50:1818/api/health

# Or test via public IP
curl http://147.139.176.70:1818/health
curl http://147.139.176.70:1818/api/health
```

If these fail, it's a network/firewall issue between servers.

### 8.2. Backend API not reachable from frontend

If the frontend loads but API calls fail:

#### Step 1: Test backend from frontend server

On **172.28.80.50**:

```bash
# Test direct connection to backend via public IP
curl http://147.139.176.70:1819/health
# Should return: {"ok":true}

# Or test via private IP (if within same VPC)
curl http://172.28.80.51:3000/health
# Should return: {"ok":true}
```

If this fails, the backend might not be accessible from the frontend server.

#### Step 2: Verify nginx proxy configuration

```bash
# Check nginx.conf has correct backend IP
cat /opt/Project-Management-V2.0/frontend/nginx.conf | grep proxy_pass

# Should show: proxy_pass http://147.139.176.70:1819;
```

If incorrect, update and restart:

```bash
# Edit the file (or pull from git if updated)
cd /opt/Project-Management-V2.0
# Edit frontend/nginx.conf if needed
docker compose -f docker-compose.frontend.yml restart frontend
```

#### Step 3: Check backend server firewall

On **172.28.80.51** (backend server):

```bash
# Check if backend allows connections from frontend IP
sudo ufw status | grep 3000

# Should allow connections from 172.28.80.50
```

#### Step 4: Verify backend container is running

On **172.28.80.51**:

```bash
docker ps | grep backend
curl http://localhost:3000/health
```

### 8.3. Quick diagnostic script

Create `/usr/local/bin/pm-diagnose.sh` on the frontend server:

```bash
#!/usr/bin/env bash
echo "=== Frontend Diagnostic ==="
echo ""
echo "1. Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|frontend"
echo ""
echo "2. Frontend container logs (last 20 lines):"
docker logs project_management_frontend --tail 20 2>&1 | tail -20
echo ""
echo "3. Port 80 listening:"
docker ps --format "{{.Ports}}" | grep "80->80"
echo ""
echo "4. Local health check:"
curl -sS http://localhost/health || echo "FAILED"
echo ""
echo "5. Nginx config test:"
docker exec project_management_frontend nginx -t 2>&1
echo ""
echo "6. Frontend files:"
ls -la /opt/Project-Management-V2.0/frontend/ | grep -E "index.html|nginx.conf"
echo ""
echo "7. Firewall status (port 1818):"
sudo ufw status | grep "1818/tcp" || echo "No UFW rule found for port 1818"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/pm-diagnose.sh
```

Run it:

```bash
pm-diagnose.sh
```

---
