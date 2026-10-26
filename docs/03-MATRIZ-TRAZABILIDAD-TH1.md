# F. Matriz de trazabilidad: Estándar 104 (TH1)

**Fuente primaria:** Resolución 5095 de 2018, Manual de Acreditación en Salud Ambulatorio y Hospitalario v3.1, Estándar 104 (TH1).

> **Limitación de verificación.** Durante el desarrollo no fue posible consultar el texto oficial del estándar: el PDF de la resolución publicado por el Ministerio es una imagen sin texto legible, la versión textual del manual se truncó antes de la sección de talento humano y el sitio del Ministerio no fue accesible desde el entorno de desarrollo. **La columna «Criterio» reproduce la lista de 15 criterios del documento de requerimientos y NO se afirma que coincida literalmente con el Manual.** Antes de usar esta matriz ante evaluadores, el área de Calidad debe cotejarla con la página 55 del Manual y ajustar `src/lib/th1.ts`.
>
> Tampoco se verificó el contenido de la Resolución 1328 de 2021, que el normograma de la Supersalud cita en relación con el Manual.

## Convenciones

- **Requisito / criterio**: lo que pide el estándar (pendiente de cotejo literal).
- **Buena práctica**: recomendación técnica, no exigencia normativa.
- **Funcionalidad**: lo que hace el software. **Por sí sola no demuestra cumplimiento.**
- **Evidencia de ejecución**: demuestra que el proceso se realizó.
- **Evidencia de efectividad**: demuestra que produjo resultados.
- **Estado**: ✅ funcional en Fase 1 · 🟡 parcial (registro y gestión de necesidades del tema) · ⏳ fase posterior.

## Matriz

| # | Criterio | Funcionalidad del software | Proceso institucional que soporta | Evidencia de ejecución | Evidencia de efectividad | Indicador asociado | Estado |
|---|---|---|---|---|---|---|---|
| 1 | Legislación | Registro de necesidades y modalidades de vinculación diferenciadas (las preguntas sobre incentivos varían según la modalidad, sin asumir los mismos derechos). Exportación de soportes | Normograma de talento humano, revisión jurídica | Registro de necesidades clasificadas en el criterio 1 | Cierre con efectividad verificada | Cierre con soporte | 🟡 La matriz legal está en la Fase 3 (Expediente TH1) |
| 2 | Evaluación periódica de expectativas y necesidades | Campañas periódicas con enlace o QR, instrumento A–G, anónimas o confidenciales, ramificación, registro de necesidades concretas, bandeja con ciclo completo | Medición anual o semestral de necesidades | Campañas, participaciones con fecha, resultados agregados, necesidades registradas | Necesidades resueltas con efectividad verificada; comparación entre campañas | Participación, Necesidades con respuesta | ✅ |
| 3 | Evaluación periódica del clima organizacional | Sección F del instrumento (percepción). **No es un instrumento validado de clima** | Medición de clima | Resultados de la sección F | — | — | ⏳ Módulo de clima (Fase 2) |
| 4 | Competencias y desempeño | Sección B, categoría «Formación y competencias», registro de acciones formativas con evidencia | Plan institucional de capacitación, evaluación de desempeño | Necesidades de formación y acciones con listas de asistencia | Evaluación de efectividad (aplicación en el puesto) | Cumplimiento de acciones, Efectividad | 🟡 Brechas por cargo en la Fase 2 (articulación con TH5) |
| 5 | Calidad de vida en el trabajo | Ítem C3 (equilibrio vida y trabajo), categoría Bienestar | Programa de bienestar | Resultados y necesidades | Efectividad de intervenciones | Efectividad | 🟡 |
| 6 | Cargas, turnos, descansos, fatiga y riesgos | Sección D (carga, descansos, turnos, fatiga, riesgo para pacientes), escalamiento a SST con acceso restringido, marca de seguridad del paciente y urgencia | SG-SST, programación de turnos | Necesidades escaladas, acciones de SST | Efectividad verificada | Oportunidad, Efectividad | 🟡 Complementa el SG-SST, no reemplaza evaluaciones técnicas |
| 7 | Análisis de puestos de trabajo | Sección A (recursos, equipos, espacio, EPP), categoría Condiciones | Inspecciones de puesto, dotación | Necesidades y acciones | Efectividad verificada | Cumplimiento de acciones | 🟡 |
| 8 | Convocatoria, selección, vinculación, retención, promoción, seguimiento y retiro | Categoría «Selección, vinculación, inducción y retiro», ítem C4 (crecimiento) | Procesos del ciclo de vida laboral | Necesidades registradas | Efectividad verificada | — | 🟡 Módulo de ciclo de vida en la Fase 2 |
| 9 | Políticas de compensación y escala salarial | Categoría «Compensación, estímulos e incentivos» (percepción) | Política salarial | Necesidades registradas | — | — | 🟡 |
| 10 | Estímulos e incentivos | Ítems C1 y C5 (según modalidad) | Plan de incentivos | Resultados y necesidades | Efectividad | — | 🟡 |
| 11 | Bienestar laboral | Ítems C2, C6 y C7 (actividades deseadas, inclusión de contratistas) | Programa de bienestar | Resultados y necesidades | Efectividad | Efectividad | 🟡 «Cuidamos a quienes cuidan» en la Fase 2 |
| 12 | Necesidades de comunicación organizacional | Sección E (oportunidad, claridad, retroalimentación, canales preferidos), comunicados en el portal, respuesta visible con código | Plan de comunicaciones | Resultados de la sección E, comunicados publicados | Mejora en mediciones posteriores | — | 🟡 |
| 13 | Transformación de la cultura organizacional | Sección F (respeto, confianza, equipo, pertenencia), ítem C8, «Tú lo propusiste, el hospital lo hizo» | Programa de cultura | Resultados y mejoras publicadas | Mejoras verificadas y publicadas | Efectividad | 🟡 |
| 14 | Relación docencia-servicio | Ítems F5 y F6 solo para personal en formación; categoría Docencia-servicio | Convenios docencia-servicio | Resultados y necesidades | Efectividad | — | 🟡 Permisos para estudiantes y tutores en la Fase 2 |
| 15 | Efectividad de la respuesta | **Evaluación de efectividad separada del cierre administrativo**, reapertura si no fue efectiva, publicación solo de mejoras verificadas, trazabilidad completa | Seguimiento PHVA | Evaluaciones con método y evidencia | Proporción de intervenciones efectivas | Efectividad, Cierre con soporte, Oportunidad | ✅ |

## Cómo el sistema genera evidencia

| Tipo | Dónde se obtiene |
|---|---|
| Enfoque (método definido) | Instrumento de la campaña, metodología de priorización aprobada, fichas técnicas de indicadores |
| Implementación | Campañas con participación, necesidades clasificadas, acciones con responsable y fecha, historial de eventos |
| Resultados | Indicadores del tablero, resultados agregados por campaña, respuestas emitidas |
| Mejoramiento | Evaluaciones de efectividad, reaperturas, comparación entre periodos, mejoras publicadas |

El **Expediente Digital del Estándar TH1** (Fase 3) consolidará esta evidencia por criterio, con archivos adjuntos, versiones y un informe de autoevaluación preliminar sujeto a revisión humana. El sistema **no asigna calificaciones oficiales de acreditación**.
