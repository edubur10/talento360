import { handler, HttpError, ok } from "@/lib/api";
import { getPublicCampaign } from "@/server/campaigns";

export const GET = handler(async (_req, { params }: { params: Promise<{ slug: string }> }) => {
  const r = await getPublicCampaign((await params).slug);
  if (!r) throw new HttpError(404, "Campaña no encontrada.");
  const { institution, ...rest } = r;
  return ok({ ...rest, institution: { name: institution.name, shortName: institution.shortName } });
});
