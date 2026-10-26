import type { Metadata } from "next";
import { SimpleShell } from "@/components/simple-shell";
import { LoginForm } from "@/components/client/login-form";
import { currentInstitution } from "@/server/context";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const { siguiente } = await searchParams;
  const inst = await currentInstitution();
  return (
    <SimpleShell width="max-w-md">
      <h1 className="text-3xl font-extrabold">Ingresar</h1>
      <p className="mt-2 text-ink-muted">Para el equipo de gestión y para participar en consultas confidenciales.</p>
      <div className="mt-6">
        <LoginForm next={siguiente ?? "/"} />
      </div>
      {inst?.isDemo && (
        <div className="mt-6 rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          <p className="font-bold">Usuarios de demostración</p>
          <p className="mt-1">
            Contraseña: <code className="font-bold">Demo-T360-2026</code>
          </p>
          <ul className="mt-2 space-y-0.5">
            <li>talento@demo.t360 (Talento Humano)</li>
            <li>calidad@demo.t360 (Calidad)</li>
            <li>gerencia@demo.t360 (Gerencia)</li>
            <li>lider.urgencias@demo.t360 (Líder de servicio)</li>
            <li>admin@demo.t360 (Administrador técnico)</li>
            <li>colaborador@demo.t360 (Colaborador)</li>
          </ul>
        </div>
      )}
    </SimpleShell>
  );
}
