# I. Plan de implementación: configuración, piloto y puesta en producción

Duración sugerida: **8 semanas** hasta la operación estable. Los tiempos dependen de la disponibilidad institucional.

## Etapa 0. Decisiones previas (semana 1)

| Actividad | Responsable | Entregable |
|---|---|---|
| Designar líder del proyecto (Talento Humano) y líder de Calidad | Gerencia | Acto o correo de designación |
| Cotejar los 15 criterios TH1 contra el Manual oficial (pág. 55) | Calidad | Matriz F ajustada |
| Validar el aviso de tratamiento de datos y las decisiones de la guía G (sección 3) | Jurídica | Concepto jurídico |
| Elegir alojamiento y región del servidor (ver manual técnico, sección 7) | Gerencia, Sistemas | Servidor contratado |
| Definir subdominio y registro DNS | Sistemas | URL pública |

## Etapa 1. Instalación y configuración (semana 2)

1. Instalar en el servidor con `docker compose` (manual técnico, sección 3) y ejecutar la carga en modo **producción**.
2. El administrador técnico ingresa, cambia la clave y configura:
   - Datos de la institución, colores y lema.
   - **Sedes, servicios y procesos** reales.
   - **Modalidades de vinculación** (revisar los códigos que activan preguntas específicas).
   - **Usuarios**: Talento Humano, Calidad, Gerencia, SST y líderes de servicio.
3. Calidad revisa y **aprueba la metodología de priorización** y las **metas de los indicadores**.
4. Talento Humano revisa el instrumento base con un grupo pequeño. Los ajustes de redacción de preguntas se hacen hoy en código; el editor de preguntas llega en la Fase 2.
5. Verificar el respaldo diario y hacer **una prueba de restauración** en un servidor aparte.

## Etapa 2. Piloto controlado (semanas 3 y 4)

- **Alcance**: 2 servicios (p. ej. Urgencias y un área administrativa), con un mínimo de 15 trabajadores en total, para que los resultados superen el umbral de confidencialidad.
- **Campaña anónima** con enlace y QR en carteleras y salas de descanso.
- **Acompañamiento**: una persona de Talento Humano disponible durante los turnos para resolver dudas. Medir cuánto tarda la gente en responder.
- **Gestión**: clasificar en menos de 5 días, priorizar, asignar y responder al menos 3 necesidades completas, incluida la evaluación de efectividad.
- **Criterios de éxito del piloto**:
  - Participación ≥ 50 % de los elegibles del piloto.
  - Ninguna falla que impida enviar el formulario desde un celular.
  - 100 % de las necesidades del piloto clasificadas en 5 días.
  - Al menos 1 mejora publicada en «Tú lo propusiste, el hospital lo hizo».
  - Encuesta breve de usabilidad al personal del piloto.
- **Cierre**: reunión de lecciones aprendidas y lista de ajustes.

## Etapa 3. Ajustes (semana 5)

Corregir lo identificado en el piloto, actualizar este plan y capacitar a los líderes de los demás servicios.

## Etapa 4. Despliegue institucional (semanas 6 a 8)

1. Comunicado de Gerencia sobre el propósito y la confidencialidad: **escuchar, no inspeccionar**.
2. Campaña institucional (anónima) con número real de elegibles.
3. Capacitación por rol (manual D): 1 hora para Talento Humano y Calidad, 30 minutos para líderes y una cápsula de 5 minutos para colaboradores.
4. Comité de seguimiento quincenal: alertas del tablero, necesidades críticas y acciones vencidas.
5. Primer informe de resultados a los trabajadores (comunicado en el portal).

## Operación permanente

| Rutina | Frecuencia | Responsable |
|---|---|---|
| Clasificar necesidades recibidas | Semanal (máximo 5 días) | Talento Humano |
| Revisar alertas y acciones vencidas | Semanal | Talento Humano y Calidad |
| Evaluar efectividad de casos respondidos | Mensual | Calidad |
| Revisar indicadores | Mensual con Gerencia | Calidad |
| Publicar mejoras verificadas y comunicados | Mensual | Talento Humano |
| Campaña de identificación de necesidades | Anual o semestral | Talento Humano |
| Revisión de usuarios y permisos | Trimestral | Administrador técnico |
| Prueba de restauración de respaldo | Trimestral | Sistemas |

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Baja participación por desconfianza | Anonimato real explicado de forma sencilla; publicar mejoras reales; respuesta visible con código |
| Necesidades sin respuesta (pérdida de credibilidad) | Alertas, plazos configurables, comité quincenal |
| Conectividad limitada | Formulario liviano y servidor rápido; QR; quien no tenga datos móviles puede usar un equipo en el área de bienestar |
| Grupos pequeños identificables | Umbral *k*; servicio opcional; análisis por área |
| Uso de la plataforma para temas de acoso o emergencias | Aviso explícito y escalamiento a los canales especiales |
| Dependencia de una sola persona técnica | Manual técnico, respaldo automático y contrato de soporte |
