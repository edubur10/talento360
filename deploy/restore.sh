#!/usr/bin/env bash
# Restaura un respaldo en la base de datos del despliegue Docker.
#   ./deploy/restore.sh backups/t360-20261008-0300.dump
# ATENCIÓN: reemplaza TODOS los datos actuales. Detiene la aplicación mientras restaura.
set -euo pipefail
FILE="${1:?Indique el archivo de respaldo (.dump)}"
[ -f "$FILE" ] || { echo "No existe $FILE"; exit 1; }
read -r -p "Esto reemplazará todos los datos actuales con $FILE. Escriba RESTAURAR para continuar: " OK
[ "$OK" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
docker compose stop app
docker compose exec -T db sh -c 'dropdb -U t360 --if-exists --force t360 && createdb -U t360 t360'
docker compose exec -T db pg_restore -U t360 -d t360 --no-owner < "$FILE"
docker compose up -d app
echo "Restauración completada. Verifique en https://\$DOMAIN/api/health"
