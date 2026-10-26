import { redirect } from "next/navigation";
import { PanelNav, type NavItem } from "@/components/panel-nav";
import { DemoBanner } from "@/components/ui";
import { can, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { cachedSession, currentInstitution } from "@/server/context";

const NAV: (NavItem & { perms: Permission[] })[] = [
  { href: "/panel", label: "Tablero", icon: "board", perms: ["dashboard.view"] },
  { href: "/panel/necesidades", label: "Necesidades", icon: "inbox", perms: ["needs.viewAll", "needs.viewScoped"] },
  { href: "/panel/campanas", label: "Campañas", icon: "megaphone", perms: ["campaigns.manage", "campaigns.viewResults"] },
  { href: "/panel/indicadores", label: "Indicadores", icon: "gauge", perms: ["dashboard.view"] },
  { href: "/panel/priorizacion", label: "Priorización", icon: "scale", perms: ["priority.configure"] },
  { href: "/panel/configuracion", label: "Configuración", icon: "settings", perms: ["institution.configure", "announcements.manage"] },
  { href: "/panel/usuarios", label: "Usuarios", icon: "users", perms: ["users.manage"] },
  { href: "/panel/auditoria", label: "Auditoría", icon: "shield", perms: ["audit.view"] },
  { href: "/panel/cuenta", label: "Mi cuenta", icon: "user", perms: ["panel.access"] },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await cachedSession();
  if (!user) redirect("/ingresar?siguiente=/panel");
  if (!can(user.role, "panel.access")) redirect("/mi-espacio");
  const inst = (await currentInstitution())!;
  const items = NAV.filter((n) => n.perms.some((p) => can(user.role, p))).map(({ perms: _p, ...i }) => i);
  return (
    <div className="min-h-screen bg-[#F5F8F6]">
      <PanelNav items={items} userName={user.name} roleLabel={ROLE_LABEL[user.role]} institution={inst.shortName} />
      <div className="lg:pl-64">
        <DemoBanner show={inst.isDemo} compact />
        <main id="contenido" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
