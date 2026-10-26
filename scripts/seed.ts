/**
 * Carga inicial.
 *   SEED_MODE=demo        → institución con DATOS DE DEMOSTRACIÓN (ficticios y marcados isDemo)
 *                           + una segunda institución de prueba para verificar el aislamiento.
 *   SEED_MODE=produccion  → solo la institución y un administrador técnico (sin datos de prueba).
 *
 * Ningún dato de demostración corresponde a información real del hospital.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { DEFAULT_EMPLOYMENT_TYPES, DEFAULT_INSTRUMENT } from "../src/lib/instrument";
import { createHash } from "node:crypto";
import { CATEGORY_DEFAULT_TH1 } from "../src/lib/th1";
import { DEFAULT_WEIGHTS } from "../src/lib/priority";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const DEMO_PASSWORD = "Demo-T360-2026";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// Generador pseudoaleatorio determinista para que la demostración sea reproducible.
let seed = 20261008;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const dayOnly = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
const midnight = (d: Date) => new Date(`${dayOnly(d)}T05:00:00.000Z`);

async function createInstitution(v: typeof schema.institutions.$inferInsert) {
  const existing = await db.query.institutions.findFirst({ where: eq(schema.institutions.slug, v.slug) });
  if (existing) {
    console.log(`La institución «${v.slug}» ya existe; no se modifica.`);
    return null;
  }
  const [i] = await db.insert(schema.institutions).values(v).returning();
  return i;
}

async function production() {
  const name = process.env.SEED_INSTITUTION_NAME;
  const slug = process.env.SEED_INSTITUTION_SLUG;
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const pw = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!name || !slug || !email) throw new Error("Defina SEED_INSTITUTION_NAME, SEED_INSTITUTION_SLUG y SEED_ADMIN_EMAIL.");
  if (pw.length < 12 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw)) throw new Error("SEED_ADMIN_PASSWORD debe tener 12+ caracteres con letras y números.");
  const inst = await createInstitution({ name, slug, shortName: name.replace(/^E\.?S\.?E\.?\s*/i, ""), city: process.env.SEED_INSTITUTION_CITY ?? null, priorityWeights: DEFAULT_WEIGHTS });
  if (!inst) return;
  await db.insert(schema.employmentTypes).values(DEFAULT_EMPLOYMENT_TYPES.map((t) => ({ ...t, institutionId: inst.id })));
  await db.insert(schema.users).values({
    institutionId: inst.id,
    email,
    name: "Administrador técnico",
    role: "ADMIN_TECNICO",
    passwordHash: await bcrypt.hash(pw, 12),
    mustChangePassword: true,
  });
  console.log(`Institución «${name}» creada. Administrador: ${email} (debe cambiar la contraseña al ingresar).`);
  console.log("Siguiente paso: ingrese como administrador, registre sedes, servicios y usuarios de Talento Humano, Calidad y Gerencia.");
}

