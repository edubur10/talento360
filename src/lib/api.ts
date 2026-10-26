import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "./auth";
import { WorkflowError } from "./workflow";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Protección CSRF adicional a la cookie SameSite=Lax: las peticiones que
 * modifican datos deben venir del mismo origen.
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // clientes no navegadores (pruebas, integraciones) no envían Origin
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new HttpError(403, "Origen no permitido.");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(403, "Origen no permitido.");
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Cuerpo de la petición inválido.");
  }
  return schema.parse(json);
}

/** Envuelve un handler: traduce errores conocidos a respuestas JSON sin filtrar detalles internos. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof AuthError || e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      if (e instanceof WorkflowError) return NextResponse.json({ error: e.message }, { status: 409 });
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return NextResponse.json(
          { error: `Dato inválido${first?.path?.length ? ` en «${first.path.join(".")}»` : ""}: ${first?.message ?? ""}`, issues: e.issues },
          { status: 400 },
        );
      }
      console.error("[api] error no controlado", e);
      return NextResponse.json({ error: "Ocurrió un error interno. Intente de nuevo." }, { status: 500 });
    }
  };
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Límite de frecuencia simple en memoria (por proceso). Para varios servidores, usar Redis. */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  b.n++;
  if (b.n > max) throw new HttpError(429, "Demasiadas solicitudes. Espere un momento e intente de nuevo.");
}

/** Clave de cliente para el límite de frecuencia: se usa solo en memoria, nunca se almacena. */
export function clientKey(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
}
