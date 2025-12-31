# Manual Sync Script - Syncs data from Google Sheets immediately

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual Google Sheets Sync" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Syncing Project data..." -ForegroundColor Yellow
node src/sync_google_sheets.js --sheetId=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY --gid=1287888772 --type=Project
Write-Host ""

Write-Host "Syncing CR data..." -ForegroundColor Yellow
node src/sync_google_sheets_cr.js --sheetId=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY --gid=355802550
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Sync completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

