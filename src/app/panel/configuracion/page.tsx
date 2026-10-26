import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCatalogs, listAnnouncements } from "@/server/institution";
import { PageHeader, fmtDate } from "@/components/ui";
import { AnnouncementForm, CatalogEditor, InstitutionForm } from "@/components/client/settings";

export default async function Settings() {
  const user = await requirePageUser(["institution.configure", "announcements.manage"], "/panel/configuracion");
  const inst = (await db.query.institutions.findFirst({ where: eq(schema.institutions.id, user.institutionId) }))!;
  const configure = can(user.role, "institution.configure");
  const [cat, news] = await Promise.all([getCatalogs(user.institutionId), listAnnouncements(user.institutionId, 10)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración institucional" description="Datos de la institución, colores del portal, sedes, servicios, modalidades de vinculación y comunicados." />
      {configure && (
        <>
          <section className="panel p-5">
            <h2 className="mb-4 text-lg font-bold">Institución</h2>
            <InstitutionForm initial={{ name: inst.name, shortName: inst.shortName, nit: inst.nit, city: inst.city, slogan: inst.slogan, primaryColor: inst.primaryColor, accentColor: inst.accentColor, minGroupSize: inst.minGroupSize, responseDays: inst.responseDays }} />
          </section>
          <section className="panel grid gap-6 p-5 lg:grid-cols-3">
            <CatalogEditor kind="site" title="Sedes" items={cat.sites} />
            <CatalogEditor kind="service" title="Servicios y procesos" items={cat.services} sites={cat.sites.filter((s) => s.active)} />
            <CatalogEditor kind="employment" title="Modalidades de vinculación" items={cat.employmentTypes} />
          </section>
          <p className="text-sm text-ink-muted">
            Los códigos PLANTA, TRABAJADOR_OFICIAL, CONTRATISTA, TERCERO y FORMACION activan preguntas específicas del instrumento base (por ejemplo, las de docencia-servicio solo para FORMACION).
          </p>
        </>
      )}
      {can(user.role, "announcements.manage") && (
        <section className="panel grid gap-6 p-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-bold">Publicar comunicado en el portal</h2>
            <AnnouncementForm />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-bold">Comunicados recientes</h2>
            <ul className="space-y-3">
              {news.map((n) => (
                <li key={n.id} className="border-l-4 border-sun pl-3">
                  <p className="text-xs text-ink-muted">{fmtDate(n.publishedAt)}</p>
                  <p className="font-bold">{n.title}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
