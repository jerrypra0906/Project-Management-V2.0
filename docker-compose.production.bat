@echo off
REM Start Docker Compose for PRODUCTION environment
echo Starting in PRODUCTION mode...
echo WARNING: Make sure frontend/nginx.conf.production is configured correctly!
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:3000

