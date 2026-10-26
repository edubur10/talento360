import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { addCatalogItem, catalogSchema, toggleCatalogItem } from "@/server/institution";

export const POST = handler(async (req) => {
  const user = await requireApiUser("institution.configure");
  await addCatalogItem(user, await parseBody(req, catalogSchema));
  return ok({ ok: true }, 201);
});

export const PATCH = handler(async (req) => {
  const user = await requireApiUser("institution.configure");
  const { kind, id, active } = await parseBody(req, z.object({ kind: z.enum(["site", "service", "employment"]), id: z.uuid(), active: z.boolean() }));
  await toggleCatalogItem(user, kind, id, active);
  return ok({ ok: true });
});
