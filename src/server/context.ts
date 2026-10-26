import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";

/** Institución a mostrar: la del usuario con sesión o la configurada por defecto. */
export const currentInstitution = cache(async (slug?: string) => {
  if (slug) return (await db.query.institutions.findFirst({ where: eq(schema.institutions.slug, slug) })) ?? null;
  const s = await getSession();
  if (s) return (await db.query.institutions.findFirst({ where: eq(schema.institutions.id, s.institutionId) })) ?? null;
  const def = process.env.DEFAULT_INSTITUTION_SLUG;
  if (def) {
    const i = await db.query.institutions.findFirst({ where: eq(schema.institutions.slug, def) });
    if (i) return i;
  }
  return (await db.query.institutions.findFirst()) ?? null;
});

export const cachedSession = cache(getSession);
