import Link from "next/link";

export default function NoPermission() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">No tiene permiso para ver esta página</h1>
      <p className="mt-2 text-ink-muted">Su rol no incluye acceso a esta sección. Si lo necesita para su trabajo, solicítelo al administrador de la plataforma.</p>
      <Link href="/panel" className="btn-primary mt-6">
        Ir al panel
      </Link>
    </div>
  );
}
