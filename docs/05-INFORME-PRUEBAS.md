# H. Informe de pruebas

Todas las pruebas de este informe **se ejecutaron realmente** en el entorno de desarrollo el 8 de octubre de 2026, sobre el código entregado. Entorno: Node.js 22, PostgreSQL 16 y Chromium sin interfaz (modo móvil 390×844 para la Prueba 4).

## 1. Resumen

| Tipo | Herramienta | Resultado |
|---|---|---|
| Verificación de tipos | TypeScript estricto | ✅ Sin errores |
| Compilación de producción | `next build` (salida standalone) | ✅ Sin errores |
| Pruebas unitarias | Vitest: ciclo de estados, indicadores, priorización, permisos, privacidad, lógica del formulario | ✅ 27/27 |
| Pruebas de aceptación E2E | `scripts/test-e2e.sh`: servidor real, base nueva, API con sesiones reales y navegador móvil | ✅ 88/88 verificaciones, 15/15 criterios |
| Accesibilidad automática | axe-core, reglas WCAG 2.0/2.1/2.2 A y AA, 11 pantallas | ✅ 0 reglas incumplidas |
| Servidor standalone (como en el contenedor) | `node server.js` | ✅ Salud OK, CSS y cabeceras de seguridad presentes |
| Carga inicial en modo producción | base vacía | ✅ Crea institución y administrador con cambio de clave obligatorio; rechaza claves débiles; bloquea datos de demostración con `NODE_ENV=production` |
| Archivo de despliegue | `docker compose config` | ✅ Válido |

## 2. Criterios de aceptación de la Fase 1

Ejecución: 2026-10-08 20:07 UTC. Resultado: **88 de 88 verificaciones aprobadas**.

| Prueba | Criterio de aceptación | Verificaciones | Resultado |
|---|---|---|---|
| 1 | Configuración institucional | 5/5 | ✅ Aprobada |
| 2 | Creación de campaña | 3/3 | ✅ Aprobada |
| 3 | Enlace compartible | 3/3 | ✅ Aprobada |
| 4 | Formulario desde celular | 2/2 | ✅ Aprobada |
| 5 | Almacenamiento y visibilidad | 7/7 | ✅ Aprobada |
| 6 | Clasificación | 4/4 | ✅ Aprobada |
| 7 | Gestión por responsable | 8/8 | ✅ Aprobada |
| 8 | Acción con fecha, responsable y verificación | 4/4 | ✅ Aprobada |
| 9 | Historial y trazabilidad | 5/5 | ✅ Aprobada |
| 10 | Indicadores del tablero | 3/3 | ✅ Aprobada |
| 11 | Exportación confidencial | 7/7 | ✅ Aprobada |
| 12 | Acceso no autorizado por URL o API | 19/19 | ✅ Aprobada |
| 13 | Aislamiento entre instituciones | 8/8 | ✅ Aprobada |
| 14 | Efectividad frente a cierre administrativo | 8/8 | ✅ Aprobada |
| 15 | Persistencia tras cerrar sesión | 2/2 | ✅ Aprobada |

### Detalle de las verificaciones

