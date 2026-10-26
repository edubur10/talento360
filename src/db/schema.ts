/**
 * TALENTO 360° SALUD — Esquema de datos (Drizzle ORM / PostgreSQL)
 *
 * Principios:
 *  · Multi-institución: toda entidad operativa lleva institution_id y se consulta
 *    siempre filtrada por la institución de la sesión (ver src/lib/auth.ts).
 *  · Identificadores UUID v4 aleatorios (gen_random_uuid): no secuenciales ni con
 *    marca de tiempo, para impedir correlacionar participaciones anónimas.
 *  · Las participaciones anónimas no guardan usuario, IP ni hora exacta: solo el día.
 *  · No se almacena información clínica de pacientes.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const role = pgEnum("role", [
  "COLABORADOR",
  "LIDER_SERVICIO",
  "TALENTO_HUMANO",
  "CALIDAD",
  "SST",
  "GERENCIA",
  "AUDITOR",
  "ADMIN_TECNICO",
]);
export const campaignMode = pgEnum("campaign_mode", ["ANONIMA", "CONFIDENCIAL"]);
export const campaignStatus = pgEnum("campaign_status", ["BORRADOR", "ACTIVA", "CERRADA"]);
export const questionType = pgEnum("question_type", ["ESCALA", "UNICA", "MULTIPLE", "TEXTO", "SI_NO"]);
export const needCategory = pgEnum("need_category", [
  "CONDICIONES_TRABAJO",
  "FORMACION_COMPETENCIAS",
  "BIENESTAR_DESARROLLO",
  "CARGA_ORGANIZACION",
  "COMUNICACION",
  "CULTURA_CLIMA",
  "CICLO_VIDA_LABORAL",
  "COMPENSACION_INCENTIVOS",
  "DOCENCIA_SERVICIO",
  "OTRA",
]);
export const needOrigin = pgEnum("need_origin", ["CAMPANA", "REGISTRO_DIRECTO"]);
export const needStatus = pgEnum("need_status", [
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
]);
export const priority = pgEnum("priority", ["BAJA", "MEDIA", "ALTA", "CRITICA"]);
export const escalationChannel = pgEnum("escalation_channel", [
  "NINGUNO",
  "SST",
  "CONVIVENCIA_LABORAL",
  "SEGURIDAD_PACIENTE",
  "CONTROL_INTERNO",
]);
/** EFECTIVIDAD_VERIFICADA: cierre tras evaluación favorable. ADMINISTRATIVO: cierre sin verificar efectividad. */
export const closeType = pgEnum("close_type", ["EFECTIVIDAD_VERIFICADA", "ADMINISTRATIVO"]);
export const actionStatus = pgEnum("action_status", ["PROGRAMADA", "EN_CURSO", "COMPLETADA", "CANCELADA"]);
export const effectivenessResult = pgEnum("effectiveness_result", [
  "EFECTIVA",
  "PARCIALMENTE_EFECTIVA",
  "NO_EFECTIVA",
]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const instRef = () =>
  uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const institutions = pgTable("institutions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  nit: text("nit"),
  city: text("city"),
  slogan: text("slogan").notNull().default("Tu voz transforma nuestra institución"),
  primaryColor: text("primary_color").notNull().default("#1E5B4F"),
  accentColor: text("accent_color").notNull().default("#F2B33D"),
  /** Tamaño mínimo de grupo para publicar resultados agregados (protección frente a identificación indirecta). */
  minGroupSize: integer("min_group_size").notNull().default(5),
  /** Días calendario por defecto para responder una necesidad. */
  responseDays: integer("response_days").notNull().default(15),
  /** Pesos de la matriz de priorización: propuesta metodológica editable, NO exigencia normativa. */
  priorityWeights: jsonb("priority_weights").$type<Record<string, number>>(),
  priorityApprovedBy: text("priority_approved_by"),
  priorityApprovedAt: ts("priority_approved_at"),
  indicatorTargets: jsonb("indicator_targets").$type<Record<string, number>>(),
  needSeq: integer("need_seq").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sites = pgTable(
  "sites",
  {
    id: id(),
    institutionId: instRef(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("sites_inst_name").on(t.institutionId, t.name)],
);

export const services = pgTable(
  "services",
  {
    id: id(),
    institutionId: instRef(),
    siteId: uuid("site_id").references(() => sites.id),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("ASISTENCIAL"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("services_inst_name").on(t.institutionId, t.name)],
);

/** Modalidad de vinculación: no todas tienen los mismos derechos contractuales. */
export const employmentTypes = pgTable(
  "employment_types",
  {
    id: id(),
    institutionId: instRef(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("emp_inst_code").on(t.institutionId, t.code)],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    institutionId: instRef(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: role("role").notNull(),
    serviceId: uuid("service_id").references(() => services.id),
    employmentTypeId: uuid("employment_type_id").references(() => employmentTypes.id),
    active: boolean("active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("users_inst_role").on(t.institutionId, t.role)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    institutionId: instRef(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: id(),
    institutionId: instRef(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    mode: campaignMode("mode").notNull(),
    status: campaignStatus("status").notNull().default("BORRADOR"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    /** Trabajadores elegibles: denominador del indicador de participación. */
    eligibleCount: integer("eligible_count"),
    createdById: uuid("created_by_id").references(() => users.id),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("campaigns_inst_status").on(t.institutionId, t.status)],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    institutionId: instRef(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    section: text("section").notNull(),
    code: text("code").notNull(),
    text: text("text").notNull(),
    help: text("help"),
    type: questionType("type").notNull(),
    options: jsonb("options").$type<string[]>(),
    required: boolean("required").notNull().default(false),
    allowNA: boolean("allow_na").notNull().default(true),
    th1Criterion: integer("th1_criterion"),
    category: needCategory("category"),
    /** Lógica condicional: se muestra solo si la pregunta showIfCode tiene uno de showIfValues. */
    showIfCode: text("show_if_code"),
    showIfValues: jsonb("show_if_values").$type<string[]>(),
    /** Ramificación por modalidad de vinculación (códigos). Nulo = todas. */
    onlyForEmploymentCodes: jsonb("only_for_employment_codes").$type<string[]>(),
  },
  (t) => [uniqueIndex("questions_campaign_code").on(t.campaignId, t.code)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    institutionId: instRef(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    /** Nulo en participaciones anónimas. */
    userId: uuid("user_id").references(() => users.id),
    employmentTypeId: uuid("employment_type_id").references(() => employmentTypes.id),
    serviceId: uuid("service_id").references(() => services.id),
    /** Solo fecha, sin hora: impide la correlación temporal. */
    submittedOn: date("submitted_on", { mode: "string" }).notNull(),
    trackingCodeHash: text("tracking_code_hash").notNull().unique(),
    isDemo: boolean("is_demo").notNull().default(false),
  },
  (t) => [
    index("submissions_inst_campaign").on(t.institutionId, t.campaignId),
    uniqueIndex("submissions_campaign_user").on(t.campaignId, t.userId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: id(),
    institutionId: instRef(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<string | string[] | number | null>(),
    notApplicable: boolean("not_applicable").notNull().default(false),
  },
  (t) => [index("answers_question").on(t.questionId)],
);

export const needs = pgTable(
  "needs",
  {
    id: id(),
    institutionId: instRef(),
    code: text("code").notNull(),
    origin: needOrigin("origin").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    submissionId: uuid("submission_id").references(() => submissions.id),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    reporterId: uuid("reporter_id").references(() => users.id),
    trackingCodeHash: text("tracking_code_hash"),
    serviceId: uuid("service_id").references(() => services.id),

    title: text("title").notNull(),
    description: text("description").notNull(),
    proposal: text("proposal"),
    category: needCategory("category").notNull(),
    th1Criterion: integer("th1_criterion"),
    affectsPatientSafety: boolean("affects_patient_safety").notNull().default(false),

    analysis: text("analysis"),
    impact: text("impact"),
    scores: jsonb("scores").$type<Record<string, number>>(),
    priorityScore: doublePrecision("priority_score"),
    priority: priority("priority"),
    priorityMethod: text("priority_method"),
    priorityApprovedById: uuid("priority_approved_by_id").references(() => users.id),
    priorityApprovedAt: ts("priority_approved_at"),
    isUrgent: boolean("is_urgent").notNull().default(false),
    escalation: escalationChannel("escalation").notNull().default("NINGUNO"),

    status: needStatus("status").notNull().default("RECIBIDA"),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    dueDate: ts("due_date"),
    resourcesRequired: text("resources_required"),
    response: text("response"),
    respondedAt: ts("responded_at"),
    closedAt: ts("closed_at"),
    closeType: closeType("close_type"),
    closeJustification: text("close_justification"),
    /** Agrupación de necesidades repetidas sin perder el origen. */
    groupParentId: uuid("group_parent_id"),
    publishImprovement: boolean("publish_improvement").notNull().default(false),
    publicSummary: text("public_summary"),

    isDemo: boolean("is_demo").notNull().default(false),
    receivedAt: ts("received_at").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("needs_inst_code").on(t.institutionId, t.code),
    index("needs_inst_status").on(t.institutionId, t.status),
    index("needs_inst_category").on(t.institutionId, t.category),
    index("needs_tracking").on(t.trackingCodeHash),
  ],
);

export const needEvents = pgTable(
  "need_events",
  {
    id: id(),
    institutionId: instRef(),
    needId: uuid("need_id")
      .notNull()
      .references(() => needs.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    type: text("type").notNull(),
    fromStatus: needStatus("from_status"),
    toStatus: needStatus("to_status"),
    note: text("note"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("need_events_need").on(t.needId, t.createdAt)],
);

export const actions = pgTable(
  "actions",
  {
    id: id(),
    institutionId: instRef(),
    needId: uuid("need_id")
      .notNull()
      .references(() => needs.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    responsibleId: uuid("responsible_id").references(() => users.id),
    startDate: ts("start_date"),
    dueDate: ts("due_date").notNull(),
    verificationMeans: text("verification_means").notNull(),
    resources: text("resources"),
    status: actionStatus("status").notNull().default("PROGRAMADA"),
    evidence: text("evidence"),
    completedAt: ts("completed_at"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("actions_inst_status_due").on(t.institutionId, t.status, t.dueDate)],
);

/** Evaluación de efectividad: distinta del cierre administrativo. */
export const effectivenessReviews = pgTable(
  "effectiveness_reviews",
  {
    id: id(),
    institutionId: instRef(),
    needId: uuid("need_id")
      .notNull()
      .references(() => needs.id, { onDelete: "cascade" }),
    result: effectivenessResult("result").notNull(),
    method: text("method").notNull(),
    evidence: text("evidence").notNull(),
    notes: text("notes"),
    reviewedById: uuid("reviewed_by_id")
      .notNull()
      .references(() => users.id),
    reviewedAt: ts("reviewed_at").notNull().defaultNow(),
  },
  (t) => [index("reviews_inst_date").on(t.institutionId, t.reviewedAt)],
);

export const announcements = pgTable("announcements", {
  id: id(),
  institutionId: instRef(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  publishedAt: ts("published_at").notNull().defaultNow(),
  createdById: uuid("created_by_id").references(() => users.id),
  isDemo: boolean("is_demo").notNull().default(false),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    institutionId: uuid("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    actorRole: role("actor_role"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_inst_date").on(t.institutionId, t.createdAt)],
);

// ─── Relaciones (para consultas con `with`) ───────────────────
export const needsRelations = relations(needs, ({ one, many }) => ({
  service: one(services, { fields: [needs.serviceId], references: [services.id] }),
  assignedTo: one(users, { fields: [needs.assignedToId], references: [users.id] }),
  reporter: one(users, { fields: [needs.reporterId], references: [users.id] }),
  campaign: one(campaigns, { fields: [needs.campaignId], references: [campaigns.id] }),
  events: many(needEvents),
  actions: many(actions),
  reviews: many(effectivenessReviews),
}));
export const needEventsRelations = relations(needEvents, ({ one }) => ({
  need: one(needs, { fields: [needEvents.needId], references: [needs.id] }),
  actor: one(users, { fields: [needEvents.actorId], references: [users.id] }),
}));
export const actionsRelations = relations(actions, ({ one }) => ({
  need: one(needs, { fields: [actions.needId], references: [needs.id] }),
  responsible: one(users, { fields: [actions.responsibleId], references: [users.id] }),
}));
export const reviewsRelations = relations(effectivenessReviews, ({ one }) => ({
  need: one(needs, { fields: [effectivenessReviews.needId], references: [needs.id] }),
  reviewedBy: one(users, { fields: [effectivenessReviews.reviewedById], references: [users.id] }),
}));
export const campaignsRelations = relations(campaigns, ({ many }) => ({
  questions: many(questions),
  submissions: many(submissions),
}));
export const questionsRelations = relations(questions, ({ one }) => ({
  campaign: one(campaigns, { fields: [questions.campaignId], references: [campaigns.id] }),
}));
export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [submissions.campaignId], references: [campaigns.id] }),
  answers: many(answers),
}));
export const answersRelations = relations(answers, ({ one }) => ({
  submission: one(submissions, { fields: [answers.submissionId], references: [submissions.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));
export const usersRelations = relations(users, ({ one }) => ({
  service: one(services, { fields: [users.serviceId], references: [services.id] }),
  institution: one(institutions, { fields: [users.institutionId], references: [institutions.id] }),
}));
export const servicesRelations = relations(services, ({ one }) => ({
  site: one(sites, { fields: [services.siteId], references: [sites.id] }),
}));

export type Role = (typeof role.enumValues)[number];
export type NeedStatus = (typeof needStatus.enumValues)[number];
export type NeedCategory = (typeof needCategory.enumValues)[number];
export type Priority = (typeof priority.enumValues)[number];
export type Need = typeof needs.$inferSelect;
export type Action = typeof actions.$inferSelect;
export type Review = typeof effectivenessReviews.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Institution = typeof institutions.$inferSelect;
export type User = typeof users.$inferSelect;
