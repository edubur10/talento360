import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { SECTIONS } from "@/lib/instrument";
import { campaignResults } from "@/server/campaigns";
import { PageHeader, fmtDate } from "@/components/ui";
import { CampaignControls, CopyLink } from "@/components/client/campaign-admin";
import { ScaleDistribution } from "@/components/client/charts";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["campaigns.manage", "campaigns.viewResults"], `/panel/campanas/${id}`);
  const r = can(user.role, "campaigns.viewResults") ? await campaignResults(user, id) : null;
  if (!r) notFound();
  const c = r.campaign;
  const h = await headers();
  const base = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${base}/c/${c.slug}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#14382F", light: "#FFFFFF" }, errorCorrectionLevel: "M" });
  const manage = can(user.role, "campaigns.manage");
  const sections = [...new Set(r.questions.map((q) => q.section))];

  return (
    <div>
      <Link href="/panel/campanas" className="text-sm font-bold text-brand">
        Volver a campañas
      </Link>
      <div className="mt-3">
        <PageHeader
          title={c.title}
          description={`${c.mode === "ANONIMA" ? "Anónima" : "Confidencial"}. Estado: ${c.status === "ACTIVA" ? "activa" : c.status === "BORRADOR" ? "borrador" : "cerrada"}. ${c.endsAt ? `Cierra el ${fmtDate(c.endsAt)}.` : ""}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel space-y-4 p-5">
          <h2 className="text-lg font-bold">Compartir con los trabajadores</h2>
          <CopyLink url={url} />
          <p className="text-sm text-ink-muted">Comparta el enlace por WhatsApp institucional o correo, e imprima el código QR para carteleras y salas de descanso.</p>
          {manage && <CampaignControls id={c.id} status={c.status} eligibleCount={c.eligibleCount} />}
          {c.status === "BORRADOR" && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">La campaña está en borrador: el enlace muestra que aún no recibe respuestas hasta que la active.</p>}
        </section>
        <section className="panel flex flex-col items-center p-5 text-center">
          <h2 className="text-lg font-bold">Código QR</h2>
          <div className="mt-3 w-56 max-w-full" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`Código QR que abre ${url}`} />
          <a href={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`} download={`qr-${c.slug}.svg`} className="btn-ghost mt-3 text-sm">
            Descargar QR
          </a>
        </section>
      </div>

      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Resultados agregados</h2>
          <p className="text-sm text-ink-muted">
            {r.total} participaciones{c.eligibleCount ? ` de ${c.eligibleCount} elegibles (${Math.round((r.total / c.eligibleCount) * 100)} %)` : ""}. Umbral de confidencialidad: {r.k}.
          </p>
        </div>
        {r.suppressed ? (
          <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-5 py-6 text-ink-muted">
            Los resultados se mostrarán cuando haya al menos {r.k} participaciones, para proteger la confidencialidad de quienes respondieron.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {sections.map((s) => (
              <div key={s} className="panel p-5">
                <h3 className="font-bold">
                  {s}. {SECTIONS[s]?.title}
                </h3>
                <ul className="mt-3 divide-y divide-line">
                  {r.questions
                    .filter((q) => q.section === s)
                    .map((q) => (
                      <li key={q.code} className="py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="max-w-2xl">{q.text}</p>
                          {!q.hidden && "avg" in q && (
                            <p className="text-sm">
                              Promedio <strong className="font-display text-lg">{q.avg}</strong>
                              <span className="ml-3 text-ink-muted">{q.favorable} % {q.inverse ? "sin cansancio frecuente" : "favorable"}</span>
                            </p>
                          )}
                        </div>
                        {q.hidden ? (
                          <p className="mt-1 text-sm text-ink-faint">Menos de {r.k} respuestas: oculto por confidencialidad.</p>
                        ) : "dist" in q ? (
                          <div className="mt-2">
                            <ScaleDistribution dist={q.dist} />
                            <p className="mt-1 text-xs text-ink-faint">
                              {q.answered} respuestas, {q.na} «No aplica»
                            </p>
                          </div>
                        ) : "options" in q ? (
                          <ul className="mt-2 space-y-1">
                            {q.options.map((o) => (
                              <li key={o.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                                <div>
                                  <span>{o.label}</span>
                                  <div className="mt-0.5 h-1.5 rounded-full bg-leaf">
                                    {o.value != null && <div className="h-full rounded-full bg-brand" style={{ width: `${(o.value / q.answered) * 100}%` }} />}
                                  </div>
                                </div>
                                <span className="font-bold tabular-nums">{o.value ?? <span className="text-xs font-normal text-ink-faint">menos de {r.k}</span>}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {r.openAnswers.length > 0 && (
              <div className="panel p-5">
                <h3 className="font-bold">Respuestas abiertas</h3>
                <p className="text-sm text-ink-muted">Se muestran en orden aleatorio y sin vínculo con las demás respuestas de la misma persona. Úselas para registrar necesidades en la bandeja.</p>
                {r.openAnswers.map((o) => (
                  <div key={o.code} className="mt-4">
                    <p className="font-bold">{o.text}</p>
                    {o.answers.length === 0 ? (
                      <p className="text-sm text-ink-muted">Sin respuestas.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {o.answers.map((a, i) => (
                          <li key={i} className="rounded-lg bg-leaf px-3 py-2 text-sm">
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
