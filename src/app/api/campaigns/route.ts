import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { campaignCreateSchema, createCampaign, listCampaigns } from "@/server/campaigns";

export const GET = handler(async () => {
  const user = await requireApiUser(["campaigns.manage", "campaigns.viewResults"]);
  return ok({ campaigns: await listCampaigns(user.institutionId) });
});

export const POST = handler(async (req) => {
  const user = await requireApiUser("campaigns.manage");
  const input = await parseBody(req, campaignCreateSchema);
  const c = await createCampaign(user, input);
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  return ok({ id: c.id, slug: c.slug, link: `${base}/c/${c.slug}` }, 201);
});
