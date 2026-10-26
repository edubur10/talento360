import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listCampaigns } from "@/server/campaigns";
import { EmptyState, PageHeader, fmtDate } from "@/components/ui";
import { CreateCampaignForm } from "@/components/client/campaign-admin";

const STATUS: Record<string, [string, string]> = {
  BORRADOR: ["Borrador", "bg-slate-100 text-slate-700"],
  ACTIVA: ["Activa", "bg-ok-soft text-ok"],
  CERRADA: ["Cerrada", "bg-leaf text-ink-muted"],
};

export default async function Campaigns() {
  const user = await requirePageUser(["campaigns.manage", "campaigns.viewResults"], "/panel/campanas");
  const rows = await listCampaigns(user.institutionId);
  const manage = can(user.role, "campaigns.manage");
  return (
    <div>
      <PageHeader title="Campañas de escucha" description="Cada campaña genera un enlace y un código QR para que los trabajadores participen desde el celular. Criterio 2 del TH1: evaluación periódica de expectativas y necesidades." />
      {manage && (
        <div className="mb-6">
          <CreateCampaignForm />
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState title="Aún no hay campañas">Cree la primera campaña para empezar a recibir las necesidades de los trabajadores.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const pct = c.eligibleCount ? Math.round((c.submissions / c.eligibleCount) * 100) : null;
            return (
              <li key={c.id}>
                <Link href={`/panel/campanas/${c.id}`} className="panel block p-5 transition-colors hover:border-brand">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip ${STATUS[c.status][1]}`}>{STATUS[c.status][0]}</span>
                    <span className="chip bg-brand-soft text-brand">{c.mode === "ANONIMA" ? "Anónima" : "Confidencial"}</span>
                    {c.isDemo && <span className="chip bg-warn-soft text-warn">Demostración</span>}
                  </div>
                  <h2 className="mt-2 text-lg font-bold">{c.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
                    <span>
                      <strong className="text-ink">{c.submissions}</strong> participaciones{pct != null ? ` (${pct} % de ${c.eligibleCount} elegibles)` : ""}
                    </span>
                    <span>
                      <strong className="text-ink">{c.needs}</strong> necesidades registradas
                    </span>
                    <span>{c.endsAt ? `Cierra el ${fmtDate(c.endsAt)}` : `Creada el ${fmtDate(c.createdAt)}`}</span>
                  </div>
                  {pct != null && (
                    <div className="mt-3 h-2 rounded-full bg-leaf">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
