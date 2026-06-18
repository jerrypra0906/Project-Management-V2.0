#!/usr/bin/env bash
# Safe Docker cleanup for the frontend-only server (ECS with docker-compose.frontend.yml).
# Does not remove volumes or stop running containers.
set -euo pipefail

cd /opt/Project-Management-V2.0 2>/dev/null || true

echo "=== Docker disk usage (before) ==="
docker system df

echo ""
echo "=== Running containers ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'

if ! docker ps --format '{{.Names}}' | grep -qx 'project_management_frontend'; then
  echo "WARNING: project_management_frontend is not running. Aborting (start it first or run prune manually)."
  exit 1
fi

echo ""
echo "=== Removing dangling images ==="
docker image prune -f

echo ""
echo "=== Removing unused images (keeps images used by running containers) ==="
docker image prune -a -f

echo ""
echo "=== Removing build cache ==="
docker builder prune -f

echo ""
echo "=== Removing stopped containers ==="
docker container prune -f

echo ""
echo "=== Removing unused networks ==="
docker network prune -f

echo ""
echo "=== Docker disk usage (after) ==="
docker system df

echo ""
echo "=== Frontend container status ==="
docker ps --filter name=project_management_frontend
