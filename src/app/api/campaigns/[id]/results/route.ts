import { handler, HttpError, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { campaignResults } from "@/server/campaigns";

export const GET = handler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser("campaigns.viewResults");
  const r = await campaignResults(user, (await params).id);
  if (!r) throw new HttpError(404, "Campaña no encontrada.");
  return ok(r);
});
