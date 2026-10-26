import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { bogotaDate, parsePeriod } from "@/lib/indicators";
import { STATUS_LABEL } from "@/lib/workflow";
import { PRIORITY_LABEL } from "@/lib/priority";
import { TH1_VERIFIED_AGAINST_OFFICIAL_TEXT } from "@/lib/th1";
import { dashboardData } from "@/server/dashboard";
import { HBarChart, ParetoChart, TrendChart } from "@/components/client/charts";
import { IndicatorRow } from "@/components/indicator-row";
import { EmptyState, PriorityBadge, fmtDate } from "@/components/ui";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const user = await requirePageUser(undefined, "/panel");
  if (!can(user.role, "dashboard.view")) {
    redirect(can(user.role, "needs.viewScoped") || can(user.role, "needs.viewAll") ? "/panel/necesidades" : "/panel/configuracion");
  }
  const period = parsePeriod(sp.desde, sp.hasta);
  const d = await dashboardData(user.institutionId, period);
  const from = bogotaDate(period.from);
  const to = bogotaDate(period.to);
  const alertsCount = d.alerts.overdueActions.length + d.alerts.overdueNeeds.length + d.alerts.urgentUnassigned.length + d.alerts.staleReceived.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tablero de talento humano</h1>
          <p className="mt-1 text-ink-muted">
            Del {fmtDate(period.from)} al {fmtDate(period.to)}. Estado de la escucha, la respuesta y la efectividad frente al estándar TH1.
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label htmlFor="desde" className="label text-xs">
              Desde
            </label>
            <input id="desde" name="desde" type="date" defaultValue={from} className="input py-2" />
          </div>
          <div>
            <label htmlFor="hasta" className="label text-xs">
              Hasta
            </label>
            <input id="hasta" name="hasta" type="date" defaultValue={to} className="input py-2" />
          </div>
          <button className="btn-primary">Aplicar</button>
          {can(user.role, "export.data") && (
            <a href={`/api/export/needs?desde=${from}&hasta=${to}`} className="btn-ghost">
              Exportar Excel
            </a>
          )}
        </form>
      </div>

      {/* Franja de cifras clave */}
      <section aria-label="Cifras clave" className="panel grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {[
          ["Participaciones", d.kpis.participations, "en campañas del periodo"],
          ["Necesidades recibidas", d.kpis.received, "en el periodo"],
          ["Abiertas", d.kpis.open, "en gestión hoy"],
          ["Urgentes abiertas", d.kpis.urgentOpen, "requieren atención prioritaria"],
          ["Acciones vencidas", d.kpis.overdueActions, `de ${d.kpis.openActions} acciones abiertas`],
          ["Días para responder", d.kpis.medianResponseDays ?? "—", "mediana del periodo"],
        ].map(([label, value, hint], idx) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-sm font-bold text-ink-muted">{label}</p>
            <p className={clsx("mt-1 font-display text-3xl font-bold tabular-nums", (idx === 3 || idx === 4) && Number(value) > 0 ? "text-risk" : "text-ink")}>{value}</p>
            <p className="text-xs text-ink-faint">{hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <section className="panel p-5" aria-labelledby="ind">
          <div className="flex items-baseline justify-between">
            <h2 id="ind" className="text-lg font-bold">
              Indicadores propuestos
            </h2>
            <Link href="/panel/indicadores" className="link text-sm">
              Fichas técnicas
            </Link>
          </div>
          <p className="text-sm text-ink-muted">Propuesta de gestión, no indicadores obligatorios del Manual. La línea vertical marca la meta.</p>
          <ul className="divide-y divide-line">
            {d.indicators.map((i) => (
              <IndicatorRow key={i.key} i={i} />
            ))}
          </ul>
        </section>

        <section className="panel p-5" aria-labelledby="alertas">
          <h2 id="alertas" className="text-lg font-bold">
            Alertas de gestión
          </h2>
          {alertsCount === 0 ? (
            <p className="mt-3 rounded-xl bg-ok-soft px-4 py-3 text-ok">Sin alertas: no hay acciones vencidas ni casos urgentes sin responsable.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.alerts.urgentUnassigned.map((n) => (
                <Alert key={`u${n.id}`} tone="risk" href={`/panel/necesidades/${n.id}`} title={`${n.code}: urgente sin responsable`} text={n.title} />
              ))}
              {d.alerts.overdueActions.map((a) => (
                <Alert key={`a${a.id}`} tone="risk" href={`/panel/necesidades/${a.needId}`} title={`Acción vencida (${a.needCode}) desde ${fmtDate(a.dueDate)}`} text={a.description} />
              ))}
              {d.alerts.overdueNeeds.map((n) => (
                <Alert key={`o${n.id}`} tone="warn" href={`/panel/necesidades/${n.id}`} title={`${n.code}: fecha de compromiso vencida sin respuesta`} text={n.title} />
              ))}
              {d.alerts.staleReceived.map((n) => (
                <Alert key={`s${n.id}`} tone="warn" href={`/panel/necesidades/${n.id}`} title={`${n.code}: más de 5 días sin clasificar`} text={n.title} />
              ))}
            </ul>
          )}
          <h3 className="mt-6 font-bold">Necesidades prioritarias abiertas</h3>
          {d.priorityOpen.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No hay necesidades críticas, altas o urgentes abiertas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {d.priorityOpen.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/panel/necesidades/${n.id}`} className="min-w-0 hover:text-brand">
                    <span className="font-bold">{n.code}</span> <span className="text-ink-muted">{n.title}</span>
                  </Link>
                  <span className="flex shrink-0 gap-1">
                    {n.isUrgent && <span className="chip bg-risk text-white">Urgente</span>}
                    <PriorityBadge priority={n.priority} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5" aria-labelledby="pareto">
          <h2 id="pareto" className="text-lg font-bold">
            ¿Dónde se concentran las necesidades?
          </h2>
          <p className="text-sm text-ink-muted">Diagrama de Pareto por temática, necesidades recibidas en el periodo.</p>
          {d.pareto.length ? <ParetoChart data={d.pareto} /> : <EmptyState title="Aún no hay necesidades en el periodo" />}
        </section>
        <section className="panel p-5" aria-labelledby="tend">
          <h2 id="tend" className="text-lg font-bold">
            Tendencia de los últimos 12 meses
          </h2>
          <p className="text-sm text-ink-muted">Necesidades recibidas frente a necesidades cerradas por mes.</p>
          <TrendChart data={d.months} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5" aria-labelledby="estados">
          <h2 id="estados" className="text-lg font-bold">
            Estado del ciclo de respuesta
          </h2>
          <HBarChart data={d.byStatus.map((s) => ({ label: STATUS_LABEL[s.key], value: s.value }))} height={340} />
        </section>
        <section className="panel p-5" aria-labelledby="calor">
          <h2 id="calor" className="text-lg font-bold">
            Matriz de calor: temática y prioridad
          </h2>
          <p className="text-sm text-ink-muted">Necesidades abiertas. Cuanto más intenso el color, más casos.</p>
          {d.heat.length === 0 ? (
            <p className="mt-4 text-ink-muted">Sin necesidades abiertas.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-bold text-ink-muted" scope="col">
                      Temática
                    </th>
                    {d.heatColumns.map((c) => (
                      <th key={c} scope="col" className="w-16 text-center font-bold text-ink-muted">
                        {c === "SIN" ? "Sin priorizar" : PRIORITY_LABEL[c]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const max = Math.max(1, ...d.heat.flatMap((r) => r.cells));
                    return d.heat.map((r) => (
                      <tr key={r.category}>
                        <th scope="row" className="pr-2 text-left font-normal">
                          {r.category}
                        </th>
                        {r.cells.map((v, i) => (
                          <td
                            key={i}
                            className={clsx("h-9 rounded-lg text-center font-bold tabular-nums", v / max > 0.8 ? "text-white" : "text-ink")}
                            style={{ background: v === 0 ? "#F1F5F2" : `rgb(${i < 2 ? "185 58 38" : "30 91 79"} / ${0.15 + (v / max) * 0.85})` }}
                          >
                            {v || ""}
                          </td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5" aria-labelledby="th1">
          <h2 id="th1" className="text-lg font-bold">
            Actividad registrada por criterio TH1
          </h2>
          <p className="text-sm text-ink-muted">
            Muestra dónde hay gestión registrada en la plataforma y dónde no (posibles brechas). No es una calificación de acreditación.
            {!TH1_VERIFIED_AGAINST_OFFICIAL_TEXT && " Denominación de criterios pendiente de verificación contra el texto oficial."}
          </p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {d.th1.map((c) => (
              <li key={c.n} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 py-2">
                <span className="font-display font-bold text-ink-muted">{c.n}</span>
                <span>{c.name}</span>
                {c.total === 0 ? (
                  <span className="chip bg-warn-soft text-warn">Sin registros</span>
                ) : (
                  <span className="whitespace-nowrap text-ink-muted">
                    {c.total} {c.total === 1 ? "caso" : "casos"}, {c.open} {c.open === 1 ? "abierto" : "abiertos"}, <strong className="text-ok">{c.verified} {c.verified === 1 ? "efectivo" : "efectivos"}</strong>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-5" aria-labelledby="serv">
          <h2 id="serv" className="text-lg font-bold">
            Necesidades por servicio
          </h2>
          <p className="text-sm text-ink-muted">Se ocultan los grupos con menos de {d.k} casos para proteger la confidencialidad.</p>
          {d.byService.length === 0 ? (
            <p className="mt-4 text-ink-muted">Sin datos en el periodo.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.byService.map((b) => {
                const max = Math.max(...d.byService.map((x) => x.value ?? 0), 1);
                return (
                  <li key={b.label}>
                    <div className="flex justify-between text-sm">
                      <span>{b.label}</span>
                      <span className="font-bold tabular-nums">{b.suppressed ? "Oculto" : b.value}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-leaf">{!b.suppressed && <div className="h-full rounded-full bg-brand" style={{ width: `${((b.value ?? 0) / max) * 100}%` }} />}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Alert({ tone, href, title, text }: { tone: "risk" | "warn"; href: string; title: string; text: string }) {
  return (
    <li>
      <Link href={href} className={clsx("block rounded-xl border-l-4 px-4 py-2.5 hover:bg-leaf", tone === "risk" ? "border-risk bg-risk-soft/60" : "border-warn bg-warn-soft/60")}>
        <p className={clsx("text-sm font-bold", tone === "risk" ? "text-risk" : "text-warn")}>{title}</p>
        <p className="truncate text-sm text-ink">{text}</p>
      </Link>
    </li>
  );
}
