import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SimpleShell } from "@/components/simple-shell";
import { fmtDate } from "@/components/ui";
import { LogoutButton } from "@/components/client/logout-button";
import { cachedSession } from "@/server/context";
import { myNeeds, portalData } from "@/server/portal";
import { PUBLIC_STATUS_LABEL } from "@/lib/workflow";
import { CATEGORY_LABEL } from "@/lib/th1";

export const metadata: Metadata = { title: "Mi espacio" };

export default async function MySpace() {
  const user = await cachedSession();
  if (!user) redirect("/ingresar?siguiente=/mi-espacio");
  const [list, portal] = await Promise.all([myNeeds(user.id, user.institutionId), portalData(user.institutionId)]);
  return (
    <SimpleShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Hola, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-ink-muted">Aquí ves las necesidades que registraste en consultas confidenciales.</p>
        </div>
        <LogoutButton />
      </div>

      {portal.open.length > 0 && (
        <div className="mt-6 rounded-2xl bg-brand p-5 text-white">
          <p className="font-bold">Hay {portal.open.length === 1 ? "una consulta abierta" : `${portal.open.length} consultas abiertas`}</p>
          <ul className="mt-3 space-y-2">
            {portal.open.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="btn-sun w-full justify-between sm:w-auto">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-8 text-xl font-bold">Mis necesidades</h2>
      {list.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-5 py-6 text-ink-muted">
          No tienes necesidades registradas en consultas confidenciales. Si participaste de forma anónima, consulta tu caso con el código en{" "}
          <Link href="/seguimiento" className="link">
            Consultar mi caso
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {list.map((n) => (
            <li key={n.code} className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-bold">{n.code}</p>
                <span className="chip bg-brand-soft text-brand">{PUBLIC_STATUS_LABEL[n.status]}</span>
              </div>
              <p className="text-sm text-ink-muted">
                {CATEGORY_LABEL[n.category]}, registrada el {fmtDate(n.receivedAt)}
              </p>
              <p className="mt-2">{n.title}</p>
              {n.response && <p className="mt-3 rounded-xl bg-leaf p-3">{n.response}</p>}
            </li>
          ))}
        </ul>
      )}
    </SimpleShell>
  );
}
