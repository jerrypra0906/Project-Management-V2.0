When deploying an updated frontend:

```bash
cd /opt/Project-Management-V2.0
git pull origin main

docker compose -f docker-compose.frontend.yml build frontend
docker compose -f docker-compose.frontend.yml up -d frontend

for backend 

cd /opt/Project-Management-V2.0
git pull origin main

docker compose build backend
docker compose up -d backend