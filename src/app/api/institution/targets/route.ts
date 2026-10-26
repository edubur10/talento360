import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { targetsSchema, updateTargets } from "@/server/institution";

export const PUT = handler(async (req) => {
  const user = await requireApiUser("priority.configure");
  await updateTargets(user, await parseBody(req, targetsSchema));
  return ok({ ok: true });
});