| Prueba | Verificación | Resultado |
|---|---|---|
| 1 | El administrador técnico actualiza los datos de la institución | ✅ |
| 1 | El administrador registra un nuevo servicio | ✅ |
| 1 | Talento Humano NO puede cambiar la configuración técnica (403) | ✅ |
| 1 | El administrador crea un usuario con rol y contraseña temporal | ✅ |
| 1 | El usuario nuevo queda obligado a cambiar la contraseña | ✅ |
| 2 | Talento Humano crea una campaña anónima de identificación de necesidades | ✅ |
| 2 | La campaña se activa para recibir respuestas | ✅ |
| 2 | Un líder de servicio NO puede crear campañas (403) | ✅ |
| 3 | Se genera un enlace con identificador aleatorio | ✅ |
| 3 | El enlace abre la campaña sin iniciar sesión | ✅ |
| 3 | El panel muestra el enlace y el código QR | ✅ |
| 4 | El formulario se completa en un celular hasta recibir código de seguimiento | ✅ |
| 4 | La página no tiene desplazamiento horizontal en 390 px | ✅ |
| 5 | El colaborador participa en una campaña confidencial | ✅ |
| 5 | El sistema impide participar dos veces en la misma campaña confidencial (409) | ✅ |
| 5 | El servidor valida preguntas obligatorias aunque el navegador se salte la validación (400) | ✅ |
| 5 | La necesidad enviada desde el celular aparece en la bandeja de Talento Humano | ✅ |
| 5 | Quedó almacenada en PostgreSQL | ✅ |
| 5 | Anonimato real: sin usuario, sin reportante y con hora truncada a medianoche (Colombia) | ✅ |
| 5 | La auditoría de la participación anónima no guarda actor | ✅ |
| 6 | El sistema rechaza transiciones fuera de orden (evaluar una necesidad recién recibida → 409) | ✅ |
| 6 | Talento Humano clasifica la necesidad y la relaciona con el criterio TH1 7 | ✅ |
| 6 | Se registra el análisis | ✅ |
| 6 | Calidad prioriza con la matriz ponderada y queda registrada la metodología | ✅ |
| 7 | Antes de la asignación el líder NO ve la necesidad (404) | ✅ |
| 7 | Talento Humano asigna responsable y fecha de compromiso | ✅ |
| 7 | El líder ve la necesidad en «Necesidades a mi cargo» | ✅ |
| 7 | El responsable inicia la ejecución | ✅ |
| 7 | El responsable NO puede cerrar administrativamente (403) | ✅ |
| 7 | El responsable emite la respuesta al trabajador | ✅ |
| 7 | El trabajador consulta su caso con el código y ve la respuesta (sin notas internas) | ✅ |
| 7 | Un código inexistente no revela información (404) | ✅ |
| 8 | Se registra una acción con fecha, responsable y medio de verificación | ✅ |
| 8 | No se acepta una acción sin medio de verificación (400) | ✅ |
| 8 | No se puede completar una acción sin evidencia (400) | ✅ |
| 8 | El responsable completa la acción registrando la evidencia | ✅ |
| 9 | El historial conserva cada paso del ciclo en orden | ✅ |
| 9 | Cada paso registra quién lo hizo | ✅ |
| 9 | La priorización registra método y aprobador | ✅ |
| 9 | La auditoría registra las acciones del personal | ✅ |
| 9 | Una necesidad cerrada puede reabrirse con motivo, sin perder su historial | ✅ |
| 10 | «Necesidades con respuesta» aumenta en 1 tras emitir la respuesta | ✅ |
| 10 | La participación cuenta la nueva participación del periodo | ✅ |
| 10 | Cada indicador expone numerador, denominador y meta | ✅ |
| 11 | Talento Humano exporta a Excel | ✅ |
| 11 | El archivo incluye las hojas Necesidades, Acciones e Indicadores | ✅ |
| 11 | El archivo contiene la necesidad confidencial pero NO el nombre ni el correo de quien la reportó | ✅ |
| 11 | El archivo no contiene códigos de seguimiento | ✅ |
| 11 | Un líder de servicio no puede exportar (403) | ✅ |
| 11 | Calidad ve la necesidad confidencial sin la identidad de quien reporta | ✅ |
| 11 | Talento Humano sí ve la identidad en la campaña confidencial (y queda auditado) | ✅ |
| 12 | Una campaña confidencial rechaza participación sin sesión (401) | ✅ |
| 12 | anónimo: GET /api/needs → 401 | ✅ |
| 12 | anónimo: GET /api/dashboard → 401 | ✅ |
| 12 | anónimo: GET /api/needs/:id → 401 | ✅ |
| 12 | colaborador: GET /api/needs → 403 | ✅ |
| 12 | colaborador: GET /api/dashboard → 403 | ✅ |
| 12 | admin: GET /api/needs → 403 | ✅ |
| 12 | admin: GET /api/needs/:id → 403 | ✅ |
| 12 | admin: GET /api/export/needs → 403 | ✅ |
| 12 | auditor: POST /api/needs/:id/operations → 403 | ✅ |
| 12 | lider: GET /api/needs/:id → 404 | ✅ |
| 12 | lider: GET /api/users → 403 | ✅ |
| 12 | talento: GET /api/users → 403 | ✅ |
| 12 | talento: GET /api/audit → 403 | ✅ |
| 12 | Sin sesión, /panel redirige al ingreso | ✅ |
| 12 | El colaborador que intenta abrir el panel por URL es redirigido a «Mi espacio» | ✅ |
| 12 | El líder que abre por URL una necesidad que no le corresponde recibe «no encontrada» | ✅ |
| 12 | El administrador técnico que abre la bandeja por URL es redirigido a «sin permiso» | ✅ |
| 12 | Una petición desde otro origen es rechazada (protección CSRF, 403) | ✅ |
| 13 | Talento Humano de la institución B no puede leer una necesidad de A (404) | ✅ |
| 13 | La bandeja de B solo contiene registros de B | ✅ |
| 13 | B no puede modificar necesidades de A (404) | ✅ |
| 13 | B no puede modificar acciones de A (404) | ✅ |
| 13 | B no puede ver resultados de campañas de A (404) | ✅ |
| 13 | B no puede crear acciones sobre necesidades de A | ✅ |
| 13 | El tablero de B no incluye datos de A | ✅ |
| 13 | Un usuario de B no puede participar en una campaña confidencial de A (403) | ✅ |
| 14 | La necesidad pasa a «Pendiente de verificar efectividad» | ✅ |
| 14 | Calidad registra evaluación EFECTIVA y el caso se cierra con efectividad verificada | ✅ |
| 14 | Otra necesidad se cierra administrativamente | ✅ |
| 14 | Los tipos de cierre quedan diferenciados (EFECTIVIDAD_VERIFICADA vs ADMINISTRATIVO) | ✅ |
| 14 | El indicador de efectividad cuenta la evaluación y no el cierre administrativo | ✅ |
| 14 | No se puede publicar como mejora un cierre administrativo (409) | ✅ |
| 14 | Sí se publica la mejora con efectividad verificada | ✅ |
| 14 | La mejora aparece en «Tú lo propusiste, el hospital lo hizo» | ✅ |
| 15 | Tras cerrar sesión, la API exige autenticación de nuevo (401) | ✅ |
| 15 | Al volver a ingresar, la necesidad conserva estado, historial y acciones | ✅ |

