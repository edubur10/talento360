import { handler, ok, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { announcementSchema, createAnnouncement } from "@/server/institution";

export const POST = handler(async (req) => {
  const user = await requireApiUser("announcements.manage");
  return ok(await createAnnouncement(user, await parseBody(req, announcementSchema)), 201);
});
