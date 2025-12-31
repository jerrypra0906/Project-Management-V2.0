# Project Management Server Startup Script
# This script starts the server with Google Sheets auto-sync enabled

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project Management Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "- Sheet ID: 1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY"
Write-Host "- Project GID: 1287888772"
Write-Host "- CR GID: 355802550"
Write-Host "- Auto-sync: Every 5 minutes"
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Green
Write-Host "- Local:   http://localhost:3000" -ForegroundColor White
Write-Host "- Network: http://172.30.18.102:3000" -ForegroundColor White
Write-Host ""
Write-Host "Share the Network URL with your team!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SHEET_ID = "1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY"
$env:GID = "1287888772"
$env:CR_GID = "355802550"

node src/server.js

