# Stop Project Management Server

Write-Host "Stopping all Node.js processes on port 3000..." -ForegroundColor Yellow
Write-Host ""

$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($pid in $processes) {
        Write-Host "Killing process ID: $pid" -ForegroundColor Cyan
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Green
} else {
    Write-Host "No server found running on port 3000." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