## 3. Fallas detectadas durante el desarrollo y corregidas

| Falla | Cómo se detectó | Corrección |
|---|---|---|
| Las subconsultas de conteo (participaciones por campaña, evidencia de cierre, alcance del líder) resolvían la columna `id` contra la tabla equivocada, así que el tablero mostraba 0 participaciones | Revisión visual del tablero y SQL generado | Referencias de columna totalmente calificadas; verificado con el SQL resultante y con las pruebas P7, P10 y P13 |
| El periodo del tablero empezaba el 31 de diciembre (zona horaria UTC) | Revisión visual | Periodos interpretados en hora de Colombia; prueba unitaria agregada |
| En los resultados de campaña, las opciones elegidas por 1 o 2 personas mostraban el conteo exacto (posible identificación indirecta) | Revisión de privacidad | Opciones con menos de *k* se muestran como «menos de *k*» |
| Contraste insuficiente: ámbar 4,19:1, verde 4,36:1, gris tenue 3,0:1, texto blanco sobre ámbar oscuro 3,71:1 | axe-core y cálculo de contraste | Paleta ajustada a 4,5:1 o más |
| Nombre accesible del logo distinto del texto visible; enlaces del menú con área táctil menor a 24 px | axe-core | Eliminado el `aria-label` redundante; áreas táctiles de 44 px |
| La pestaña por defecto del detalle repetía el paso actual en lugar del siguiente | Revisión visual | Pestaña inicial según el siguiente paso del ciclo |

