"use client";

import { useState } from "react";
import { api } from "./api";
import { CATEGORY_LABEL } from "@/lib/th1";

export function NewNeedForm({ services }: { services: { id: string; name: string }[] }) {
  const [f, setF] = useState({ title: "", description: "", proposal: "", category: "", serviceId: "", affectsPatientSafety: false, source: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/needs", "POST", {
        title: f.title,
        description: f.description,
        proposal: f.proposal || undefined,
        category: f.category,
        serviceId: f.serviceId || null,
        affectsPatientSafety: f.affectsPatientSafety,
        source: f.source || undefined,
      });
      window.location.assign(`/panel/necesidades/${r.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel max-w-3xl space-y-4 p-5 sm:p-6">
      <div>
        <label className="label" htmlFor="t">
          Título breve
        </label>
        <input id="t" className="input" required minLength={3} maxLength={160} value={f.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="d">
          Descripción de la necesidad
        </label>
        <textarea id="d" className="input min-h-[120px]" required minLength={10} value={f.description} onChange={(e) => set("description", e.target.value)} />
        <p className="hint">No incluya nombres de quien la reportó si la persona pidió reserva, ni datos de pacientes.</p>
      </div>
      <div>
        <label className="label" htmlFor="p">
          Propuesta de solución <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <textarea id="p" className="input min-h-[80px]" value={f.proposal} onChange={(e) => set("proposal", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c">
            Temática
          </label>
          <select id="c" className="input" required value={f.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Elija</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="s">
            Servicio
          </label>
          <select id="s" className="input" value={f.serviceId} onChange={(e) => set("serviceId", e.target.value)}>
            <option value="">Institucional / no aplica</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="src">
          Fuente <span className="font-normal text-ink-muted">(reunión, comité, buzón físico, entrevista…)</span>
        </label>
        <input id="src" className="input" maxLength={200} value={f.source} onChange={(e) => set("source", e.target.value)} />
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5" checked={f.affectsPatientSafety} onChange={(e) => set("affectsPatientSafety", e.target.checked)} />
        Puede afectar la seguridad del paciente
      </label>
      {err && (
        <p role="alert" className="rounded-xl bg-risk-soft px-4 py-3 text-risk">
          {err}
        </p>
      )}
      <button className="btn-primary" disabled={busy}>
        {busy ? "Registrando…" : "Registrar necesidad"}
      </button>
    </form>
  );
}
