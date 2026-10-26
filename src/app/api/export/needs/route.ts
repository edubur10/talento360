import { handler } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth";
import { parsePeriod } from "@/lib/indicators";
import { buildNeedsWorkbook } from "@/server/export";

export const GET = handler(async (req) => {
  const user = await requireApiUser("export.data");
  const p = new URL(req.url).searchParams;
  const period = parsePeriod(p.get("desde"), p.get("hasta"));
  const buf = await buildNeedsWorkbook(user, period);
  await audit({ institutionId: user.institutionId, actorId: user.id, actorRole: user.role, action: "EXPORTACION_EXCEL", entity: "needs", detail: { from: period.from, to: period.to } });
  const name = `talento360-necesidades-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
});
