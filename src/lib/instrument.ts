/**
 * Instrumento base de identificación de necesidades y expectativas (TH1 · criterio 2).
 * Es una plantilla institucional: se copia en cada campaña nueva y puede ajustarse.
 * Las preguntas cerradas usan una escala de acuerdo 1–5 con opción «No aplica».
 * No recopila datos sensibles (salud, creencias, orientación, filiación política, etc.).
 */
import type { NeedCategory } from "@/db/schema";

export interface QuestionTemplate {
  section: string;
  code: string;
  text: string;
  help?: string;
  type: "ESCALA" | "UNICA" | "MULTIPLE" | "TEXTO" | "SI_NO";
  options?: string[];
  required?: boolean;
  allowNA?: boolean;
  th1Criterion?: number;
  category?: NeedCategory;
  showIfCode?: string;
  showIfValues?: string[];
  onlyForEmploymentCodes?: string[];
}

export const SECTIONS: Record<string, { title: string; intro: string }> = {
  P: { title: "Sobre tu vinculación", intro: "Esto nos ayuda a mostrarte solo las preguntas que te aplican. No pedimos tu nombre ni tu documento." },
  A: { title: "Condiciones para hacer tu trabajo", intro: "Recursos, herramientas, espacios y elementos que usas a diario." },
  B: { title: "Formación y competencias", intro: "Lo que necesitas aprender o reforzar para trabajar con seguridad y confianza." },
  C: { title: "Bienestar y desarrollo", intro: "Reconocimiento, apoyo, crecimiento y equilibrio con tu vida personal." },
  D: { title: "Carga y organización del trabajo", intro: "Turnos, descansos, cansancio y cómo se distribuyen las tareas." },
  E: { title: "Comunicación institucional", intro: "Cómo te llega la información y cómo te escuchan." },
  F: { title: "Cultura y clima", intro: "El trato, la confianza y el trabajo en equipo en tu día a día." },
  G: { title: "En tus propias palabras", intro: "Las respuestas abiertas son las más valiosas. Escribe lo que quieras; nadie te va a juzgar por ello." },
  N: { title: "¿Quieres registrar una necesidad concreta?", intro: "Cada necesidad que registres aquí recibe un número, un responsable y una respuesta. Puedes consultar su estado con tu código de seguimiento." },
};

const AGREE = "Indica qué tan de acuerdo estás: 1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo";

