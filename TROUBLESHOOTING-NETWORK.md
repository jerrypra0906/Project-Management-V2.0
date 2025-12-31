# 🔧 Network Access Troubleshooting

## ❌ Problem: Team Cannot Access http://172.30.18.102:3000

### Most Common Cause: Windows Firewall
Windows Firewall is blocking incoming connections on port 3000.

---

## ✅ Quick Fix

### Step 1: Run the Firewall Setup Script

**Right-click** on `allow-network-access.bat` → Select **"Run as administrator"**

This will:
- ✅ Create a Windows Firewall rule
- ✅ Allow incoming connections on port 3000
- ✅ Enable network access for your team

### Step 2: Verify Server is Running

Make sure `start-server.bat` is running and shows:
```
Server listening on:
  - Local:   http://localhost:3000
  - Network: http://172.30.18.102:3000
```

### Step 3: Share the URL

Send this to your team:
```
http://172.30.18.102:3000
```

---

## 🔍 Still Not Working? Check These:

### 1. Same Network?
Both you and your team must be on the **same office network**:
- ✅ Same WiFi network
- ✅ Same LAN (wired network)
- ❌ Different WiFi networks won't work
- ❌ VPN might block access

**How to check:**
- Ask team member to ping your IP:
  ```
  ping 172.30.18.102
  ```
- Should see replies (not "Request timed out")

### 2. Corporate Firewall/Proxy?
Some companies block custom ports:
- Ask IT department if port 3000 is blocked
- May need to use a different port or get approval

### 3. Antivirus Software?
Some antivirus software has built-in firewalls:
- Check: Norton, McAfee, Kaspersky, Avast, etc.
- Temporarily disable to test
- Add exception for port 3000

### 4. Router/Switch Issues?
Office routers might block internal communication:
- Check router settings for AP Isolation
- Ensure "Client Isolation" is OFF
- May need router admin to fix

### 5. IP Address Changed?
Your IP address might change if:
- Computer restarts
- Network reconnects
- DHCP lease expires

**Check current IP:**
```powershell
ipconfig | findstr IPv4
```

If different from 172.30.18.102:
- Update the URL you share with team
- Update NETWORK-ACCESS.md file

---

## 🧪 Testing Network Access

### From Your Computer:
```powershell
# Test local access
curl http://localhost:3000

# Test network access
curl http://172.30.18.102:3000
```

Both should return HTML (the dashboard page).

### From Team Member's Computer:
```powershell
# Test connection
Test-NetConnection -ComputerName 172.30.18.102 -Port 3000
```

Should show:
- TcpTestSucceeded: True

If False, firewall is blocking.

---

## 📋 Checklist

Before asking team to access:

- [ ] Server is running (`start-server.bat`)
- [ ] Firewall rule is created (`allow-network-access.bat` as admin)
- [ ] You can access locally (http://localhost:3000)
- [ ] You can access via network IP (http://172.30.18.102:3000)
- [ ] Team is on same network
- [ ] No corporate firewall blocking port 3000
- [ ] No antivirus blocking connections
- [ ] IP address hasn't changed

---

## 🆘 Advanced: Manual Firewall Rule

If the batch file doesn't work, create the rule manually:

1. Open **Windows Defender Firewall**
2. Click **Advanced settings**
3. Click **Inbound Rules** → **New Rule**
4. Select **Port** → Click **Next**
5. Select **TCP** → Enter **3000** → Click **Next**
6. Select **Allow the connection** → Click **Next**
7. Check **Domain** and **Private** → Click **Next**
8. Name: **Node.js Server - Port 3000** → Click **Finish**

---

## 📞 Still Having Issues?

### Check Server Logs
Look at the terminal running `start-server.bat`:
- Any error messages?
- Is it listening on the correct port?

### Get Help
Contact IT support with this information:
- Server IP: 172.30.18.102
- Port: 3000
- Protocol: HTTP (TCP)
- Request: Allow incoming connections on port 3000

---

## 🔐 Security Notes

- This firewall rule only allows connections from:
  - Domain networks (office network)
  - Private networks (home network)
- Public networks are blocked by default
- Only port 3000 is opened
- The app requires same-network access (no internet exposure)

