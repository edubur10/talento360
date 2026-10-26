import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { changeOwnPassword } from "@/server/institution";

const schema = z.object({ current: z.string().min(1).max(200), next: z.string().min(1).max(200) });

export const POST = handler(async (req) => {
  const user = await requireApiUser();
  const { current, next } = await parseBody(req, schema);
  await changeOwnPassword(user, current, next);
  return ok({ ok: true });
});
