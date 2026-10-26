import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { NeedCategory, Priority } from "@/db/schema";
import { bogotaDate, computeIndicators, type Period } from "@/lib/indicators";
import { suppressDistribution } from "@/lib/privacy";
import { CATEGORIES, CATEGORY_SHORT, TH1_CRITERIA } from "@/lib/th1";
import { STATUS_ORDER } from "@/lib/workflow";

const { needs, actions, effectivenessReviews, campaigns, submissions, institutions, services } = schema;

export async function dashboardData(institutionId: string, period: Period, now = new Date()) {
  const inst = (await db.query.institutions.findFirst({ where: eq(institutions.id, institutionId) }))!;
  const k = inst.minGroupSize;

  const needRows = await db
    .select({
      id: needs.id,
      code: needs.code,
      title: needs.title,
      status: needs.status,
      category: needs.category,
      priority: needs.priority,
      th1Criterion: needs.th1Criterion,
      isUrgent: needs.isUrgent,
      receivedAt: needs.receivedAt,
      respondedAt: needs.respondedAt,
      dueDate: needs.dueDate,
      closedAt: needs.closedAt,
      closeType: needs.closeType,
      groupParentId: needs.groupParentId,
      assignedToId: needs.assignedToId,
      serviceName: services.name,
      isDemo: needs.isDemo,
      hasEvidence: sql<boolean>`(
        exists(select 1 from ${actions} a where a.need_id = "needs"."id" and coalesce(trim(a.evidence),'') <> '')
        or exists(select 1 from ${effectivenessReviews} r where r.need_id = "needs"."id" and coalesce(trim(r.evidence),'') <> '')
      )`,
    })
    .from(needs)
    .leftJoin(services, eq(needs.serviceId, services.id))
    .where(eq(needs.institutionId, institutionId));

  const actionRows = await db
    .select({ id: actions.id, status: actions.status, dueDate: actions.dueDate, completedAt: actions.completedAt, description: actions.description, needId: actions.needId })
    .from(actions)
    .where(eq(actions.institutionId, institutionId));
  const reviewRows = await db
    .select({ needId: effectivenessReviews.needId, result: effectivenessReviews.result, reviewedAt: effectivenessReviews.reviewedAt })
    .from(effectivenessReviews)
    .where(eq(effectivenessReviews.institutionId, institutionId));
  const fromD = bogotaDate(period.from);
  const toD = bogotaDate(period.to);
  const campRows = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      eligibleCount: campaigns.eligibleCount,
      status: campaigns.status,
      submissionsInPeriod: sql<number>`(select count(*)::int from ${submissions} s where s.campaign_id = "campaigns"."id" and s.submitted_on between ${fromD} and ${toD})`,
    })
    .from(campaigns)
    .where(and(eq(campaigns.institutionId, institutionId), sql`${campaigns.status} <> 'BORRADOR'`));

  const indicators = computeIndicators({
    period,
    now,
    needs: needRows.map((n) => ({ ...n, hasEvidence: !!n.hasEvidence })),
    actions: actionRows,
    reviews: reviewRows,
    campaigns: campRows,
    targets: inst.indicatorTargets ?? {},
  });

  const inPeriod = needRows.filter((n) => n.receivedAt >= period.from && n.receivedAt <= period.to);
  const principal = inPeriod.filter((n) => !n.groupParentId);
  const open = needRows.filter((n) => n.status !== "CERRADA" && !n.groupParentId);

  const byCategory = CATEGORIES.map((c) => ({ key: c, label: CATEGORY_SHORT[c], value: inPeriod.filter((n) => n.category === c).length })).filter((x) => x.value > 0);
  const paretoBase = [...byCategory].sort((a, b) => b.value - a.value);
  const totalCat = paretoBase.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const pareto = paretoBase.map((x) => {
    acc += x.value;
    return { ...x, cumulative: totalCat ? Math.round((acc / totalCat) * 1000) / 10 : 0 };
  });

  const byStatus = STATUS_ORDER.map((s) => ({ key: s, value: principal.filter((n) => n.status === s).length }));

  // Tendencia mensual de los últimos 12 meses (recibidas vs. cerradas)
  const months: { key: string; label: string; recibidas: number; cerradas: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(period.to.getUTCFullYear(), period.to.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({
      key,
      label: d.toLocaleDateString("es-CO", { month: "short", year: "2-digit", timeZone: "UTC" }),
      recibidas: needRows.filter((n) => n.receivedAt.toISOString().slice(0, 7) === key).length,
      cerradas: needRows.filter((n) => n.closedAt && n.closedAt.toISOString().slice(0, 7) === key).length,
    });
  }

  // Distribución por servicio con supresión de grupos pequeños
  const svcCounts = new Map<string, number>();
  for (const n of inPeriod) svcCounts.set(n.serviceName ?? "Sin servicio indicado", (svcCounts.get(n.serviceName ?? "Sin servicio indicado") ?? 0) + 1);
  const byService = suppressDistribution(
    [...svcCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    k,
  );

  // Matriz de calor categoría × prioridad (necesidades abiertas)
  const prios: (Priority | "SIN")[] = ["CRITICA", "ALTA", "MEDIA", "BAJA", "SIN"];
  const heat = CATEGORIES.map((c) => ({
    category: CATEGORY_SHORT[c as NeedCategory],
    cells: prios.map((p) => open.filter((n) => n.category === c && (n.priority ?? "SIN") === p).length),
  })).filter((r) => r.cells.some((x) => x > 0));

  // Cobertura de criterios TH1: actividad registrada por criterio
  const th1 = TH1_CRITERIA.map((c) => {
    const list = needRows.filter((n) => n.th1Criterion === c.n);
    return {
      n: c.n,
      name: c.name,
      total: list.length,
      open: list.filter((n) => n.status !== "CERRADA").length,
      verified: list.filter((n) => n.closeType === "EFECTIVIDAD_VERIFICADA").length,
    };
  });

  // Tiempo de respuesta (días) de las necesidades respondidas en el periodo
  const respDays = needRows
    .filter((n) => n.respondedAt && n.respondedAt >= period.from && n.respondedAt <= period.to)
    .map((n) => (n.respondedAt!.getTime() - n.receivedAt.getTime()) / 86_400_000)
    .sort((a, b) => a - b);
  const median = respDays.length ? respDays[Math.floor((respDays.length - 1) / 2)] : null;

  const overdueActions = actionRows
    .filter((a) => (a.status === "PROGRAMADA" || a.status === "EN_CURSO") && a.dueDate < now)
    .map((a) => ({ ...a, needCode: needRows.find((n) => n.id === a.needId)?.code ?? "" }));
  const overdueNeeds = open.filter((n) => n.dueDate && n.dueDate < now && !n.respondedAt);
  const urgentUnassigned = open.filter((n) => n.isUrgent && !n.assignedToId);
  const staleReceived = open.filter((n) => n.status === "RECIBIDA" && now.getTime() - n.receivedAt.getTime() > 5 * 86_400_000);

  return {
    institution: inst,
    indicators,
    kpis: {
      received: inPeriod.length,
      open: open.length,
      urgentOpen: open.filter((n) => n.isUrgent).length,
      overdueActions: overdueActions.length,
      openActions: actionRows.filter((a) => a.status === "PROGRAMADA" || a.status === "EN_CURSO").length,
      medianResponseDays: median == null ? null : Math.round(median * 10) / 10,
      participations: campRows.reduce((s, c) => s + c.submissionsInPeriod, 0),
    },
    byCategory,
    pareto,
    byStatus,
    months,
    byService,
    heat,
    heatColumns: prios,
    th1,
    alerts: { overdueActions, overdueNeeds, urgentUnassigned, staleReceived },
    priorityOpen: open
      .filter((n) => n.priority === "CRITICA" || n.priority === "ALTA" || n.isUrgent)
      .sort((a, b) => (a.priority === "CRITICA" ? -1 : 1) - (b.priority === "CRITICA" ? -1 : 1))
      .slice(0, 8),
    hasDemo: needRows.some((n) => n.isDemo),
    k,
  };
}

export type DashboardData = Awaited<ReturnType<typeof dashboardData>>;

/** Agregado por servicio para líderes: solo conteos y solo si alcanza el umbral. */
export async function serviceSummary(institutionId: string, serviceId: string) {
  const inst = (await db.query.institutions.findFirst({ where: eq(institutions.id, institutionId) }))!;
  const rows = await db
    .select({ category: needs.category, n: sql<number>`count(*)::int` })
    .from(needs)
    .where(and(eq(needs.institutionId, institutionId), eq(needs.serviceId, serviceId), gte(needs.receivedAt, new Date(Date.now() - 365 * 86_400_000)), lte(needs.receivedAt, new Date())))
    .groupBy(needs.category);
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (total < inst.minGroupSize) return { total, suppressed: true as const, rows: [], k: inst.minGroupSize };
  return { total, suppressed: false as const, rows: suppressDistribution(rows.map((r) => ({ label: CATEGORY_SHORT[r.category], count: r.n })), inst.minGroupSize), k: inst.minGroupSize };
}
