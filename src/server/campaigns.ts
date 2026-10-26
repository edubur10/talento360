import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { HttpError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { DEFAULT_INSTRUMENT } from "@/lib/instrument";
import { isAnswered, isVisible, validateAnswer, type AnswerState } from "@/lib/form-logic";
import { hashToken, newTrackingCode, normalizeTrackingCode, startOfDayBogota, todayDateOnly } from "@/lib/privacy";
import { CATEGORY_DEFAULT_TH1 } from "@/lib/th1";
import { nextNeedCode } from "./needs";

const { campaigns, questions, submissions, answers, needs, needEvents, employmentTypes, services, institutions } = schema;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const campaignCreateSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(2000),
  mode: z.enum(["ANONIMA", "CONFIDENCIAL"]),
  startsAt: isoDate.optional(),
  endsAt: isoDate.optional(),
  eligibleCount: z.number().int().min(1).max(100000).optional(),
});

function newSlug() {
  return randomBytes(6).toString("base64url").replace(/[-_]/g, "x").toLowerCase();
}

export async function createCampaign(user: SessionUser, input: z.infer<typeof campaignCreateSchema>) {
  if (!can(user.role, "campaigns.manage")) throw new HttpError(403, "No tiene permiso para crear campañas.");
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) throw new HttpError(400, "La fecha de cierre es anterior a la de inicio.");
  return db.transaction(async (tx) => {
    const types = await tx
      .select()
      .from(employmentTypes)
      .where(and(eq(employmentTypes.institutionId, user.institutionId), eq(employmentTypes.active, true)))
      .orderBy(asc(employmentTypes.name));
    if (types.length === 0) throw new HttpError(400, "Configure primero las modalidades de vinculación de la institución.");
    const [c] = await tx
      .insert(campaigns)
      .values({
        institutionId: user.institutionId,
        slug: newSlug(),
        title: input.title,
        description: input.description,
        mode: input.mode,
        startsAt: input.startsAt ? new Date(`${input.startsAt}T00:00:00-05:00`) : null,
        endsAt: input.endsAt ? new Date(`${input.endsAt}T23:59:59-05:00`) : null,
        eligibleCount: input.eligibleCount ?? null,
        createdById: user.id,
      })
      .returning();
    await tx.insert(questions).values(
      DEFAULT_INSTRUMENT.map((q, i) => ({
        institutionId: user.institutionId,
        campaignId: c.id,
        order: i + 1,
        section: q.section,
        code: q.code,
        text: q.text,
        help: q.help ?? null,
        type: q.type,
        options: q.code === "P1" ? types.map((t) => t.name) : (q.options ?? null),
        required: q.required ?? false,
        allowNA: q.allowNA ?? (q.type === "ESCALA"),
        th1Criterion: q.th1Criterion ?? null,
        category: q.category ?? null,
        showIfCode: q.showIfCode ?? null,
        showIfValues: q.showIfValues ?? null,
        onlyForEmploymentCodes: q.onlyForEmploymentCodes ?? null,
      })),
    );
    await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "CAMPANA_CREADA", entity: "campaign", entityId: c.id, detail: { mode: c.mode } }, tx);
    return c;
  });
}

export const campaignUpdateSchema = z.object({
  status: z.enum(["BORRADOR", "ACTIVA", "CERRADA"]).optional(),
  eligibleCount: z.number().int().min(1).max(100000).nullable().optional(),
  endsAt: isoDate.nullable().optional(),
});

export async function updateCampaign(user: SessionUser, id: string, input: z.infer<typeof campaignUpdateSchema>) {
  if (!can(user.role, "campaigns.manage")) throw new HttpError(403, "No tiene permiso para modificar campañas.");
  const c = await db.query.campaigns.findFirst({ where: and(eq(campaigns.id, id), eq(campaigns.institutionId, user.institutionId)) });
  if (!c) throw new HttpError(404, "Campaña no encontrada.");
  if (c.status === "CERRADA" && input.status && input.status !== "CERRADA") throw new HttpError(409, "Una campaña cerrada no se puede reabrir; cree una nueva medición.");
  const patch: Partial<typeof campaigns.$inferInsert> = { updatedAt: new Date() };
  if (input.status) patch.status = input.status;
  if (input.eligibleCount !== undefined) patch.eligibleCount = input.eligibleCount;
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt ? new Date(`${input.endsAt}T23:59:59-05:00`) : null;
  await db.update(campaigns).set(patch).where(eq(campaigns.id, id));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "CAMPANA_ACTUALIZADA", entity: "campaign", entityId: id, detail: input });
  return { id };
}

