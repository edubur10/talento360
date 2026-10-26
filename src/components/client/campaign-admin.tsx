"use client";

import { useState } from "react";
import { api } from "./api";

export function CreateCampaignForm({ defaultEligible }: { defaultEligible?: number }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "Identificación de necesidades y expectativas del talento humano",
    description: "Queremos saber qué necesitas para trabajar mejor y sentirte bien en el hospital. Toma unos 10 minutos.",
    mode: "ANONIMA",
    startsAt: "",
    endsAt: "",
    eligibleCount: defaultEligible ? String(defaultEligible) : "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Crear campaña
      </button>
    );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/campaigns", "POST", {
        title: f.title,
        description: f.description,
        mode: f.mode,
        startsAt: f.startsAt || undefined,
        endsAt: f.endsAt || undefined,
        eligibleCount: f.eligibleCount ? Number(f.eligibleCount) : undefined,
      });
      window.location.assign(`/panel/campanas/${r.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="panel w-full space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold">Nueva campaña de identificación de necesidades</h2>
      <p className="text-sm text-ink-muted">Se crea con el instrumento base de 8 secciones (A–G y registro de necesidades). Queda en borrador hasta que la active.</p>
      <div>
        <label className="label" htmlFor="c-t">Título</label>
        <input id="c-t" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required minLength={5} />
      </div>
      <div>
        <label className="label" htmlFor="c-d">Mensaje para los trabajadores</label>
        <textarea id="c-d" className="input min-h-[80px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required minLength={10} />
      </div>
      <fieldset>
        <legend className="label">Modalidad de participación</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["ANONIMA", "Anónima", "Sin usuario. No se guarda IP ni hora. Seguimiento solo con código."],
            ["CONFIDENCIAL", "Confidencial (identificada)", "Requiere ingresar. Talento Humano ve la identidad para dar respuesta."],
          ].map(([k, l, h]) => (
            <label key={k} className={`cursor-pointer rounded-xl border-2 p-3 ${f.mode === k ? "border-brand bg-brand-soft" : "border-line"}`}>
              <input type="radio" name="mode" className="sr-only" checked={f.mode === k} onChange={() => setF({ ...f, mode: k })} />
              <span className="block font-bold">{l}</span>
              <span className="text-sm text-ink-muted">{h}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="c-s">Inicio <span className="font-normal text-ink-muted">(opcional)</span></label>
          <input id="c-s" type="date" className="input" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="c-e">Cierre <span className="font-normal text-ink-muted">(opcional)</span></label>
          <input id="c-e" type="date" className="input" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="c-n">Trabajadores elegibles</label>
          <input id="c-n" type="number" min={1} className="input" value={f.eligibleCount} onChange={(e) => setF({ ...f, eligibleCount: e.target.value })} />
          <p className="hint">Denominador del indicador de participación.</p>
        </div>
      </div>
      {err && <p role="alert" className="rounded-xl bg-risk-soft px-4 py-3 text-risk">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Creando…" : "Crear campaña"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}

export function CampaignControls({ id, status, eligibleCount }: { id: string; status: string; eligibleCount: number | null }) {
  const [n, setN] = useState(eligibleCount ? String(eligibleCount) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = async (body: Record<string, unknown>) => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/campaigns/${id}`, "PATCH", body);
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "BORRADOR" && <button type="button" className="btn-sun" disabled={busy} onClick={() => patch({ status: "ACTIVA" })}>Activar y recibir respuestas</button>}
        {status === "ACTIVA" && (
          <button type="button" className="btn-danger" disabled={busy} onClick={() => confirm("¿Cerrar la campaña? No podrá volver a recibir respuestas.") && patch({ status: "CERRADA" })}>
            Cerrar campaña
          </button>
        )}
      </div>
      {status !== "CERRADA" && (
        <div className="flex items-end gap-2">
          <div>
            <label className="label text-xs" htmlFor="elig">Trabajadores elegibles</label>
            <input id="elig" type="number" min={1} className="input w-32 py-2" value={n} onChange={(e) => setN(e.target.value)} />
          </div>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => patch({ eligibleCount: n ? Number(n) : null })}>Guardar</button>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-risk">{err}</p>}
    </div>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input readOnly value={url} className="input font-mono text-sm" aria-label="Enlace para compartir" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn-primary shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setOk(true);
          } catch {}
        }}
      >
        {ok ? "Copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
