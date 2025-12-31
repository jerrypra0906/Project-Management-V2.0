# 🔧 Troubleshooting Guide - Network Access Issues

## Problem: Friends/Colleagues Can't Access the App

If someone on your network cannot access http://172.30.18.102:3000, follow these steps:

---

## ✅ Quick Checklist

### Step 1: Verify Same Network
**Both devices MUST be on the same WiFi/LAN**

Ask your friend to check:
- [ ] Are they connected to the same WiFi network as you?
- [ ] Can they access other devices on the network?

**Test connectivity:**
```powershell
# On your friend's laptop, open PowerShell and run:
ping 172.30.18.102

# Should see replies like:
# Reply from 172.30.18.102: bytes=32 time=2ms TTL=128
```

If ping **fails** ❌:
- Not on same network, or
- Network has AP Isolation enabled (see below)

---

### Step 2: Setup Windows Firewall (MOST COMMON ISSUE)

**⚠️ This requires Administrator privileges!**

1. **Right-click PowerShell** → Select **"Run as Administrator"**
2. Navigate to project folder:
   ```powershell
   cd "D:\Cursor\Project Management"
   ```
3. Run the firewall setup script:
   ```powershell
   .\setup-firewall.ps1
   ```

**Manual Alternative:**
If the script doesn't work, run this in **Administrator PowerShell**:
```powershell
netsh advfirewall firewall add rule name="Project Management App" dir=in action=allow protocol=TCP localport=3000 profile=any
```

**Verify firewall rule:**
```powershell
netsh advfirewall firewall show rule name="Project Management App"
```

Should show:
```
Rule Name:                            Project Management App
Enabled:                              Yes
Direction:                            In
Profiles:                             Domain,Private,Public
Action:                               Allow
Protocol:                             TCP
LocalPort:                            3000
```

---

### Step 3: Verify Server is Running

On your computer:
1. Check if server is running: http://localhost:3000
2. Should see the app ✅

**Check server process:**
```powershell
Get-Process node
```

Should show node.exe running.

**Check if port 3000 is listening:**
```powershell
netstat -an | Select-String ":3000"
```

Should show:
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
```

If you see `127.0.0.1:3000` instead of `0.0.0.0:3000`, the server is NOT configured for network access!

---

### Step 4: Check Your Network Profile

Some Windows firewall settings depend on network profile:

```powershell
Get-NetConnectionProfile
```

Look at `NetworkCategory`:
- **Public** - Most restrictive (might block)
- **Private** - Recommended for home/office
- **Domain** - For corporate networks

**Change to Private if needed:**
```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
```
(Replace "Wi-Fi" with your actual interface name from the first command)

---

## 🔍 Advanced Troubleshooting

### Issue: AP Isolation / Client Isolation

Some routers/WiFi have "AP Isolation" or "Client Isolation" enabled, which prevents devices from communicating with each other.

**Check with your network admin or:**
1. Access your router settings (usually http://192.168.1.1 or http://172.30.18.254)
2. Look for "AP Isolation", "Client Isolation", or "Privacy Separator"
3. **Disable** this feature
4. Restart router

**Test if this is the issue:**
- Can you ping other computers on the network?
- Can other devices ping your computer?

---

### Issue: Antivirus Software Blocking

Some antivirus programs have their own firewall:

**Common antivirus with firewalls:**
- Norton
- McAfee
- Kaspersky
- Avast
- AVG
- Bitdefender

**Solution:**
1. Open your antivirus settings
2. Find "Firewall" or "Network Protection"
3. Add exception for port 3000
4. Or temporarily disable to test

---

### Issue: Corporate Network Restrictions

If on a corporate network:
- Port 3000 might be blocked by network policy
- May need IT department to allow it
- Consider using ngrok instead (see below)

---

### Issue: Wrong IP Address

Your computer's IP might change (DHCP):

**Check current IP:**
```powershell
ipconfig | Select-String "IPv4"
```

**If IP changed:**
1. Update the URL you share with friends
2. Update `src/server.js` with new IP
3. Restart server

**To prevent IP changes:**
- Set static IP in router (DHCP reservation)
- Or use computer's hostname instead: http://YOUR-COMPUTER-NAME:3000

---

## 🚀 Alternative Solution: Use ngrok (Temporary Internet Access)

If local network sharing doesn't work, use ngrok for temporary internet access:

1. **Install ngrok:**
   ```powershell
   npm install -g ngrok
   ```

2. **Share your localhost:**
   ```powershell
   ngrok http 3000
   ```

3. **Share the URL** that ngrok provides (e.g., https://abc123.ngrok.io)
   - Works from anywhere in the world!
   - Free tier available
   - URL changes each time (unless you get a paid account)

---

## 📋 Quick Diagnostic Script

Run this on your computer to gather diagnostic info:

```powershell
Write-Host "=== Network Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# IP Address
Write-Host "Your IP Address:" -ForegroundColor Yellow
ipconfig | Select-String "IPv4"

# Server Process
Write-Host "`nServer Process:" -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName

# Port Listening
Write-Host "`nPort 3000 Status:" -ForegroundColor Yellow
netstat -an | Select-String ":3000" | Select-Object -First 3

# Firewall Rule
Write-Host "`nFirewall Rule:" -ForegroundColor Yellow
netsh advfirewall firewall show rule name="Project Management App" | Select-String "Rule Name","Enabled","Direction","Profile","Action","LocalPort"

# Network Profile
Write-Host "`nNetwork Profile:" -ForegroundColor Yellow
Get-NetConnectionProfile | Select-Object Name, NetworkCategory, InterfaceAlias

Write-Host ""
Write-Host "Share this info if asking for help!" -ForegroundColor Green
```

---

## ✅ Checklist Summary

- [ ] Friend is on same WiFi/network
- [ ] Can ping your computer (172.30.18.102)
- [ ] Firewall rule created (as Administrator)
- [ ] Server is running
- [ ] Server listening on 0.0.0.0:3000 (not 127.0.0.1)
- [ ] Network profile is Private (not Public)
- [ ] No AP Isolation on router
- [ ] No antivirus blocking port 3000
- [ ] Using correct IP address

---

## 📞 Still Not Working?

1. Try ngrok (temporary solution above)
2. Consider cloud deployment (Railway.app, Render.com)
3. Check `NETWORK-ACCESS.md` for more info
4. Share diagnostic output (script above) for help

---

**Last Updated**: October 9, 2025

