import { requirePageUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { getCatalogs, listUsers } from "@/server/institution";
import { PageHeader, fmtDateTime } from "@/components/ui";
import { UserCreateForm, UserRowActions } from "@/components/client/settings";

export default async function Users() {
  const user = await requirePageUser("users.manage", "/panel/usuarios");
  const [rows, cat] = await Promise.all([listUsers(user.institutionId), getCatalogs(user.institutionId)]);
  const roles = Object.entries(ROLE_LABEL) as [string, string][];
  const svc = new Map(cat.services.map((s) => [s.id, s.name]));
  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios y roles" description="Principio de mínimo privilegio: cada persona ve solo lo que su rol requiere. El administrador técnico no tiene acceso a necesidades ni respuestas." />
      <section className="panel p-5">
        <h2 className="mb-3 text-lg font-bold">Crear usuario</h2>
        <UserCreateForm roles={roles} services={cat.services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} />
      </section>
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-leaf text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3">Persona</th>
              <th className="px-4 py-3">Rol actual</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Último ingreso</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className={u.active ? "" : "text-ink-faint"}>
                <td className="px-4 py-3">
                  <p className="font-bold">{u.name}</p>
                  <p className="text-xs">{u.email}</p>
                  {!u.active && <span className="chip bg-slate-100 text-slate-600">Inactivo</span>}
                  {u.mustChangePassword && u.active && <span className="chip bg-warn-soft text-warn">Debe cambiar contraseña</span>}
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">{u.serviceId ? svc.get(u.serviceId) : "—"}</td>
                <td className="px-4 py-3">{fmtDateTime(u.lastLoginAt)}</td>
                <td className="px-4 py-3">
                  <UserRowActions id={u.id} active={u.active} role={u.role} roles={roles} self={u.id === user.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
