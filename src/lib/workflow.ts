/**
 * Ciclo de vida de una necesidad. Las transiciones se validan en el servidor:
 * ningún cliente puede saltarse pasos ni cerrar sin cumplir los requisitos.
 */
import type { NeedStatus } from "@/db/schema";

export const STATUS_LABEL: Record<NeedStatus, string> = {
  RECIBIDA: "Recibida",
  CLASIFICADA: "Clasificada",
  EN_ANALISIS: "En análisis",
  PRIORIZADA: "Priorizada",
  ASIGNADA: "Asignada",
  EN_EJECUCION: "En ejecución",
  RESPUESTA_EMITIDA: "Respuesta emitida",
  PENDIENTE_EFECTIVIDAD: "Pendiente de verificar efectividad",
  CERRADA: "Cerrada",
  REABIERTA: "Reabierta",
};

export const STATUS_ORDER: NeedStatus[] = [
  "RECIBIDA",
  "CLASIFICADA",
  "EN_ANALISIS",
  "PRIORIZADA",
  "ASIGNADA",
  "EN_EJECUCION",
  "RESPUESTA_EMITIDA",
  "PENDIENTE_EFECTIVIDAD",
  "CERRADA",
  "REABIERTA",
];

export const OPEN_STATUSES: NeedStatus[] = STATUS_ORDER.filter((s) => s !== "CERRADA");

/** Estados que el colaborador ve en el seguimiento (lenguaje sencillo). */
export const PUBLIC_STATUS_LABEL: Record<NeedStatus, string> = {
  RECIBIDA: "Recibimos tu aporte",
  CLASIFICADA: "Lo estamos revisando",
  EN_ANALISIS: "Lo estamos analizando",
  PRIORIZADA: "Ya tiene prioridad asignada",
  ASIGNADA: "Tiene un responsable",
  EN_EJECUCION: "Se están realizando acciones",
  RESPUESTA_EMITIDA: "Ya tiene respuesta",
  PENDIENTE_EFECTIVIDAD: "Estamos verificando si funcionó",
  CERRADA: "Cerrada",
  REABIERTA: "Se retomó porque la respuesta no fue suficiente",
};

export type Operation =
  | "classify"
  | "analyze"
  | "prioritize"
  | "assign"
  | "start"
  | "respond"
  | "toVerification"
  | "review"
  | "closeAdministrative"
  | "reopen";

/** Estados desde los que se permite cada operación. */
const ALLOWED_FROM: Record<Operation, NeedStatus[]> = {
  classify: ["RECIBIDA", "CLASIFICADA", "REABIERTA"],
  analyze: ["CLASIFICADA", "REABIERTA"],
  prioritize: ["CLASIFICADA", "EN_ANALISIS", "PRIORIZADA", "REABIERTA"],
  assign: ["PRIORIZADA", "ASIGNADA", "EN_EJECUCION"],
  start: ["ASIGNADA"],
  respond: ["ASIGNADA", "EN_EJECUCION", "RESPUESTA_EMITIDA"],
  toVerification: ["RESPUESTA_EMITIDA"],
  review: ["PENDIENTE_EFECTIVIDAD"],
  closeAdministrative: [
    "RECIBIDA",
    "CLASIFICADA",
    "EN_ANALISIS",
    "PRIORIZADA",
    "ASIGNADA",
    "EN_EJECUCION",
    "RESPUESTA_EMITIDA",
    "PENDIENTE_EFECTIVIDAD",
    "REABIERTA",
  ],
  reopen: ["CERRADA", "RESPUESTA_EMITIDA", "PENDIENTE_EFECTIVIDAD"],
};

const TARGET: Partial<Record<Operation, NeedStatus>> = {
  classify: "CLASIFICADA",
  analyze: "EN_ANALISIS",
  prioritize: "PRIORIZADA",
  assign: "ASIGNADA",
  start: "EN_EJECUCION",
  respond: "RESPUESTA_EMITIDA",
  toVerification: "PENDIENTE_EFECTIVIDAD",
  closeAdministrative: "CERRADA",
  reopen: "REABIERTA",
};

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function canApply(op: Operation, from: NeedStatus) {
  return ALLOWED_FROM[op].includes(from);
}

/**
 * Calcula el estado resultante de una operación. La evaluación de efectividad
 * decide entre CERRADA (efectiva) y REABIERTA (no efectiva o parcial).
 */
export function nextStatus(
  op: Operation,
  from: NeedStatus,
  ctx: { reviewResult?: "EFECTIVA" | "PARCIALMENTE_EFECTIVA" | "NO_EFECTIVA" } = {},
): NeedStatus {
  if (!canApply(op, from)) {
    throw new WorkflowError(
      `No se puede «${OPERATION_LABEL[op]}» una necesidad en estado «${STATUS_LABEL[from]}».`,
    );
  }
  if (op === "review") {
    if (!ctx.reviewResult) throw new WorkflowError("Falta el resultado de la evaluación de efectividad.");
    return ctx.reviewResult === "EFECTIVA" ? "CERRADA" : "REABIERTA";
  }
  // Clasificar o priorizar de nuevo no retrocede el estado.
  if (op === "classify" && from === "CLASIFICADA") return "CLASIFICADA";
  if (op === "prioritize" && from === "PRIORIZADA") return "PRIORIZADA";
  if (op === "assign" && (from === "ASIGNADA" || from === "EN_EJECUCION")) return from;
  if (op === "respond" && from === "RESPUESTA_EMITIDA") return "RESPUESTA_EMITIDA";
  return TARGET[op]!;
}

export const OPERATION_LABEL: Record<Operation, string> = {
  classify: "clasificar",
  analyze: "iniciar análisis de",
  prioritize: "priorizar",
  assign: "asignar",
  start: "iniciar ejecución de",
  respond: "emitir respuesta a",
  toVerification: "enviar a verificación de efectividad",
  review: "evaluar efectividad de",
  closeAdministrative: "cerrar administrativamente",
  reopen: "reabrir",
};

/** Operaciones disponibles en un estado (para mostrar solo los botones válidos). */
export function availableOperations(from: NeedStatus): Operation[] {
  return (Object.keys(ALLOWED_FROM) as Operation[]).filter((op) => ALLOWED_FROM[op].includes(from));
}

export const ESCALATION_LABEL: Record<string, string> = {
  NINGUNO: "No requiere",
  SST: "Seguridad y Salud en el Trabajo",
  CONVIVENCIA_LABORAL: "Comité de Convivencia Laboral",
  SEGURIDAD_PACIENTE: "Programa de Seguridad del Paciente",
  CONTROL_INTERNO: "Control Interno",
};
