import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { campaignUpdateSchema, updateCampaign } from "@/server/campaigns";

export const PATCH = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser("campaigns.manage");
  const input = await parseBody(req, campaignUpdateSchema);
  return ok(await updateCampaign(user, (await params).id, input));
});
