import "server-only";
import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SessionUser } from "@/lib/auth";
import { bogotaDate, FICHAS, type Period } from "@/lib/indicators";
import { PRIORITY_LABEL } from "@/lib/priority";
import { CATEGORY_LABEL, th1Name } from "@/lib/th1";
import { STATUS_LABEL } from "@/lib/workflow";
import { dashboardData } from "./dashboard";

const { needs, actions, services, users } = schema;

const fmt = (d: Date | null | undefined) => (d ? bogotaDate(d) : "");

/**
 * Exportación Excel sin datos de identidad: nunca incluye quién reportó,
 * ni códigos de seguimiento, ni la relación con participaciones individuales.
 * Los responsables de gestión (personal institucional) sí se incluyen.
 */
export async function buildNeedsWorkbook(user: SessionUser, period: Period) {
  const inst = (await db.query.institutions.findFirst({ where: eq(schema.institutions.id, user.institutionId) }))!;
  const rows = await db
    .select({
      id: needs.id,
      code: needs.code,
      receivedAt: needs.receivedAt,
      origin: needs.origin,
      isAnonymous: needs.isAnonymous,
      category: needs.category,
      th1: needs.th1Criterion,
      service: services.name,
      title: needs.title,
      description: needs.description,
      impact: needs.impact,
      priority: needs.priority,
      priorityScore: needs.priorityScore,
      priorityMethod: needs.priorityMethod,
      isUrgent: needs.isUrgent,
      escalation: needs.escalation,
      status: needs.status,
      responsible: users.name,
      dueDate: needs.dueDate,
      resources: needs.resourcesRequired,
      response: needs.response,
      respondedAt: needs.respondedAt,
      closedAt: needs.closedAt,
      closeType: needs.closeType,
      groupParentId: needs.groupParentId,
      isDemo: needs.isDemo,
    })
    .from(needs)
    .leftJoin(services, eq(needs.serviceId, services.id))
    .leftJoin(users, eq(needs.assignedToId, users.id))
    .where(eq(needs.institutionId, user.institutionId))
    .orderBy(asc(needs.code));

  const inPeriod = rows.filter((r) => r.receivedAt >= period.from && r.receivedAt <= period.to);
  const codeById = new Map(rows.map((r) => [r.id, r.code]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Talento 360° Salud";
  wb.created = new Date();

  const head = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E5B4F" } };
    ws.getRow(1).alignment = { vertical: "middle", wrapText: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  };

  const info = wb.addWorksheet("Información");
  info.columns = [{ width: 32 }, { width: 90 }];
  info.addRows([
    ["Institución", inst.name],
    ["Periodo", `${fmt(period.from)} a ${fmt(period.to)}`],
    ["Generado", new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC"],
    ["Generado por (rol)", user.role],
    ["Confidencialidad", "Este archivo no contiene identidad de quienes reportaron ni códigos de seguimiento. Uso interno para la gestión del talento humano."],
    ["Datos de demostración", rows.some((r) => r.isDemo) ? "SÍ: este entorno contiene datos de demostración marcados en la columna «Demostración»." : "No"],
    ["Nota normativa", "Los criterios TH1 y los indicadores son referencia de gestión; su redacción debe verificarse contra el Manual de Acreditación (Res. 5095 de 2018)."],
  ]);
  info.getColumn(1).font = { bold: true };

  const ws = wb.addWorksheet("Necesidades");
  ws.columns = [
    { header: "Código", key: "code", width: 15 },
    { header: "Fecha de recepción", key: "received", width: 14 },
    { header: "Origen", key: "origin", width: 16 },
    { header: "Participación", key: "anon", width: 14 },
    { header: "Categoría", key: "category", width: 30 },
    { header: "Criterio TH1", key: "th1", width: 40 },
    { header: "Servicio", key: "service", width: 22 },
    { header: "Título", key: "title", width: 40 },
    { header: "Descripción", key: "description", width: 60 },
    { header: "Impacto", key: "impact", width: 30 },
    { header: "Prioridad", key: "priority", width: 11 },
    { header: "Puntaje", key: "score", width: 9 },
    { header: "Metodología de prioridad", key: "method", width: 40 },
    { header: "Urgente", key: "urgent", width: 9 },
    { header: "Escalamiento", key: "escalation", width: 18 },
    { header: "Estado", key: "status", width: 22 },
    { header: "Responsable", key: "responsible", width: 24 },
    { header: "Fecha compromiso", key: "due", width: 14 },
    { header: "Recursos requeridos", key: "resources", width: 30 },
    { header: "Respuesta", key: "response", width: 50 },
    { header: "Fecha respuesta", key: "responded", width: 14 },
    { header: "Fecha cierre", key: "closed", width: 14 },
    { header: "Tipo de cierre", key: "closeType", width: 22 },
    { header: "Agrupada en", key: "group", width: 15 },
    { header: "Demostración", key: "demo", width: 12 },
  ];
  for (const r of inPeriod) {
    ws.addRow({
      code: r.code,
      received: fmt(r.receivedAt),
      origin: r.origin === "CAMPANA" ? "Campaña" : "Registro directo",
      anon: r.isAnonymous ? "Anónima" : r.origin === "CAMPANA" ? "Confidencial" : "Institucional",
      category: CATEGORY_LABEL[r.category],
      th1: r.th1 ? `${r.th1}. ${th1Name(r.th1)}` : "",
      service: r.service ?? "",
      title: r.title,
      description: r.description,
      impact: r.impact ?? "",
      priority: r.priority ? PRIORITY_LABEL[r.priority] : "",
      score: r.priorityScore ?? "",
      method: r.priorityMethod ?? "",
      urgent: r.isUrgent ? "Sí" : "No",
      escalation: r.escalation === "NINGUNO" ? "" : r.escalation,
      status: STATUS_LABEL[r.status],
      responsible: r.responsible ?? "",
      due: fmt(r.dueDate),
      resources: r.resources ?? "",
      response: r.response ?? "",
      responded: fmt(r.respondedAt),
      closed: fmt(r.closedAt),
      closeType: r.closeType === "EFECTIVIDAD_VERIFICADA" ? "Efectividad verificada" : r.closeType === "ADMINISTRATIVO" ? "Administrativo" : "",
      group: r.groupParentId ? (codeById.get(r.groupParentId) ?? "") : "",
      demo: r.isDemo ? "Sí" : "",
    });
  }
  head(ws);

  const acts = await db
    .select({ needId: actions.needId, description: actions.description, responsible: users.name, startDate: actions.startDate, dueDate: actions.dueDate, verification: actions.verificationMeans, resources: actions.resources, status: actions.status, evidence: actions.evidence, completedAt: actions.completedAt })
    .from(actions)
    .leftJoin(users, eq(actions.responsibleId, users.id))
    .where(eq(actions.institutionId, user.institutionId))
    .orderBy(asc(actions.dueDate));
  const wa = wb.addWorksheet("Acciones");
  wa.columns = [
    { header: "Necesidad", key: "need", width: 15 },
    { header: "Acción", key: "description", width: 50 },
    { header: "Responsable", key: "responsible", width: 24 },
    { header: "Inicio", key: "start", width: 12 },
    { header: "Fecha límite", key: "due", width: 12 },
    { header: "Medio de verificación", key: "verification", width: 36 },
    { header: "Recursos", key: "resources", width: 26 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Evidencia", key: "evidence", width: 50 },
    { header: "Completada", key: "completed", width: 12 },
  ];
  for (const a of acts) {
    wa.addRow({ need: codeById.get(a.needId) ?? "", description: a.description, responsible: a.responsible ?? "", start: fmt(a.startDate), due: fmt(a.dueDate), verification: a.verification, resources: a.resources ?? "", status: a.status, evidence: a.evidence ?? "", completed: fmt(a.completedAt) });
  }
  head(wa);

  const d = await dashboardData(user.institutionId, period);
  const wi = wb.addWorksheet("Indicadores");
  wi.columns = [
    { header: "Indicador", key: "name", width: 32 },
    { header: "Numerador", key: "num", width: 12 },
    { header: "Denominador", key: "den", width: 13 },
    { header: "Resultado", key: "display", width: 14 },
    { header: "Meta", key: "target", width: 8 },
    { header: "Fórmula", key: "formula", width: 60 },
    { header: "Exclusiones", key: "excl", width: 60 },
    { header: "Observación", key: "note", width: 40 },
  ];
  for (const i of d.indicators) {
    const f = FICHAS.find((x) => x.key === i.key)!;
    wi.addRow({ name: i.name, num: i.numerator, den: i.denominator, display: i.display, target: `${i.target} %`, formula: f.formula, excl: f.exclusions, note: i.note ?? "" });
  }
  head(wi);

  return wb.xlsx.writeBuffer();
}
