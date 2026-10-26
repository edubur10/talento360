import { handler, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listAudit } from "@/server/institution";

export const GET = handler(async () => {
  const user = await requireApiUser("audit.view");
  return ok({ entries: await listAudit(user) });
});
