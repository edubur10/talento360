import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-ink-muted">Puede que el enlace esté incompleto o que no tenga acceso a este contenido.</p>
      <Link href="/" className="btn-primary mt-6">
        Ir al inicio
      </Link>
    </main>
  );
}
