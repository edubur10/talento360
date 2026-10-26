/**
 * Lógica de visibilidad del formulario, compartida por el navegador y el servidor
 * (el servidor la usa para validar obligatorias sin confiar en el cliente).
 */
export interface QLogic {
  code: string;
  type: string;
  required: boolean;
  allowNA: boolean;
  showIfCode: string | null;
  showIfValues: string[] | null;
  onlyForEmploymentCodes: string[] | null;
  options?: string[] | null;
}

export type AnswerValue = string | string[] | number | null;
export interface AnswerState {
  value: AnswerValue;
  na?: boolean;
}

export function isVisible(q: QLogic, answers: Record<string, AnswerState>, employmentCode: string | null) {
  if (q.onlyForEmploymentCodes && q.onlyForEmploymentCodes.length > 0) {
    if (!employmentCode || !q.onlyForEmploymentCodes.includes(employmentCode)) return false;
  }
  if (q.showIfCode) {
    const a = answers[q.showIfCode];
    if (!a || a.na || a.value == null) return false;
    const vals = Array.isArray(a.value) ? a.value.map(String) : [String(a.value)];
    return (q.showIfValues ?? []).some((v) => vals.includes(v));
  }
  return true;
}

export function isAnswered(a: AnswerState | undefined) {
  if (!a) return false;
  if (a.na) return true;
  if (a.value == null) return false;
  if (Array.isArray(a.value)) return a.value.length > 0;
  if (typeof a.value === "string") return a.value.trim().length > 0;
  return true;
}

/** Valida tipo y rango de una respuesta. Devuelve mensaje de error o null. */
export function validateAnswer(q: QLogic, a: AnswerState): string | null {
  if (a.na) return q.allowNA ? null : "Esta pregunta no admite «No aplica».";
  const v = a.value;
  if (v == null) return null;
  switch (q.type) {
    case "ESCALA": {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? null : "Valor de escala inválido.";
    }
    case "SI_NO":
      return v === "Sí" || v === "No" ? null : "Respuesta inválida.";
    case "UNICA":
      return typeof v === "string" && (q.options ?? []).includes(v) ? null : "Opción inválida.";
    case "MULTIPLE":
      return Array.isArray(v) && v.every((x) => (q.options ?? []).includes(x)) ? null : "Opción inválida.";
    case "TEXTO":
      return typeof v === "string" && v.length <= 2000 ? null : "Texto demasiado largo (máximo 2.000 caracteres).";
    default:
      return "Tipo de pregunta desconocido.";
  }
}
