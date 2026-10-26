import { z } from "zod";
import { clientKey, handler, HttpError, ok, parseBody, rateLimit } from "@/lib/api";
import { PUBLIC_STATUS_LABEL } from "@/lib/workflow";
import { CATEGORY_LABEL } from "@/lib/th1";
import { trackByCode } from "@/server/campaigns";

export const POST = handler(async (req) => {
  rateLimit(`track:${clientKey(req)}`, 30, 10 * 60_000);
  const { code } = await parseBody(req, z.object({ code: z.string().max(40) }));
  const r = await trackByCode(code);
  if (!r) throw new HttpError(404, "No encontramos ese código. Revisa que esté completo, por ejemplo T360-ABCD-EFGH.");
  return ok({
    campaign: r.campaign,
    submittedOn: r.submittedOn,
    needs: r.needs.map((n) => ({
      code: n.code,
      title: n.title,
      category: CATEGORY_LABEL[n.category],
      status: PUBLIC_STATUS_LABEL[n.status],
      closed: n.status === "CERRADA",
      response: n.response,
      respondedOn: n.respondedAt ? n.respondedAt.toISOString().slice(0, 10) : null,
    })),
  });
});
