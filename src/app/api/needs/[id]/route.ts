import { handler, HttpError, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getNeed } from "@/server/needs";

export const GET = handler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser(["needs.viewAll", "needs.viewScoped"]);
  const n = await getNeed(user, (await params).id);
  if (!n) throw new HttpError(404, "Necesidad no encontrada.");
  return ok({ need: n });
});
