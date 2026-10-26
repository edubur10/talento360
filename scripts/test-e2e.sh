#!/usr/bin/env bash
# Ejecuta la prueba de extremo a extremo sobre una base de datos de PRUEBA nueva.
# Requiere: PostgreSQL accesible, `npm run build` previo.
#   TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/t360_test ./scripts/test-e2e.sh
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TEST_DATABASE_URL:?Defina TEST_DATABASE_URL (base de datos exclusiva para pruebas; se BORRA)}"
PORT="${E2E_PORT:-3100}"
DBNAME="$(basename "${TEST_DATABASE_URL%%\?*}")"
ADMIN_URL="${TEST_DATABASE_URL%/*}/postgres"

echo "› Recreando la base de pruebas «$DBNAME»"
psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$DBNAME\" WITH (FORCE);" -c "CREATE DATABASE \"$DBNAME\";"

export DATABASE_URL="$TEST_DATABASE_URL" SEED_MODE=demo APP_URL="http://localhost:$PORT" DEFAULT_INSTITUTION_SLUG=pio-xii
npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts > /dev/null

echo "› Iniciando servidor de pruebas en el puerto $PORT"
npx next start -p "$PORT" > /tmp/t360-e2e-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for i in $(seq 1 40); do curl -sf "http://localhost:$PORT/api/health" > /dev/null && break; sleep 0.5; done

BASE_URL="http://localhost:$PORT" npx tsx tests/e2e/flujo-completo.ts
