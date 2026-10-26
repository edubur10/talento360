import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createUser, listUsers, userCreateSchema } from "@/server/institution";

export const GET = handler(async () => {
  const user = await requireApiUser("users.manage");
  return ok({ users: await listUsers(user.institutionId) });
});

export const POST = handler(async (req) => {
  const user = await requireApiUser("users.manage");
  const u = await createUser(user, await parseBody(req, userCreateSchema));
  return ok(u, 201);
});
