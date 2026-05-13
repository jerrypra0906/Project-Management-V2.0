#!/bin/bash
# Quick SSL Configuration Test Script
# Run this on the AliCloud frontend server (172.28.80.50)

set -e

echo "=========================================="
echo "SSL Configuration Comprehensive Test"
echo "=========================================="
echo ""

# Navigate to project directory
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
echo "[3/5] Checking basic syntax..."
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
echo "   (This may show certificate errors if certbot hasn't run yet - that's OK)"
echo ""

# Create dummy certificates for testing (if real ones don't exist)
if [ ! -d "/etc/letsencrypt/live/pm.energi-up.com" ]; then
    echo "   Creating temporary dummy certificates for syntax testing..."
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
    
    CERT_PATH="/tmp/letsencrypt-test"
else
    CERT_PATH="/etc/letsencrypt"
fi

# Run nginx test
TEST_OUTPUT=$(docker run --rm \
  -v "$(pwd)/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$CERT_PATH:/etc/letsencrypt:ro" \
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
    
    # Clean up dummy certs if we created them
    if [ -d "/tmp/letsencrypt-test" ]; then
        rm -rf /tmp/letsencrypt-test
    fi
    exit 1
fi

# Clean up dummy certs if we created them
if [ -d "/tmp/letsencrypt-test" ]; then
    rm -rf /tmp/letsencrypt-test
fi

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

