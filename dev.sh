#!/bin/bash

BASE="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Iniciando SellaPlus (dev)..."

# DB
echo "  → PostgreSQL..."
docker compose -f "$BASE/docker-compose.dev.yml" up -d
sleep 2

# Backend
echo "  → Backend (puerto 4300)..."
cd "$BASE/backend"
npm run start:dev &
BACKEND_PID=$!

# Frontend
echo "  → Frontend (puerto 4200)..."
cd "$BASE/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅  Servicios corriendo:"
echo "    Frontend  → http://localhost:4200"
echo "    API       → http://localhost:4300/api/v1"
echo "    Swagger   → http://localhost:4300/api/docs"
echo ""
echo "Presiona Ctrl+C para detener todo."

trap "echo '⏹ Deteniendo...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose -f '$BASE/docker-compose.dev.yml' stop; exit 0" INT

wait