export async function listCampaigns(institutionId: string) {
  const rows = await db
    .select({
      id: campaigns.id,
      slug: campaigns.slug,
      title: campaigns.title,
      mode: campaigns.mode,
      status: campaigns.status,
      startsAt: campaigns.startsAt,
      endsAt: campaigns.endsAt,
      eligibleCount: campaigns.eligibleCount,
      isDemo: campaigns.isDemo,
      createdAt: campaigns.createdAt,
      submissions: sql<number>`(select count(*)::int from ${submissions} s where s.campaign_id = "campaigns"."id")`,
      needs: sql<number>`(select count(*)::int from ${needs} n where n.campaign_id = "campaigns"."id")`,
    })
    .from(campaigns)
    .where(eq(campaigns.institutionId, institutionId))
    .orderBy(desc(campaigns.createdAt));
  return rows;
}

export function campaignIsOpen(c: { status: string; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (c.status !== "ACTIVA") return false;
  if (c.startsAt && now < c.startsAt) return false;
  if (c.endsAt && now > c.endsAt) return false;
  return true;
}

/** Datos públicos de una campaña (sin información interna). */
export async function getPublicCampaign(slug: string) {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.slug, slug) });
  if (!c) return null;
  const inst = await db.query.institutions.findFirst({ where: eq(institutions.id, c.institutionId) });
  const qs = await db.select().from(questions).where(eq(questions.campaignId, c.id)).orderBy(asc(questions.order));
  const types = await db
    .select({ code: employmentTypes.code, name: employmentTypes.name })
    .from(employmentTypes)
    .where(and(eq(employmentTypes.institutionId, c.institutionId), eq(employmentTypes.active, true)));
  const svcs = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.institutionId, c.institutionId), eq(services.active, true)))
    .orderBy(asc(services.name));
  return {
    campaign: { id: c.id, slug: c.slug, title: c.title, description: c.description, mode: c.mode, open: campaignIsOpen(c), status: c.status, endsAt: c.endsAt, isDemo: c.isDemo },
    institution: inst!,
    questions: qs.map((q) => ({
      id: q.id,
      code: q.code,
      section: q.section,
      text: q.text,
      help: q.help,
      type: q.type,
      options: q.options,
      required: q.required,
      allowNA: q.allowNA,
      showIfCode: q.showIfCode,
      showIfValues: q.showIfValues,
      onlyForEmploymentCodes: q.onlyForEmploymentCodes,
    })),
    employmentTypes: types,
    services: svcs,
  };
}

// ─── Envío de respuestas ─────────────────────────────────────────
const answerSchema = z.object({
  value: z.union([z.string().max(2000), z.array(z.string().max(300)).max(20), z.number(), z.null()]),
  na: z.boolean().optional(),
});
export const submissionSchema = z.object({
  answers: z.record(z.string().max(20), answerSchema),
  serviceId: z.uuid().nullable().optional(),
  needs: z
    .array(
      z.object({
        category: z.enum(schema.needCategory.enumValues),
        description: z.string().trim().min(10, "Describe la necesidad con al menos 10 caracteres.").max(2000),
        proposal: z.string().trim().max(1000).optional(),
        affectsPatientSafety: z.boolean().optional(),
      }),
    )
    .max(3),
  consent: z.literal(true, { error: "Debe aceptar el aviso de tratamiento de datos para continuar." }),
});

