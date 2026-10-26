import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeVars } from "@/lib/colors";
import { currentInstitution } from "@/server/context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Talento 360° Salud", template: "%s · Talento 360° Salud" },
  description: "Sistema Integral de Escucha, Bienestar y Respuesta al Talento Humano.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1E5B4F" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let style: Record<string, string> = {};
  try {
    const inst = await currentInstitution();
    if (inst) style = themeVars(inst.primaryColor, inst.accentColor);
  } catch {
    // Si la base no está disponible se usan los colores por defecto.
  }
  return (
    <html lang="es-CO">
      <body style={style}>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
