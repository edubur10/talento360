import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createDirectNeed, directNeedSchema, listNeeds } from "@/server/needs";

export const GET = handler(async (req) => {
  const user = await requireApiUser(["needs.viewAll", "needs.viewScoped"]);
  const p = new URL(req.url).searchParams;
  const rows = await listNeeds(user, {
    status: p.get("estado") ?? undefined,
    category: p.get("categoria") ?? undefined,
    priority: p.get("prioridad") ?? undefined,
    urgent: p.get("urgentes") === "1",
    open: p.get("abiertas") === "1",
    q: p.get("q") ?? undefined,
  });
  return ok({ needs: rows });
});

export const POST = handler(async (req) => {
  const user = await requireApiUser("needs.create");
  const input = await parseBody(req, directNeedSchema);
  const n = await createDirectNeed(user, input);
  return ok(n, 201);
});
