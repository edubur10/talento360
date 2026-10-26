import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { institutionSchema, updateInstitution } from "@/server/institution";

export const PATCH = handler(async (req) => {
  const user = await requireApiUser("institution.configure");
  await updateInstitution(user, await parseBody(req, institutionSchema));
  return ok({ ok: true });
});
