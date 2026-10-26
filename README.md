# Talento 360° Salud

**Sistema Integral de Escucha, Bienestar y Respuesta al Talento Humano.**
*«Tu voz transforma nuestra institución».*

Aplicación web para que una ESE escuche a sus trabajadores, gestione las necesidades identificadas hasta verificar su efectividad y documente el mejoramiento continuo del talento humano (Estándar 104, TH1, del Manual de Acreditación en Salud Ambulatorio y Hospitalario, Resolución 5095 de 2018).

Primera institución: **ESE Hospital Pío XII, Colón (Putumayo)**. Diseñada para varias ESE con datos separados.

> **Estado: Fase 1 (MVP) construida y probada.** 27 pruebas unitarias y 88 verificaciones de extremo a extremo (los 15 criterios de aceptación) aprobadas. Ver `docs/05-INFORME-PRUEBAS.md`.

## Qué hace la Fase 1

`IDENTIFICAR → ANALIZAR → PRIORIZAR → RESPONDER → VERIFICAR → MEJORAR → DOCUMENTAR`

- **Portal del colaborador**: inicio institucional, consulta por enlace o QR, participación **anónima real** o **confidencial**, código de seguimiento, «Mi espacio», «Tú lo propusiste, el hospital lo hizo» y comunicados.
- **Instrumento de necesidades**: 8 secciones (A–G y necesidades concretas), escalas 1–5 con «No aplica», preguntas condicionales y ramificación por modalidad de vinculación.
- **Bandeja de necesidades**: ciclo de 10 estados validado en el servidor, clasificación con criterio TH1, análisis, matriz de priorización ponderada (editable y aprobable), asignación, acciones con medio de verificación y evidencia, respuesta, **evaluación de efectividad distinta del cierre administrativo**, reapertura, agrupación de repetidas y trazabilidad completa.
- **Tablero gerencial**: 6 indicadores propuestos con ficha técnica («No calculable» si el denominador es 0), alertas, Pareto, tendencia, matriz de calor, actividad por criterio TH1 y distribución por servicio con supresión de grupos pequeños.
- **Exportación a Excel** sin datos de identidad.
- **Roles y permisos** (8 roles, mínimo privilegio, control en el servidor), **aislamiento entre instituciones**, **auditoría** y configuración institucional.

## Arranque rápido (desarrollo)

Requisitos: Node.js 22 y PostgreSQL 16.

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL y ponga SEED_MODE=demo
npm run db:migrate            # crea las tablas
npm run db:seed               # datos de DEMOSTRACIÓN (ficticios y marcados)
npm run dev                   # http://localhost:3000
```

Usuarios de demostración (contraseña `Demo-T360-2026`): `talento@demo.t360`, `calidad@demo.t360`, `gerencia@demo.t360`, `lider.urgencias@demo.t360`, `sst@demo.t360`, `auditor@demo.t360`, `admin@demo.t360`, `colaborador@demo.t360`. Código de seguimiento de prueba: `T360-DEMO-0001`.

## Producción

Ver **`docs/01-MANUAL-TECNICO.md`**: un servidor con Docker, `docker compose up -d --build`, HTTPS automático y respaldo diario.

## Comandos

| Comando | Uso |
|---|---|
| `npm run build` / `npm start` | Compilar y ejecutar en producción |
| `npm run db:generate` | Generar migración SQL tras cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplicar migraciones pendientes |
| `npm run db:seed` | Carga inicial (`SEED_MODE=demo` o `produccion`) |
| `npm test` | Pruebas unitarias (Vitest) |
| `TEST_DATABASE_URL=… ./scripts/test-e2e.sh` | Pruebas de aceptación de extremo a extremo (base de pruebas que se BORRA) |
| `npm run typecheck` | Verificación de tipos |

## Estructura

```
src/
  app/            páginas (portal, formulario, panel) y API REST (app/api)
  components/     interfaz; components/client = componentes interactivos
  db/             esquema de datos (Drizzle ORM) y conexión
  lib/            reglas de negocio puras: ciclo de estados, indicadores, priorización,
                  permisos, privacidad, criterios TH1, instrumento
  server/         servicios con acceso a datos (siempre filtrados por institución)
drizzle/          migraciones SQL versionadas
scripts/          migración, carga inicial y pruebas E2E
deploy/           Caddy (HTTPS), respaldos y restauración
tests/            unitarias y extremo a extremo
docs/             manuales y entregables D–J
```

## Documentación

| | Documento |
|---|---|
| C | `docs/00-ESQUEMA-DATOS.md`: esquema, relaciones, índices y migraciones |
| D | `docs/02-MANUAL-USUARIO.md` |
| E | `docs/01-MANUAL-TECNICO.md`: instalación, despliegue, mantenimiento, costos |
| F | `docs/03-MATRIZ-TRAZABILIDAD-TH1.md` |
| G | `docs/04-PROTECCION-DATOS.md` |
| H | `docs/05-INFORME-PRUEBAS.md` |
| I | `docs/06-PLAN-IMPLEMENTACION.md` |
| J | `docs/07-RUTA-EVOLUCION.md` |
| | `docs/08-RESPALDO-RECUPERACION.md` |

## Advertencia normativa

La redacción de los 15 criterios del TH1 proviene del documento de requerimientos y **no fue cotejada contra el texto oficial** del Manual (el PDF oficial no estuvo disponible en formato legible durante el desarrollo). Calidad debe verificarla antes de usar el sistema como soporte ante evaluadores (`src/lib/th1.ts`). El sistema **no asigna calificaciones de acreditación** y su instalación por sí sola no demuestra cumplimiento.
