import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { hashPassword, validatePasswordStrength, type SessionUser } from "@/lib/auth";
import { HttpError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { PRIORITY_CRITERIA } from "@/lib/priority";
import { FICHAS } from "@/lib/indicators";

const { institutions, sites, services, employmentTypes, users, announcements, auditLogs } = schema;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");

export const institutionSchema = z.object({
  name: z.string().trim().min(3).max(200),
  shortName: z.string().trim().min(2).max(60),
  nit: z.string().trim().max(30).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  slogan: z.string().trim().min(3).max(140),
  primaryColor: hex,
  accentColor: hex,
  minGroupSize: z.number().int().min(3, "El umbral mínimo recomendado es 3").max(50),
  responseDays: z.number().int().min(1).max(120),
});

export async function updateInstitution(user: SessionUser, input: z.infer<typeof institutionSchema>) {
  if (!can(user.role, "institution.configure")) throw new HttpError(403, "No tiene permiso para configurar la institución.");
  await db.update(institutions).set({ ...input, updatedAt: new Date() }).where(eq(institutions.id, user.institutionId));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "INSTITUCION_CONFIGURADA", entity: "institution", entityId: user.institutionId, detail: input });
}

export const catalogSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("site"), name: z.string().trim().min(2).max(120) }),
  z.object({ kind: z.literal("service"), name: z.string().trim().min(2).max(120), siteId: z.uuid().nullable().optional(), serviceKind: z.enum(["ASISTENCIAL", "ADMINISTRATIVO", "APOYO"]) }),
  z.object({ kind: z.literal("employment"), name: z.string().trim().min(2).max(120), code: z.string().trim().regex(/^[A-Z_]{3,30}$/, "Código en mayúsculas, sin espacios") }),
]);

export async function addCatalogItem(user: SessionUser, input: z.infer<typeof catalogSchema>) {
  if (!can(user.role, "institution.configure")) throw new HttpError(403, "No tiene permiso para configurar la institución.");
  try {
    if (input.kind === "site") await db.insert(sites).values({ institutionId: user.institutionId, name: input.name });
    if (input.kind === "service") {
      if (input.siteId) {
        const s = await db.query.sites.findFirst({ where: and(eq(sites.id, input.siteId), eq(sites.institutionId, user.institutionId)) });
        if (!s) throw new HttpError(400, "Sede inválida.");
      }
      await db.insert(services).values({ institutionId: user.institutionId, name: input.name, siteId: input.siteId ?? null, kind: input.serviceKind });
    }
    if (input.kind === "employment") await db.insert(employmentTypes).values({ institutionId: user.institutionId, name: input.name, code: input.code });
  } catch (e: unknown) {
    if (e instanceof HttpError) throw e;
    if (String((e as { cause?: { code?: string } })?.cause?.code ?? (e as { code?: string }).code) === "23505") throw new HttpError(409, "Ya existe un elemento con ese nombre o código.");
    throw e;
  }
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "CATALOGO_AGREGADO", entity: input.kind, detail: { name: input.name } });
}

export async function toggleCatalogItem(user: SessionUser, kind: "site" | "service" | "employment", id: string, active: boolean) {
  if (!can(user.role, "institution.configure")) throw new HttpError(403, "No tiene permiso para configurar la institución.");
  const table = kind === "site" ? sites : kind === "service" ? services : employmentTypes;
  const r = await db.update(table).set({ active }).where(and(eq(table.id, id), eq(table.institutionId, user.institutionId))).returning({ id: table.id });
  if (!r.length) throw new HttpError(404, "Elemento no encontrado.");
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: active ? "CATALOGO_ACTIVADO" : "CATALOGO_DESACTIVADO", entity: kind, entityId: id });
}

export async function getCatalogs(institutionId: string) {
  const [s, sv, et] = await Promise.all([
    db.select().from(sites).where(eq(sites.institutionId, institutionId)).orderBy(asc(sites.name)),
    db.select().from(services).where(eq(services.institutionId, institutionId)).orderBy(asc(services.name)),
    db.select().from(employmentTypes).where(eq(employmentTypes.institutionId, institutionId)).orderBy(asc(employmentTypes.name)),
  ]);
  return { sites: s, services: sv, employmentTypes: et };
}

// ─── Metodología de priorización y metas ────────────────────────
export const weightsSchema = z.object({
  weights: z.object(Object.fromEntries(PRIORITY_CRITERIA.map((c) => [c.key, z.number().int().min(0).max(100)])) as Record<string, z.ZodNumber>),
  approve: z.boolean(),
});
export async function updateWeights(user: SessionUser, input: z.infer<typeof weightsSchema>) {
  if (!can(user.role, "priority.configure")) throw new HttpError(403, "No tiene permiso para modificar la metodología de priorización.");
  const total = Object.values(input.weights).reduce((s, x) => s + x, 0);
  if (total !== 100) throw new HttpError(400, `Los pesos deben sumar 100 (suman ${total}).`);
  await db
    .update(institutions)
    .set({
      priorityWeights: input.weights,
      priorityApprovedBy: input.approve ? `${user.name} (${user.role})` : null,
      priorityApprovedAt: input.approve ? new Date() : null,
    })
    .where(eq(institutions.id, user.institutionId));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: input.approve ? "METODOLOGIA_PRIORIZACION_APROBADA" : "METODOLOGIA_PRIORIZACION_EDITADA", entity: "institution", entityId: user.institutionId, detail: input.weights });
}

