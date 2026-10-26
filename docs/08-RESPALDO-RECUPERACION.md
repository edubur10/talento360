# Guía de respaldo y recuperación

## Qué se respalda

Toda la información vive en **PostgreSQL**: configuración, usuarios, campañas, respuestas, necesidades, acciones, evaluaciones y auditoría. La aplicación no guarda archivos en disco en la Fase 1.

También debe conservarse, aparte y de forma segura, el archivo **`.env`**, que contiene las claves.

## Respaldo automático

El servicio `backup` de `docker-compose.yml` genera cada 24 horas un archivo `backups/t360-AAAAMMDD-HHMM.dump` (formato `pg_dump` comprimido) y elimina los de más de `BACKUP_KEEP_DAYS` días (por defecto 30).

Verificar:
```bash
ls -lh /opt/talento360/backups | tail
docker compose logs backup | tail
```

## Respaldo manual (antes de actualizar)
```bash
docker compose exec -T db pg_dump -U t360 -Fc t360 > backups/manual-$(date +%Y%m%d-%H%M).dump
```

## Copia fuera del servidor (obligatoria)

Un respaldo que solo existe en el mismo servidor se pierde con él. Opciones:
- **Almacenamiento de objetos** (S3 compatible) con `rclone` y una tarea programada en el servidor:
  ```bash
  # crontab -e   (todos los días a las 4:30)
  30 4 * * * rclone copy /opt/talento360/backups remoto:t360-respaldos --max-age 48h
  ```
- **Servidor del hospital**: `rsync` por SSH a un equipo institucional.

Los respaldos contienen datos personales: almacénelos cifrados o en un destino de acceso restringido.

## Restauración

```bash
cd /opt/talento360
./deploy/restore.sh backups/t360-20261008-0300.dump
```
El script pide confirmación escribiendo `RESTAURAR`, detiene la aplicación, recrea la base, restaura y vuelve a iniciar. Luego verifique `https://DOMINIO/api/health` e ingrese al panel.

## Recuperación ante pérdida total del servidor

1. Contratar un servidor nuevo e instalar Docker (manual técnico, sección 3).
2. Copiar el proyecto y el archivo `.env` resguardado.
3. `docker compose up -d --build` (crea una base vacía y aplica las migraciones).
4. Copiar el último respaldo a `backups/` y ejecutar `./deploy/restore.sh`.
5. Actualizar el DNS si cambió la IP.

Objetivos de referencia: **pérdida máxima de datos de 24 horas** (respaldo diario) y **recuperación en menos de 4 horas**. Para una pérdida menor, aumente la frecuencia del respaldo o use un PostgreSQL administrado con recuperación a un punto en el tiempo.

## Prueba trimestral

En un servidor de pruebas, restaure el respaldo más reciente y verifique que: (1) se puede ingresar, (2) la bandeja muestra las necesidades, (3) el tablero calcula indicadores. Registre la fecha y el resultado.
