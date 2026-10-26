import type { Metadata } from "next";
import { SimpleShell } from "@/components/simple-shell";
import { Tracking } from "@/components/client/tracking";

export const metadata: Metadata = { title: "Consultar mi caso" };

export default function SeguimientoPage() {
  return (
    <SimpleShell>
      <h1 className="text-3xl font-extrabold">Consulta el estado de tu caso</h1>
      <p className="mt-2 text-lg text-ink-muted">Escribe el código que recibiste al enviar tu participación. Solo verás el estado y la respuesta; nadie más puede ver tus datos con este código.</p>
      <div className="mt-6">
        <Tracking />
      </div>
    </SimpleShell>
  );
}
