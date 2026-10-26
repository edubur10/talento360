# C. Estructura de base de datos

Motor: **PostgreSQL 16**. Definición: `src/db/schema.ts` (Drizzle ORM). Migraciones SQL versionadas en `drizzle/` (la primera: `0000_inicial.sql`), aplicadas con `npm run db:migrate`.

## Principios

1. **Multi-institución**: toda tabla operativa tiene `institution_id` y toda consulta del servidor se filtra por la institución de la sesión. Verificado por la Prueba 13.
2. **Identificadores UUID v4 aleatorios** (`gen_random_uuid()`): no son secuenciales ni contienen marca de tiempo, así que no permiten ordenar ni correlacionar participaciones anónimas.
3. **Anonimato**: en campañas anónimas `submissions.user_id` y `needs.reporter_id` son nulos y solo se guarda la **fecha** (`submitted_on` de tipo `date`). La recepción de la necesidad se fija a medianoche del día.
4. **Sin datos clínicos de pacientes.**

## Entidades

| Tabla | Propósito | Campos clave |
|---|---|---|
| `institutions` | ESE configuradas | slug, nombre, colores, lema, `min_group_size` (umbral de confidencialidad), `response_days`, pesos de priorización y aprobación, metas de indicadores, consecutivo de necesidades, `is_demo` |
| `sites` | Sedes | nombre, activo |
| `services` | Servicios y procesos | sede, tipo (asistencial / administrativo / apoyo), activo |
| `employment_types` | Modalidades de vinculación | código (PLANTA, CONTRATISTA, TERCERO, FORMACION…), nombre |
| `users` | Personal con acceso | correo único, hash bcrypt, rol, servicio, activo, intentos fallidos, bloqueo temporal, cambio de clave obligatorio |
| `sessions` | Sesiones revocables | **hash SHA-256** del token (el token nunca se guarda), vencimiento |
| `campaigns` | Campañas de escucha | slug aleatorio (enlace), modalidad ANONIMA / CONFIDENCIAL, estado, fechas, trabajadores elegibles |
| `questions` | Preguntas de cada campaña | sección A–G, tipo, opciones, obligatoria, «No aplica», criterio TH1, categoría, condición (`show_if_*`), ramificación por modalidad |
| `submissions` | Participaciones | usuario (nulo si anónima), modalidad, servicio opcional, **solo fecha**, hash del código de seguimiento. Único (campaña, usuario) |
| `answers` | Respuestas | valor JSON, «No aplica» |
| `needs` | Necesidades (núcleo) | código NEC-AAAA-NNNN, origen, anónima, reportante (solo confidencial), categoría, criterio TH1, servicio, seguridad del paciente, análisis, impacto, puntajes, prioridad y método y aprobador, urgente, escalamiento, estado, responsable, compromiso, recursos, respuesta, cierre y **tipo de cierre** (EFECTIVIDAD_VERIFICADA / ADMINISTRATIVO), agrupación, publicación |
| `need_events` | Trazabilidad | tipo, estado anterior y nuevo, actor, nota, datos |
| `actions` | Acciones de respuesta | responsable, inicio, fecha límite, **medio de verificación**, recursos, estado, evidencia |
| `effectiveness_reviews` | Evaluación de efectividad | resultado, método, evidencia, evaluador, fecha |
| `announcements` | Comunicados del portal | título, mensaje |
| `audit_logs` | Auditoría | actor (nulo para anónimos), rol, acción, entidad, detalle |

## Relaciones principales

```
institutions 1─* sites 1─* services
institutions 1─* employment_types
institutions 1─* users ─* sessions
institutions 1─* campaigns 1─* questions
campaigns 1─* submissions 1─* answers *─1 questions
submissions 1─* needs ─* need_events
needs 1─* actions        needs 1─* effectiveness_reviews
needs *─1 needs (agrupación: group_parent_id)
```

## Índices

- Únicos: `institutions.slug`, `users.email`, `sessions.token_hash`, `campaigns.slug`, `submissions.tracking_code_hash`, `(campaign_id, user_id)` en submissions, `(institution_id, code)` en needs, `(institution_id, name)` en sedes y servicios, `(institution_id, code)` en modalidades, `(campaign_id, code)` en preguntas.
- Consulta: `needs (institution_id, status)`, `needs (institution_id, category)`, `needs (tracking_code_hash)`, `actions (institution_id, status, due_date)`, `need_events (need_id, created_at)`, `audit_logs (institution_id, created_at)`, `users (institution_id, role)`.

## Cambios al esquema

1. Modificar `src/db/schema.ts`.
2. `npm run db:generate -- --name descripcion_del_cambio` genera el SQL en `drizzle/`.
3. Revisar el SQL generado y versionarlo.
4. `npm run db:migrate` en cada entorno (en Docker se ejecuta automáticamente al iniciar).