export const targetsSchema = z.object(Object.fromEntries(FICHAS.map((f) => [f.key, z.number().min(0).max(100)])) as Record<string, z.ZodNumber>);
export async function updateTargets(user: SessionUser, input: Record<string, number>) {
  if (!can(user.role, "priority.configure")) throw new HttpError(403, "No tiene permiso para modificar metas.");
  await db.update(institutions).set({ indicatorTargets: input }).where(eq(institutions.id, user.institutionId));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "METAS_INDICADORES_ACTUALIZADAS", entity: "institution", entityId: user.institutionId, detail: input });
}

// ─── Usuarios ───────────────────────────────────────────────────
export const userCreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.email().transform((s) => s.toLowerCase()),
  role: z.enum(schema.role.enumValues),
  serviceId: z.uuid().nullable().optional(),
  tempPassword: z.string().min(12).max(200),
});

export async function createUser(user: SessionUser, input: z.infer<typeof userCreateSchema>) {
  if (!can(user.role, "users.manage")) throw new HttpError(403, "No tiene permiso para administrar usuarios.");
  const weak = validatePasswordStrength(input.tempPassword);
  if (weak) throw new HttpError(400, weak);
  if (input.serviceId) {
    const s = await db.query.services.findFirst({ where: and(eq(services.id, input.serviceId), eq(services.institutionId, user.institutionId)) });
    if (!s) throw new HttpError(400, "Servicio inválido.");
  }
  const exists = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (exists) throw new HttpError(409, "Ya existe un usuario con ese correo.");
  const [u] = await db
    .insert(users)
    .values({
      institutionId: user.institutionId,
      name: input.name,
      email: input.email,
      role: input.role,
      serviceId: input.serviceId ?? null,
      passwordHash: await hashPassword(input.tempPassword),
      mustChangePassword: true,
    })
    .returning({ id: users.id });
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "USUARIO_CREADO", entity: "user", entityId: u.id, detail: { role: input.role } });
  return u;
}

export const userUpdateSchema = z.object({
  role: z.enum(schema.role.enumValues).optional(),
  active: z.boolean().optional(),
  serviceId: z.uuid().nullable().optional(),
  resetPassword: z.string().min(12).max(200).optional(),
});

export async function updateUser(user: SessionUser, id: string, input: z.infer<typeof userUpdateSchema>) {
  if (!can(user.role, "users.manage")) throw new HttpError(403, "No tiene permiso para administrar usuarios.");
  const target = await db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.institutionId, user.institutionId)) });
  if (!target) throw new HttpError(404, "Usuario no encontrado.");
  if (target.id === user.id && (input.active === false || (input.role && input.role !== user.role))) {
    throw new HttpError(400, "No puede desactivarse ni cambiarse el rol a sí mismo.");
  }
  const patch: Partial<typeof users.$inferInsert> = {};
  if (input.role) patch.role = input.role;
  if (input.active !== undefined) patch.active = input.active;
  if (input.serviceId !== undefined) patch.serviceId = input.serviceId;
  if (input.resetPassword) {
    const weak = validatePasswordStrength(input.resetPassword);
    if (weak) throw new HttpError(400, weak);
    patch.passwordHash = await hashPassword(input.resetPassword);
    patch.mustChangePassword = true;
  }
  await db.update(users).set(patch).where(eq(users.id, id));
  if (input.active === false || input.resetPassword || input.role) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "USUARIO_ACTUALIZADO", entity: "user", entityId: id, detail: { role: input.role, active: input.active, passwordReset: !!input.resetPassword } });
}

export async function listUsers(institutionId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, serviceId: users.serviceId, lastLoginAt: users.lastLoginAt, mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.institutionId, institutionId))
    .orderBy(asc(users.name));
}

export async function changeOwnPassword(user: SessionUser, current: string, next: string) {
  const bcrypt = (await import("bcryptjs")).default;
  const u = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!u || !(await bcrypt.compare(current, u.passwordHash))) throw new HttpError(400, "La contraseña actual no es correcta.");
  const weak = validatePasswordStrength(next);
  if (weak) throw new HttpError(400, weak);
  if (current === next) throw new HttpError(400, "La nueva contraseña debe ser diferente.");
  await db.update(users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(users.id, user.id));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "CONTRASENA_CAMBIADA", entity: "user", entityId: user.id });
}

// ─── Comunicados ────────────────────────────────────────────────
export const announcementSchema = z.object({ title: z.string().trim().min(3).max(140), body: z.string().trim().min(10).max(3000) });
export async function createAnnouncement(user: SessionUser, input: z.infer<typeof announcementSchema>) {
  if (!can(user.role, "announcements.manage")) throw new HttpError(403, "No tiene permiso para publicar comunicados.");
  const [a] = await db.insert(announcements).values({ institutionId: user.institutionId, ...input, createdById: user.id }).returning({ id: announcements.id });
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "COMUNICADO_PUBLICADO", entity: "announcement", entityId: a.id });
  return a;
}
export async function listAnnouncements(institutionId: string, limit = 5) {
  return db.select().from(announcements).where(eq(announcements.institutionId, institutionId)).orderBy(desc(announcements.publishedAt)).limit(limit);
}

export async function listAudit(user: SessionUser, limit = 300) {
  if (!can(user.role, "audit.view")) throw new HttpError(403, "No tiene permiso para ver la auditoría.");
  return db
    .select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, actorRole: auditLogs.actorRole, actorName: users.name, createdAt: auditLogs.createdAt, detail: auditLogs.detail })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(eq(auditLogs.institutionId, user.institutionId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
