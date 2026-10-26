import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { NewNeedForm } from "@/components/client/new-need-form";

export default async function NewNeed() {
  const user = await requirePageUser("needs.create", "/panel/necesidades/nueva");
  const services = await db
    .select({ id: schema.services.id, name: schema.services.name })
    .from(schema.services)
    .where(and(eq(schema.services.institutionId, user.institutionId), eq(schema.services.active, true)))
    .orderBy(asc(schema.services.name));
  return (
    <div>
      <PageHeader title="Registrar necesidad" description="Para necesidades identificadas fuera de las campañas: comités, reuniones de servicio, buzón físico o entrevistas. Queda trazado quién la registró." />
      <NewNeedForm services={services} />
    </div>
  );
}
