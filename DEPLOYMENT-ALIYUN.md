## AliCloud Production Deployment Guide

This document describes how to deploy **Project-Management-V2.0** to production on AliCloud with:

- **Backend + Postgres DB** on: `172.28.80.51` (Private) / `8.215.56.98:1819` (Public)
- **Frontend (Nginx + static files)** on: `172.28.80.50` (Private) / `147.139.176.70:1817` (Public)

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
    proxy_pass http://8.215.56.98:1819;
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
    proxy_pass http://8.215.56.98:1819;
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

**CRITICAL**: Security Groups control what traffic can reach your instances. This is the most common cause of public IP access issues.

If you use AliCloud security groups / VPC ACLs, configure equivalent rules:

**Frontend Server (172.28.80.50):**
- Allow inbound **1817/tcp** (or your actual port) from `0.0.0.0/0` for public access
- If SSH is on port 1818, allow **1818/tcp** from specific IPs only for security

**Backend Server (172.28.80.51):**
- Allow inbound **3000/tcp** from `172.28.80.50/32` (frontend private IP only)
- Do **not** expose port 3000 publicly (frontend proxies all requests)

**How to configure Security Group in AliCloud Console:**

1. **Go to**: ECS → Instances → Select your frontend instance
2. **Click**: Security Groups tab → Click on the security group name
3. **Go to**: Inbound Rules (入站规则)
4. **Add Rule**:
   - **Authorization Policy**: Allow
   - **Priority**: 1 (highest priority)
   - **Protocol Type**: TCP
   - **Port Range**: `1817/1817` (or your actual port)
   - **Authorization Object**: `0.0.0.0/0` (allows from anywhere, or specify IP ranges)
   - **Description**: "Frontend HTTP Access"

5. **Click**: Save

**Port Mapping in AliCloud:**
- If using **Elastic IP (EIP)**: Ensure EIP is bound to the instance (check in ECS → Network & Security)
- If using **NAT Gateway**: Configure DNAT entries if needed:
   - `147.139.176.70:1817` → `172.28.80.50:1817` (Frontend)
   - `8.215.56.98:1819` → `172.28.80.51:3000` (Backend, optional direct access)

**Troubleshooting Public IP Access:**

If private IP works but public IP doesn't (even with Security Group configured correctly):

1. **Verify EIP Binding:**
   - ECS → Instances → Your instance → Network & Security tab
   - Ensure Elastic IP `147.139.176.70` shows as "Bound" (已绑定) to your frontend instance
   - **Important**: The EIP must be bound to the instance that has the container running
   - If not bound, click "Bind Elastic IP" and select `147.139.176.70`
   - Wait 1-2 minutes after binding for changes to take effect

2. **Check if using NAT Gateway (DNAT):**
   - If your instance is in a VPC and using NAT Gateway, you may need DNAT entries
   - NAT Gateway → DNAT Entries → Check if there's a mapping:
     - External IP: `147.139.176.70`
     - External Port: `1817`
     - Internal IP: `172.28.80.50`
     - Internal Port: `1817`
   - If missing, create a DNAT entry

3. **Verify Security Group is attached to correct instance:**
   - ECS → Instances → Your frontend instance (172.28.80.50)
   - Security Groups tab → Verify the security group with port 1817 rule is listed
   - If multiple security groups, ensure at least one has the 1817 rule

4. **Check VPC Route Table:**
   - VPC → Route Tables → Your route table
   - Ensure there's a default route (`0.0.0.0/0`) pointing to:
     - Internet Gateway (if using EIP directly), OR
     - NAT Gateway (if using NAT Gateway)
   - Without this route, public traffic cannot reach the instance

5. **Test from different locations:**
   
   **Important Note**: Testing from the frontend server itself using its own public IP often times out - this is normal behavior. Test from elsewhere.
   
   ```bash
   # From backend server (within VPC):
   curl -v http://147.139.176.70:1817/health
   
   # From your local computer/browser (outside VPC):
   curl -v http://147.139.176.70:1817/health
   # Or open in browser: http://147.139.176.70:1817
   
   # From frontend server itself (using public IP often fails - this is expected):
   # Use private IP instead:
   curl http://172.28.80.50:1817/health
   ```
   
   **Why accessing own public IP from the server fails:**
   - Traffic tries to go out to internet and back, which may be blocked by routing policies
   - Use private IP when testing from the same server
   - Test public IP from a different location (backend server, your computer, etc.)

