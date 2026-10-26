import { notFound } from "next/navigation";
import { Portal } from "@/components/portal";
import { cachedSession, currentInstitution } from "@/server/context";

/** Portal de una institución específica (instalación multi-ESE). */
export default async function InstitutionHome({ params }: { params: Promise<{ slug: string }> }) {
  const institution = await currentInstitution((await params).slug);
  if (!institution) notFound();
  const user = await cachedSession();
  return <Portal institution={institution} user={user && user.institutionId === institution.id ? user : null} />;
}
