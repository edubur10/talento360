#!/bin/sh
# Respaldo diario de PostgreSQL (formato custom, comprimido) con retención configurable.
set -eu
mkdir -p /backups
while true; do
  STAMP=$(date +%Y%m%d-%H%M)
  FILE="/backups/t360-$STAMP.dump"
  if pg_dump -Fc -f "$FILE.tmp"; then
    mv "$FILE.tmp" "$FILE"
    echo "[respaldo] $FILE ($(du -h "$FILE" | cut -f1))"
  else
    echo "[respaldo] ERROR al generar $FILE" >&2
    rm -f "$FILE.tmp"
  fi
  find /backups -name 't360-*.dump' -mtime +"${BACKUP_KEEP_DAYS:-30}" -delete
  sleep 86400
done
