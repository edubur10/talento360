import { requirePageUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { listAudit } from "@/server/institution";
import { PageHeader, fmtDateTime } from "@/components/ui";

export default async function Audit() {
  const user = await requirePageUser("audit.view", "/panel/auditoria");
  const rows = await listAudit(user);
  return (
    <div>
      <PageHeader title="Registro de auditoría" description="Quién hizo qué y cuándo. Las participaciones anónimas se registran sin identidad. Se muestran los 300 eventos más recientes." />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-leaf text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2.5">{fmtDateTime(r.createdAt)}</td>
                <td className="px-4 py-2.5 font-bold">{r.action.replace(/_/g, " ").toLowerCase()}</td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {r.entity}
                  {r.entityId ? <span className="ml-1 font-mono text-xs">{r.entityId.slice(0, 8)}</span> : null}
                </td>
                <td className="px-4 py-2.5">{r.actorName ? `${r.actorName} (${r.actorRole ? ROLE_LABEL[r.actorRole] : ""})` : <span className="text-ink-muted">Participante anónimo o sistema</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
