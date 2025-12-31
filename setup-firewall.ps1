# Project Management App - Firewall Setup Script
# Run this script as Administrator to allow network access

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project Management App - Firewall Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "How to run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Navigate to this folder: cd 'D:\Cursor\Project Management'" -ForegroundColor White
    Write-Host "4. Run: .\setup-firewall.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "Running with Administrator privileges..." -ForegroundColor Green
Write-Host ""

# Remove existing rule if any
Write-Host "Removing existing firewall rule (if any)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Project Management App" 2>$null

# Add new firewall rule for all network profiles
Write-Host "Creating new firewall rule..." -ForegroundColor Yellow
$result = netsh advfirewall firewall add rule name="Project Management App" dir=in action=allow protocol=TCP localport=3000 profile=any

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Firewall rule created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Firewall Rule Details:" -ForegroundColor Cyan
    Write-Host "- Rule Name: Project Management App" -ForegroundColor White
    Write-Host "- Direction: Inbound" -ForegroundColor White
    Write-Host "- Protocol: TCP" -ForegroundColor White
    Write-Host "- Port: 3000" -ForegroundColor White
    Write-Host "- Profile: All (Domain, Private, Public)" -ForegroundColor White
    Write-Host "- Action: Allow" -ForegroundColor White
    Write-Host ""
    
    # Show the rule
    Write-Host "Verifying firewall rule..." -ForegroundColor Yellow
    netsh advfirewall firewall show rule name="Project Management App"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your app is now accessible from other devices on your network:" -ForegroundColor White
    Write-Host "http://172.30.18.102:3000" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to create firewall rule!" -ForegroundColor Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

