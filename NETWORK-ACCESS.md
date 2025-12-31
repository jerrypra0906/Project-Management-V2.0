# 🌐 Network Access Guide

## How to Access the Project Management App

### From Your Computer (Host)
- **URL**: http://localhost:3000
- **Network URL**: http://172.30.18.102:3000

### From Other Devices (Same Network)
Share this URL with your team members who are on the same network:

📱 **Access URL**: **http://172.30.18.102:3000**

---

## 🚀 Quick Setup (First Time)

If your team cannot access the dashboard, you need to **allow network access through Windows Firewall**:

### Steps:
1. **Right-click** on `allow-network-access.bat`
2. Select **"Run as administrator"**
3. Click **Yes** when Windows asks for permission
4. Wait for the success message
5. ✅ Done! Your team can now access the dashboard

**OR** run this command in PowerShell (as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Node.js Server - Port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Domain,Private
```

---

## ✅ Requirements

To access the app from other devices, they must be:
1. **Connected to the same network** (same WiFi or LAN)
2. **On the same subnet** (typically automatic if on same WiFi)
3. **Windows Firewall rule must be enabled** (see Quick Setup above)

---

## 📱 Supported Devices

The application works on:
- ✅ Desktop computers (Windows, Mac, Linux)
- ✅ Laptops
- ✅ Tablets (iPad, Android tablets)
- ✅ Smartphones (iPhone, Android)
- ✅ Any device with a modern web browser

---

## 🔧 How to Share with Team

### Option 1: Share the Link
Just copy and send this URL to your team:
```
http://172.30.18.102:3000
```

### Option 2: Create QR Code (Optional)
Generate a QR code for the URL so team members can scan with their phones:
- Use any QR code generator online
- Input: http://172.30.18.102:3000
- Print or display the QR code

---

## 🚀 Starting the Server

### Quick Start
Double-click one of these files:
- `start-server.bat` (Windows Command Prompt)
- `start-server.ps1` (PowerShell)

The server will display:
```
Access URLs:
- Local:   http://localhost:3000
- Network: http://172.30.18.102:3000
```

---

## 🛑 Stopping the Server

Double-click:
- `stop-server.bat` (Windows Command Prompt)
- `stop-server.ps1` (PowerShell)

---

## 🔥 Firewall Settings

### If Team Cannot Access (Firewall Blocked)

The most common issue is **Windows Firewall blocking incoming connections**. 

#### Solution:
1. **Right-click** on `allow-network-access.bat`
2. Select **"Run as administrator"**
3. Click **Yes** when prompted
4. ✅ Firewall rule will be created automatically

#### What This Does:
- Creates a firewall rule named "Node.js Server - Port 3000"
- Allows incoming TCP connections on port 3000
- Enables access from Domain and Private networks
- Action: Allow

If you need to remove the firewall rule:
```powershell
Remove-NetFirewallRule -DisplayName "Project Management App"
```

---

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

1. **Local Network Only**: This setup only allows access from devices on your local network
2. **Not Internet-Accessible**: Devices outside your network cannot access the app
3. **No Authentication**: Currently, there's no login system. Anyone on your network can access it
4. **Firewall Protection**: Windows Firewall is configured to only allow port 3000

### For Production Use:
If you need internet access or better security:
- Consider deploying to a cloud platform (Railway, Render, etc.)
- Implement authentication/authorization
- Use HTTPS/SSL certificates

---

## 🆘 Troubleshooting

### Can't Access from Other Devices?

1. **Check Network Connection**
   - Ensure both devices are on the same WiFi/network
   - Try pinging: `ping 172.30.18.102`

2. **Check Firewall**
   - Run as Administrator in PowerShell:
   ```powershell
   Get-NetFirewallRule -DisplayName "Project Management App"
   ```

3. **Check Server is Running**
   - Open http://localhost:3000 on host computer
   - Should show the app

4. **Verify IP Address**
   - IP addresses can change (DHCP)
   - Check current IP: `ipconfig`
   - Update access URL if IP changed

### Server Won't Start?

1. **Port Already in Use**
   - Stop existing server: `.\stop-server.bat`
   - Then start again

2. **Check Node.js**
   - Ensure Node.js is installed: `node --version`

---

## 📊 Current Configuration

- **Host IP**: 172.30.18.102
- **Port**: 3000
- **Google Sheets ID**: 1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY
- **Auto-sync**: Every 5 minutes
- **Daily Snapshots**: Automatic

---

## 📞 Need Help?

If you encounter issues:
1. Check this guide's troubleshooting section
2. Verify all prerequisites are met
3. Check the server console for error messages
4. Ensure network connectivity between devices

---

**Last Updated**: October 9, 2025

