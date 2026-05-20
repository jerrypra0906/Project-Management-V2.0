@echo off
REM Start Docker Compose for LOCAL development
echo Starting in LOCAL mode...
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:3000

