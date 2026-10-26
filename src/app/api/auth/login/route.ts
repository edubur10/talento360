import { z } from "zod";
import { clientKey, handler, HttpError, ok, parseBody, rateLimit } from "@/lib/api";
import { login, setSessionCookie } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().min(3).max(200), password: z.string().min(1).max(200) });

export const POST = handler(async (req) => {
  rateLimit(`login:${clientKey(req)}`, 20, 10 * 60_000);
  const { email, password } = await parseBody(req, schema);
  const r = await login(email, password);
  if (!r.ok) throw new HttpError(401, r.error);
  await setSessionCookie(r.token, r.expiresAt);
  return ok({ ok: true, role: r.user.role, mustChangePassword: r.user.mustChangePassword });
});
