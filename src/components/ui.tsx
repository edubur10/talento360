import Link from "next/link";
import clsx from "clsx";
import type { NeedStatus, Priority } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/workflow";
import { PRIORITY_LABEL } from "@/lib/priority";

/** Marca: un anillo de 360° abierto que «escucha» (onda de voz entrando al círculo). */
export function Mark({ className = "h-9 w-9", tone = "brand" }: { className?: string; tone?: "brand" | "white" }) {
  const c = tone === "white" ? "#fff" : "rgb(var(--brand))";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M33 12.5A15 15 0 1 0 35 20" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
      <circle cx="33.4" cy="12.6" r="3.2" fill="rgb(var(--sun))" />
      <path d="M14 20h2.5M18.5 15.5v9M23 17.5v5M27.5 19v2" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ institution, tone = "brand", href = "/" }: { institution?: string; tone?: "brand" | "white"; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Mark tone={tone} />
      <span className="leading-tight">
        <span className={clsx("block font-display text-lg font-bold", tone === "white" ? "text-white" : "text-ink")}>Talento 360° Salud</span>
        {institution && <span className={clsx("block text-xs", tone === "white" ? "text-white/80" : "text-ink-muted")}>{institution}</span>}
      </span>
    </Link>
  );
}

export function DemoBanner({ show, compact = false }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <div role="note" className={clsx("border-b border-warn/30 bg-warn-soft text-warn", compact ? "px-4 py-1.5 text-xs" : "px-4 py-2 text-sm")}>
      <strong>Entorno de demostración.</strong> Los datos que ve aquí son ficticios y no corresponden a información real del hospital.
    </div>
  );
}

const STATUS_TONE: Record<NeedStatus, string> = {
  RECIBIDA: "bg-slate-100 text-slate-700",
  CLASIFICADA: "bg-sky-50 text-sky-800",
  EN_ANALISIS: "bg-sky-100 text-sky-900",
  PRIORIZADA: "bg-indigo-50 text-indigo-800",
  ASIGNADA: "bg-violet-50 text-violet-800",
  EN_EJECUCION: "bg-warn-soft text-warn",
  RESPUESTA_EMITIDA: "bg-teal-50 text-teal-800",
  PENDIENTE_EFECTIVIDAD: "bg-amber-50 text-amber-900",
  CERRADA: "bg-ok-soft text-ok",
  REABIERTA: "bg-risk-soft text-risk",
};
export function StatusBadge({ status }: { status: NeedStatus }) {
  return <span className={clsx("chip", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}

const PRIORITY_TONE: Record<Priority, string> = {
  CRITICA: "bg-risk text-white",
  ALTA: "bg-risk-soft text-risk",
  MEDIA: "bg-warn-soft text-warn",
  BAJA: "bg-slate-100 text-slate-700",
};
export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="chip bg-white text-ink-faint ring-1 ring-line">Sin priorizar</span>;
  return <span className={clsx("chip", PRIORITY_TONE[priority])}>{PRIORITY_LABEL[priority]}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-leaf/50 px-6 py-10 text-center">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-ink-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
};
export const fmtDateTime = (d: Date | null | undefined) =>
  d ? d.toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" }) : "—";
