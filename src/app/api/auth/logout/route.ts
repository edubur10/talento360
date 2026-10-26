import { handler, ok } from "@/lib/api";
import { logout } from "@/lib/auth";

export const POST = handler(async () => {
  await logout();
  return ok({ ok: true });
});
