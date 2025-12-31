# Add Windows Firewall rule to allow Node.js server access
# Run this script as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Network Access Setup for Project Management Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to this directory and run the script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "Running as Administrator - OK" -ForegroundColor Green
Write-Host ""

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName "Node.js Server - Port 3000" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "Firewall rule already exists. Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Node.js Server - Port 3000"
    Write-Host "Old rule removed." -ForegroundColor Green
    Write-Host ""
}

# Create new firewall rule
Write-Host "Creating new firewall rule..." -ForegroundColor Cyan
try {
    New-NetFirewallRule `
        -DisplayName "Node.js Server - Port 3000" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3000 `
        -Action Allow `
        -Profile Domain,Private `
        -Description "Allow incoming connections to Node.js server on port 3000 for Project Management Dashboard" `
        -Enabled True | Out-Null
    
    Write-Host "SUCCESS: Firewall rule created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Network access is now enabled on:" -ForegroundColor Cyan
    Write-Host "- http://localhost:3000" -ForegroundColor White
    Write-Host "- http://172.30.18.102:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Your team can now access the dashboard using:" -ForegroundColor Green
    Write-Host "http://172.30.18.102:3000" -ForegroundColor Yellow -BackgroundColor DarkGreen
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to create firewall rule" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

# Verify the rule was created
Write-Host "Verifying firewall rule..." -ForegroundColor Cyan
$rule = Get-NetFirewallRule -DisplayName "Node.js Server - Port 3000" -ErrorAction SilentlyContinue

if ($rule) {
    Write-Host "Rule verified successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Rule Details:" -ForegroundColor Cyan
    $rule | Select-Object DisplayName, Enabled, Direction, Action, Profile | Format-List
} else {
    Write-Host "WARNING: Could not verify the rule" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure your Node.js server is running (start-server.bat)" -ForegroundColor White
Write-Host "2. Share this URL with your team: http://172.30.18.102:3000" -ForegroundColor White
Write-Host "3. If they still can't access, check:" -ForegroundColor White
Write-Host "   - Both computers are on the same network" -ForegroundColor Gray
Write-Host "   - Your company firewall/proxy settings" -ForegroundColor Gray
Write-Host "   - Antivirus software firewall settings" -ForegroundColor Gray
Write-Host ""
pause

