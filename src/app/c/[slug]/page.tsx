import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Brand, DemoBanner } from "@/components/ui";
import { CampaignForm } from "@/components/client/campaign-form";
import { getPublicCampaign } from "@/server/campaigns";
import { cachedSession } from "@/server/context";
import { themeVars } from "@/lib/colors";

export const metadata: Metadata = { title: "Participar" };

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicCampaign(slug);
  if (!data) notFound();
  const { campaign, institution } = data;
  const user = await cachedSession();
  const confidential = campaign.mode === "CONFIDENCIAL";
  const wrongInstitution = confidential && user && user.institutionId !== institution.id;

  return (
    <div className="min-h-screen bg-leaf/60" style={themeVars(institution.primaryColor, institution.accentColor)}>
      <DemoBanner show={campaign.isDemo || institution.isDemo} compact />
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Brand institution={institution.name} href={`/i/${institution.slug}`} />
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        {!campaign.open ? (
          <div className="panel p-6">
            <h1 className="text-2xl font-bold">Esta consulta no está recibiendo respuestas</h1>
            <p className="mt-2 text-ink-muted">
              {campaign.status === "CERRADA" ? "La consulta ya cerró. Gracias a quienes participaron." : "La consulta aún no ha iniciado o se encuentra en preparación."}
            </p>
            <Link href="/seguimiento" className="link mt-4 inline-block">Consultar el estado de un caso</Link>
          </div>
        ) : confidential && !user ? (
          <div className="panel p-6">
            <span className="chip bg-violet-50 text-violet-800">Participación confidencial</span>
            <h1 className="mt-3 text-2xl font-bold">{campaign.title}</h1>
            <p className="mt-2 text-ink-muted">
              Esta consulta es confidencial: necesitas ingresar con tu usuario para que Talento Humano pueda darte respuesta. Tu nombre no aparece en ningún informe.
            </p>
            <Link href={`/ingresar?siguiente=/c/${slug}`} className="btn-primary mt-5">Ingresar para participar</Link>
          </div>
        ) : wrongInstitution ? (
          <div className="panel p-6">
            <h1 className="text-2xl font-bold">Esta consulta pertenece a otra institución</h1>
            <p className="mt-2 text-ink-muted">Tu usuario no está vinculado a {institution.name}.</p>
          </div>
        ) : (
          <CampaignForm
            slug={slug}
            title={campaign.title}
            description={campaign.description}
            mode={campaign.mode}
            questions={data.questions}
            employmentTypes={data.employmentTypes}
            services={data.services}
            userName={confidential ? user?.name : null}
          />
        )}
      </main>
    </div>
  );
}
