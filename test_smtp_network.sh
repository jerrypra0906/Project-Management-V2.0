#!/bin/bash
# Test network connectivity from backend server to SMTP server
# This script tests if the backend server can connect to the SMTP server

echo "=========================================="
echo "Network Connectivity Test to SMTP Server"
echo "=========================================="
echo ""

SMTP_HOST="mail.energi-up.com"
SMTP_PORT="587"

echo "SMTP Configuration:"
echo "  Host: $SMTP_HOST"
echo "  Port: $SMTP_PORT"
echo ""

# Test 1: DNS Resolution
echo "Test 1: DNS Resolution"
echo "----------------------"
docker exec project_management_backend nslookup $SMTP_HOST 2>&1 | grep -A 5 "Name:" || echo "  ⚠️  DNS lookup failed or nslookup not available"
echo ""

# Test 2: Ping (if ICMP is allowed)
echo "Test 2: Ping Test (ICMP)"
echo "------------------------"
echo "  (This may fail if ICMP is blocked by firewall)"
docker exec project_management_backend ping -c 3 $SMTP_HOST 2>&1 | tail -4 || echo "  ⚠️  Ping test failed (this is normal if ICMP is blocked)"
echo ""

# Test 3: TCP Port Connectivity
echo "Test 3: TCP Port Connectivity"
echo "------------------------------"
echo "  Testing connection to $SMTP_HOST:$SMTP_PORT..."
if docker exec project_management_backend timeout 5 bash -c "echo > /dev/tcp/$SMTP_HOST/$SMTP_PORT" 2>&1; then
    echo "  ✅ Port $SMTP_PORT is ACCESSIBLE"
else
    echo "  ❌ Port $SMTP_PORT is NOT accessible or connection timed out"
    echo "  This indicates a network/firewall restriction!"
fi
echo ""

# Test 4: SMTP Handshake (using Node.js)
echo "Test 4: SMTP Handshake Test"
echo "---------------------------"
docker exec project_management_backend node -e "
const net = require('net');
const host = '$SMTP_HOST';
const port = $SMTP_PORT;

console.log('  Connecting to ' + host + ':' + port + '...');

const socket = net.createConnection(port, host, () => {
  console.log('  ✅ Successfully connected to SMTP server');
  console.log('  Remote address: ' + socket.remoteAddress + ':' + socket.remotePort);
  socket.end();
  process.exit(0);
});

socket.setTimeout(5000);

socket.on('error', (err) => {
  console.log('  ❌ Connection ERROR:', err.message);
  console.log('  Error code:', err.code);
  process.exit(1);
});

socket.on('timeout', () => {
  console.log('  ❌ Connection TIMEOUT (5 seconds)');
  socket.destroy();
  process.exit(1);
});
" 2>&1

SMTP_CONNECT_RESULT=$?

echo ""

# Test 5: Check firewall rules on host (if accessible)
echo "Test 5: Host Firewall Status"
echo "-----------------------------"
if command -v ufw >/dev/null 2>&1; then
    echo "  Checking UFW firewall status:"
    sudo ufw status 2>&1 | head -5 | sed 's/^/  /' || echo "  ⚠️  Could not check UFW status"
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "  Checking firewalld status:"
    sudo firewall-cmd --list-all 2>&1 | head -10 | sed 's/^/  /' || echo "  ⚠️  Could not check firewall status"
else
    echo "  ⚠️  Firewall management tool not found (ufw/firewalld)"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""

if [ $SMTP_CONNECT_RESULT -eq 0 ]; then
    echo "✅ Network connectivity is WORKING"
    echo ""
    echo "Interpretation:"
    echo "  - Backend server CAN connect to SMTP server"
    echo "  - Network/firewall is NOT blocking SMTP traffic"
    echo "  - The issue is likely:"
    echo "    1. Mail server relay restriction (most likely)"
    echo "    2. SMTP server accepting but not delivering internally"
    echo "    3. Email server configuration issue"
    echo ""
    echo "Next steps:"
    echo "  - Contact email administrator to allow SMTP relay to local domains"
    echo "  - Test sending to external email address to confirm relay restriction"
else
    echo "❌ Network connectivity is BLOCKED"
    echo ""
    echo "Interpretation:"
    echo "  - Backend server CANNOT connect to SMTP server"
    echo "  - Network/firewall IS blocking SMTP traffic"
    echo "  - Check:"
    echo "    1. AliCloud Security Group outbound rules (port 587)"
    echo "    2. Backend server firewall rules"
    echo "    3. Network ACLs or routing issues"
    echo ""
    echo "Next steps:"
    echo "  - Check AliCloud ECS Security Group settings"
    echo "  - Verify outbound rules allow port 587"
    echo "  - Check backend server firewall configuration"
fi

echo ""

