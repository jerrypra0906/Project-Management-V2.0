# Start Docker Compose for PRODUCTION environment
Write-Host "Starting in PRODUCTION mode..." -ForegroundColor Red
Write-Host "WARNING: Make sure frontend/nginx.conf.production is configured correctly!" -ForegroundColor Red
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Cyan

