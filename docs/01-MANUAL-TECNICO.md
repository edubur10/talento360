# E. Manual técnico: instalación, despliegue y mantenimiento

## 1. Arquitectura

| Capa | Tecnología | Motivo |
|---|---|---|
| Aplicación | Next.js 15 (React 19, TypeScript) | Una sola aplicación para el portal, el panel y la API; renderizado en el servidor (rápido en celulares de gama baja) |
| Estilos | Tailwind CSS 3, fuentes alojadas en el servidor (Atkinson Hyperlegible, Bricolage Grotesque) | No depende de servicios externos de fuentes (privacidad y conectividad) |
| API | Route Handlers REST en `src/app/api`, validación con Zod | Permisos verificables directamente por URL o API |
| Datos | PostgreSQL 16 + Drizzle ORM | Sin binarios nativos (funciona en redes restringidas), migraciones SQL legibles |
| Autenticación | Sesiones propias en servidor: token aleatorio de 256 bits en cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en producción), solo el hash en la base, contraseñas con bcrypt (costo 12), bloqueo de 15 min tras 5 intentos | Revocables al instante (desactivar usuario, cambio de rol o de clave). Se puede migrar a un proveedor institucional (Microsoft Entra ID o Google Workspace por OIDC) en la Fase 2 |
| Gráficos | Recharts | Estable, accesible y sin servicios externos |
| Exportación | ExcelJS | Excel nativo |
| QR | `qrcode`, generado en el servidor como SVG | No se envían enlaces a servicios de terceros |
| Despliegue | Docker Compose: app + PostgreSQL + Caddy (HTTPS automático) + respaldo diario | Un solo servidor, costo bajo, control institucional de los datos |

Seguridad transversal: validación en servidor de todos los datos, consultas parametrizadas (sin SQL armado a mano con datos del usuario), protección CSRF (cookie `SameSite` + verificación de `Origin`), cabeceras CSP, `X-Frame-Options`, `Referrer-Policy: no-referrer`, HSTS (en Caddy), límites de frecuencia en ingreso y envíos públicos, y mensajes de error que no revelan detalles internos.

## 2. Variables de entorno

Ver `.env.example`. **Nunca** suba `.env` a un repositorio.

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL |
| `APP_URL` | URL pública (enlaces y QR) |
| `DEFAULT_INSTITUTION_SLUG` | Institución que se muestra en la página de inicio |
| `SESSION_HOURS` | Duración de la sesión del personal (por defecto 10) |
| `POSTGRES_PASSWORD` | Clave de la base en Docker (larga y aleatoria) |
| `DOMAIN` | Dominio público (Caddy obtiene el certificado HTTPS) |
| `SEED_*` | Datos de la carga inicial de producción |
| `BACKUP_KEEP_DAYS` | Días de retención de respaldos (por defecto 30) |

## 3. Publicación en producción (servidor con Docker)

### Pasos que requieren intervención del propietario

1. **Contratar un servidor virtual (VPS)** con Ubuntu 24.04 LTS, mínimo 2 GB de RAM y 2 vCPU, 40 GB de disco. Ver costos en la sección 7.
2. **Dominio o subdominio** (p. ej. `talento360.hospitalpioxii.gov.co`) con un registro DNS tipo **A** que apunte a la IP del servidor. Lo hace quien administra el dominio del hospital.
3. **Definir las claves**: `POSTGRES_PASSWORD` y la clave temporal del administrador.
4. **Validación jurídica** del aviso de tratamiento de datos (ver `04-PROTECCION-DATOS.md`).

### Procedimiento

```bash
# En el servidor (como usuario con sudo)
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker

# Copiar el proyecto (git clone de su repositorio privado, o subir el .zip y descomprimir)
cd /opt && sudo mkdir talento360 && sudo chown $USER talento360 && cd talento360
# … copiar aquí el contenido del proyecto …

cp .env.example .env
nano .env
#   POSTGRES_PASSWORD=<openssl rand -base64 32>
#   DOMAIN=talento360.su-dominio.gov.co
#   DEFAULT_INSTITUTION_SLUG=pio-xii
#   SEED_MODE=produccion
#   SEED_INSTITUTION_NAME="ESE Hospital Pío XII"
#   SEED_INSTITUTION_SLUG=pio-xii
#   SEED_INSTITUTION_CITY="Colón, Putumayo"
#   SEED_ADMIN_EMAIL=correo-del-administrador@...
#   SEED_ADMIN_PASSWORD=<clave temporal de 12+ caracteres con letras y números>
chmod 600 .env

# Firewall: solo SSH y web
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable

# Construir e iniciar (la primera vez tarda varios minutos)
docker compose up -d --build

# Carga inicial (solo una vez): crea la institución y el administrador técnico
docker compose run --rm migrate npx tsx scripts/seed.ts

# Verificar
docker compose ps
curl https://$DOMAIN/api/health      # → {"ok":true,"db":"ok"}
```