## 4. Lo que NO se pudo verificar en este entorno

| Elemento | Motivo | Cómo verificarlo |
|---|---|---|
| Construcción de las imágenes Docker y despliegue real | El acceso a Docker Hub está bloqueado desde el entorno de desarrollo | Ejecutar `docker compose up -d --build` en el servidor (manual técnico) y verificar `/api/health` |
| HTTPS, HSTS y certificado | Requieren dominio y servidor público | Tras el despliegue, revisar el sitio en un analizador SSL |
| Que Caddy omita del log las rutas públicas | Requiere Caddy en ejecución | `docker compose logs caddy` tras enviar un formulario: no debe aparecer `/api/public` |
| Redacción literal de los criterios TH1 | El texto oficial no fue accesible | Cotejo por Calidad (ver matriz F) |
| Celulares físicos y redes 3G | Se usó emulación de Chromium móvil | Probar en el piloto con equipos del personal |
| Lectores de pantalla y teclado completo | axe-core detecta solo una parte de los problemas | Revisión manual con NVDA o TalkBack |
| Carga y concurrencia | No se hicieron pruebas de estrés | Una ESE de primer nivel genera poco tráfico; si se usa en una red de ESE, hacer prueba de carga |
| Precios de alojamiento | No se pudieron consultar en línea | Cotizar al contratar |

## 5. Limitaciones conocidas de la Fase 1

- El instrumento base se edita en código; el editor desde el panel llega en la Fase 2.
- Las evidencias se registran como texto (descripción y ubicación del soporte). La carga de archivos llega en la Fase 3 (Expediente TH1).
- El límite de frecuencia funciona en memoria (una sola instancia).
- En campañas anónimas no se puede garantizar una participación por persona sin identificar, así que el indicador de participación cuenta envíos (documentado en la ficha técnica).
- Si una institución configura un color principal muy claro, puede bajar el contraste. Se recomienda verificarlo al cambiar colores.

## 6. Cómo repetir las pruebas

```bash
npm run typecheck && npm test
npm run build
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/t360_test npm run test:e2e
BASE_URL=http://localhost:3000 npm run test:a11y      # con el servidor de demostración en ejecución
```
Resultados detallados: `tests/e2e/resultados.json` y `tests/e2e/accesibilidad.json`.

## 7. Revisión de dependencias (`npm audit --omit=dev`)

| Paquete | Severidad | Análisis de riesgo en este sistema | Acción |
|---|---|---|---|
| `postcss` (dentro de `next` 15) | Alta | Afecta el procesamiento de CSS **controlado por un atacante**. Aquí PostCSS solo procesa durante la compilación el CSS propio del proyecto; los usuarios no envían CSS. Riesgo práctico bajo | Actualizar a Next.js 16 en la primera actualización de mantenimiento (cambio de versión mayor: requiere repetir todas las pruebas) |
| `next` 15 | Moderada | Hereda el aviso de `postcss` | Igual que el anterior |
| `uuid` (dentro de `exceljs`) | Moderada | Afecta las funciones v3/v5/v6 cuando reciben un búfer externo. La generación de Excel no las usa con datos del usuario. Riesgo práctico bajo | Seguir la publicación de una versión de `exceljs` que actualice `uuid`; la «corrección» automática degradaría `exceljs` a la 3.4 |
| `exceljs` | Moderada | Hereda el aviso de `uuid` | Igual que el anterior |

Recomendación: ejecutar `npm audit` en cada mantenimiento trimestral (manual técnico, sección 6).