6. **Check instance network configuration:**
   ```bash
   # On frontend server (172.28.80.50):
   ip addr show
   # Should show the private IP 172.28.80.50
   
   # Check if instance can reach internet (outbound):
   curl -I http://www.alipay.com
   # If this fails, the instance may not have internet gateway configured
   
   # Verify container is accessible via private IP:
   curl http://localhost:1817/health
   # Should return: healthy
   
   # Verify container is accessible via private IP from outside container:
   curl http://172.28.80.50:1817/health
   # Should return: healthy
   ```

7. **Check for OS-level firewall (iptables/ufw):**
   ```bash
   # On frontend server:
   # Check UFW status
   sudo ufw status
   
   # Check iptables rules (if UFW not used):
   sudo iptables -L -n -v | grep 1817
   
   # If UFW is active, ensure port 1817 is allowed:
   sudo ufw allow 1817/tcp
   sudo ufw reload
   ```
   
8. **Verify Docker port binding:**
   ```bash
   # On frontend server:
   docker ps --format "{{.Names}}: {{.Ports}}" | grep frontend
   # Should show: 0.0.0.0:1817->80/tcp
   # If it shows 127.0.0.1:1817->80/tcp, that's the problem - rebuild container
   # If empty, check container name:
   docker ps --format "table {{.Names}}\t{{.Ports}}"
   ```

9. **Most Common Issue: NAT Gateway DNAT Entry Missing**
   
   If private IP works but public IP doesn't (from any location), **you likely need a DNAT entry** in NAT Gateway.
   
   **How to Check Existing DNAT Entries:**
   
   **Method 1: Via AliCloud Console (Easiest)**
   
   1. Go to: **NAT Gateway** → Select your NAT Gateway
   2. Click: **DNAT Entry List** (DNAT条目列表)
   3. **Look for entries with:**
      - External IP: `147.139.176.70`
      - Check both ports: `1817` (frontend) and `1818` (SSH, if needed)
   
   4. **Verify the entry:**
      - External Port: `1817` (or `1818`)
      - Internal IP: Should be `172.28.80.50` for frontend
      - Internal Port: Should match External Port (`1817` for frontend, `1818` for SSH)
      - Status: Should be "Available" (可用)
   
   **Method 2: Via AliCloud CLI (If installed)**
   
   ```bash
   # Install AliCloud CLI if not installed:
   # wget https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz
   # tar xzvf aliyun-cli-linux-latest-amd64.tgz
   # sudo mv aliyun /usr/local/bin/
   
   # Configure credentials (if not already done):
   # aliyun configure
   
   # List all NAT Gateways (to find the ID):
   aliyun vpc DescribeNatGateways
   
   # List DNAT entries (replace NAT_GATEWAY_ID with actual ID):
   aliyun vpc DescribeForwardTableEntries \
     --RegionId cn-hangzhou \
     --ForwardTableId <YOUR_NAT_GATEWAY_ID>
   
   # Filter for your IP and ports:
   aliyun vpc DescribeForwardTableEntries \
     --RegionId cn-hangzhou \
     --ForwardTableId <YOUR_NAT_GATEWAY_ID> | \
     grep -E "147.139.176.70|1817|1818"
   ```
   
   **Method 3: Quick Check Script**
   
   Run this on any server with AliCloud CLI access:
   
   ```bash
   # Check DNAT entries for your public IP
   PUBLIC_IP="147.139.176.70"
   PORTS="1817 1818"
   
   echo "Checking DNAT entries for $PUBLIC_IP..."
   echo ""
   
   for PORT in $PORTS; do
     echo "Checking port $PORT:"
     # Use AliCloud CLI to check (requires proper setup)
     # This is a template - actual command depends on your CLI setup
     echo "  External IP: $PUBLIC_IP"
     echo "  External Port: $PORT"
     echo "  Check in console: NAT Gateway → DNAT Entry List"
   done
   ```
   
   **What to Look For:**
   
   - ✅ **DNAT entry exists for port 1817** → Good! Frontend should work
   - ❌ **No DNAT entry for port 1817** → **This is the problem!**
   - ⚠️ **DNAT entry exists for port 1818** → This is for SSH, not frontend
   - ❌ **DNAT entry points to wrong internal IP** → Fix the Internal IP
   - ❌ **DNAT entry points to wrong internal port** → Fix the Internal Port
   
   **If DNAT Entry is Missing for Port 1817:**
   
   1. Go to: **NAT Gateway** → Select your NAT Gateway
   2. Click: **DNAT Entry List** (DNAT条目列表)
   3. Click: **Create DNAT Entry** (创建DNAT条目)
   4. Fill in:
      - **Entry Type**: Select "Port" (端口)
      - **Public IP Address**: Select `147.139.176.70`
      - **Public Port**: `1817`
      - **Private IP Address**: Select `172.28.80.50` (your frontend instance)
      - **Private Port**: `1817`
      - **Protocol**: TCP
      - **Entry Name**: `frontend-http-1817` (optional)
   5. Click **OK**
   6. **Wait 1-2 minutes** for the DNAT entry to take effect
   
   **Test After Creating DNAT Entry:**
   
   ```bash
   # From backend server:
   curl -v --connect-timeout 10 http://147.139.176.70:1817/health
   # Should return: healthy
   
   # From your laptop browser:
   # http://147.139.176.70:1817
   ```

