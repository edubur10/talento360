import { requirePageUser } from "@/lib/auth";
import { ROLE_LABEL, permissionsOf } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/client/settings";

export default async function Account({ searchParams }: { searchParams: Promise<{ obligatorio?: string }> }) {
  const { obligatorio } = await searchParams;
  const user = await requirePageUser(undefined, "/panel/cuenta");
  return (
    <div className="space-y-6">
      <PageHeader title="Mi cuenta" description={`${user.name}, ${ROLE_LABEL[user.role]}.`} />
      {(obligatorio || user.mustChangePassword) && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-warn">
          Por seguridad, cambie su contraseña temporal antes de continuar.
        </p>
      )}
      <section className="panel p-5">
        <h2 className="mb-3 text-lg font-bold">Cambiar contraseña</h2>
        <PasswordForm forced={!!(obligatorio || user.mustChangePassword)} />
      </section>
      <section className="panel p-5">
        <h2 className="text-lg font-bold">Permisos de su rol</h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {permissionsOf(user.role).map((p) => (
            <li key={p} className="rounded-lg bg-leaf px-2.5 py-1 font-mono text-xs">
              {p}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
