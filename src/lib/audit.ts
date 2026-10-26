import "server-only";
import { db, schema, type Tx } from "@/db";
import type { Role } from "@/db/schema";

/**
 * Registro de auditoría. No guarda contenido de respuestas ni identidad de
 * participantes anónimos: solo quién (personal autenticado) hizo qué y cuándo.
 */
export async function audit(
  entry: {
    institutionId: string | null;
    actorId: string | null;
    actorRole?: Role | null;
    action: string;
    entity: string;
    entityId?: string | null;
    detail?: Record<string, unknown>;
  },
  tx?: Tx,
) {
  await (tx ?? db).insert(schema.auditLogs).values({
    institutionId: entry.institutionId,
    actorId: entry.actorId,
    actorRole: entry.actorRole ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    detail: entry.detail ?? null,
  });
}
