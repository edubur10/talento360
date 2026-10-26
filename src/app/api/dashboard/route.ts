import { handler, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { parsePeriod } from "@/lib/indicators";
import { dashboardData } from "@/server/dashboard";

export const GET = handler(async (req) => {
  const user = await requireApiUser("dashboard.view");
  const p = new URL(req.url).searchParams;
  const d = await dashboardData(user.institutionId, parsePeriod(p.get("desde"), p.get("hasta")));
  const { institution, ...rest } = d;
  return ok({ ...rest, institution: { name: institution.name } });
});
