import { clientKey, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { submissionSchema, submitCampaign } from "@/server/campaigns";

/**
 * Envío de participación. En campañas anónimas NO se registra la IP ni la hora:
 * la clave de cliente se usa solo en memoria para limitar abusos y nunca se guarda.
 * (El proxy inverso de producción está configurado para no registrar esta ruta.)
 */
export const POST = handler(async (req, { params }: { params: Promise<{ slug: string }> }) => {
  rateLimit(`submit:${clientKey(req)}`, 30, 60 * 60_000);
  const input = await parseBody(req, submissionSchema);
  const session = await getSession();
  const r = await submitCampaign((await params).slug, input, session);
  return ok(r, 201);
});
