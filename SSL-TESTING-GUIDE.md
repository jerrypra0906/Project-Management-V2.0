# SSL Configuration Testing Guide for AliCloud Production

This guide shows you how to run the comprehensive SSL testing script from `DEPLOYMENT-ALIYUN.md` (line 1921) to verify your `nginx-ssl.conf` configuration before deploying.

## Prerequisites

- SSH access to the **frontend server** (`172.28.80.50` or public IP `147.139.176.70`)
- Docker installed and running
- The `frontend/nginx-ssl.conf` file exists in your project directory

---

## Step-by-Step Instructions

### Step 1: SSH to Frontend Server

**From your local machine:**

```bash
# SSH to the frontend server
ssh youruser@147.139.176.70
# Or use private IP if you're within the VPC:
# ssh youruser@172.28.80.50
```

### Step 2: Navigate to Project Directory

```bash
cd /opt/Project-Management-V2.0

# Verify you're in the correct directory
pwd
# Should show: /opt/Project-Management-V2.0
```

### Step 3: Verify nginx-ssl.conf Exists

```bash
# Check if the SSL configuration file exists
ls -la frontend/nginx-ssl.conf

# If file doesn't exist, you need to create it first (see DEPLOYMENT-ALIYUN.md Step 6.2-6.4)
```

**Expected output:**
```
-rw-r--r-- 1 user user 12345 Dec 15 10:30 frontend/nginx-ssl.conf
```

### Step 4: Create the Test Script

**Option A: Create script directly (Recommended)**

```bash
cd /opt/Project-Management-V2.0

# Create the comprehensive test script
cat > /tmp/test-nginx-ssl-config.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Testing nginx-ssl.conf ==="
echo ""

cd /opt/Project-Management-V2.0

# Check 1: File exists
echo "1. Checking if file exists..."
if [ ! -f "frontend/nginx-ssl.conf" ]; then
    echo "   ❌ ERROR: frontend/nginx-ssl.conf not found!"
    exit 1
fi
echo "   ✅ File exists"
echo ""

# Check 2: File is readable
echo "2. Checking file permissions..."
if [ ! -r "frontend/nginx-ssl.conf" ]; then
    echo "   ⚠️  File is not readable, fixing permissions..."
    chmod 644 frontend/nginx-ssl.conf
fi
echo "   ✅ File is readable"
echo ""

# Check 3: Basic syntax checks
echo "3. Checking basic syntax..."
OPEN_BRACES=$(grep -o '{' frontend/nginx-ssl.conf | wc -l)
CLOSE_BRACES=$(grep -o '}' frontend/nginx-ssl.conf | wc -l)
if [ "$OPEN_BRACES" != "$CLOSE_BRACES" ]; then
    echo "   ❌ ERROR: Unmatched braces! Opening: $OPEN_BRACES, Closing: $CLOSE_BRACES"
    exit 1
fi
echo "   ✅ Braces are balanced"
echo ""

# Check 4: Required directives exist
echo "4. Checking required directives..."
REQUIRED=("server_name" "ssl_certificate" "ssl_certificate_key" "proxy_pass")
for directive in "${REQUIRED[@]}"; do
    if ! grep -q "$directive" frontend/nginx-ssl.conf; then
        echo "   ❌ ERROR: Missing required directive: $directive"
        exit 1
    fi
done
echo "   ✅ All required directives present"
echo ""

# Check 5: Docker nginx test
echo "5. Testing with Docker nginx..."
if docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine \
  nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "   ✅ Nginx syntax test passed!"
else
    echo "   ❌ ERROR: Nginx syntax test failed!"
    echo "   Running test again to show full error:"
    docker run --rm \
      -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
      nginx:alpine \
      nginx -t
    exit 1
fi
echo ""

echo "=== All tests passed! ==="
EOF

# Make script executable
chmod +x /tmp/test-nginx-ssl-config.sh
```

