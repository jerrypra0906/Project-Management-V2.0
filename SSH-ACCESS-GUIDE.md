# SSH Access Troubleshooting Guide for AliCloud Servers

If `ssh youruser@147.139.176.70` doesn't work or hangs, try these solutions:

## Common Issues and Solutions

### Issue 1: SSH on Non-Standard Port

The documentation mentions port 1818 might be used for SSH. Try:

```bash
# Try SSH with port 1818
ssh -p 1818 youruser@147.139.176.70

# Or try other common ports
ssh -p 22 youruser@147.139.176.70
ssh -p 2222 youruser@147.139.176.70
```

### Issue 2: Connection Timeout / Hanging

If SSH hangs without connecting:

**On Windows (PowerShell or CMD):**
```powershell
# Add verbose output to see what's happening
ssh -v youruser@147.139.176.70

# Or with timeout
ssh -o ConnectTimeout=10 youruser@147.139.176.70

# Try with specific port
ssh -p 22 -o ConnectTimeout=10 youruser@147.139.176.70
```

**Check if port is reachable:**
```powershell
# Test if SSH port is open
Test-NetConnection -ComputerName 147.139.176.70 -Port 22
Test-NetConnection -ComputerName 147.139.176.70 -Port 1818
```

### Issue 3: Using PuTTY (Windows)

If you're on Windows, PuTTY might work better:

1. **Download PuTTY**: https://www.putty.org/
2. **Configure connection:**
   - Host Name: `147.139.176.70`
   - Port: `22` (or `1818` if that's your SSH port)
   - Connection type: SSH
3. **Click "Open"**

**Or use PuTTY from command line:**
```cmd
# If PuTTY is installed
putty.exe -ssh youruser@147.139.176.70 -P 22
putty.exe -ssh youruser@147.139.176.70 -P 1818
```

### Issue 4: SSH Key Authentication Required

You might need to use an SSH key file:

```bash
# If you have a key file
ssh -i /path/to/your-key.pem youruser@147.139.176.70

# On Windows with PuTTY, convert .pem to .ppk using PuTTYgen
```

### Issue 5: Username Might Be Different

Common usernames to try:
- `root`
- `ubuntu` (for Ubuntu servers)
- `admin`
- `ecs-user` (AliCloud default)
- `your-company-username`

```bash
# Try different usernames
ssh root@147.139.176.70
ssh ubuntu@147.139.176.70
ssh admin@147.139.176.70
```

---

## Alternative: Run Test Script Without SSH

If you can't SSH directly, here are alternative methods:

### Method 1: Use AliCloud Console Web Terminal

1. **Log into AliCloud Console**
2. **Go to**: ECS → Instances
3. **Select your frontend instance** (172.28.80.50)
4. **Click**: "Remote Connection" or "Web Terminal"
5. **Use the browser-based terminal** to run commands

### Method 2: Use AliCloud Workbench

1. **Log into AliCloud Console**
2. **Go to**: ECS → Instances
3. **Select your frontend instance**
4. **Click**: "Workbench" or "Remote Connection"
5. **Choose**: "Workbench" option
6. **Enter password** (if required)
7. **Run commands in the web terminal**

### Method 3: Copy Script to Server via Other Method

If you have access through another method (like AliCloud console file manager):

1. **Create the test script locally** (save `run-ssl-test.sh` to your computer)
2. **Upload via AliCloud Console**:
   - Go to ECS → Instances → Your instance
   - Use file manager or upload feature
   - Upload to `/tmp/test-ssl.sh`
3. **Run via web terminal**:
   ```bash
   chmod +x /tmp/test-ssl.sh
   /tmp/test-ssl.sh
   ```

### Method 4: Run Commands Directly via AliCloud API/CLI

If you have AliCloud CLI configured:

```bash
# Install AliCloud CLI first (if not installed)
# Then use ECS RunCommand feature
```

---

## Quick Diagnostic: Test SSH Connection

Run these commands to diagnose the issue:

### On Windows (PowerShell):

```powershell
# Test 1: Check if server is reachable
Test-Connection -ComputerName 147.139.176.70 -Count 4

# Test 2: Check if SSH port is open
Test-NetConnection -ComputerName 147.139.176.70 -Port 22
Test-NetConnection -ComputerName 147.139.176.70 -Port 1818

# Test 3: Try telnet (if available)
telnet 147.139.176.70 22
telnet 147.139.176.70 1818

# Test 4: Try SSH with verbose output
ssh -v -o ConnectTimeout=10 youruser@147.139.176.70
```

### On Linux/Mac:

```bash
# Test 1: Ping test
ping -c 4 147.139.176.70

# Test 2: Check if SSH port is open
nc -zv 147.139.176.70 22
nc -zv 147.139.176.70 1818

# Test 3: Try SSH with verbose output
ssh -v -o ConnectTimeout=10 youruser@147.139.176.70
```

---

## Expected SSH Connection Flow

When SSH works correctly, you should see:

```
$ ssh youruser@147.139.176.70
The authenticity of host '147.139.176.70' can't be established.
ECDSA key fingerprint is SHA256:...
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '147.139.176.70' to the list of known hosts.
youruser@147.139.176.70's password: [enter password]
Welcome to Ubuntu...
youruser@server:~$
```

If you see nothing or it hangs, the connection is being blocked.

---

## Common Error Messages and Fixes

### "Connection timed out"
- **Cause**: Firewall blocking SSH port
- **Fix**: Check AliCloud Security Group allows port 22 (or your SSH port)

### "Connection refused"
- **Cause**: SSH service not running or wrong port
- **Fix**: Verify SSH is running on the server

### "Permission denied (publickey)"
- **Cause**: SSH key authentication required
- **Fix**: Use `-i` flag with your key file, or configure password authentication

### "Host key verification failed"
- **Cause**: Host key changed
- **Fix**: Remove old key: `ssh-keygen -R 147.139.176.70`

---

## If You Still Can't Connect

1. **Contact your system administrator** for:
   - Correct SSH username
   - SSH port number
   - SSH key file (if required)
   - Password (if password auth is enabled)

2. **Check AliCloud Console**:
   - Security Group rules (must allow SSH port)
   - Instance status (must be running)
   - Network configuration

3. **Use AliCloud Web Terminal** as a workaround (see Method 1 above)

---

## Once Connected: Run the SSL Test

After successfully connecting via SSH or web terminal:

```bash
# Navigate to project directory
cd /opt/Project-Management-V2.0

# Create and run the test script
cat > /tmp/test-ssl.sh << 'EOF'
[paste the content of run-ssl-test.sh here]
EOF

chmod +x /tmp/test-ssl.sh
/tmp/test-ssl.sh
```

Or use the one-liner:

```bash
cd /opt/Project-Management-V2.0 && bash -c "$(cat << 'SCRIPT'
[paste run-ssl-test.sh content here]
SCRIPT
)"
```

