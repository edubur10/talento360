import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { actionUpdateSchema, updateAction } from "@/server/needs";

export const PATCH = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser(["needs.manage", "actions.updateOwn"]);
  const input = await parseBody(req, actionUpdateSchema);
  return ok(await updateAction(user, (await params).id, input));
});
