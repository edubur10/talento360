import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { FICHAS, parsePeriod } from "@/lib/indicators";
import { dashboardData } from "@/server/dashboard";
import { PageHeader } from "@/components/ui";
import { IndicatorRow } from "@/components/indicator-row";
import { TargetsForm } from "@/components/client/settings";

export default async function Indicators() {
  const user = await requirePageUser("dashboard.view", "/panel/indicadores");
  const inst = (await db.query.institutions.findFirst({ where: eq(schema.institutions.id, user.institutionId) }))!;
  const d = await dashboardData(user.institutionId, parsePeriod(null, null));
  const targets = Object.fromEntries(FICHAS.map((f) => [f.key, inst.indicatorTargets?.[f.key] ?? f.defaultTarget]));
  return (
    <div>
      <PageHeader
        title="Indicadores y fichas técnicas"
        description="Seis indicadores PROPUESTOS para gestionar el TH1. No son indicadores obligatorios del Manual de Acreditación; la institución puede adoptarlos, ajustarlos o reemplazarlos. Cuando el denominador es cero se muestra «No calculable»."
      />
      <section className="panel mb-6 p-5">
        <h2 className="text-lg font-bold">Resultado del año en curso</h2>
        <ul className="divide-y divide-line">
          {d.indicators.map((i) => (
            <IndicatorRow key={i.key} i={i} />
          ))}
        </ul>
      </section>
      {can(user.role, "priority.configure") && (
        <section className="panel mb-6 p-5">
          <h2 className="mb-3 text-lg font-bold">Metas institucionales (%)</h2>
          <TargetsForm fichas={FICHAS.map((f) => ({ key: f.key, name: f.name }))} initial={targets} />
        </section>
      )}
      <div className="space-y-4">
        {FICHAS.map((f) => (
          <article key={f.key} className="panel p-5">
            <h2 className="text-lg font-bold">{f.name}</h2>
            <p className="mt-1 rounded-lg bg-leaf px-3 py-2 font-bold">{f.formula}</p>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
              {[
                ["Numerador", f.numerator],
                ["Denominador", f.denominator],
                ["Fecha de corte", f.cutoff],
                ["Datos faltantes", f.missingData],
                ["Exclusiones", f.exclusions],
                ["Fuente", f.source],
                ["Periodicidad", f.periodicity],
                ["Responsable", f.responsible],
                ["Meta propuesta", `${f.defaultTarget} % (vigente: ${targets[f.key]} %)`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-bold text-ink-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