export async function submitCampaign(slug: string, input: z.infer<typeof submissionSchema>, session: SessionUser | null) {
  const pub = await getPublicCampaign(slug);
  if (!pub) throw new HttpError(404, "Campaña no encontrada.");
  const { campaign, questions: qs, employmentTypes: types, institution } = pub;
  if (!campaign.open) throw new HttpError(409, "Esta campaña no está recibiendo respuestas.");

  const confidential = campaign.mode === "CONFIDENCIAL";
  if (confidential) {
    if (!session) throw new HttpError(401, "Esta campaña es confidencial: inicie sesión para participar.");
    if (session.institutionId !== institution.id) throw new HttpError(403, "Esta campaña pertenece a otra institución.");
  }

  // Validación en servidor (no se confía en el navegador)
  const ans = input.answers as Record<string, AnswerState>;
  const p1 = ans["P1"];
  const empType = types.find((t) => t.name === p1?.value) ?? null;
  const known = new Set(qs.map((q) => q.code));
  for (const code of Object.keys(ans)) if (!known.has(code)) throw new HttpError(400, `Pregunta desconocida: ${code}`);
  for (const q of qs) {
    const visible = isVisible(q, ans, empType?.code ?? null);
    const a = ans[q.code];
    if (!visible) {
      delete ans[q.code];
      continue;
    }
    if (q.required && !isAnswered(a)) throw new HttpError(400, `Falta responder: «${q.text}»`);
    if (a) {
      const err = validateAnswer(q, a);
      if (err) throw new HttpError(400, `${err} («${q.text}»)`);
    }
  }
  if (input.serviceId) {
    const s = pub.services.find((x) => x.id === input.serviceId);
    if (!s) throw new HttpError(400, "Servicio inválido.");
  }

  const trackingCode = newTrackingCode();
  const trackingHash = hashToken(trackingCode);
  const day = todayDateOnly();
  // Anónima: fecha de recepción truncada al día. Confidencial: hora real.
  const receivedAt = confidential ? new Date() : startOfDayBogota(day);

  const created = await db.transaction(async (tx) => {
    if (confidential) {
      const prev = await tx.query.submissions.findFirst({
        where: and(eq(submissions.campaignId, campaign.id), eq(submissions.userId, session!.id)),
      });
      if (prev) throw new HttpError(409, "Ya participaste en esta campaña. Puedes consultar el estado de tus necesidades en «Mi espacio».");
    }
    const [sub] = await tx
      .insert(submissions)
      .values({
        institutionId: institution.id,
        campaignId: campaign.id,
        userId: confidential ? session!.id : null,
        employmentTypeId: empType ? (await tx.query.employmentTypes.findFirst({ where: and(eq(employmentTypes.institutionId, institution.id), eq(employmentTypes.code, empType.code)) }))!.id : null,
        serviceId: input.serviceId ?? null,
        submittedOn: day,
        trackingCodeHash: trackingHash,
      })
      .returning({ id: submissions.id });
    const byCode = new Map(qs.map((q) => [q.code, q]));
    const rows = Object.entries(ans)
      .filter(([, a]) => isAnswered(a))
      .map(([code, a]) => ({
        institutionId: institution.id,
        submissionId: sub.id,
        questionId: byCode.get(code)!.id,
        value: a.na ? null : a.value,
        notApplicable: !!a.na,
      }));
    if (rows.length) await tx.insert(answers).values(rows);

    const codes: string[] = [];
    for (const n of input.needs) {
      const code = await nextNeedCode(tx, institution.id);
      const firstLine = n.description.split(/[.\n]/)[0].slice(0, 120);
      const [need] = await tx
        .insert(needs)
        .values({
          institutionId: institution.id,
          code,
          origin: "CAMPANA",
          campaignId: campaign.id,
          submissionId: sub.id,
          isAnonymous: !confidential,
          reporterId: confidential ? session!.id : null,
          trackingCodeHash: trackingHash,
          serviceId: input.serviceId ?? null,
          title: firstLine.length >= 3 ? firstLine : n.description.slice(0, 120),
          description: n.description,
          proposal: n.proposal || null,
          category: n.category,
          th1Criterion: CATEGORY_DEFAULT_TH1[n.category],
          affectsPatientSafety: n.affectsPatientSafety ?? false,
          receivedAt,
        })
        .returning({ id: needs.id });
      await tx.insert(needEvents).values({
        institutionId: institution.id,
        needId: need.id,
        actorId: null,
        type: "CREADA",
        toStatus: "RECIBIDA",
        note: confidential ? "Registrada en campaña confidencial." : "Registrada en campaña anónima.",
        createdAt: receivedAt,
      });
      codes.push(code);
    }
    // Auditoría sin identidad del participante en campañas anónimas.
    await audit(
      {
        institutionId: institution.id,
        actorId: confidential ? session!.id : null,
        actorRole: confidential ? session!.role : null,
        action: "PARTICIPACION_REGISTRADA",
        entity: "campaign",
        entityId: campaign.id,
        detail: { needs: codes.length, mode: campaign.mode },
      },
      tx,
    );
    return { codes };
  });

  return { trackingCode, needCodes: created.codes, mode: campaign.mode };
}