7. **Verify the public IP is actually assigned to this instance:**
   - In AliCloud Console, check:
     - Elastic IP `147.139.176.70` → Associated Instance → Should show your frontend instance
     - OR Instance → Network & Security → Public IP/EIP → Should show `147.139.176.70`

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
- [ ] `frontend/nginx.conf` proxies `/api` and `/docs` to `http://8.215.56.98:1819` (or `172.28.80.51:3000` if using private network).
- [ ] `docker-compose.frontend.yml` exists and configured with port `1818:80`.
- [ ] `project_management_frontend` container is running.
- [ ] Firewall allows port `1818/tcp` (and AliCloud security group configured).
- [ ] Accessing `http://147.139.176.70:1818` in the browser shows the app and allows login.

Once all boxes are checked, the application should be fully live in production on AliCloud. 

---

## 8. Troubleshooting

### 8.0. Port already in use error

If you get `failed to bind host port 0.0.0.0:1818/tcp: address already in use`:

**Step 1: Check what's using port 1818**

```bash
# Check if another container is using the port
docker ps -a | grep 1818

# Check all containers that might be using port 1818
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 1818

# Check what process is using port 1818 (Linux)
sudo lsof -i :1818
# or
sudo netstat -tulpn | grep 1818
# or
sudo ss -tlnp | grep 1818

# If lsof is not available, use:
sudo fuser 1818/tcp
```

**Step 2: Stop existing containers and networks**

```bash
# Stop and remove any existing frontend containers
docker stop project_management_frontend 2>/dev/null
docker rm project_management_frontend 2>/dev/null

# Or if using docker-compose (this also cleans up networks)
cd /opt/Project-Management-V2.0
docker compose -f docker-compose.frontend.yml down -v

# Check for any other containers that might be using port 1818
docker ps -a --filter "publish=1818"

# Force remove all stopped containers with that port mapping
docker ps -aq --filter "publish=1818" | xargs -r docker rm -f
```

**Step 3: Check for other services or Docker conflicts**

If port 1818 is used by another service (not Docker):

```bash
# Find the process ID (PID) - method 1
sudo lsof -i :1818

# Find the process ID (PID) - method 2
sudo fuser 1818/tcp

# Stop the process (replace PID with actual process ID from above)
sudo kill -9 <PID>

# If it's a Docker process but not showing in docker ps:
# Check Docker's internal network mappings
docker inspect $(docker ps -aq) 2>/dev/null | grep -A 10 '"Ports"' | grep 1818
```

