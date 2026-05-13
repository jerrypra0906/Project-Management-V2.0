# Start Docker Compose for TESTING environment
Write-Host "Starting in TESTING mode..." -ForegroundColor Yellow
Write-Host "Make sure frontend/nginx.conf.testing is configured with your testing backend URL!" -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Cyan

