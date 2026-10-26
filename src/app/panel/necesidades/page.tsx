import Link from "next/link";
import clsx from "clsx";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_SHORT } from "@/lib/th1";
import { ESCALATION_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/workflow";
import { PRIORITY_LABEL } from "@/lib/priority";
import { listNeeds } from "@/server/needs";
import { serviceSummary } from "@/server/dashboard";
import { EmptyState, PageHeader, PriorityBadge, StatusBadge, fmtDate } from "@/components/ui";

type SP = { estado?: string; categoria?: string; prioridad?: string; q?: string; urgentes?: string; abiertas?: string };

export default async function Inbox({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requirePageUser(["needs.viewAll", "needs.viewScoped"], "/panel/necesidades");
  const scoped = !can(user.role, "needs.viewAll");
  const openDefault = sp.abiertas === undefined && !sp.estado;
  const rows = await listNeeds(user, {
    status: sp.estado,
    category: sp.categoria,
    priority: sp.prioridad,
    q: sp.q,
    urgent: sp.urgentes === "1",
    open: sp.abiertas === "1" || openDefault,
  });
  const summary = scoped && user.serviceId ? await serviceSummary(user.institutionId, user.serviceId) : null;
  const now = new Date();

  return (
    <div>
      <PageHeader
        title={scoped ? "Necesidades a mi cargo" : "Bandeja de necesidades"}
        description={
          scoped
            ? "Necesidades y acciones que te fueron asignadas. Registra avances y evidencias para que Talento Humano y Calidad puedan verificar."
            : "Toda necesidad recibida pasa por este ciclo: clasificar, analizar, priorizar, asignar, responder y verificar su efectividad."
        }
        actions={
          can(user.role, "needs.create") ? (
            <Link href="/panel/necesidades/nueva" className="btn-primary">
              Registrar necesidad
            </Link>
          ) : undefined
        }
      />

      {summary && (
        <section className="panel mb-6 p-5">
          <h2 className="font-bold">Resumen agregado de mi servicio (últimos 12 meses)</h2>
          {summary.suppressed ? (
            <p className="mt-1 text-sm text-ink-muted">Hay menos de {summary.k} necesidades registradas para tu servicio; por confidencialidad no se muestra el detalle.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {summary.rows.map((r) => (
                <li key={r.label} className="rounded-lg bg-leaf px-3 py-1.5">
                  {r.label}: <strong>{r.suppressed ? "oculto" : r.value}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form method="get" className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="q" className="label text-xs">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Código, título o descripción" className="input py-2" />
        </div>
        <div>
          <label htmlFor="estado" className="label text-xs">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={sp.estado ?? ""} className="input py-2">
            <option value="">Todos</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="categoria" className="label text-xs">
            Temática
          </label>
          <select id="categoria" name="categoria" defaultValue={sp.categoria ?? ""} className="input py-2">
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prioridad" className="label text-xs">
            Prioridad
          </label>
          <select id="prioridad" name="prioridad" defaultValue={sp.prioridad ?? ""} className="input py-2">
            <option value="">Todas</option>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="abiertas" value="1" defaultChecked={sp.abiertas === "1" || openDefault} className="h-4 w-4" />
            Solo abiertas
          </label>
          <button className="btn-primary">Filtrar</button>
        </div>
      </form>

      <p className="mb-2 text-sm text-ink-muted">
        {rows.length} {rows.length === 1 ? "necesidad" : "necesidades"}
        {rows.length === 500 ? " (se muestran las 500 más recientes; refine el filtro)" : ""}
      </p>

      {rows.length === 0 ? (
        <EmptyState title={scoped ? "No tienes necesidades asignadas" : "No hay necesidades con estos filtros"}>
          {scoped ? "Cuando Talento Humano te asigne un caso o una acción, aparecerá aquí." : "Cambia los filtros o crea una campaña para empezar a escuchar a los trabajadores."}
        </EmptyState>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-leaf text-xs text-ink-muted md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-bold">Código</th>
                <th className="px-4 py-3 font-bold">Necesidad</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Prioridad</th>
                <th className="px-4 py-3 font-bold">Responsable</th>
                <th className="px-4 py-3 font-bold">Compromiso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((n) => {
                const overdue = n.dueDate && n.dueDate < now && n.status !== "CERRADA" && n.status !== "RESPUESTA_EMITIDA" && n.status !== "PENDIENTE_EFECTIVIDAD";
                return (
                  <tr key={n.id} className="block hover:bg-leaf/60 md:table-row">
                    <td className="block px-4 pt-3 md:table-cell md:py-3">
                      <Link href={`/panel/necesidades/${n.id}`} className="font-display font-bold text-brand hover:underline">
                        {n.code}
                      </Link>
                      {n.isDemo && <span className="ml-1 text-[10px] font-bold text-warn">DEMO</span>}
                    </td>
                    <td className="block px-4 py-1 md:table-cell md:py-3">
                      <Link href={`/panel/necesidades/${n.id}`} className="font-bold hover:text-brand">
                        {n.title}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {CATEGORY_SHORT[n.category]}
                        {n.service ? `, ${n.service.name}` : ""}, recibida {fmtDate(n.receivedAt)}
                        {n.groupParentId ? ", agrupada" : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {n.isUrgent && <span className="chip bg-risk text-white">Urgente</span>}
                        {n.affectsPatientSafety && <span className="chip bg-risk-soft text-risk">Seguridad del paciente</span>}
                        {n.escalation !== "NINGUNO" && <span className="chip bg-violet-50 text-violet-800">Escalada a {ESCALATION_LABEL[n.escalation]}</span>}
                      </div>
                    </td>
                    <td className="inline-block px-4 py-1 md:table-cell md:py-3">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="inline-block px-1 py-1 md:table-cell md:px-4 md:py-3">
                      <PriorityBadge priority={n.priority} />
                    </td>
                    <td className="block px-4 py-1 text-ink-muted md:table-cell md:py-3">{n.assignedTo?.name ?? "Sin asignar"}</td>
                    <td className={clsx("block px-4 pb-3 md:table-cell md:py-3", overdue ? "font-bold text-risk" : "text-ink-muted")}>
                      {n.dueDate ? `${fmtDate(n.dueDate)}${overdue ? " (vencida)" : ""}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
