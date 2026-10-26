import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { updateWeights, weightsSchema } from "@/server/institution";

export const PUT = handler(async (req) => {
  const user = await requireApiUser("priority.configure");
  await updateWeights(user, await parseBody(req, weightsSchema));
  return ok({ ok: true });
});