**Option B: Download script from a file (if you saved it locally)**

If you've saved the script to a file on your local machine:

```bash
# From your local machine, copy the script to the server
scp test-nginx-ssl-config.sh youruser@147.139.176.70:/tmp/

# Then on the server:
chmod +x /tmp/test-nginx-ssl-config.sh
```

### Step 5: Run the Test Script

```bash
# Execute the test script
/tmp/test-nginx-ssl-config.sh
```

### Step 6: Interpret the Results

**✅ Success Output:**

```
=== Testing nginx-ssl.conf ===

1. Checking if file exists...
   ✅ File exists

2. Checking file permissions...
   ✅ File is readable

3. Checking basic syntax...
   ✅ Braces are balanced

4. Checking required directives...
   ✅ All required directives present

5. Testing with Docker nginx...
   ✅ Nginx syntax test passed!

=== All tests passed! ===
```

**❌ Error Output Examples:**

**Error 1: File not found**
```
1. Checking if file exists...
   ❌ ERROR: frontend/nginx-ssl.conf not found!
```
**Fix:** Create the `nginx-ssl.conf` file first (see DEPLOYMENT-ALIYUN.md Step 6.2-6.4)

**Error 2: Unmatched braces**
```
3. Checking basic syntax...
   ❌ ERROR: Unmatched braces! Opening: 15, Closing: 14
```
**Fix:** Check your nginx-ssl.conf file for missing `{` or `}`

**Error 3: Missing required directive**
```
4. Checking required directives...
   ❌ ERROR: Missing required directive: ssl_certificate
```
**Fix:** Add the missing directive to your nginx-ssl.conf file

**Error 4: Nginx syntax test failed**
```
5. Testing with Docker nginx...
   ❌ ERROR: Nginx syntax test failed!
   Running test again to show full error:
   nginx: [emerg] cannot load certificate ...
   nginx: configuration file ... test failed
```
**Fix:** See troubleshooting section below

---

## Troubleshooting Common Issues

### Issue 1: Certificate Files Not Found (Expected Before Certbot)

**Error:**
```
nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/pm.energi-up.com/fullchain.pem": No such file or directory
```

**This is EXPECTED if you haven't run certbot yet!**

**Solution:** The script will still show "syntax is ok" if the configuration syntax is correct. The certificate error is expected before obtaining SSL certificates.

**To test syntax only (ignore certificate errors):**

```bash
# Create a modified test that uses dummy certificates
cat > /tmp/test-nginx-ssl-syntax-only.sh << 'EOF'
#!/bin/bash
set -e

cd /opt/Project-Management-V2.0

# Create dummy certificate directory
mkdir -p /tmp/letsencrypt/live/pm.energi-up.com

# Create dummy certificate files
echo "-----BEGIN CERTIFICATE-----
DUMMY
-----END CERTIFICATE-----" > /tmp/letsencrypt/live/pm.energi-up.com/fullchain.pem

echo "-----BEGIN PRIVATE KEY-----
DUMMY
-----END PRIVATE KEY-----" > /tmp/letsencrypt/live/pm.energi-up.com/privkey.pem

echo "-----BEGIN CERTIFICATE-----
DUMMY
-----END CERTIFICATE-----" > /tmp/letsencrypt/live/pm.energi-up.com/chain.pem

# Test with dummy certificates
echo "Testing nginx-ssl.conf with dummy certificates..."
docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "/tmp/letsencrypt:/etc/letsencrypt:ro" \
  nginx:alpine \
  nginx -t

# Clean up
rm -rf /tmp/letsencrypt

echo ""
echo "✅ If you see 'syntax is ok', your configuration is correct!"
EOF

chmod +x /tmp/test-nginx-ssl-syntax-only.sh
/tmp/test-nginx-ssl-syntax-only.sh
```

### Issue 2: Docker Not Running

**Error:**
```
Cannot connect to the Docker daemon. Is the docker daemon running?
```

