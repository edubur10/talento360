import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { actionSchema, addAction } from "@/server/needs";

export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser("needs.manage");
  const input = await parseBody(req, actionSchema);
  const a = await addAction(user, (await params).id, input);
  return ok({ id: a.id }, 201);
});
