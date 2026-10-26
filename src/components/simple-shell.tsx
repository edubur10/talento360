import Link from "next/link";
import { Brand, DemoBanner } from "@/components/ui";
import { currentInstitution } from "@/server/context";

/** Marco sencillo para páginas públicas secundarias. */
export async function SimpleShell({ children, width = "max-w-2xl" }: { children: React.ReactNode; width?: string }) {
  const inst = await currentInstitution();
  return (
    <div className="min-h-screen bg-leaf/60">
      <DemoBanner show={!!inst?.isDemo} compact />
      <header className="border-b border-line bg-white">
        <div className={`mx-auto flex items-center justify-between px-4 py-3 ${width}`}>
          <Brand institution={inst?.name} />
          <Link href="/" className="text-sm font-bold text-brand">
            Inicio
          </Link>
        </div>
      </header>
      <main id="contenido" className={`mx-auto px-4 py-8 sm:py-12 ${width}`}>
        {children}
      </main>
    </div>
  );
}
