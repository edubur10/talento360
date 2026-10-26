import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { campaignIsOpen } from "./campaigns";
import { listAnnouncements } from "./institution";

const { campaigns, needs } = schema;

export async function portalData(institutionId: string) {
  const camps = await db.select().from(campaigns).where(and(eq(campaigns.institutionId, institutionId), eq(campaigns.status, "ACTIVA"))).orderBy(desc(campaigns.createdAt));
  const open = camps.filter((c) => campaignIsOpen(c)).map((c) => ({ slug: c.slug, title: c.title, mode: c.mode, endsAt: c.endsAt }));
  const improvements = await db
    .select({ code: needs.code, category: needs.category, summary: needs.publicSummary, closedAt: needs.closedAt, receivedAt: needs.receivedAt })
    .from(needs)
    .where(and(eq(needs.institutionId, institutionId), eq(needs.publishImprovement, true), eq(needs.status, "CERRADA"), eq(needs.closeType, "EFECTIVIDAD_VERIFICADA")))
    .orderBy(desc(needs.closedAt))
    .limit(6);
  const news = await listAnnouncements(institutionId, 3);
  return { open, improvements, news };
}

/** Participaciones confidenciales del colaborador y el estado de sus necesidades. */
export async function myNeeds(userId: string, institutionId: string) {
  return db
    .select({ code: needs.code, title: needs.title, status: needs.status, response: needs.response, receivedAt: needs.receivedAt, category: needs.category })
    .from(needs)
    .where(and(eq(needs.institutionId, institutionId), eq(needs.reporterId, userId)))
    .orderBy(desc(needs.receivedAt));
}
