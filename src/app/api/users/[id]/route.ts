import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { updateUser, userUpdateSchema } from "@/server/institution";

export const PATCH = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser("users.manage");
  await updateUser(user, (await params).id, await parseBody(req, userUpdateSchema));
  return ok({ ok: true });
});
