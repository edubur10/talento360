import Link from "next/link";
import type { Institution } from "@/db/schema";
import { Brand, DemoBanner, fmtDate } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/th1";
import type { SessionUser } from "@/lib/auth";
import { portalData } from "@/server/portal";

export async function Portal({ institution, user }: { institution: Institution; user: SessionUser | null }) {
  const { open, improvements, news } = await portalData(institution.id);
  const main = open.find((c) => c.mode === "ANONIMA") ?? open[0];
  const firstName = user?.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-white">
      <DemoBanner show={institution.isDemo} />
      <header className="bg-brand-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand institution={institution.name} tone="white" />
          <nav className="flex items-center gap-1 text-sm sm:gap-3" aria-label="Principal">
            <Link href="/seguimiento" className="hidden min-h-[44px] items-center rounded-lg px-3 font-bold text-white/90 hover:bg-white/10 sm:inline-flex">
              Consultar mi caso
            </Link>
            {user ? (
              <Link href={user.role === "COLABORADOR" ? "/mi-espacio" : "/panel"} className="inline-flex min-h-[44px] items-center rounded-lg bg-white/10 px-3 font-bold text-white hover:bg-white/20">
                {user.role === "COLABORADOR" ? "Mi espacio" : "Panel de gestión"}
              </Link>
            ) : (
              <Link href="/ingresar" className="inline-flex min-h-[44px] items-center rounded-lg px-3 font-bold text-white/90 hover:bg-white/10">
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main id="contenido">
        {/* Héroe: la frase institucional es el elemento memorable */}
        <section className="contours relative overflow-hidden bg-brand-dark text-white">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
            {firstName && <p className="rise mb-3 text-lg text-white/85">Hola, {firstName}. Qué bueno verte por aquí.</p>}
            <h1 className="rise max-w-3xl text-[2.6rem] font-extrabold leading-[1.02] text-white sm:text-6xl md:text-7xl" style={{ fontVariationSettings: '"wdth" 90' }}>
              {institution.slogan}
            </h1>
            <p className="rise mt-5 max-w-xl text-lg text-white/85 [animation-delay:120ms] sm:text-xl">
              Cuéntanos qué necesitas para trabajar mejor. Cada aporte recibe un número, una persona responsable y una respuesta.
            </p>
            <div className="rise mt-8 flex flex-col gap-3 [animation-delay:220ms] sm:flex-row sm:items-center">
              {main ? (
                <Link href={`/c/${main.slug}`} className="btn-sun px-6 py-4 text-lg shadow-[0_10px_30px_-10px_rgb(var(--sun)/0.8)]">
                  Quiero expresar mis necesidades
                </Link>
              ) : (
                <p className="rounded-xl bg-white/10 px-4 py-3 text-white/90">En este momento no hay una consulta abierta. Te avisaremos por los canales institucionales cuando inicie la próxima.</p>
              )}
              <Link href="/seguimiento" className="btn px-5 text-white ring-1 ring-white/40 hover:bg-white/10">
                Ya participé: ver mi caso
              </Link>
            </div>
            {main && (
              <p className="mt-4 text-sm text-white/75">
                {main.mode === "ANONIMA"
                  ? "Participación anónima: no pedimos tu nombre y no guardamos la hora ni el equipo desde el que respondes."
                  : "Participación confidencial: ingresas con tu usuario para que podamos contactarte. Tu nombre solo lo ve Talento Humano."}
                {main.endsAt && <> Abierta hasta el {fmtDate(main.endsAt)}.</>}
              </p>
            )}
          </div>
        </section>

        {open.length > 1 && (
          <section className="border-b border-line bg-leaf">
            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
              <h2 className="text-base font-bold">Otras consultas abiertas</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {open
                  .filter((c) => c.slug !== main?.slug)
                  .map((c) => (
                    <li key={c.slug}>
                      <Link href={`/c/${c.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 font-bold text-brand hover:border-brand">
                        {c.title}
                        <span className="chip bg-brand-soft text-brand">{c.mode === "ANONIMA" ? "Anónima" : "Confidencial"}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}

        {/* Cómo funciona: es una secuencia real, por eso va numerada */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Qué pasa con lo que nos cuentas</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Lo expresas", "Respondes la consulta y, si quieres, registras necesidades concretas. Recibes un código de seguimiento."],
              ["Lo analizamos", "Talento Humano clasifica tu aporte y, junto con Calidad, define su prioridad."],
              ["Respondemos", "Una persona responsable ejecuta acciones con fecha de compromiso y te da una respuesta."],
              ["Verificamos", "Comprobamos si la solución funcionó. Si no, el caso se reabre."],
            ].map(([t, d], i) => (
              <li key={t} className="relative pl-14">
                <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-bold text-brand" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{t}</h3>
                <p className="mt-1 text-ink-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-leaf">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">Tú lo propusiste, el hospital lo hizo</h2>
                <p className="mt-1 max-w-2xl text-ink-muted">Mejoras realizadas a partir de lo que expresaron los trabajadores, verificadas por el área de Calidad.</p>
              </div>
            </div>
            {improvements.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-line bg-white px-5 py-6 text-ink-muted">
                Aquí aparecerán las mejoras cuando se verifique que funcionaron. Solo publicamos cambios reales, sin datos de quien los propuso.
              </p>
            ) : (
              <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {improvements.map((m) => (
                  <li key={m.code} className="grid gap-2 px-5 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
                    <div className="text-sm">
                      <p className="font-bold text-brand">{CATEGORY_LABEL[m.category]}</p>
                      <p className="text-ink-muted">Propuesto en {m.receivedAt.toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" })}</p>
                    </div>
                    <p className="text-lg leading-snug">{m.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold">Comunicados</h2>
            {news.length === 0 ? (
              <p className="mt-4 text-ink-muted">No hay comunicados publicados.</p>
            ) : (
              <ul className="mt-4 space-y-5">
                {news.map((n) => (
                  <li key={n.id} className="border-l-4 border-sun pl-4">
                    <p className="text-sm text-ink-muted">{fmtDate(n.publishedAt)}</p>
                    <h3 className="text-lg font-bold">{n.title}</h3>
                    <p className="mt-1 text-ink-muted">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="rounded-2xl bg-brand-soft p-6" aria-labelledby="privacidad">
            <h2 id="privacidad" className="text-xl font-bold">Tu información está protegida</h2>
            <ul className="mt-3 space-y-2 text-ink">
              <li>
                <strong>Anónima</strong> significa de verdad anónima: sin nombre, sin usuario, sin registrar tu equipo ni la hora.
              </li>
              <li>
                <strong>Confidencial</strong> significa que sabemos quién eres para ayudarte, pero solo Talento Humano lo ve.
              </li>
              <li>Los resultados se publican agrupados y nunca por grupos tan pequeños que permitan reconocer a alguien.</li>
            </ul>
            <Link href="/privacidad" className="link mt-4 inline-block">
              Leer el aviso de tratamiento de datos
            </Link>
          </aside>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h2 className="text-lg font-bold">En preparación</h2>
            <p className="mt-1 text-ink-muted">Estos espacios se habilitarán en las próximas fases de la plataforma.</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {["Encuesta de clima organizacional", "Cuidamos a quienes cuidan: bienestar laboral", "Tus ideas transforman nuestro hospital"].map((t) => (
                <span key={t} className="rounded-xl border border-line px-3 py-2 text-ink-muted">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:justify-between sm:px-6">
          <p>
            {institution.name}
            {institution.city ? `, ${institution.city}` : ""}
          </p>
          <p>
            <Link href="/privacidad" className="underline underline-offset-4">
              Tratamiento de datos
            </Link>
            <span className="ml-4">Talento 360° Salud</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