/** Seguimiento público con código: solo estado y respuesta; nunca notas internas. */
export async function trackByCode(rawCode: string) {
  const code = normalizeTrackingCode(rawCode);
  if (!/^T360-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return null;
  const h = hashToken(code);
  const sub = await db.query.submissions.findFirst({ where: eq(submissions.trackingCodeHash, h) });
  if (!sub) return null;
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, sub.campaignId), columns: { title: true } });
  const list = await db
    .select({
      code: needs.code,
      title: needs.title,
      category: needs.category,
      status: needs.status,
      response: needs.response,
      respondedAt: needs.respondedAt,
      closeType: needs.closeType,
    })
    .from(needs)
    .where(eq(needs.trackingCodeHash, h))
    .orderBy(asc(needs.code));
  return { campaign: c?.title ?? "", submittedOn: sub.submittedOn, needs: list };
}

// ─── Resultados agregados con protección de grupos pequeños ─────
export async function campaignResults(user: SessionUser, id: string) {
  if (!can(user.role, "campaigns.viewResults")) throw new HttpError(403, "No tiene permiso para ver resultados.");
  const c = await db.query.campaigns.findFirst({ where: and(eq(campaigns.id, id), eq(campaigns.institutionId, user.institutionId)) });
  if (!c) return null;
  const inst = await db.query.institutions.findFirst({ where: eq(institutions.id, user.institutionId) });
  const k = inst!.minGroupSize;
  const [{ n }] = await db.select({ n: count() }).from(submissions).where(eq(submissions.campaignId, c.id));
  const qs = await db.select().from(questions).where(eq(questions.campaignId, c.id)).orderBy(asc(questions.order));
  if (n < k) return { campaign: c, total: n, k, suppressed: true as const, questions: [], openAnswers: [] };

  const all = await db
    .select({ questionId: answers.questionId, value: answers.value, na: answers.notApplicable })
    .from(answers)
    .where(inArray(answers.questionId, qs.map((q) => q.id)));
  const byQ = new Map<string, { value: unknown; na: boolean }[]>();
  for (const a of all) byQ.set(a.questionId, [...(byQ.get(a.questionId) ?? []), a]);

  const canReadOpen = can(user.role, "needs.manage");
  const out = qs
    .filter((q) => q.type !== "TEXTO")
    .map((q) => {
      const list = byQ.get(q.id) ?? [];
      const valid = list.filter((a) => !a.na && a.value != null);
      const base = { code: q.code, section: q.section, text: q.text, type: q.type, th1Criterion: q.th1Criterion, answered: valid.length, na: list.length - valid.length };
      // Una pregunta con pocas respuestas (p. ej. ramificada a un grupo pequeño) se oculta.
      if (valid.length < k) return { ...base, hidden: true as const };
      if (q.type === "ESCALA") {
        const nums = valid.map((a) => Number(a.value));
        const dist = [1, 2, 3, 4, 5].map((v) => nums.filter((x) => x === v).length);
        const avg = nums.reduce((s, x) => s + x, 0) / nums.length;
        // Para D4 (cansancio) la escala es inversa: más alto es peor.
        const inverse = q.code === "D4";
        const favorable = nums.filter((x) => (inverse ? x <= 2 : x >= 4)).length / nums.length;
        return { ...base, hidden: false as const, avg: Math.round(avg * 100) / 100, dist, favorable: Math.round(favorable * 1000) / 10, inverse };
      }
      const counts = new Map<string, number>();
      for (const a of valid) for (const v of Array.isArray(a.value) ? a.value : [a.value]) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
      // Opciones elegidas por menos de k personas se muestran como «menos de k» (no se revela el conteo exacto).
      return {
        ...base,
        hidden: false as const,
        options: [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => ({ label, value: value >= k ? value : null })),
      };
    });

  // Respuestas abiertas: solo para quienes gestionan; sin vínculo a otras respuestas del mismo participante.
  const openAnswers = canReadOpen
    ? qs
        .filter((q) => q.type === "TEXTO")
        .map((q) => ({
          code: q.code,
          text: q.text,
          answers: (byQ.get(q.id) ?? [])
            .map((a) => (typeof a.value === "string" ? a.value.trim() : ""))
            .filter(Boolean)
            .sort(() => Math.random() - 0.5), // orden aleatorio: no permite cruzar con el orden de otras preguntas
        }))
    : [];
  return { campaign: c, total: n, k, suppressed: false as const, questions: out, openAnswers };
}
