import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { applyOperation, operationSchema } from "@/server/needs";

export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser(["needs.viewAll", "needs.viewScoped"]);
  const input = await parseBody(req, operationSchema);
  const r = await applyOperation(user, (await params).id, input);
  return ok(r);
});
