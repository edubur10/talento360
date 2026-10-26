import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { can, type Permission } from "./permissions";
import { hashToken, newSessionToken } from "./privacy";
import { audit } from "./audit";

export const SESSION_COOKIE = "t360_session";
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
let dummyHash: string | undefined;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  institutionId: string;
  serviceId: string | null;
  mustChangePassword: boolean;
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(pw) || !/\d/.test(pw)) return "La contraseña debe combinar letras y números.";
  return null;
}

/** Verifica credenciales con bloqueo temporal tras intentos fallidos. Mensaje genérico para no revelar si el correo existe. */
export async function login(email: string, password: string) {
  const generic = "Correo o contraseña incorrectos.";
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email.trim().toLowerCase()) });
  if (!user || !user.active) {
    dummyHash ??= await bcrypt.hash("dummy-password-t360", 12);
    await bcrypt.compare(password, dummyHash); // tiempo similar exista o no el correo
    return { ok: false as const, error: generic };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false as const, error: `Cuenta bloqueada temporalmente por intentos fallidos. Intente de nuevo en ${LOCK_MINUTES} minutos.` };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db
      .update(schema.users)
      .set({
        failedLogins: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(schema.users.id, user.id));
    await audit({ institutionId: user.institutionId, actorId: null, action: "LOGIN_FALLIDO", entity: "user", entityId: user.id });
    return { ok: false as const, error: generic };
  }
  const token = newSessionToken();
  const hours = Number(process.env.SESSION_HOURS ?? 10);
  const expiresAt = new Date(Date.now() + hours * 3600_000);
  await db.insert(schema.sessions).values({
    tokenHash: hashToken(token),
    userId: user.id,
    institutionId: user.institutionId,
    expiresAt,
  });
  await db
    .update(schema.users)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id));
  // Limpieza oportunista de sesiones vencidas
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "LOGIN", entity: "user", entityId: user.id });
  return { ok: true as const, token, expiresAt, user };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.ALLOW_INSECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const s = await getSession();
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
    if (s) await audit({ institutionId: s.institutionId, actorId: s.id, actorRole: s.role, action: "LOGOUT", entity: "user", entityId: s.id });
  }
  jar.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual o null. Valida vigencia, estado activo y pertenencia a la institución. */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      institutionId: schema.users.institutionId,
      serviceId: schema.users.serviceId,
      mustChangePassword: schema.users.mustChangePassword,
      active: schema.users.active,
      sessionInstitution: schema.sessions.institutionId,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const r = rows[0];
  if (!r || !r.active || r.sessionInstitution !== r.institutionId) return null;
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    institutionId: r.institutionId,
    serviceId: r.serviceId,
    mustChangePassword: r.mustChangePassword,
  };
}

/** Para Route Handlers: exige sesión y, opcionalmente, un permiso. Lanza AuthError (401/403). */
export async function requireApiUser(permission?: Permission | Permission[]) {
  const user = await getSession();
  if (!user) throw new AuthError(401, "Debe iniciar sesión.");
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    if (!perms.some((p) => can(user.role, p))) throw new AuthError(403, "No tiene permiso para esta operación.");
  }
  return user;
}

/** Para páginas del servidor: redirige al ingreso o muestra «sin permiso». */
export async function requirePageUser(permission?: Permission | Permission[], next = "/panel") {
  const user = await getSession();
  if (!user) redirect(`/ingresar?siguiente=${encodeURIComponent(next)}`);
  if (user.mustChangePassword && !next.startsWith("/panel/cuenta")) redirect("/panel/cuenta?obligatorio=1");
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    if (!perms.some((p) => can(user.role, p))) redirect("/panel/sin-permiso");
  }
  return user;
}
