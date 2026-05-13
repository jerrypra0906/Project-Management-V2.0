# Switch to SIT Branch - Step by Step

Your working tree is clean. Now switch to SIT branch:

## Step 2: Fetch and Switch to SIT Branch

Run these commands on your **frontend server**:

```bash
cd /opt/Project-Management-V2.0

# Fetch latest from GitHub (including SIT branch)
git fetch origin

# Switch to SIT branch (creates local SIT tracking origin/SIT)
git checkout -B SIT origin/SIT

# Verify you're on SIT branch
git branch --show-current
# Should show: SIT

# Verify you're up to date
git status
```

**Expected output:**
```
Switched to a new branch 'SIT'
Branch 'SIT' set up to track remote branch 'SIT' from 'origin'.
On branch SIT
Your branch is up to date with 'origin/SIT'.
nothing to commit, working tree clean
```

## Step 3: Verify SSL Files Are Present

After switching to SIT, check that the SSL config files exist:

```bash
# Check nginx-ssl.conf exists
ls -la frontend/nginx-ssl.conf

# Check docker-compose.frontend.yml has SSL config
grep -A 5 "nginx-ssl.conf" docker-compose.frontend.yml

# Check assets/ssl directory structure
ls -la assets/ssl/
```

## Step 4: Copy Your Certificates

Now you can copy your certificate files to the server. Since Workbench isn't working, use one of these methods:

### Option A: Use VNC to Upload Files

1. **Connect via VNC** (from AliCloud Console → Remote Connection → VNC)
2. **Upload files** using VNC file transfer or copy-paste
3. **Move files to correct location:**

```bash
# Create directory if needed
mkdir -p /opt/Project-Management-V2.0/assets/ssl

# Move your cert files here (adjust source path based on where you uploaded them)
# Example if uploaded to /root/:
mv /root/fullchain.pem /opt/Project-Management-V2.0/assets/ssl/
mv /root/privkey.pem /opt/Project-Management-V2.0/assets/ssl/
mv /root/chain.pem /opt/Project-Management-V2.0/assets/ssl/  # if you have it

# Set correct permissions
chmod 644 /opt/Project-Management-V2.0/assets/ssl/fullchain.pem
chmod 600 /opt/Project-Management-V2.0/assets/ssl/privkey.pem
chmod 644 /opt/Project-Management-V2.0/assets/ssl/chain.pem 2>/dev/null || true

# Verify
ls -la /opt/Project-Management-V2.0/assets/ssl/
```

### Option B: Use SCP (if SSH works from your laptop)

From your **Windows laptop** (PowerShell):

```powershell
# Navigate to folder with your cert files
cd C:\path\to\your\certificates

# Copy to server (adjust port if SSH is not on 22)
scp -P 22 fullchain.pem privkey.pem chain.pem root@147.139.176.70:/tmp/

# Or if SSH is on port 1818:
# scp -P 1818 fullchain.pem privkey.pem chain.pem root@147.139.176.70:/tmp/
```

Then on **server**:

```bash
mkdir -p /opt/Project-Management-V2.0/assets/ssl
mv /tmp/fullchain.pem /tmp/privkey.pem /tmp/chain.pem /opt/Project-Management-V2.0/assets/ssl/ 2>/dev/null
chmod 644 /opt/Project-Management-V2.0/assets/ssl/fullchain.pem
chmod 600 /opt/Project-Management-V2.0/assets/ssl/privkey.pem
chmod 644 /opt/Project-Management-V2.0/assets/ssl/chain.pem 2>/dev/null || true
ls -la /opt/Project-Management-V2.0/assets/ssl/
```

## Step 5: Restart Frontend with SSL

After certificates are in place:

```bash
cd /opt/Project-Management-V2.0

# Stop current frontend
docker compose -f docker-compose.frontend.yml down

# Rebuild and start with SSL config
docker compose -f docker-compose.frontend.yml build frontend
docker compose -f docker-compose.frontend.yml up -d frontend

# Check logs
docker logs project_management_frontend --tail 50

# Test HTTPS (if port 18443 is exposed)
curl -vk https://localhost:18443/health
```

## Troubleshooting

### If `git checkout -B SIT origin/SIT` fails:

**Error: "fatal: 'origin/SIT' is not a valid ref"**

```bash
# Fetch again to make sure SIT branch exists
git fetch origin

# List all remote branches
git branch -r | grep SIT

# If SIT exists, try:
git checkout -b SIT origin/SIT
```

### If certificates are wrong format:

If your certs are `.crt` and `.key` instead of `.pem`:

```bash
# Rename them
cd /opt/Project-Management-V2.0/assets/ssl
cp yourdomain.crt fullchain.pem
cp yourdomain.key privkey.pem

# If you have intermediate certs, combine them:
cat yourdomain.crt intermediate.crt > fullchain.pem
```

### If nginx fails to start:

```bash
# Check nginx config syntax
docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$(pwd)/assets/ssl:/etc/nginx/ssl:ro" \
  nginx:alpine \
  nginx -t

# Check container logs
docker logs project_management_frontend --tail 100
```

