import "server-only";
import { and, asc, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Tx } from "@/db";
import type { NeedStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { HttpError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { DEFAULT_WEIGHTS, methodVersion, priorityBand, priorityScore, PRIORITY_CRITERIA } from "@/lib/priority";
import { CATEGORY_DEFAULT_TH1 } from "@/lib/th1";
import { nextStatus, type Operation, WorkflowError } from "@/lib/workflow";

const { needs, needEvents, actions, effectivenessReviews, users, institutions } = schema;

/** Condición de alcance: qué necesidades puede ver este usuario. Siempre incluye la institución. */
export function needScope(user: SessionUser): SQL {
  const inst = eq(needs.institutionId, user.institutionId);
  if (can(user.role, "needs.viewAll")) return inst;
  if (can(user.role, "needs.viewScoped")) {
    const conds: SQL[] = [
      eq(needs.assignedToId, user.id),
      exists(
        db
          .select({ x: sql`1` })
          .from(actions)
          .where(and(sql`${actions.needId} = "needs"."id"`, eq(actions.responsibleId, user.id))),
      ),
    ];
    if (user.role === "SST") conds.push(eq(needs.escalation, "SST"));
    return and(inst, or(...conds))!;
  }
  return sql`false`;
}

export async function nextNeedCode(tx: Tx, institutionId: string, date = new Date()) {
  const [r] = await tx
    .update(institutions)
    .set({ needSeq: sql`${institutions.needSeq} + 1` })
    .where(eq(institutions.id, institutionId))
    .returning({ seq: institutions.needSeq });
  return `NEC-${date.getUTCFullYear()}-${String(r.seq).padStart(4, "0")}`;
}

export interface NeedFilters {
  status?: string;
  category?: string;
  priority?: string;
  urgent?: boolean;
  q?: string;
  open?: boolean;
}

export async function listNeeds(user: SessionUser, f: NeedFilters = {}) {
  const conds: SQL[] = [needScope(user)];
  if (f.status && schema.needStatus.enumValues.includes(f.status as NeedStatus)) conds.push(eq(needs.status, f.status as NeedStatus));
  if (f.open) conds.push(sql`${needs.status} <> 'CERRADA'`);
  if (f.category && schema.needCategory.enumValues.includes(f.category as never)) conds.push(eq(needs.category, f.category as never));
  if (f.priority && schema.priority.enumValues.includes(f.priority as never)) conds.push(eq(needs.priority, f.priority as never));
  if (f.urgent) conds.push(eq(needs.isUrgent, true));
  if (f.q) {
    const q = `%${f.q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(needs.title, q), ilike(needs.description, q), ilike(needs.code, q))!);
  }
  return db.query.needs.findMany({
    where: and(...conds),
    columns: {
      id: true,
      code: true,
      title: true,
      category: true,
      th1Criterion: true,
      status: true,
      priority: true,
      priorityScore: true,
      isUrgent: true,
      escalation: true,
      isAnonymous: true,
      dueDate: true,
      receivedAt: true,
      groupParentId: true,
      isDemo: true,
      affectsPatientSafety: true,
    },
    with: { service: { columns: { name: true } }, assignedTo: { columns: { name: true } } },
    orderBy: [desc(needs.isUrgent), desc(needs.receivedAt)],
    limit: 500,
  });
}

/** Detalle de una necesidad. Devuelve null si no existe o está fuera del alcance (no se revela su existencia). */
export async function getNeed(user: SessionUser, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const n = await db.query.needs.findFirst({
    where: and(eq(needs.id, id), needScope(user)),
    with: {
      service: { columns: { id: true, name: true } },
      assignedTo: { columns: { id: true, name: true } },
      reporter: { columns: { id: true, name: true, email: true } },
      campaign: { columns: { id: true, title: true, mode: true } },
      events: { orderBy: [asc(needEvents.createdAt)], with: { actor: { columns: { name: true } } } },
      actions: { orderBy: [asc(actions.dueDate)], with: { responsible: { columns: { id: true, name: true } } } },
      reviews: { orderBy: [desc(effectivenessReviews.reviewedAt)], with: { reviewedBy: { columns: { name: true } } } },
    },
  });
  if (!n) return null;
  // La identidad de quien reporta (solo existe en campañas confidenciales) es visible únicamente para Talento Humano.
  const showReporter = !n.isAnonymous && can(user.role, "needs.viewReporterIdentity");
  // Nunca se exponen el hash de seguimiento ni el vínculo con la participación individual.
  const { reporter, trackingCodeHash: _t, submissionId: _s, reporterId, ...rest } = n;
  const children = await db
    .select({ id: needs.id, code: needs.code, title: needs.title })
    .from(needs)
    .where(and(eq(needs.institutionId, user.institutionId), eq(needs.groupParentId, n.id)));
  const parent = n.groupParentId
    ? await db.query.needs.findFirst({
        where: and(eq(needs.id, n.groupParentId), eq(needs.institutionId, user.institutionId)),
        columns: { id: true, code: true, title: true },
      })
    : null;
  if (showReporter && reporter) {
    await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "VER_IDENTIDAD_REPORTANTE", entity: "need", entityId: n.id });
  }
  return { ...rest, reporterId: showReporter ? reporterId : null, reporter: showReporter ? reporter : null, children, parent };
}

// ─── Operaciones del ciclo de vida ─────────────────────────────
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha con formato AAAA-MM-DD");
const scoreVal = z.number().int().min(1).max(5);

export const operationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("classify"),
    category: z.enum(schema.needCategory.enumValues),
    th1Criterion: z.number().int().min(1).max(15),
    serviceId: z.uuid().nullable().optional(),
    title: z.string().trim().min(3).max(160).optional(),
    isUrgent: z.boolean().optional(),
    escalation: z.enum(schema.escalationChannel.enumValues).optional(),
    note: z.string().max(2000).optional(),
  }),
  z.object({ op: z.literal("analyze"), analysis: z.string().trim().min(5).max(4000), impact: z.string().max(2000).optional() }),
  z.object({
    op: z.literal("prioritize"),
    scores: z.object(Object.fromEntries(PRIORITY_CRITERIA.map((c) => [c.key, scoreVal.optional()])) as Record<string, z.ZodOptional<typeof scoreVal>>),
    override: z.enum(schema.priority.enumValues).optional(),
    justification: z.string().max(2000).optional(),
  }),
  z.object({ op: z.literal("assign"), assignedToId: z.uuid(), dueDate: isoDate, resourcesRequired: z.string().max(2000).optional() }),
  z.object({ op: z.literal("start"), note: z.string().max(2000).optional() }),
  z.object({ op: z.literal("respond"), response: z.string().trim().min(10, "La respuesta debe explicar qué se hizo o se hará (mínimo 10 caracteres).").max(4000) }),
  z.object({ op: z.literal("toVerification"), note: z.string().max(2000).optional() }),
  z.object({
    op: z.literal("review"),
    result: z.enum(schema.effectivenessResult.enumValues),
    method: z.string().trim().min(5, "Describa cómo se verificó la efectividad.").max(2000),
    evidence: z.string().trim().min(5, "Registre la evidencia de la verificación.").max(4000),
    notes: z.string().max(2000).optional(),
  }),
  z.object({ op: z.literal("closeAdministrative"), justification: z.string().trim().min(10, "Justifique el cierre administrativo (mínimo 10 caracteres).").max(2000) }),
  z.object({ op: z.literal("reopen"), reason: z.string().trim().min(10, "Explique por qué se reabre (mínimo 10 caracteres).").max(2000) }),
  z.object({ op: z.literal("comment"), note: z.string().trim().min(2).max(4000) }),
  z.object({ op: z.literal("group"), parentId: z.uuid().nullable() }),
  z.object({ op: z.literal("publish"), publish: z.boolean(), publicSummary: z.string().trim().max(600).optional() }),
]);
export type OperationInput = z.infer<typeof operationSchema>;

function assertOpPermission(user: SessionUser, op: OperationInput["op"], need: { assignedToId: string | null }) {
  const isAssignee = need.assignedToId === user.id;
  const manage = can(user.role, "needs.manage");
  switch (op) {
    case "prioritize":
      if (!can(user.role, "needs.prioritizeApprove")) throw new HttpError(403, "No tiene permiso para priorizar.");
      return;
    case "review":
      if (!can(user.role, "needs.reviewEffectiveness")) throw new HttpError(403, "No tiene permiso para evaluar efectividad.");
      return;
    case "start":
    case "respond":
    case "comment":
      if (!manage && !isAssignee) throw new HttpError(403, "Solo el responsable asignado o Talento Humano/Calidad pueden hacer esto.");
      return;
    default:
      if (!manage) throw new HttpError(403, "No tiene permiso para gestionar necesidades.");
  }
}

export async function applyOperation(user: SessionUser, id: string, input: OperationInput) {
  return db.transaction(async (tx) => {
    // Bloqueo de fila: evita transiciones simultáneas contradictorias.
    const [need] = await tx
      .select()
      .from(needs)
      .where(and(eq(needs.id, id), needScope(user)))
      .for("update");
    if (!need) throw new HttpError(404, "Necesidad no encontrada.");
    assertOpPermission(user, input.op, need);

    const now = new Date();
    const patch: Partial<typeof needs.$inferInsert> = { updatedAt: now };
    let to: NeedStatus | null = null;
    let note: string | undefined;
    let data: Record<string, unknown> | undefined;
    let eventType: string = input.op.toUpperCase();

    const transition = (op: Operation, ctx?: Parameters<typeof nextStatus>[2]) => {
      to = nextStatus(op, need.status, ctx);
      patch.status = to;
    };

    switch (input.op) {
      case "classify": {
        transition("classify");
        Object.assign(patch, {
          category: input.category,
          th1Criterion: input.th1Criterion,
          isUrgent: input.isUrgent ?? need.isUrgent,
          escalation: input.escalation ?? need.escalation,
        });
        if (input.title) patch.title = input.title;
        if (input.serviceId !== undefined) {
          if (input.serviceId) await assertService(tx, user.institutionId, input.serviceId);
          patch.serviceId = input.serviceId;
        }
        note = input.note;
        data = { category: input.category, th1Criterion: input.th1Criterion, isUrgent: patch.isUrgent, escalation: patch.escalation };
        break;
      }
      case "analyze":
        transition("analyze");
        patch.analysis = input.analysis;
        patch.impact = input.impact ?? null;
        note = input.analysis;
        break;
      case "prioritize": {
        transition("prioritize");
        const [inst] = await tx.select().from(institutions).where(eq(institutions.id, user.institutionId));
        const weights = inst.priorityWeights ?? DEFAULT_WEIGHTS;
        const scores = Object.fromEntries(Object.entries(input.scores).filter(([, v]) => v != null)) as Record<string, number>;
        const score = priorityScore(scores, weights);
        const band = priorityBand(score, scores);
        if (input.override && input.override !== band && !input.justification?.trim()) {
          throw new HttpError(400, "Si cambia la prioridad calculada debe justificarlo.");
        }
        const finalPriority = input.override ?? band;
        if (!finalPriority) throw new HttpError(400, "Califique al menos un criterio o asigne una prioridad.");
        Object.assign(patch, {
          scores,
          priorityScore: score,
          priority: finalPriority,
          priorityMethod: methodVersion(weights, inst.priorityApprovedAt) + (input.override && input.override !== band ? ` · ajuste manual: ${input.justification}` : ""),
          priorityApprovedById: user.id,
          priorityApprovedAt: now,
          isUrgent: finalPriority === "CRITICA" ? true : need.isUrgent,
        });
        data = { scores, score, calculated: band, final: finalPriority, method: patch.priorityMethod };
        note = input.justification;
        break;
      }
      case "assign": {
        transition("assign");
        const assignee = await tx.query.users.findFirst({
          where: and(eq(users.id, input.assignedToId), eq(users.institutionId, user.institutionId), eq(users.active, true)),
        });
        if (!assignee || assignee.role === "COLABORADOR" || assignee.role === "ADMIN_TECNICO" || assignee.role === "AUDITOR") {
          throw new HttpError(400, "El responsable debe ser un usuario activo de la institución con rol de gestión.");
        }
        Object.assign(patch, {
          assignedToId: assignee.id,
          dueDate: new Date(`${input.dueDate}T23:59:59.000-05:00`),
          resourcesRequired: input.resourcesRequired ?? need.resourcesRequired,
        });
        data = { assignedTo: assignee.name, dueDate: input.dueDate };
        break;
      }
      case "start":
        transition("start");
        note = input.note;
        break;
      case "respond":
        transition("respond");
        patch.response = input.response;
        patch.respondedAt = need.respondedAt ?? now;
        note = input.response;
        break;
      case "toVerification":
        transition("toVerification");
        note = input.note;
        break;
      case "review": {
        transition("review", { reviewResult: input.result });
        await tx.insert(effectivenessReviews).values({
          institutionId: user.institutionId,
          needId: need.id,
          result: input.result,
          method: input.method,
          evidence: input.evidence,
          notes: input.notes,
          reviewedById: user.id,
        });
        if (to === "CERRADA") Object.assign(patch, { closedAt: now, closeType: "EFECTIVIDAD_VERIFICADA" as const, closeJustification: null });
        else Object.assign(patch, { closedAt: null, closeType: null });
        data = { result: input.result };
        note = input.method;
        eventType = "EVALUACION_EFECTIVIDAD";
        break;
      }
      case "closeAdministrative":
        transition("closeAdministrative");
        Object.assign(patch, { closedAt: now, closeType: "ADMINISTRATIVO" as const, closeJustification: input.justification, publishImprovement: false });
        note = input.justification;
        break;
      case "reopen":
        transition("reopen");
        Object.assign(patch, { closedAt: null, closeType: null, publishImprovement: false });
        note = input.reason;
        break;
      case "comment":
        note = input.note;
        break;
      case "group": {
        if (input.parentId === need.id) throw new HttpError(400, "Una necesidad no puede agruparse consigo misma.");
        if (input.parentId) {
          const parent = await tx.query.needs.findFirst({
            where: and(eq(needs.id, input.parentId), eq(needs.institutionId, user.institutionId)),
          });
          if (!parent) throw new HttpError(404, "Necesidad principal no encontrada.");
          if (parent.groupParentId) throw new HttpError(400, "La necesidad elegida ya está agrupada en otra; elija la principal.");
          data = { parent: parent.code };
        }
        patch.groupParentId = input.parentId;
        break;
      }
      case "publish": {
        if (input.publish) {
          if (need.status !== "CERRADA" || need.closeType !== "EFECTIVIDAD_VERIFICADA") {
            throw new WorkflowError("Solo se publican mejoras cerradas con efectividad verificada.");
          }
          if (!input.publicSummary || input.publicSummary.length < 15) throw new HttpError(400, "Escriba un resumen público de la mejora (sin datos personales).");
        }
        patch.publishImprovement = input.publish;
        patch.publicSummary = input.publicSummary ?? need.publicSummary;
        data = { publish: input.publish };
        break;
      }
    }

    await tx.update(needs).set(patch).where(eq(needs.id, need.id));
    await tx.insert(needEvents).values({
      institutionId: user.institutionId,
      needId: need.id,
      actorId: user.id,
      type: eventType,
      fromStatus: to ? need.status : null,
      toStatus: to,
      note: note ?? null,
      data: data ?? null,
    });
    await audit(
      { institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: `NECESIDAD_${eventType}`, entity: "need", entityId: need.id, detail: { from: need.status, to } },
      tx,
    );
    return { id: need.id, status: to ?? need.status };
  });
}

async function assertService(tx: Tx, institutionId: string, serviceId: string) {
  const s = await tx.query.services.findFirst({ where: and(eq(schema.services.id, serviceId), eq(schema.services.institutionId, institutionId)) });
  if (!s) throw new HttpError(400, "Servicio inválido.");
}

// ─── Registro directo ───────────────────────────────────────────
export const directNeedSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  proposal: z.string().max(2000).optional(),
  category: z.enum(schema.needCategory.enumValues),
  serviceId: z.uuid().nullable().optional(),
  affectsPatientSafety: z.boolean().optional(),
  source: z.string().max(200).optional(),
});

export async function createDirectNeed(user: SessionUser, input: z.infer<typeof directNeedSchema>) {
  return db.transaction(async (tx) => {
    if (input.serviceId) await assertService(tx, user.institutionId, input.serviceId);
    const code = await nextNeedCode(tx, user.institutionId);
    const [n] = await tx
      .insert(needs)
      .values({
        institutionId: user.institutionId,
        code,
        origin: "REGISTRO_DIRECTO",
        title: input.title,
        description: input.description,
        proposal: input.proposal,
        category: input.category,
        th1Criterion: CATEGORY_DEFAULT_TH1[input.category],
        serviceId: input.serviceId ?? null,
        affectsPatientSafety: input.affectsPatientSafety ?? false,
        receivedAt: new Date(),
      })
      .returning({ id: needs.id, code: needs.code });
    await tx.insert(needEvents).values({
      institutionId: user.institutionId,
      needId: n.id,
      actorId: user.id,
      type: "CREADA",
      toStatus: "RECIBIDA",
      note: input.source ? `Registro directo. Fuente: ${input.source}` : "Registro directo por el equipo de gestión.",
    });
    await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "NECESIDAD_CREADA", entity: "need", entityId: n.id }, tx);
    return n;
  });
}

// ─── Acciones ───────────────────────────────────────────────────
export const actionSchema = z.object({
  description: z.string().trim().min(5).max(2000),
  responsibleId: z.uuid(),
  startDate: isoDate.optional(),
  dueDate: isoDate,
  verificationMeans: z.string().trim().min(3, "Indique el medio de verificación.").max(1000),
  resources: z.string().max(1000).optional(),
});

export async function addAction(user: SessionUser, needId: string, input: z.infer<typeof actionSchema>) {
  if (!can(user.role, "needs.manage")) throw new HttpError(403, "No tiene permiso para registrar acciones.");
  return db.transaction(async (tx) => {
    const [need] = await tx.select().from(needs).where(and(eq(needs.id, needId), needScope(user)));
    if (!need) throw new HttpError(404, "Necesidad no encontrada.");
    if (need.status === "CERRADA") throw new WorkflowError("La necesidad está cerrada. Reábrala para registrar nuevas acciones.");
    const resp = await tx.query.users.findFirst({
      where: and(eq(users.id, input.responsibleId), eq(users.institutionId, user.institutionId), eq(users.active, true)),
    });
    if (!resp) throw new HttpError(400, "Responsable inválido.");
    const [a] = await tx
      .insert(actions)
      .values({
        institutionId: user.institutionId,
        needId,
        description: input.description,
        responsibleId: resp.id,
        startDate: input.startDate ? new Date(`${input.startDate}T00:00:00-05:00`) : null,
        dueDate: new Date(`${input.dueDate}T23:59:59-05:00`),
        verificationMeans: input.verificationMeans,
        resources: input.resources,
        createdById: user.id,
      })
      .returning();
    await tx.insert(needEvents).values({
      institutionId: user.institutionId,
      needId,
      actorId: user.id,
      type: "ACCION_REGISTRADA",
      note: input.description,
      data: { responsible: resp.name, dueDate: input.dueDate, verificationMeans: input.verificationMeans },
    });
    await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "ACCION_CREADA", entity: "action", entityId: a.id }, tx);
    return a;
  });
}

export const actionUpdateSchema = z.object({
  status: z.enum(schema.actionStatus.enumValues),
  evidence: z.string().trim().max(4000).optional(),
});

export async function updateAction(user: SessionUser, actionId: string, input: z.infer<typeof actionUpdateSchema>) {
  return db.transaction(async (tx) => {
    const [a] = await tx
      .select()
      .from(actions)
      .where(and(eq(actions.id, actionId), eq(actions.institutionId, user.institutionId)))
      .for("update");
    if (!a) throw new HttpError(404, "Acción no encontrada.");
    const [need] = await tx.select({ id: needs.id }).from(needs).where(and(eq(needs.id, a.needId), needScope(user)));
    if (!need) throw new HttpError(404, "Acción no encontrada.");
    if (!can(user.role, "needs.manage") && a.responsibleId !== user.id) throw new HttpError(403, "Solo el responsable de la acción o Talento Humano/Calidad pueden actualizarla.");
    if (input.status === "COMPLETADA" && !(input.evidence ?? a.evidence)?.trim()) {
      throw new HttpError(400, "Para completar la acción registre la evidencia según el medio de verificación.");
    }
    const now = new Date();
    await tx
      .update(actions)
      .set({
        status: input.status,
        evidence: input.evidence ?? a.evidence,
        completedAt: input.status === "COMPLETADA" ? (a.completedAt ?? now) : null,
        updatedAt: now,
      })
      .where(eq(actions.id, a.id));
    await tx.insert(needEvents).values({
      institutionId: user.institutionId,
      needId: a.needId,
      actorId: user.id,
      type: "ACCION_ACTUALIZADA",
      note: input.evidence ? `Evidencia: ${input.evidence}` : null,
      data: { action: a.description, from: a.status, to: input.status },
    });
    await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "ACCION_ACTUALIZADA", entity: "action", entityId: a.id, detail: { from: a.status, to: input.status } }, tx);
    return { id: a.id, status: input.status };
  });
}

/** Personas a las que se puede asignar (roles de gestión activos de la institución). */
export async function assignableUsers(institutionId: string) {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.institutionId, institutionId),
        eq(users.active, true),
        inArray(users.role, ["LIDER_SERVICIO", "TALENTO_HUMANO", "CALIDAD", "SST", "GERENCIA"]),
      ),
    )
    .orderBy(asc(users.name));
}