Después de la carga, **borre `SEED_ADMIN_PASSWORD` del archivo `.env`**. El administrador ingresa en `https://DOMINIO/ingresar`, cambia la clave temporal y configura sedes, servicios, modalidades y usuarios.

### Entorno de pruebas o piloto con datos de demostración

En un servidor **distinto** al de producción: `SEED_MODE=demo` y ejecute `docker compose run --rm -e ALLOW_DEMO_SEED=1 migrate npx tsx scripts/seed.ts`. Los datos de demostración están marcados y el sistema muestra un aviso permanente.

## 4. Actualizaciones

```bash
cd /opt/talento360
# copiar la nueva versión del código (git pull o archivos)
docker compose up -d --build        # aplica migraciones pendientes automáticamente
docker compose logs -f app          # revisar
```

Antes de cada actualización, genere un respaldo manual (ver `08-RESPALDO-RECUPERACION.md`).

## 5. Operación y monitoreo

- Salud: `GET /api/health` (aplicación y base de datos). Configure un monitor externo de disponibilidad sobre esta URL.
- Registros: `docker compose logs app`, `docker compose logs caddy`. Caddy **no registra** las rutas públicas de participación (`/c/*`, `/api/public/*`, `/seguimiento`) para no asociar participaciones anónimas a IP y hora.
- Auditoría funcional: panel → Auditoría (roles Calidad, Auditor y Administrador técnico).
- Límite de frecuencia: en memoria del proceso. Si en el futuro se ejecutan varias instancias, debe moverse a Redis.

## 6. Mantenimiento

| Tarea | Frecuencia |
|---|---|
| Revisar que existan respaldos recientes en `./backups` | Semanal |
| Prueba de restauración en un servidor de pruebas | Trimestral |
| Actualizaciones de seguridad del sistema operativo (`sudo apt upgrade`) | Mensual |
| Actualizar dependencias (`npm outdated`, `npm audit`), reconstruir y ejecutar pruebas | Trimestral |
| Revisar usuarios activos y roles | Trimestral |
| Copia de respaldos fuera del servidor | Diaria o semanal (ver guía de respaldo) |

## 7. Costos y dependencias del alojamiento

Valores **de referencia aproximados (USD/mes)**. Verifique precios vigentes al contratar: no pudieron confirmarse en línea durante el desarrollo.

| Opción | Componentes | Rango aproximado | Observaciones |
|---|---|---|---|
| **A. VPS único (recomendada)** | Servidor 2 GB/2 vCPU (DigitalOcean, Hetzner, Linode, AWS Lightsail u operador nacional) | 10 a 25 | Incluye app, base y respaldos locales. Control total de los datos |
| Respaldo externo | Almacenamiento de objetos (S3 compatible) o copia a un servidor del hospital | 1 a 5 | Recomendado para recuperación ante pérdida del servidor |
| Dominio | Subdominio del dominio institucional | 0 | Si se compra uno nuevo: costo anual del registrador |
| Certificado HTTPS | Let's Encrypt, automático con Caddy | 0 | |
| **B. Servicios administrados** | Vercel (app) + Neon o Supabase (PostgreSQL) | 0 a 45 | Menos mantenimiento; revisar condiciones de transferencia internacional de datos y planes gratuitos con suspensión por inactividad |
| IA externa | No se usa en la Fase 1 | 0 | |

**Dependencias externas en ejecución:** ninguna además del servidor y el certificado. No hay analítica, fuentes, CDN ni scripts de terceros.

**Ubicación de los datos:** la mayoría de proveedores alojan fuera de Colombia. Según la Ley 1581 de 2012, la transferencia internacional de datos personales tiene condiciones: **debe validarlo la oficina jurídica** antes de elegir proveedor y región.

## 8. Ejecución de pruebas

```bash
npm test                                                     # unitarias
npm run build
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/t360_test ./scripts/test-e2e.sh
```

La prueba E2E **borra y recrea** la base indicada, carga datos de demostración, inicia un servidor en el puerto 3100 y recorre los 15 criterios de aceptación (incluye un navegador móvil real). Resultados en `tests/e2e/resultados.json`.