export const DEFAULT_INSTRUMENT: QuestionTemplate[] = [
  // P — Perfil mínimo para ramificación (no identifica a la persona)
  {
    section: "P",
    code: "P1",
    text: "¿Cuál es tu tipo de vinculación con el hospital?",
    type: "UNICA",
    required: true,
    allowNA: false,
    help: "Usamos esto solo para mostrarte preguntas que te apliquen.",
  },
  {
    section: "P",
    code: "P2",
    text: "¿En qué tipo de área trabajas?",
    type: "UNICA",
    options: ["Asistencial", "Administrativa", "Apoyo (servicios generales, mantenimiento, transporte)"],
    required: true,
    allowNA: false,
  },

  // A — Condiciones (criterio 7: puestos de trabajo; 6: riesgos)
  { section: "A", code: "A1", text: "Cuento con los recursos y suministros necesarios para hacer mi trabajo.", help: AGREE, type: "ESCALA", th1Criterion: 7, category: "CONDICIONES_TRABAJO", required: true },
  { section: "A", code: "A2", text: "Los equipos y herramientas que uso funcionan adecuadamente.", help: AGREE, type: "ESCALA", th1Criterion: 7, category: "CONDICIONES_TRABAJO", required: true },
  { section: "A", code: "A3", text: "El espacio físico donde trabajo es adecuado (iluminación, ventilación, comodidad).", help: AGREE, type: "ESCALA", th1Criterion: 7, category: "CONDICIONES_TRABAJO", required: true },
  { section: "A", code: "A4", text: "Recibo oportunamente los elementos de protección que mi trabajo requiere.", help: AGREE, type: "ESCALA", th1Criterion: 6, category: "CONDICIONES_TRABAJO", required: true },
  {
    section: "A",
    code: "A5",
    text: "¿Qué es lo que más te hace falta?",
    type: "MULTIPLE",
    options: ["Insumos o suministros", "Equipos biomédicos", "Equipos de cómputo o sistemas", "Mobiliario", "Elementos de protección", "Espacio físico", "Otro"],
    showIfCode: "A1",
    showIfValues: ["1", "2"],
    th1Criterion: 7,
    category: "CONDICIONES_TRABAJO",
  },

  // B — Formación (criterio 4)
  { section: "B", code: "B1", text: "He recibido la capacitación que necesito para hacer bien mi trabajo.", help: AGREE, type: "ESCALA", th1Criterion: 4, category: "FORMACION_COMPETENCIAS", required: true },
  {
    section: "B",
    code: "B2",
    text: "¿En qué temas te gustaría recibir formación o entrenamiento?",
    type: "MULTIPLE",
    options: ["Actualización científica o técnica de mi área", "Entrenamiento práctico", "Manejo de equipos y tecnologías", "Seguridad del paciente", "Humanización del servicio", "Liderazgo y comunicación", "Sistemas de información", "Atención al usuario"],
    th1Criterion: 4,
    category: "FORMACION_COMPETENCIAS",
  },
  { section: "B", code: "B3", text: "Me siento seguro(a) manejando los equipos y tecnologías de mi puesto.", help: AGREE, type: "ESCALA", th1Criterion: 4, category: "FORMACION_COMPETENCIAS" },

  // C — Bienestar (criterios 5, 10, 11)
  { section: "C", code: "C1", text: "Siento que mi trabajo es reconocido.", help: AGREE, type: "ESCALA", th1Criterion: 10, category: "BIENESTAR_DESARROLLO", required: true },
  { section: "C", code: "C2", text: "La institución me apoya cuando lo necesito.", help: AGREE, type: "ESCALA", th1Criterion: 11, category: "BIENESTAR_DESARROLLO", required: true },
  { section: "C", code: "C3", text: "Puedo equilibrar mi trabajo con mi vida personal y familiar.", help: AGREE, type: "ESCALA", th1Criterion: 5, category: "BIENESTAR_DESARROLLO", required: true },
  { section: "C", code: "C4", text: "Veo oportunidades de crecer y desarrollarme en el hospital.", help: AGREE, type: "ESCALA", th1Criterion: 8, category: "BIENESTAR_DESARROLLO" },
  {
    section: "C",
    code: "C5",
    text: "Conozco el plan de bienestar e incentivos que me corresponde según mi vinculación.",
    help: AGREE,
    type: "ESCALA",
    th1Criterion: 10,
    category: "COMPENSACION_INCENTIVOS",
    onlyForEmploymentCodes: ["PLANTA", "TRABAJADOR_OFICIAL"],
  },
  {
    section: "C",
    code: "C6",
    text: "Me siento incluido(a) en las actividades de integración y reconocimiento, aunque mi vinculación sea por contrato.",
    help: AGREE,
    type: "ESCALA",
    th1Criterion: 11,
    category: "BIENESTAR_DESARROLLO",
    onlyForEmploymentCodes: ["CONTRATISTA", "TERCERO"],
  },
  {
    section: "C",
    code: "C7",
    text: "¿Qué actividades de bienestar te gustaría que existieran?",
    type: "MULTIPLE",
    options: ["Pausas activas", "Actividades deportivas", "Actividades culturales o de integración", "Reconocimiento público", "Apoyo psicosocial", "Actividades con la familia", "Flexibilidad de horario cuando sea posible"],
    th1Criterion: 11,
    category: "BIENESTAR_DESARROLLO",
  },
  { section: "C", code: "C8", text: "Puedo participar en las decisiones que afectan mi trabajo.", help: AGREE, type: "ESCALA", th1Criterion: 13, category: "CULTURA_CLIMA" },

  // D — Carga (criterio 6)
  { section: "D", code: "D1", text: "La cantidad de trabajo que tengo es manejable en mi jornada.", help: AGREE, type: "ESCALA", th1Criterion: 6, category: "CARGA_ORGANIZACION", required: true },
  { section: "D", code: "D2", text: "Puedo tomar los descansos que me corresponden.", help: AGREE, type: "ESCALA", th1Criterion: 6, category: "CARGA_ORGANIZACION", required: true },
  { section: "D", code: "D3", text: "La programación de turnos es justa y se informa a tiempo.", help: AGREE, type: "ESCALA", th1Criterion: 6, category: "CARGA_ORGANIZACION" },
  { section: "D", code: "D4", text: "Con frecuencia termino mi jornada con un cansancio que me afecta.", help: "1 = Nunca · 5 = Casi siempre", type: "ESCALA", th1Criterion: 6, category: "CARGA_ORGANIZACION", required: true },
  {
    section: "D",
    code: "D5",
    text: "¿Qué factores hacen más pesada tu carga de trabajo?",
    type: "MULTIPLE",
    options: ["Falta de personal", "Turnos seguidos o extensos", "Tareas que no son de mi cargo", "Trámites administrativos", "Interrupciones constantes", "Falta de insumos o equipos", "Otro"],
    showIfCode: "D1",
    showIfValues: ["1", "2"],
    th1Criterion: 6,
    category: "CARGA_ORGANIZACION",
  },
  {
    section: "D",
    code: "D6",
    text: "¿Has notado situaciones de carga o cansancio que puedan poner en riesgo la seguridad de los pacientes?",
    type: "SI_NO",
    th1Criterion: 6,
    category: "CARGA_ORGANIZACION",
  },

  // E — Comunicación (criterio 12)
  { section: "E", code: "E1", text: "Recibo a tiempo la información que necesito para mi trabajo.", help: AGREE, type: "ESCALA", th1Criterion: 12, category: "COMUNICACION", required: true },
  { section: "E", code: "E2", text: "Las instrucciones que recibo son claras.", help: AGREE, type: "ESCALA", th1Criterion: 12, category: "COMUNICACION", required: true },
  { section: "E", code: "E3", text: "Mi jefe o líder me da retroalimentación sobre mi trabajo.", help: AGREE, type: "ESCALA", th1Criterion: 12, category: "COMUNICACION" },
  {
    section: "E",
    code: "E4",
    text: "¿Por cuál medio prefieres recibir la información institucional?",
    type: "MULTIPLE",
    options: ["WhatsApp institucional", "Correo electrónico", "Reuniones de servicio", "Carteleras", "Esta plataforma", "Mensajes de texto"],
    th1Criterion: 12,
    category: "COMUNICACION",
  },

  // F — Cultura y clima (criterio 13)
  { section: "F", code: "F1", text: "En mi servicio nos tratamos con respeto.", help: AGREE, type: "ESCALA", th1Criterion: 13, category: "CULTURA_CLIMA", required: true },
  { section: "F", code: "F2", text: "Confío en mis compañeros y en mis líderes.", help: AGREE, type: "ESCALA", th1Criterion: 13, category: "CULTURA_CLIMA", required: true },
  { section: "F", code: "F3", text: "Trabajamos en equipo para atender bien a los pacientes.", help: AGREE, type: "ESCALA", th1Criterion: 13, category: "CULTURA_CLIMA", required: true },
  { section: "F", code: "F4", text: "Me siento orgulloso(a) de trabajar en este hospital.", help: AGREE, type: "ESCALA", th1Criterion: 13, category: "CULTURA_CLIMA", required: true },

  // Docencia-servicio (criterio 14): solo personal en formación
  {
    section: "F",
    code: "F5",
    text: "Durante mi práctica recibo orientación y supervisión suficientes.",
    help: AGREE,
    type: "ESCALA",
    th1Criterion: 14,
    category: "DOCENCIA_SERVICIO",
    onlyForEmploymentCodes: ["FORMACION"],
  },
  {
    section: "F",
    code: "F6",
    text: "Me siento integrado(a) al equipo del servicio donde realizo mi práctica.",
    help: AGREE,
    type: "ESCALA",
    th1Criterion: 14,
    category: "DOCENCIA_SERVICIO",
    onlyForEmploymentCodes: ["FORMACION"],
  },

  // G — Preguntas abiertas (criterio 2)
  { section: "G", code: "G1", text: "¿Qué necesitas para realizar mejor tu trabajo?", type: "TEXTO", th1Criterion: 2, allowNA: false },
  { section: "G", code: "G2", text: "¿Qué dificultad consideras prioritario resolver?", type: "TEXTO", th1Criterion: 2, allowNA: false },
  { section: "G", code: "G3", text: "¿Qué aspecto positivo deberíamos conservar?", type: "TEXTO", th1Criterion: 13, allowNA: false },
  { section: "G", code: "G4", text: "¿Cómo podría la institución apoyarte mejor?", type: "TEXTO", th1Criterion: 11, allowNA: false },
];

/** Opciones de modalidad para P1 a partir de las modalidades configuradas por la institución. */
export const DEFAULT_EMPLOYMENT_TYPES = [
  { code: "PLANTA", name: "Personal de planta" },
  { code: "TRABAJADOR_OFICIAL", name: "Trabajador oficial" },
  { code: "CONTRATISTA", name: "Contratista de prestación de servicios" },
  { code: "TERCERO", name: "Trabajador de empresa tercera" },
  { code: "FORMACION", name: "Personal en formación (docencia-servicio)" },
];