**If port is still in use after stopping containers:**

```bash
# Kill the process directly using fuser
sudo fuser -k 1818/tcp

# Or find and kill using ss
sudo ss -tlnp | grep 1818
# Note the PID from the output, then:
sudo kill -9 <PID>

# Verify port is now free
sudo lsof -i :1818
# Should return nothing
```

**Step 4: Restart frontend container**

```bash
cd /opt/Project-Management-V2.0
docker compose -f docker-compose.frontend.yml up -d frontend
```

**Alternative: Use a different port**

If you need to keep the existing service on port 1818, you can temporarily use a different port:

1. Edit `docker-compose.frontend.yml` and change `1818:80` to `1817:80` (or another available port)
2. Update AliCloud Security Group to allow the new port
3. Restart the container

**Important Note**: If port 1818 is already in use (e.g., by SSH), Docker will automatically fail to bind. Check what's using the port first:
```bash
sudo netstat -tulpn | grep 1818
# If it shows sshd or another service, either:
# - Use a different port for frontend (1817, 1819, etc.)
# - Or change the conflicting service's port
```

### 8.1. Frontend not accessible - Complete Diagnostic

If the frontend site can't be reached, run through this complete checklist:

**Run all these commands on the frontend server (172.28.80.50):**

```bash
echo "=== 1. Container Status ==="
docker ps -a | grep frontend

echo ""
echo "=== 2. Container Logs (last 30 lines) ==="
docker logs project_management_frontend --tail 30 2>&1

echo ""
echo "=== 3. Port Binding Check ==="
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep frontend

echo ""
echo "=== 4. Port Listening on Host ==="
sudo netstat -tulpn | grep -E "1818|1817" || echo "Port not found in netstat"
sudo ss -tlnp | grep -E "1818|1817" || echo "Port not found in ss"

echo ""
echo "=== 5. Test Local Access ==="
curl -v http://localhost:1818/health 2>&1 | head -20 || echo "CURL FAILED - Container may not be responding"
# If you changed to a different port, replace 1818 with your new port

echo ""
echo "=== 6. Frontend Files Check ==="
ls -la /opt/Project-Management-V2.0/frontend/ | head -10

echo ""
echo "=== 7. Nginx Configuration Test ==="
docker exec project_management_frontend nginx -t 2>&1 || echo "Cannot test nginx config - container may not be running"

echo ""
echo "=== 8. Firewall Status ==="
sudo ufw status | grep -E "1818|1817" || echo "No UFW rules found for this port"

echo ""
echo "=== 9. Container Network ==="
docker inspect project_management_frontend --format '{{json .NetworkSettings.Ports}}' 2>/dev/null | python3 -m json.tool || docker inspect project_management_frontend --format '{{json .NetworkSettings.Ports}}' 2>/dev/null

echo ""
echo "=== 10. Docker Compose Status ==="
cd /opt/Project-Management-V2.0
docker compose -f docker-compose.frontend.yml ps
```

**What to look for in each step:**

1. **Container Status**: Should show container as "Up" (not "Exited" or "Restarting")
2. **Container Logs**: Check for nginx errors, file permission issues, or config errors
3. **Port Binding**: Should show `0.0.0.0:1818->80/tcp` (or your custom port)
4. **Port Listening**: Should show port is listening on 0.0.0.0:1818
5. **Local Access**: Should return "healthy" or HTML content
6. **Frontend Files**: Should see `index.html`, `main.js`, `styles.css`, `nginx.conf`
7. **Nginx Config**: Should say "syntax is ok" and "test is successful"
8. **Firewall**: Should show a rule allowing your port
9. **Container Network**: Should show port mapping
10. **Compose Status**: Should show service as running

### 8.1. Frontend not accessible - Quick Fixes

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

**Important**: Replace `1818` with the actual port your frontend container is using (check with `docker ps` on the frontend server). Common ports are `1817` or `1818`.