**Solution:**
```bash
# Check Docker status
sudo systemctl status docker

# Start Docker if not running
sudo systemctl start docker

# Verify Docker is working
docker ps
```

### Issue 3: Permission Denied

**Error:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Solution:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker

# Verify
docker ps
```

### Issue 4: File Path Issues

**Error:**
```
docker: Error response from daemon: invalid volume specification
```

**Solution:**
```bash
# Use absolute path instead
cd /opt/Project-Management-V2.0

# Verify absolute path
pwd
# Should show: /opt/Project-Management-V2.0

# Test with absolute path
docker run --rm \
  -v "/opt/Project-Management-V2.0/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine \
  nginx -t
```

### Issue 5: Markdown Syntax in Config File

**Error:**
```
nginx: [emerg] unknown directive "```nginx" in /etc/nginx/conf.d/default.conf:1
```

**Solution:**
```bash
# Check if file contains markdown syntax
head -3 frontend/nginx-ssl.conf

# If you see "```nginx" or "```", remove it:
sed -i '/^```/d' frontend/nginx-ssl.conf
sed -i '/^```nginx/d' frontend/nginx-ssl.conf

# Verify file starts correctly
head -3 frontend/nginx-ssl.conf
# Should show: # HTTP Server Block (NOT ```nginx)
```

---

## Advanced Testing Options

### Test with Real Certificates (After Certbot)

If you've already obtained SSL certificates with certbot:

```bash
# Test with real certificates mounted
docker run --rm \
  -v "/opt/Project-Management-V2.0/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "/etc/letsencrypt:/etc/letsencrypt:ro" \
  nginx:alpine \
  nginx -t
```

### Test Specific Configuration Sections

```bash
# Test only HTTP redirect block
grep -A 5 "listen 80" frontend/nginx-ssl.conf

# Test only HTTPS block
grep -A 10 "listen 443" frontend/nginx-ssl.conf

# Check proxy_pass configuration
grep "proxy_pass" frontend/nginx-ssl.conf
```

### Verbose Testing (See All Output)

```bash
# Run test with full output (no grep filtering)
docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine \
  nginx -t 2>&1 | tee /tmp/nginx-test-full.log

# Review full output
cat /tmp/nginx-test-full.log
```

---

## Quick Reference Commands

Save these for quick access:

```bash
# Quick test (one-liner)
cd /opt/Project-Management-V2.0 && docker run --rm -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t

# Check file exists and is readable
ls -la /opt/Project-Management-V2.0/frontend/nginx-ssl.conf

# View first 20 lines of config
head -20 /opt/Project-Management-V2.0/frontend/nginx-ssl.conf

# Count braces (should match)
grep -o '{' /opt/Project-Management-V2.0/frontend/nginx-ssl.conf | wc -l
grep -o '}' /opt/Project-Management-V2.0/frontend/nginx-ssl.conf | wc -l

# Check for required directives
grep -E "server_name|ssl_certificate|ssl_certificate_key|proxy_pass" /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

---

## Next Steps After Testing

Once all tests pass:

1. **Obtain SSL certificates** (if not done yet):
   ```bash
   sudo certbot certonly --standalone -d pm.energi-up.com
   ```

2. **Update docker-compose.frontend.yml** to use nginx-ssl.conf:
   ```yaml
   volumes:
     - ./frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

3. **Restart frontend container**:
   ```bash
   docker compose -f docker-compose.frontend.yml restart frontend
   ```

4. **Test HTTPS access**:
   ```bash
   curl -v https://pm.energi-up.com/health
   ```

---

## Summary

The comprehensive test script checks:
1. ✅ File exists
2. ✅ File permissions
3. ✅ Basic syntax (braces matching)
4. ✅ Required directives present
5. ✅ Nginx syntax validation

**If all tests pass**, your `nginx-ssl.conf` is ready for deployment!

**If any test fails**, follow the troubleshooting steps above to fix the issue.

