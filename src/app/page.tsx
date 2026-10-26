import { Portal } from "@/components/portal";
import { cachedSession, currentInstitution } from "@/server/context";

export default async function Home() {
  const user = await cachedSession();
  const institution = await currentInstitution();
  if (!institution) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-3xl font-bold">Talento 360° Salud</h1>
        <p className="mt-3 text-ink-muted">La plataforma aún no tiene una institución configurada. El administrador técnico debe ejecutar la carga inicial (ver manual técnico).</p>
      </main>
    );
  }
  return <Portal institution={institution} user={user} />;
}
