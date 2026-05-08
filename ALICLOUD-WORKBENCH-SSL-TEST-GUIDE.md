# Detailed Guide: Running SSL Test via AliCloud Workbench

This guide walks you through using the AliCloud ECS Workbench interface (the dialog you're seeing) to run the SSL configuration test.

---

## Step-by-Step Instructions

### Step 1: Configure the Connection Dialog

In the "New Connection" dialog you're seeing:

1. **Instance**: Already shows `ECS-App / i-k1ad3kyn8xfme3vsx78c` ✅
   - Status shows "Running" (green circle) ✅
   - This is correct, no changes needed

2. **Connection Method**: 
   - **Option A (Recommended)**: Keep "Password-Free" selected
     - This uses your AliCloud account authentication
     - No password needed
   - **Option B**: Click "Terminal" if you prefer terminal mode
     - Both work the same for our purpose

3. **Username**: 
   - Currently shows `root` ✅
   - This is correct for most AliCloud instances
   - If you know a different username, you can change it

4. **Security Group Warning** (Orange box):
   - **Important**: Click **"Add Now"** button
   - This allows your connection from CIDR `100.104.0.0/16`
   - Without this, you won't be able to connect
   - After clicking, wait a few seconds for the rule to be added

5. **Click "Log In"** button (blue button at bottom)

---

### Step 2: Wait for Connection

After clicking "Log In":
- The dialog will close
- A terminal window will appear in the Workbench interface
- You'll see a command prompt like: `root@i-k1ad3kyn8xfme3vsx78c:~#`
- This may take 10-30 seconds

**If connection fails:**
- Check the error message
- Try clicking "Add Now" on the security group warning again
- Try the "Terminal" connection method instead
- Click "View Details" in the warning box for more information

---

### Step 3: Navigate to Project Directory

Once connected, you'll see a terminal. Type these commands:

```bash
# Navigate to the project directory
cd /opt/Project-Management-V2.0

# Verify you're in the right place
pwd
# Should show: /opt/Project-Management-V2.0

# Check if nginx-ssl.conf exists
ls -la frontend/nginx-ssl.conf
```

**Expected output:**
```
-rw-r--r-- 1 root root 12345 Dec 15 10:30 frontend/nginx-ssl.conf
```

**If file doesn't exist:**
- You need to create it first (see DEPLOYMENT-ALIYUN.md Step 6.2-6.4)
- Or the file might be in a different location

---

### Step 4: Run the SSL Test Script

Copy and paste this **ENTIRE** command block into the terminal:

```bash
cd /opt/Project-Management-V2.0 && cat > /tmp/test-ssl.sh << 'SCRIPT_END'
#!/bin/bash
set -e

echo "=========================================="
echo "SSL Configuration Comprehensive Test"
echo "=========================================="
echo ""

cd /opt/Project-Management-V2.0

# Check 1: File exists
echo "[1/5] Checking if file exists..."
if [ ! -f "frontend/nginx-ssl.conf" ]; then
    echo "   ❌ ERROR: frontend/nginx-ssl.conf not found!"
    echo "   → Create the file first (see DEPLOYMENT-ALIYUN.md Step 6.2-6.4)"
    exit 1
fi
echo "   ✅ File exists"
echo ""

# Check 2: File is readable
echo "[2/5] Checking file permissions..."
if [ ! -r "frontend/nginx-ssl.conf" ]; then
    echo "   ⚠️  File is not readable, fixing permissions..."
    chmod 644 frontend/nginx-ssl.conf
fi
echo "   ✅ File is readable"
echo ""

# Check 3: Basic syntax checks
echo "[3/5] Checking basic syntax (braces)..."
OPEN_BRACES=$(grep -o '{' frontend/nginx-ssl.conf | wc -l)
CLOSE_BRACES=$(grep -o '}' frontend/nginx-ssl.conf | wc -l)
if [ "$OPEN_BRACES" != "$CLOSE_BRACES" ]; then
    echo "   ❌ ERROR: Unmatched braces!"
    echo "   Opening braces: $OPEN_BRACES"
    echo "   Closing braces: $CLOSE_BRACES"
    exit 1
fi
echo "   ✅ Braces are balanced ($OPEN_BRACES opening, $CLOSE_BRACES closing)"
echo ""

# Check 4: Required directives exist
echo "[4/5] Checking required directives..."
REQUIRED=("server_name" "ssl_certificate" "ssl_certificate_key" "proxy_pass")
MISSING=()
for directive in "${REQUIRED[@]}"; do
    if ! grep -q "$directive" frontend/nginx-ssl.conf; then
        MISSING+=("$directive")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "   ❌ ERROR: Missing required directives:"
    for dir in "${MISSING[@]}"; do
        echo "      - $dir"
    done
    exit 1
fi
echo "   ✅ All required directives present"
echo ""

# Check 5: Docker nginx test
echo "[5/5] Testing with Docker nginx..."
echo "   (Certificate errors are OK if certbot hasn't run yet)"
echo ""

# Create dummy certificates for testing
mkdir -p /tmp/letsencrypt-test/live/pm.energi-up.com
echo "-----BEGIN CERTIFICATE-----
DUMMY
-----END CERTIFICATE-----" > /tmp/letsencrypt-test/live/pm.energi-up.com/fullchain.pem
echo "-----BEGIN PRIVATE KEY-----
DUMMY
-----END PRIVATE KEY-----" > /tmp/letsencrypt-test/live/pm.energi-up.com/privkey.pem
echo "-----BEGIN CERTIFICATE-----
DUMMY
-----END CERTIFICATE-----" > /tmp/letsencrypt-test/live/pm.energi-up.com/chain.pem

# Run nginx test
TEST_OUTPUT=$(docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "/tmp/letsencrypt-test:/etc/letsencrypt:ro" \
  nginx:alpine \
  nginx -t 2>&1)

# Check if syntax is OK
if echo "$TEST_OUTPUT" | grep -q "syntax is ok"; then
    echo "   ✅ Nginx syntax test passed!"
    if echo "$TEST_OUTPUT" | grep -q "test is successful"; then
        echo "   ✅ Configuration test is successful!"
    fi
else
    echo "   ❌ ERROR: Nginx syntax test failed!"
    echo ""
    echo "   Full error output:"
    echo "   ----------------------------------------"
    echo "$TEST_OUTPUT" | sed 's/^/   /'
    echo "   ----------------------------------------"
    rm -rf /tmp/letsencrypt-test
    exit 1
fi

# Clean up dummy certs
rm -rf /tmp/letsencrypt-test

echo ""
echo "=========================================="
echo "✅ All tests passed! Configuration is ready."
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. If certificates don't exist, run: sudo certbot certonly --standalone -d pm.energi-up.com"
echo "  2. Update docker-compose.frontend.yml to use nginx-ssl.conf"
echo "  3. Restart frontend: docker compose -f docker-compose.frontend.yml restart frontend"
echo ""
SCRIPT_END
chmod +x /tmp/test-ssl.sh && /tmp/test-ssl.sh
```

**Important**: 
- Copy the ENTIRE block from `cd /opt/Project-Management-V2.0` to the end
- Paste it into the terminal
- Press **Enter**
- Wait for the script to run (may take 30-60 seconds)

---

### Step 5: Read the Results

You should see output like this:

```
==========================================
SSL Configuration Comprehensive Test
==========================================

[1/5] Checking if file exists...
   ✅ File exists

[2/5] Checking file permissions...
   ✅ File is readable

[3/5] Checking basic syntax (braces)...
   ✅ Braces are balanced (15 opening, 15 closing)

[4/5] Checking required directives...
   ✅ All required directives present

[5/5] Testing with Docker nginx...
   (Certificate errors are OK if certbot hasn't run yet)

   ✅ Nginx syntax test passed!
   ✅ Configuration test is successful!

==========================================
✅ All tests passed! Configuration is ready.
==========================================
```

---

## Troubleshooting Common Issues

### Issue 1: "frontend/nginx-ssl.conf not found"

**Error:**
```
❌ ERROR: frontend/nginx-ssl.conf not found!
```

**Solution:**
```bash
# Check if you're in the right directory
pwd
# Should show: /opt/Project-Management-V2.0

# Check if file exists in a different location
find /opt -name "nginx-ssl.conf" 2>/dev/null

# If file doesn't exist, create it first
# See DEPLOYMENT-ALIYUN.md Step 6.2-6.4
```

### Issue 2: "Docker: command not found"

**Error:**
```
docker: command not found
```

**Solution:**
```bash
# Try with sudo
sudo docker run --rm ...

# Or check if Docker is installed
which docker
docker --version

# If Docker is not installed, install it first
# (Usually Docker is pre-installed on AliCloud ECS)
```

### Issue 3: "Cannot connect to Docker daemon"

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Start Docker service
sudo systemctl start docker

# Check Docker status
sudo systemctl status docker

# Try again
/tmp/test-ssl.sh
```

### Issue 4: "Permission denied"

**Error:**
```
Permission denied
```

**Solution:**
```bash
# Run with sudo
sudo /tmp/test-ssl.sh

# Or fix permissions
sudo chmod +x /tmp/test-ssl.sh
```

### Issue 5: Connection Dialog Won't Connect

**If "Log In" button doesn't work:**

1. **Click "Add Now"** in the security group warning (orange box)
2. **Wait 10-20 seconds** for the rule to be added
3. **Try "Log In" again**

**If still failing:**

1. **Click "View Details"** in the warning box
2. **Check the security group rules** in AliCloud Console
3. **Try "Terminal" connection method** instead of "Password-Free"
4. **Use VNC connection** as mentioned in the dialog

---

## Alternative: Run Tests One by One

If the full script doesn't work, run these commands one at a time:

```bash
# 1. Navigate to directory
cd /opt/Project-Management-V2.0

# 2. Check file exists
ls -la frontend/nginx-ssl.conf

# 3. Check permissions
chmod 644 frontend/nginx-ssl.conf

# 4. Count braces
echo "Opening: $(grep -o '{' frontend/nginx-ssl.conf | wc -l)"
echo "Closing: $(grep -o '}' frontend/nginx-ssl.conf | wc -l)"

# 5. Check directives
grep -E "server_name|ssl_certificate|ssl_certificate_key|proxy_pass" frontend/nginx-ssl.conf

# 6. Create dummy certificates
mkdir -p /tmp/test-certs/live/pm.energi-up.com
echo "DUMMY" > /tmp/test-certs/live/pm.energi-up.com/fullchain.pem
echo "DUMMY" > /tmp/test-certs/live/pm.energi-up.com/privkey.pem
echo "DUMMY" > /tmp/test-certs/live/pm.energi-up.com/chain.pem

# 7. Test with Docker
docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "/tmp/test-certs:/etc/letsencrypt:ro" \
  nginx:alpine \
  nginx -t

# 8. Clean up
rm -rf /tmp/test-certs
```

---

## Visual Guide: What to Click

Based on your screenshot:

1. ✅ **Instance**: Already correct (`ECS-App / i-k1ad3kyn8xfme3vsx78c`)
2. ✅ **Status**: Shows "Running" (green) - good!
3. ✅ **Connection Method**: "Password-Free" is fine (or try "Terminal")
4. ✅ **Username**: "root" is correct
5. ⚠️ **IMPORTANT**: Click **"Add Now"** in the orange warning box
6. ✅ Click **"Log In"** (blue button)

---

## What Each Test Does

1. **File exists** - Verifies `nginx-ssl.conf` is in the right place
2. **Permissions** - Ensures file can be read
3. **Braces** - Checks `{` and `}` are balanced (syntax check)
4. **Directives** - Verifies required nginx settings are present
5. **Docker test** - Validates configuration with real nginx

**All 5 tests must pass** for your SSL configuration to be valid!

---

## After Tests Pass

Once you see "✅ All tests passed!", you can:

1. **Obtain SSL certificates** (if not done):
   ```bash
   sudo certbot certonly --standalone -d pm.energi-up.com
   ```

2. **Update docker-compose.frontend.yml** to use the SSL config

3. **Restart frontend container**:
   ```bash
   docker compose -f docker-compose.frontend.yml restart frontend
   ```

---

## Quick Reference

**To run the test again later:**
```bash
/tmp/test-ssl.sh
```

**To view the test script:**
```bash
cat /tmp/test-ssl.sh
```

**To edit the test script:**
```bash
nano /tmp/test-ssl.sh
```

---

## Summary

1. ✅ Click **"Add Now"** in the security group warning
2. ✅ Click **"Log In"** button
3. ✅ Wait for terminal to appear
4. ✅ Run: `cd /opt/Project-Management-V2.0`
5. ✅ Copy and paste the full test script
6. ✅ Press Enter and wait for results

That's it! The test will tell you if your SSL configuration is ready to deploy.