async function demo() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const inst = await createInstitution({
    slug: "pio-xii",
    name: "ESE Hospital Pío XII",
    shortName: "Hospital Pío XII",
    city: "Colón, Putumayo",
    isDemo: true,
    priorityWeights: DEFAULT_WEIGHTS,
  });
  if (!inst) return;

  const [site] = await db.insert(schema.sites).values({ institutionId: inst.id, name: "Sede principal (demostración)" }).returning();
  const svcNames: [string, string][] = [
    ["Urgencias", "ASISTENCIAL"],
    ["Hospitalización", "ASISTENCIAL"],
    ["Consulta externa", "ASISTENCIAL"],
    ["Odontología", "ASISTENCIAL"],
    ["Laboratorio clínico", "APOYO"],
    ["Farmacia", "APOYO"],
    ["Promoción y mantenimiento de la salud", "ASISTENCIAL"],
    ["Gestión administrativa", "ADMINISTRATIVO"],
    ["Servicios generales", "APOYO"],
  ];
  const svcs = await db.insert(schema.services).values(svcNames.map(([name, kind]) => ({ institutionId: inst.id, siteId: site.id, name, kind }))).returning();
  const svc = (n: string) => svcs.find((s) => s.name === n)!.id;
  const types = await db.insert(schema.employmentTypes).values(DEFAULT_EMPLOYMENT_TYPES.map((t) => ({ ...t, institutionId: inst.id }))).returning();

  const mk = (email: string, name: string, role: schema.Role, serviceId: string | null = null) => ({ institutionId: inst.id, email, name, role, serviceId, passwordHash: hash });
  const us = await db
    .insert(schema.users)
    .values([
      mk("admin@demo.t360", "Administración técnica (demo)", "ADMIN_TECNICO"),
      mk("talento@demo.t360", "Coordinación de Talento Humano (demo)", "TALENTO_HUMANO"),
      mk("calidad@demo.t360", "Líder de Calidad (demo)", "CALIDAD"),
      mk("gerencia@demo.t360", "Gerencia (demo)", "GERENCIA"),
      mk("lider.urgencias@demo.t360", "Líder de Urgencias (demo)", "LIDER_SERVICIO", svc("Urgencias")),
      mk("lider.hosp@demo.t360", "Líder de Hospitalización (demo)", "LIDER_SERVICIO", svc("Hospitalización")),
      mk("sst@demo.t360", "Profesional SST (demo)", "SST"),
      mk("auditor@demo.t360", "Auditoría interna (demo)", "AUDITOR"),
      mk("colaborador@demo.t360", "Colaborador de prueba (demo)", "COLABORADOR", svc("Consulta externa")),
    ])
    .returning();
  const u = (email: string) => us.find((x) => x.email === email)!;

  // ── Campañas ──
  const makeCampaign = async (v: Partial<typeof schema.campaigns.$inferInsert> & { slug: string; title: string; mode: "ANONIMA" | "CONFIDENCIAL" }) => {
    const [c] = await db
      .insert(schema.campaigns)
      .values({ institutionId: inst.id, description: "", status: "ACTIVA", isDemo: true, createdById: u("talento@demo.t360").id, ...v })
      .returning();
    const qs = await db
      .insert(schema.questions)
      .values(
        DEFAULT_INSTRUMENT.map((q, i) => ({
          institutionId: inst.id,
          campaignId: c.id,
          order: i + 1,
          section: q.section,
          code: q.code,
          text: q.text,
          help: q.help ?? null,
          type: q.type,
          options: q.code === "P1" ? types.map((t) => t.name) : (q.options ?? null),
          required: q.required ?? false,
          allowNA: q.allowNA ?? q.type === "ESCALA",
          th1Criterion: q.th1Criterion ?? null,
          category: q.category ?? null,
          showIfCode: q.showIfCode ?? null,
          showIfValues: q.showIfValues ?? null,
          onlyForEmploymentCodes: q.onlyForEmploymentCodes ?? null,
        })),
      )
      .returning();
    return { c, qs };
  };

  const anon = await makeCampaign({
    slug: "demo-necesidades-2026",
    title: "Identificación de necesidades y expectativas 2026 (demostración)",
    description: "Queremos saber qué necesitas para trabajar mejor y sentirte bien en el hospital. Tu participación es anónima: no pedimos tu nombre y no registramos tu equipo ni la hora en que respondes.",
    mode: "ANONIMA",
    startsAt: daysAgo(150),
    eligibleCount: 120,
  });
  await makeCampaign({
    slug: "demo-confidencial-2026",
    title: "Consulta confidencial de seguimiento (demostración)",
    description: "Participación identificada: Talento Humano podrá contactarte para resolver tu necesidad. Tus respuestas no se publican con tu nombre.",
    mode: "CONFIDENCIAL",
    startsAt: daysAgo(30),
    eligibleCount: 40,
  });

  // Participaciones anónimas simuladas (respuestas ficticias)
  const typeWeights = ["PLANTA", "PLANTA", "CONTRATISTA", "CONTRATISTA", "CONTRATISTA", "TERCERO", "FORMACION"];
  const subIds: string[] = [];
  for (let i = 0; i < 26; i++) {
    const tcode = pick(typeWeights);
    const t = types.find((x) => x.code === tcode)!;
    const when = daysAgo(Math.floor(rnd() * 140) + 3);
    const [s] = await db
      .insert(schema.submissions)
      .values({
        institutionId: inst.id,
        campaignId: anon.c.id,
        employmentTypeId: t.id,
        serviceId: rnd() < 0.7 ? pick(svcs).id : null,
        submittedOn: dayOnly(when),
        trackingCodeHash: sha(`demo-sub-${i}`),
        isDemo: true,
      })
      .returning();
    subIds.push(s.id);
    const rows: (typeof schema.answers.$inferInsert)[] = [];
    for (const q of anon.qs) {
      if (q.onlyForEmploymentCodes && !q.onlyForEmploymentCodes.includes(tcode)) continue;
      let value: unknown = null;
      if (q.code === "P1") value = t.name;
      else if (q.type === "ESCALA") {
        const bias = q.section === "D" ? -0.6 : q.section === "F" ? 0.6 : q.section === "A" ? -0.3 : 0;
        value = Math.max(1, Math.min(5, Math.round(3 + bias + (rnd() * 2.6 - 1.3))));
        if (q.code === "D4") value = Math.max(1, Math.min(5, Math.round(3.6 + (rnd() * 2 - 1))));
      } else if (q.type === "UNICA") value = pick(q.options ?? []);
      else if (q.type === "MULTIPLE") value = (q.options ?? []).filter(() => rnd() < 0.3);
      else if (q.type === "SI_NO") value = rnd() < 0.35 ? "Sí" : "No";
      else if (q.type === "TEXTO") {
        const bank: Record<string, string[]> = {
          G1: ["Más insumos en el turno de la noche", "Un computador adicional en la estación de enfermería", "Capacitación en el nuevo software de historia clínica", "Que los turnos se publiquen con más anticipación"],
          G2: ["La falta de personal en los fines de semana", "Los tiempos de espera para recibir dotación", "La comunicación entre turnos", "El cansancio en turnos de 12 horas seguidos"],
          G3: ["El compañerismo del equipo", "La disposición de los jefes para escuchar", "El compromiso con los pacientes de la región"],
          G4: ["Reconociendo el trabajo bien hecho", "Con espacios de descanso adecuados", "Informando a tiempo los cambios", "Incluyendo a los contratistas en las actividades"],
        };
        value = rnd() < 0.65 ? pick(bank[q.code] ?? ["(sin comentario)"]) : null;
      }
      if (value == null || (Array.isArray(value) && value.length === 0)) continue;
      rows.push({ institutionId: inst.id, submissionId: s.id, questionId: q.id, value: value as never });
    }
    if (rows.length) await db.insert(schema.answers).values(rows);
  }

  // ── Necesidades de demostración en distintos estados ──
  let seq = 0;
  const th = u("talento@demo.t360"), cal = u("calidad@demo.t360"), lid = u("lider.urgencias@demo.t360"), sst = u("sst@demo.t360"), lidH = u("lider.hosp@demo.t360");
  type Spec = {
    title: string; description: string; category: schema.NeedCategory; service?: string; ago: number; status: schema.NeedStatus;
    priority?: schema.Priority; score?: number; urgent?: boolean; assign?: typeof th; dueIn?: number; response?: string; respondedAfter?: number;
    actions?: { d: string; who: typeof th; dueIn: number; status: "PROGRAMADA" | "EN_CURSO" | "COMPLETADA"; evidence?: string }[];
    review?: { result: "EFECTIVA" | "NO_EFECTIVA" | "PARCIALMENTE_EFECTIVA"; after: number }; closeAdmin?: string; publish?: string; escalation?: "SST" | "NINGUNO"; safety?: boolean;
  };
  const specs: Spec[] = [
    { title: "Insumos insuficientes en el turno nocturno", description: "En la noche se agotan guantes y gasas y no hay a quién solicitarlos hasta la mañana.", category: "CONDICIONES_TRABAJO", service: "Urgencias", ago: 120, status: "CERRADA", priority: "ALTA", score: 68, assign: lid, dueIn: 15, response: "Se dejó un stock mínimo nocturno bajo custodia del jefe de turno y se ajustó la reposición diaria.", respondedAfter: 12,
      actions: [{ d: "Definir stock mínimo nocturno con farmacia", who: lid, dueIn: 10, status: "COMPLETADA", evidence: "Acta de reunión con farmacia y formato de stock firmado (demo)." }], review: { result: "EFECTIVA", after: 45 }, publish: "Ahora el servicio de urgencias cuenta con un stock nocturno de insumos básicos, para que nadie se quede sin guantes ni gasas en la madrugada.", safety: true },
    { title: "Sala de descanso sin agua potable", description: "El personal de turno no tiene acceso a agua potable en la sala de descanso.", category: "BIENESTAR_DESARROLLO", service: "Hospitalización", ago: 110, status: "CERRADA", priority: "MEDIA", score: 48, assign: th, dueIn: 20, response: "Se instaló un dispensador de agua en la sala de descanso.", respondedAfter: 18,
      actions: [{ d: "Instalar dispensador de agua", who: th, dueIn: 18, status: "COMPLETADA", evidence: "Registro fotográfico y orden de compra (demo)." }], review: { result: "EFECTIVA", after: 30 }, publish: "Instalamos un dispensador de agua potable en la sala de descanso de hospitalización." },
    { title: "Programación de turnos publicada tarde", description: "Los turnos del mes se conocen con menos de tres días de anticipación, lo que impide organizar la vida familiar.", category: "CARGA_ORGANIZACION", service: "Urgencias", ago: 95, status: "REABIERTA", priority: "ALTA", score: 62, assign: lid, dueIn: 20, response: "Se acordó publicar los turnos el día 20 de cada mes.", respondedAfter: 15,
      actions: [{ d: "Publicar turnos el día 20 de cada mes", who: lid, dueIn: 25, status: "COMPLETADA", evidence: "Cuadros de turno publicados (demo)." }], review: { result: "NO_EFECTIVA", after: 50 } },
    { title: "Capacitación en manejo del desfibrilador", description: "Personal nuevo no ha recibido entrenamiento práctico en el desfibrilador del servicio.", category: "FORMACION_COMPETENCIAS", service: "Urgencias", ago: 70, status: "PENDIENTE_EFECTIVIDAD", priority: "CRITICA", score: 82, urgent: true, assign: cal, dueIn: 10, response: "Se realizó entrenamiento práctico a 14 personas del servicio.", respondedAfter: 9,
      actions: [{ d: "Taller práctico de desfibrilación", who: cal, dueIn: 9, status: "COMPLETADA", evidence: "Listas de asistencia y evaluación práctica (demo)." }], safety: true },
    { title: "Cansancio por turnos dobles consecutivos", description: "Se programan turnos dobles seguidos por falta de personal, con riesgo de errores.", category: "CARGA_ORGANIZACION", service: "Hospitalización", ago: 40, status: "EN_EJECUCION", priority: "CRITICA", score: 79, urgent: true, assign: sst, dueIn: 12, escalation: "SST", safety: true,
      actions: [{ d: "Análisis de carga laboral y fatiga con SST", who: sst, dueIn: -3, status: "EN_CURSO" }, { d: "Propuesta de ajuste de planta de personal a Gerencia", who: th, dueIn: 20, status: "PROGRAMADA" }] },
    { title: "Computador lento en facturación", description: "El equipo de facturación se bloquea varias veces al día y retrasa la atención.", category: "CONDICIONES_TRABAJO", service: "Gestión administrativa", ago: 35, status: "ASIGNADA", priority: "MEDIA", score: 41, assign: th, dueIn: -2 },
    { title: "Contratistas no participan en actividades de bienestar", description: "Las actividades de integración solo se informan al personal de planta.", category: "BIENESTAR_DESARROLLO", ago: 28, status: "PRIORIZADA", priority: "MEDIA", score: 44 },
    { title: "Instrucciones contradictorias entre turnos", description: "Cada jefe de turno da indicaciones distintas sobre el mismo procedimiento.", category: "COMUNICACION", service: "Hospitalización", ago: 22, status: "EN_ANALISIS", priority: undefined },
    { title: "Falta de reconocimiento al personal de servicios generales", description: "El trabajo de aseo y mantenimiento no se menciona en los reconocimientos institucionales.", category: "CULTURA_CLIMA", service: "Servicios generales", ago: 18, status: "CLASIFICADA" },
    { title: "Inducción incompleta para personal nuevo", description: "Personal que ingresó este trimestre no recibió inducción al servicio.", category: "CICLO_VIDA_LABORAL", ago: 12, status: "RECIBIDA" },
    { title: "Estudiantes sin tutor asignado en el turno de la tarde", description: "En la tarde los estudiantes en práctica no tienen un tutor claro.", category: "DOCENCIA_SERVICIO", service: "Consulta externa", ago: 9, status: "RECIBIDA" },
    { title: "Necesito más insumos en la noche", description: "Por la noche faltan insumos básicos en urgencias.", category: "CONDICIONES_TRABAJO", service: "Urgencias", ago: 100, status: "CERRADA", closeAdmin: "Duplicada: se agrupa con la necesidad de insumos nocturnos." },
    { title: "Silla ergonómica en laboratorio", description: "Las sillas del laboratorio causan molestias en la espalda tras jornadas largas.", category: "CONDICIONES_TRABAJO", service: "Laboratorio clínico", ago: 60, status: "RESPUESTA_EMITIDA", priority: "BAJA", score: 30, assign: lidH, dueIn: 30, response: "Se solicitó la compra de dos sillas ergonómicas en el plan de compras.", respondedAfter: 20 },
    { title: "Reconocimiento por antigüedad", description: "No existe reconocimiento para quienes cumplen muchos años en el hospital.", category: "COMPENSACION_INCENTIVOS", ago: 5, status: "RECIBIDA" },
  ];
  const ids: string[] = [];
  for (const s of specs) {
    seq++;
    const receivedAt = midnight(daysAgo(s.ago));
    const dueDate = s.dueIn != null ? (s.dueIn < 0 ? daysAgo(-s.dueIn) : new Date(receivedAt.getTime() + s.dueIn * 86_400_000)) : null;
    const respondedAt = s.respondedAfter != null ? new Date(receivedAt.getTime() + s.respondedAfter * 86_400_000) : null;
    const reviewAt = s.review ? new Date(receivedAt.getTime() + s.review.after * 86_400_000) : null;
    const closed = s.status === "CERRADA";
    const [n] = await db
      .insert(schema.needs)
      .values({
        institutionId: inst.id,
        code: `NEC-${receivedAt.getUTCFullYear()}-${String(seq).padStart(4, "0")}`,
        origin: "CAMPANA",
        campaignId: anon.c.id,
        submissionId: subIds[seq % subIds.length],
        isAnonymous: true,
        trackingCodeHash: seq === 1 ? sha("T360-DEMO-0001") : null,
        serviceId: s.service ? svc(s.service) : null,
        title: s.title,
        description: s.description,
        category: s.category,
        th1Criterion: CATEGORY_DEFAULT_TH1[s.category],
        affectsPatientSafety: !!s.safety,
        priority: s.priority ?? null,
        priorityScore: s.score ?? null,
        priorityMethod: s.priority ? "Matriz ponderada v1 (demostración)" : null,
        isUrgent: !!s.urgent,
        escalation: s.escalation ?? "NINGUNO",
        status: s.status,
        assignedToId: s.assign?.id ?? null,
        dueDate,
        response: s.response ?? null,
        respondedAt,
        closedAt: closed ? (reviewAt ?? new Date(receivedAt.getTime() + 3 * 86_400_000)) : null,
        closeType: closed ? (s.closeAdmin ? "ADMINISTRATIVO" : "EFECTIVIDAD_VERIFICADA") : null,
        closeJustification: s.closeAdmin ?? null,
        publishImprovement: !!s.publish,
        publicSummary: s.publish ?? null,
        isDemo: true,
        receivedAt,
      })
      .returning();
    ids.push(n.id);
    const ev: (typeof schema.needEvents.$inferInsert)[] = [{ institutionId: inst.id, needId: n.id, type: "CREADA", toStatus: "RECIBIDA", note: "Registrada en campaña anónima (demostración).", createdAt: receivedAt }];
    if (s.status !== "RECIBIDA") ev.push({ institutionId: inst.id, needId: n.id, actorId: th.id, type: "CLASSIFY", fromStatus: "RECIBIDA", toStatus: "CLASIFICADA", createdAt: new Date(receivedAt.getTime() + 86_400_000) });
    if (s.priority) ev.push({ institutionId: inst.id, needId: n.id, actorId: cal.id, type: "PRIORITIZE", fromStatus: "CLASIFICADA", toStatus: "PRIORIZADA", data: { final: s.priority }, createdAt: new Date(receivedAt.getTime() + 2 * 86_400_000) });
    if (s.assign) ev.push({ institutionId: inst.id, needId: n.id, actorId: th.id, type: "ASSIGN", fromStatus: "PRIORIZADA", toStatus: "ASIGNADA", data: { assignedTo: s.assign.name }, createdAt: new Date(receivedAt.getTime() + 3 * 86_400_000) });
    if (respondedAt) ev.push({ institutionId: inst.id, needId: n.id, actorId: s.assign?.id ?? th.id, type: "RESPOND", fromStatus: "EN_EJECUCION", toStatus: "RESPUESTA_EMITIDA", note: s.response, createdAt: respondedAt });
    if (s.review && reviewAt) ev.push({ institutionId: inst.id, needId: n.id, actorId: cal.id, type: "EVALUACION_EFECTIVIDAD", fromStatus: "PENDIENTE_EFECTIVIDAD", toStatus: s.review.result === "EFECTIVA" ? "CERRADA" : "REABIERTA", data: { result: s.review.result }, createdAt: reviewAt });
    if (s.closeAdmin) ev.push({ institutionId: inst.id, needId: n.id, actorId: th.id, type: "CLOSEADMINISTRATIVE", fromStatus: "CLASIFICADA", toStatus: "CERRADA", note: s.closeAdmin, createdAt: new Date(receivedAt.getTime() + 3 * 86_400_000) });
    await db.insert(schema.needEvents).values(ev);
    for (const a of s.actions ?? []) {
      const dueA = a.dueIn < 0 ? daysAgo(-a.dueIn) : new Date(receivedAt.getTime() + a.dueIn * 86_400_000);
      await db.insert(schema.actions).values({
        institutionId: inst.id, needId: n.id, description: a.d, responsibleId: a.who.id, dueDate: dueA, verificationMeans: "Acta, registro fotográfico o lista de asistencia", status: a.status,
        evidence: a.evidence ?? null, completedAt: a.status === "COMPLETADA" ? new Date(dueA.getTime() - 86_400_000) : null, createdById: th.id, createdAt: new Date(receivedAt.getTime() + 3 * 86_400_000),
      });
    }
    if (s.review && reviewAt) {
      await db.insert(schema.effectivenessReviews).values({
        institutionId: inst.id, needId: n.id, result: s.review.result, method: "Verificación en el servicio y consulta breve al personal del turno (demostración).",
        evidence: s.review.result === "EFECTIVA" ? "Ronda de verificación sin novedades durante cuatro semanas (demo)." : "El personal reporta que la medida no se cumplió dos meses seguidos (demo).",
        reviewedById: cal.id, reviewedAt: reviewAt,
      });
    }
  }
  // Agrupación: la duplicada (#12) se agrupa con la #1
  await db.update(schema.needs).set({ groupParentId: ids[0] }).where(eq(schema.needs.id, ids[11]));
  await db.update(schema.institutions).set({ needSeq: seq }).where(eq(schema.institutions.id, inst.id));

  await db.insert(schema.announcements).values([
    { institutionId: inst.id, title: "Ya puedes participar en la identificación de necesidades 2026", body: "Escanea el código QR en las carteleras o entra desde el enlace compartido. Tu participación es anónima y tarda unos 10 minutos.", isDemo: true, createdById: th.id, publishedAt: daysAgo(20) },
    { institutionId: inst.id, title: "Resultados del primer corte", body: "Gracias a quienes participaron. Ya estamos trabajando en las primeras necesidades priorizadas; consulta abajo las mejoras realizadas.", isDemo: true, createdById: th.id, publishedAt: daysAgo(6) },
  ]);

  // ── Segunda institución (solo para verificar aislamiento) ──
  const b = await createInstitution({ slug: "demo-b", name: "Institución de prueba B (demostración)", shortName: "Institución B", city: "Municipio de prueba", isDemo: true });
  if (b) {
    await db.insert(schema.employmentTypes).values(DEFAULT_EMPLOYMENT_TYPES.map((t) => ({ ...t, institutionId: b.id })));
    await db.insert(schema.users).values({ institutionId: b.id, email: "talento@demob.t360", name: "Talento Humano Institución B (demo)", role: "TALENTO_HUMANO", passwordHash: hash });
    await db.insert(schema.needs).values({
      institutionId: b.id, code: "NEC-2026-0001", origin: "REGISTRO_DIRECTO", title: "Necesidad privada de la institución B", description: "Este registro nunca debe verse desde otra institución.", category: "OTRA", isDemo: true, receivedAt: daysAgo(3),
    });
    await db.update(schema.institutions).set({ needSeq: 1 }).where(eq(schema.institutions.id, b.id));
  }

  console.log("Datos de demostración cargados.");
  console.log(`Usuarios de demostración (contraseña: ${DEMO_PASSWORD}):`);
  for (const x of us) console.log(`  ${x.role.padEnd(15)} ${x.email}`);
  console.log("  TALENTO_HUMANO  talento@demob.t360  (institución B)");
  console.log("Código de seguimiento de prueba: T360-DEMO-0001");
}

(async () => {
  const mode = process.env.SEED_MODE ?? "demo";
  if (mode === "produccion") await production();
  else if (mode === "demo") {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) throw new Error("No se cargan datos de demostración con NODE_ENV=production (use ALLOW_DEMO_SEED=1 para un entorno de pruebas).");
    await demo();
  } else throw new Error(`SEED_MODE desconocido: ${mode}`);
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
