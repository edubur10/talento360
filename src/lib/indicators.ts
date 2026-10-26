/**
 * Indicadores gerenciales PROPUESTOS para el seguimiento del TH1.
 * No son indicadores obligatorios del Manual de Acreditación: son una propuesta
 * técnica con ficha transparente. Las metas son configurables por la institución.
 * Regla: si el denominador es cero, el indicador es «No calculable».
 */

export interface Period {
  from: Date;
  to: Date; // inclusivo
}

export interface NeedLite {
  id: string;
  status: string;
  receivedAt: Date;
  respondedAt: Date | null;
  dueDate: Date | null;
  closedAt: Date | null;
  closeType: string | null;
  groupParentId: string | null;
  hasEvidence: boolean;
}
export interface ActionLite {
  status: string;
  dueDate: Date;
  completedAt: Date | null;
}
export interface ReviewLite {
  needId: string;
  result: string;
  reviewedAt: Date;
}
export interface CampaignLite {
  id: string;
  eligibleCount: number | null;
  submissionsInPeriod: number;
}

export type IndicatorKey =
  | "participacion"
  | "necesidadesConRespuesta"
  | "oportunidadRespuesta"
  | "cumplimientoAcciones"
  | "efectividad"
  | "cierreConSoporte";

export interface IndicatorResult {
  key: IndicatorKey;
  name: string;
  numerator: number;
  denominator: number;
  value: number | null;
  display: string;
  target: number;
  status: "ok" | "warn" | "risk" | "na";
  note?: string;
}

export interface Ficha {
  key: IndicatorKey;
  name: string;
  formula: string;
  numerator: string;
  denominator: string;
  cutoff: string;
  missingData: string;
  exclusions: string;
  source: string;
  periodicity: string;
  responsible: string;
  defaultTarget: number;
}

export const FICHAS: Ficha[] = [
  {
    key: "participacion",
    name: "Participación de trabajadores",
    formula: "Participaciones registradas ÷ trabajadores elegibles × 100",
    numerator:
      "Participaciones registradas en campañas con fecha de envío dentro del periodo. En campañas confidenciales cada trabajador participa una sola vez (el sistema lo impide); en campañas anónimas se cuentan envíos, pues no es posible verificar unicidad sin identificar.",
    denominator: "Suma de trabajadores elegibles declarados en esas campañas.",
    cutoff: "Último día del periodo consultado.",
    missingData: "Campañas sin número de elegibles se excluyen del cálculo y se informa la exclusión.",
    exclusions: "Campañas en borrador y datos marcados como demostración en entornos productivos.",
    source: "Módulo de campañas (tablas campaigns y submissions).",
    periodicity: "Por campaña y trimestral.",
    responsible: "Talento Humano",
    defaultTarget: 70,
  },
  {
    key: "necesidadesConRespuesta",
    name: "Necesidades con respuesta",
    formula: "Necesidades con respuesta emitida ÷ necesidades que requieren respuesta × 100",
    numerator: "Necesidades recibidas en el periodo que tienen fecha de respuesta emitida.",
    denominator: "Necesidades recibidas en el periodo que requieren respuesta.",
    cutoff: "Fecha de recepción dentro del periodo; respuesta evaluada a la fecha de consulta.",
    missingData: "Sin fecha de respuesta se considera no respondida.",
    exclusions:
      "Necesidades agrupadas como repetidas (la respuesta se mide en la necesidad principal) y cierres administrativos por duplicidad o fuera de alcance.",
    source: "Bandeja de necesidades (needs).",
    periodicity: "Mensual.",
    responsible: "Talento Humano",
    defaultTarget: 90,
  },
  {
    key: "oportunidadRespuesta",
    name: "Oportunidad de respuesta",
    formula: "Respuestas dentro del plazo ÷ necesidades cuyo plazo venció o que fueron respondidas en el periodo × 100",
    numerator: "Necesidades respondidas en o antes de su fecha de compromiso.",
    denominator:
      "Necesidades con fecha de compromiso que fueron respondidas en el periodo, más las no respondidas cuyo plazo venció dentro del periodo.",
    cutoff: "Último día del periodo.",
    missingData: "Necesidades sin fecha de compromiso no entran al cálculo.",
    exclusions: "Necesidades agrupadas como repetidas.",
    source: "Bandeja de necesidades (needs).",
    periodicity: "Mensual.",
    responsible: "Talento Humano",
    defaultTarget: 85,
  },
  {
    key: "cumplimientoAcciones",
    name: "Cumplimiento de acciones",
    formula: "Acciones completadas ÷ acciones programadas para el periodo × 100",
    numerator: "Acciones con fecha límite en el periodo y estado completada.",
    denominator: "Acciones con fecha límite en el periodo.",
    cutoff: "Último día del periodo.",
    missingData: "No aplica: la fecha límite es obligatoria.",
    exclusions: "Acciones canceladas.",
    source: "Acciones de respuesta (actions).",
    periodicity: "Mensual.",
    responsible: "Calidad",
    defaultTarget: 90,
  },
  {
    key: "efectividad",
    name: "Efectividad de intervenciones",
    formula: "Intervenciones verificadas efectivas ÷ intervenciones con efectividad evaluada × 100",
    numerator: "Evaluaciones de efectividad del periodo con resultado «Efectiva».",
    denominator: "Evaluaciones de efectividad realizadas en el periodo.",
    cutoff: "Fecha de la evaluación dentro del periodo.",
    missingData: "Sin evaluación no se cuenta: el cierre administrativo NO es evaluación de efectividad.",
    exclusions: "Ninguna.",
    source: "Evaluaciones de efectividad (effectiveness_reviews).",
    periodicity: "Trimestral.",
    responsible: "Calidad",
    defaultTarget: 80,
  },
  {
    key: "cierreConSoporte",
    name: "Cierre con soporte",
    formula: "Casos cerrados con evidencia ÷ casos cerrados × 100",
    numerator: "Necesidades cerradas en el periodo con al menos una evidencia registrada (acción o evaluación).",
    denominator: "Necesidades cerradas en el periodo.",
    cutoff: "Fecha de cierre dentro del periodo.",
    missingData: "Evidencia vacía se considera sin soporte.",
    exclusions: "Necesidades agrupadas como repetidas.",
    source: "Bandeja, acciones y evaluaciones.",
    periodicity: "Mensual.",
    responsible: "Calidad",
    defaultTarget: 100,
  },
];

