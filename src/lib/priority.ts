/**
 * Matriz de priorización — METODOLOGÍA PROPUESTA.
 * Los pesos por defecto son una sugerencia técnica del equipo desarrollador, no una
 * exigencia normativa. Son visibles, editables y deben ser aprobados por un
 * responsable autorizado; cada priorización registra la versión del método usada.
 */
import type { Priority } from "@/db/schema";

export const PRIORITY_CRITERIA = [
  { key: "seguridadPaciente", label: "Impacto en la seguridad del paciente" },
  { key: "trabajador", label: "Impacto en el trabajador" },
  { key: "riesgoLegal", label: "Riesgo legal" },
  { key: "frecuencia", label: "Frecuencia (cuántas personas lo reportan)" },
  { key: "magnitud", label: "Magnitud" },
  { key: "urgencia", label: "Urgencia" },
  { key: "factibilidad", label: "Factibilidad de intervención" },
] as const;

export type PriorityKey = (typeof PRIORITY_CRITERIA)[number]["key"];
export type Scores = Partial<Record<PriorityKey, number>>;

export const DEFAULT_WEIGHTS: Record<PriorityKey, number> = {
  seguridadPaciente: 25,
  trabajador: 20,
  riesgoLegal: 15,
  frecuencia: 10,
  magnitud: 10,
  urgencia: 10,
  factibilidad: 10,
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

/** Puntaje ponderado 0–100 a partir de calificaciones 1–5. */
export function priorityScore(scores: Scores, weights: Record<string, number> = DEFAULT_WEIGHTS) {
  let sum = 0;
  let wsum = 0;
  for (const c of PRIORITY_CRITERIA) {
    const s = scores[c.key];
    const w = weights[c.key] ?? 0;
    if (s == null || w <= 0) continue;
    if (s < 1 || s > 5) throw new Error(`Calificación fuera de rango para ${c.label}`);
    sum += ((s - 1) / 4) * w;
    wsum += w;
  }
  if (wsum === 0) return null;
  return Math.round((sum / wsum) * 1000) / 10;
}

/** Bandas propuestas. Un impacto 5 en seguridad del paciente siempre se trata como crítico. */
export function priorityBand(score: number | null, scores: Scores = {}): Priority | null {
  if (scores.seguridadPaciente === 5) return "CRITICA";
  if (score == null) return null;
  if (score >= 75) return "CRITICA";
  if (score >= 55) return "ALTA";
  if (score >= 35) return "MEDIA";
  return "BAJA";
}

export function methodVersion(weights: Record<string, number>, approvedAt?: Date | null) {
  const w = PRIORITY_CRITERIA.map((c) => `${c.key}:${weights[c.key] ?? 0}`).join(",");
  return `Matriz ponderada v1 [${w}]${approvedAt ? ` aprobada ${approvedAt.toISOString().slice(0, 10)}` : " (pesos sin aprobar)"}`;
}
