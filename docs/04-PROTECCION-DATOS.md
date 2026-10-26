# G. Guía de protección de datos personales

Marco de referencia: Ley 1581 de 2012 y sus normas reglamentarias, y la política de tratamiento de datos de la institución. **Este documento describe controles técnicos. Las decisiones jurídicas de la sección 3 deben ser validadas por la oficina jurídica y el responsable de protección de datos de la ESE antes de la puesta en producción.**

## 1. Datos que trata el sistema

| Dato | Dónde | Finalidad | Sensible |
|---|---|---|---|
| Nombre, correo y rol del personal con acceso | `users` | Autenticación y trazabilidad | No |
| Identidad de quien participa en campañas **confidenciales** | `submissions.user_id`, `needs.reporter_id` | Responder la necesidad | No por sí misma; el contenido podría serlo |
| Modalidad de vinculación y servicio (opcional) | `submissions` | Ramificación del instrumento y análisis agregado | No, pero puede identificar en grupos pequeños (ver controles) |
| Respuestas y necesidades | `answers`, `needs` | Gestión del talento humano | El texto libre podría contener datos sensibles que la persona escriba |
| Registros de auditoría | `audit_logs` | Seguridad y trazabilidad | No |

**No se recogen**: documento de identidad, datos de salud, creencias, orientación sexual, afiliación sindical o política, ni información clínica de pacientes.

## 2. Controles técnicos implementados (verificados en pruebas)

| Control | Implementación | Prueba |
|---|---|---|
| Anonimato real | Sin usuario, sin IP y sin hora (solo fecha); identificadores UUID aleatorios; auditoría sin actor; Caddy no registra rutas públicas; código de seguimiento guardado solo como hash | P5 |
| Sin borrador en dispositivos compartidos | En campañas anónimas no se guarda borrador en el navegador | Revisión de código |
| Confidencialidad de identidad | Solo el rol Talento Humano ve la identidad; cada consulta se audita; no aparece en exportaciones | P11 |
| Protección frente a identificación indirecta | Umbral *k* configurable (por defecto 5): resultados de campañas, preguntas ramificadas, opciones y distribución por servicio con menos de *k* se ocultan; un único grupo oculto no se publica para que no pueda deducirse por diferencia; respuestas abiertas en orden aleatorio | Unitarias y revisión |
| Mínimo privilegio | 8 roles; el administrador técnico no ve necesidades; líderes y SST solo ven lo asignado | P12 |
| Separación por institución | Filtro obligatorio por `institution_id` en todas las consultas | P13 |
| Autenticación | bcrypt, sesiones revocables (solo hash del token), bloqueo tras intentos fallidos, clave temporal con cambio obligatorio, mínimo 12 caracteres | P1, P15 |
| Cifrado en tránsito | HTTPS obligatorio con HSTS (Caddy y Let's Encrypt); cookie `Secure` | Configuración |
| Protección de datos almacenados | Base no expuesta a internet; disco del VPS (recomendado: cifrado del proveedor); respaldos con permisos restringidos | Configuración |
| Ataques comunes | Validación en servidor (Zod), consultas parametrizadas, CSP, CSRF (SameSite y Origin), límites de frecuencia, errores genéricos | P12 |
| Exportación segura | Sin identidad, sin códigos de seguimiento y solo para roles autorizados; cada exportación se audita | P11 |
| IA externa | No se envía información a servicios de IA | — |

## 3. Decisiones pendientes de validación institucional

1. **Texto del aviso de tratamiento** (`/privacidad`): es un borrador técnico. Debe ajustarse a la política institucional e incluir los canales de atención de derechos.
2. **Autorización**: el formulario exige aceptar el aviso. Jurídica debe confirmar si ese mecanismo es suficiente para cada tipo de vinculación (planta, contratistas, terceros, estudiantes).
3. **Personal de terceros y estudiantes**: definir con las empresas e instituciones educativas la base para su participación.
4. **Ubicación del servidor**: si se aloja fuera de Colombia, evaluar los requisitos de transferencia internacional de datos.
5. **Retención**: definir por cuánto tiempo se conservan respuestas, necesidades y auditoría (sugerencia técnica: participaciones 5 años, auditoría 5 años, respaldos 30 días). La eliminación programada se implementará cuando se apruebe la política.
6. **Encargado del tratamiento**: si un proveedor externo administra el servidor, formalizar el contrato de transmisión de datos.
7. **Registro de bases de datos** ante la autoridad competente, si aplica a la institución.
8. **Uso futuro de IA (Fase 3)**: requerirá autorización, base jurídica y anonimización previa.

## 4. Gestión de incidentes

1. **Detectar**: alertas de disponibilidad, revisión de auditoría (ingresos fallidos, exportaciones, consultas de identidad).
2. **Contener**: desactivar usuarios comprometidos (cierra sus sesiones de inmediato), cambiar `POSTGRES_PASSWORD` y, si es necesario, detener `app`.
3. **Evaluar** qué datos se afectaron (la auditoría registra quién consultó o exportó).
4. **Notificar** según la política institucional y la normativa aplicable.
5. **Recuperar** desde un respaldo (ver `08-RESPALDO-RECUPERACION.md`).
6. **Documentar** el incidente y las acciones de mejora.

## 5. Recomendaciones de uso

- No escriba nombres de personas ni datos de pacientes en descripciones, análisis o respuestas.
- Las respuestas emitidas son visibles para quien tiene el código: redáctelas sin datos de terceros.
- Mantenga el umbral *k* en 5 o más. En servicios muy pequeños, analice a nivel de área.
- Revise trimestralmente los usuarios activos y sus roles.