const within = (d: Date | null | undefined, p: Period) => !!d && d >= p.from && d <= p.to;

function result(
  key: IndicatorKey,
  numerator: number,
  denominator: number,
  targets: Partial<Record<IndicatorKey, number>>,
  note?: string,
): IndicatorResult {
  const ficha = FICHAS.find((f) => f.key === key)!;
  const target = targets[key] ?? ficha.defaultTarget;
  if (denominator === 0) {
    return { key, name: ficha.name, numerator, denominator, value: null, display: "No calculable", target, status: "na", note };
  }
  const value = Math.round((numerator / denominator) * 1000) / 10;
  const status = value >= target ? "ok" : value >= target * 0.8 ? "warn" : "risk";
  return {
    key,
    name: ficha.name,
    numerator,
    denominator,
    value,
    display: `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`,
    target,
    status,
    note,
  };
}

export function computeIndicators(input: {
  period: Period;
  needs: NeedLite[];
  actions: ActionLite[];
  reviews: ReviewLite[];
  campaigns: CampaignLite[];
  targets?: Partial<Record<IndicatorKey, number>>;
  now?: Date;
}): IndicatorResult[] {
  const { period, targets = {} } = input;
  const now = input.now ?? new Date();
  const principal = input.needs.filter((n) => !n.groupParentId);

  // 1. Participación
  const withEligible = input.campaigns.filter((c) => c.eligibleCount && c.eligibleCount > 0 && c.submissionsInPeriod > 0);
  const excluded = input.campaigns.filter((c) => (!c.eligibleCount || c.eligibleCount <= 0) && c.submissionsInPeriod > 0);
  const part = result(
    "participacion",
    withEligible.reduce((a, c) => a + c.submissionsInPeriod, 0),
    withEligible.reduce((a, c) => a + (c.eligibleCount ?? 0), 0),
    targets,
    excluded.length ? `${excluded.length} campaña(s) sin número de elegibles excluida(s).` : undefined,
  );

  // 2. Necesidades con respuesta
  const requireResponse = principal.filter(
    (n) => within(n.receivedAt, period) && !(n.status === "CERRADA" && n.closeType === "ADMINISTRATIVO" && !n.respondedAt),
  );
  const resp = result("necesidadesConRespuesta", requireResponse.filter((n) => n.respondedAt).length, requireResponse.length, targets);

  // 3. Oportunidad de respuesta
  const cutoff = period.to < now ? period.to : now;
  const opDen = principal.filter((n) => {
    if (!n.dueDate) return false;
    if (n.respondedAt) return within(n.respondedAt, period);
    return n.dueDate >= period.from && n.dueDate <= cutoff;
  });
  const opNum = opDen.filter((n) => n.respondedAt && n.dueDate && n.respondedAt <= endOfDay(n.dueDate));
  const op = result("oportunidadRespuesta", opNum.length, opDen.length, targets);

  // 4. Cumplimiento de acciones
  const acts = input.actions.filter((a) => a.status !== "CANCELADA" && within(a.dueDate, period));
  const cum = result("cumplimientoAcciones", acts.filter((a) => a.status === "COMPLETADA").length, acts.length, targets);

  // 5. Efectividad
  const revs = input.reviews.filter((r) => within(r.reviewedAt, period));
  const ef = result("efectividad", revs.filter((r) => r.result === "EFECTIVA").length, revs.length, targets);

  // 6. Cierre con soporte
  const closed = principal.filter((n) => n.status === "CERRADA" && within(n.closedAt, period));
  const sop = result("cierreConSoporte", closed.filter((n) => n.hasEvidence).length, closed.length, targets);

  return [part, resp, op, cum, ef, sop];
}

function endOfDay(d: Date) {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

/** Los periodos se interpretan en hora de Colombia (UTC−5, sin horario de verano). */
const startBogota = (d: string) => new Date(`${d}T00:00:00.000-05:00`);
const endBogota = (d: string) => new Date(`${d}T23:59:59.999-05:00`);
export const bogotaDate = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);

/** Periodo por defecto: año en curso (hora de Colombia) hasta hoy. */
export function defaultPeriod(now = new Date()): Period {
  return { from: startBogota(`${bogotaDate(now).slice(0, 4)}-01-01`), to: endBogota(bogotaDate(now)) };
}

export function parsePeriod(from?: string | null, to?: string | null, now = new Date()): Period {
  const d = defaultPeriod(now);
  const ok = (s?: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(startBogota(s).getTime());
  const f = ok(from) ? startBogota(from!) : d.from;
  const t = ok(to) ? endBogota(to!) : d.to;
  return f <= t ? { from: f, to: t } : { from: t, to: f };
}
