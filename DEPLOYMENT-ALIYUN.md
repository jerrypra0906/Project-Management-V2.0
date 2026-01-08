## AliCloud Production Deployment Guide

This document describes how to deploy **Project-Management-V2.0** to production on AliCloud with:

- **Backend + Postgres DB** on: `172.28.80.51`
- **Frontend (Nginx + static files)** on: `172.28.80.50`

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

# Frontend URL (IP or domain of the frontend server)
FRONTEND_URL=http://172.28.80.50

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

- `http://172.28.80.50` → Project & Change Request Management UI

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

Typical production configuration:

- **172.28.80.51 (backend + DB)**:
  - Allow port **3000/tcp** from **172.28.80.50** only.
  - Do **not** expose Postgres (5432/5434) publicly; only allow internal access if needed.
- **172.28.80.50 (frontend)**:
  - Allow port **80/tcp** (and **443/tcp** if you later add TLS) from end‑user networks.

On Ubuntu with UFW you could do:

```bash
# On backend server
sudo ufw allow from 172.28.80.50 to any port 3000 proto tcp

# On frontend server
sudo ufw allow 80/tcp
```

If you use AliCloud security groups / VPC ACLs, configure equivalent rules there.

Optional DNS:

- Point `pm.yourcompany.com` → `172.28.80.50`
- Update `FRONTEND_URL` in backend `.env` to `http://pm.yourcompany.com` (or `https://...` once TLS is enabled).

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
  curl http://172.28.80.50/health
  ```

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
- [ ] `frontend/nginx.conf` proxies `/api` and `/docs` to `172.28.80.51:3000`.
- [ ] `docker-compose.frontend.yml` exists and `project_management_frontend` is running.
- [ ] Accessing `http://172.28.80.50` in the browser shows the app and allows login.

Once all boxes are checked, the application should be fully live in production on AliCloud. 


