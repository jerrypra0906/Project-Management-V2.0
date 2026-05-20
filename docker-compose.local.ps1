# Start Docker Compose for LOCAL development
Write-Host "Starting in LOCAL mode..." -ForegroundColor Green
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Cyan