```bash
# Test frontend via private IP (replace PORT with actual port, e.g., 1817)
curl http://172.28.80.50:PORT/health
curl http://172.28.80.50:PORT/api/health

# Or test via public IP
curl http://147.139.176.70:PORT/health
curl http://147.139.176.70:PORT/api/health

# Example if using port 1817:
curl http://172.28.80.50:1817/health
curl http://147.139.176.70:1817/health
```

**Troubleshooting curl errors:**

- `curl: (1) Received HTTP/0.9 when not allowed` → You're connecting to the wrong port (likely SSH)
- `curl: (7) Failed to connect` → Port is not open in firewall/security group, or container is not running
- `curl: (28) Connection timed out` → Security group is blocking the connection
- `401 Unauthorized` or `403 Forbidden` → Expected for `/api/*` endpoints without authentication

**To find the correct port:**
```bash
# On frontend server (172.28.80.50):
docker ps --format "{{.Ports}}" | grep frontend | grep -oP '\d+(?=->80)'
```

If these fail, it's a network/firewall issue between servers.

**If private IP works but public IP doesn't:**

This indicates the container is working, but public IP access is blocked. Common causes:

1. **AliCloud Security Group** - Port 1817 not allowed from public IPs
2. **EIP not properly bound** - Elastic IP not associated with the instance
3. **NAT Gateway configuration** - If using NAT Gateway, port forwarding may be missing
4. **VPC route table** - Public traffic not routing to the instance

**Fix steps:**

```bash
# On backend server, test what happens with public IP
curl -v http://147.139.176.70:1817/health
# Check the error message:
# - Connection timeout → Security group blocking
# - Connection refused → Port not open or EIP not bound
# - No route to host → Routing issue
```

**In AliCloud Console:**

1. **Check EIP binding:**
   - ECS → Instances → Your frontend instance
   - Network & Security → Check if Elastic IP is "Bound"

2. **Check Security Group:**
   - Security Groups → Your security group → Inbound Rules
   - Must have rule: Port `1817/tcp`, Source `0.0.0.0/0`, Action `Allow`

3. **If using NAT Gateway:**
   - NAT Gateway → SNAT/DNAT entries
   - Ensure DNAT entry exists: Public IP:1817 → Private IP:1817

### 8.2. Backend API not reachable from frontend

If the frontend loads but API calls fail (e.g., `ERR_EMPTY_RESPONSE`, `Failed to fetch`):

**Common Symptoms:**
- Frontend UI loads but login/API calls fail
- Browser console shows: `net::ERR_EMPTY_RESPONSE` or `Failed to fetch`
- API endpoints return empty responses or timeouts

**Quick Diagnostic:**

Run this on the frontend server (172.28.80.50):

```bash
echo "=== Backend API Connectivity Test ==="
echo ""

echo "1. Test backend health endpoint via public IP:"
curl -v --connect-timeout 10 http://8.215.56.98:1819/health
echo ""

echo "2. Test backend health endpoint via private IP:"
curl -v --connect-timeout 10 http://172.28.80.51:3000/health
echo ""

echo "3. Test forgot-password endpoint (should return JSON):"
curl -v --connect-timeout 10 -X POST http://8.215.56.98:1819/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
echo ""

echo "4. Check if backend container is running (from backend server):"
echo "   SSH to backend server and run: docker ps | grep backend"
echo ""

echo "5. Check nginx proxy configuration:"
cat /opt/Project-Management-V2.0/frontend/nginx.conf | grep -A 5 "location /api/"
```

**What to look for:**

1. **If private IP (172.28.80.51:3000) works but public IP (8.215.56.98:1819) doesn't:**
   - Missing NAT Gateway DNAT entry for port 1819
   - Security Group not allowing port 1819
   - Backend container not listening on 0.0.0.0:3000

2. **If both fail:**
   - Backend container not running
   - Backend not accessible from frontend server
   - Network/firewall blocking

3. **If curl works but browser doesn't:**
   - CORS issue (check backend CORS configuration)
   - Browser blocking mixed content
   - Nginx proxy configuration issue

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

# Should show: proxy_pass http://8.215.56.98:1819;
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
