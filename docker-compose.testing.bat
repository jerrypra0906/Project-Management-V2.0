@echo off
REM Start Docker Compose for TESTING environment
echo Starting in TESTING mode...
echo Make sure frontend/nginx.conf.testing is configured with your testing backend URL!
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:3000

