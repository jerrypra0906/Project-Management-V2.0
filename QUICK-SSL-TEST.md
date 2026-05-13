# Quick SSL Test - No SSH Required

If SSH isn't working, use **AliCloud Web Terminal** instead. Here's how:

## Step 1: Access AliCloud Web Terminal

1. **Log into AliCloud Console**: https://ecs.console.aliyun.com
2. **Go to**: ECS → Instances
3. **Find your frontend server** (IP: 172.28.80.50 or 147.139.176.70)
4. **Click**: "Remote Connection" or "Workbench"
5. **Select**: "Workbench" or "Web Terminal"
6. **Enter password** if prompted

## Step 2: Copy and Paste This Script

Once you're in the web terminal, copy the ENTIRE block below and paste it:

```bash
cd /opt/Project-Management-V2.0 && cat > /tmp/test-ssl.sh << 'SCRIPT_END'
#!/bin/bash
set -e
echo "=========================================="
echo "SSL Configuration Test"
echo "=========================================="
cd /opt/Project-Management-V2.0
echo "[1/5] Checking file exists..."
[ -f "frontend/nginx-ssl.conf" ] && echo "   ✅ File exists" || { echo "   ❌ File not found!"; exit 1; }
echo "[2/5] Checking permissions..."
[ -r "frontend/nginx-ssl.conf" ] && echo "   ✅ File readable" || { chmod 644 frontend/nginx-ssl.conf; echo "   ✅ Permissions fixed"; }
echo "[3/5] Checking syntax (braces)..."
OPEN=$(grep -o '{' frontend/nginx-ssl.conf | wc -l)
CLOSE=$(grep -o '}' frontend/nginx-ssl.conf | wc -l)
[ "$OPEN" = "$CLOSE" ] && echo "   ✅ Braces balanced ($OPEN)" || { echo "   ❌ Unmatched braces!"; exit 1; }
echo "[4/5] Checking required directives..."
for dir in server_name ssl_certificate ssl_certificate_key proxy_pass; do
  grep -q "$dir" frontend/nginx-ssl.conf || { echo "   ❌ Missing: $dir"; exit 1; }
done
echo "   ✅ All directives present"
echo "[5/5] Testing with Docker nginx..."
mkdir -p /tmp/letsencrypt-test/live/pm.energi-up.com
echo "DUMMY" > /tmp/letsencrypt-test/live/pm.energi-up.com/fullchain.pem
echo "DUMMY" > /tmp/letsencrypt-test/live/pm.energi-up.com/privkey.pem
echo "DUMMY" > /tmp/letsencrypt-test/live/pm.energi-up.com/chain.pem
if docker run --rm -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" -v "/tmp/letsencrypt-test:/etc/letsencrypt:ro" nginx:alpine nginx -t 2>&1 | grep -q "syntax is ok"; then
  echo "   ✅ Nginx syntax OK!"
  rm -rf /tmp/letsencrypt-test
  echo ""
  echo "=========================================="
  echo "✅ All tests passed!"
  echo "=========================================="
else
  echo "   ❌ Syntax test failed!"
  docker run --rm -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" -v "/tmp/letsencrypt-test:/etc/letsencrypt:ro" nginx:alpine nginx -t
  rm -rf /tmp/letsencrypt-test
  exit 1
fi
SCRIPT_END
chmod +x /tmp/test-ssl.sh && /tmp/test-ssl.sh
```

**Just copy everything from `cd /opt/Project-Management-V2.0` to the end, paste into the web terminal, and press Enter.**

## Step 3: Read the Results

You'll see output like:

```
==========================================
SSL Configuration Test
==========================================
[1/5] Checking file exists...
   ✅ File exists
[2/5] Checking permissions...
   ✅ File readable
[3/5] Checking syntax (braces)...
   ✅ Braces balanced (15)
[4/5] Checking required directives...
   ✅ All directives present
[5/5] Testing with Docker nginx...
   ✅ Nginx syntax OK!

==========================================
✅ All tests passed!
==========================================
```

---

## Alternative: One Command at a Time

If the script above doesn't work, run these commands one by one:

```bash
# 1. Go to project directory
cd /opt/Project-Management-V2.0

# 2. Check if file exists
ls -la frontend/nginx-ssl.conf

# 3. Check file permissions
chmod 644 frontend/nginx-ssl.conf

# 4. Count braces (should match)
echo "Opening: $(grep -o '{' frontend/nginx-ssl.conf | wc -l)"
echo "Closing: $(grep -o '}' frontend/nginx-ssl.conf | wc -l)"

# 5. Check required directives
grep -E "server_name|ssl_certificate|ssl_certificate_key|proxy_pass" frontend/nginx-ssl.conf

# 6. Test with Docker (create dummy certs first)
mkdir -p /tmp/test-certs/live/pm.energi-up.com
echo "DUMMY" > /tmp/test-certs/live/pm.energi-up.com/fullchain.pem
echo "DUMMY" > /tmp/test-certs/live/pm.energi-up.com/privkey.pem
echo "DUMMY" > /tmp/test-certs/live/pm.energi-up.com/chain.pem

# 7. Run nginx test
docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "/tmp/test-certs:/etc/letsencrypt:ro" \
  nginx:alpine \
  nginx -t

# 8. Clean up
rm -rf /tmp/test-certs
```

---

## Troubleshooting

### "No such file or directory"
- The `nginx-ssl.conf` file doesn't exist yet
- Create it first (see DEPLOYMENT-ALIYUN.md Step 6.2-6.4)

### "Docker: command not found"
- Docker isn't installed or not in PATH
- Try: `sudo docker` instead of `docker`

### "Permission denied"
- Need sudo access
- Try: `sudo docker` for docker commands

### "Cannot connect to Docker daemon"
- Docker service not running
- Try: `sudo systemctl start docker`

---

## What Each Test Checks

1. **File exists** - Verifies `frontend/nginx-ssl.conf` is present
2. **Permissions** - Ensures file is readable
3. **Braces** - Checks `{` and `}` are balanced
4. **Directives** - Verifies required nginx directives exist
5. **Nginx syntax** - Validates configuration with Docker nginx

All tests must pass for the configuration to be valid!

