"use client";

import { useState } from "react";
import { api } from "./api";

interface Result {
  campaign: string;
  submittedOn: string;
  needs: { code: string; title: string; category: string; status: string; closed: boolean; response: string | null; respondedOn: string | null }[];
}

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export function Tracking() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setRes(null);
    setBusy(true);
    try {
      setRes(await api<Result>("/api/public/tracking", "POST", { code }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="flex-1">
          <label htmlFor="codigo" className="label">
            Código de seguimiento
          </label>
          <input
            id="codigo"
            className="input font-display text-xl uppercase tracking-wider"
            placeholder="T360-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary sm:px-8" disabled={busy || code.trim().length < 8}>
          {busy ? "Buscando…" : "Consultar"}
        </button>
      </form>

      {err && (
        <p role="alert" className="mt-4 rounded-xl border border-risk/30 bg-risk-soft px-4 py-3 text-risk">
          {err}
        </p>
      )}

      {res && (
        <section className="mt-6" aria-live="polite">
          <p className="text-ink-muted">
            Participaste en <strong className="text-ink">{res.campaign}</strong> el {fmt(res.submittedOn)}.
          </p>
          {res.needs.length === 0 ? (
            <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3">
              Tu participación quedó registrada. No registraste necesidades concretas, así que no hay casos que seguir; tus respuestas hacen parte del análisis general.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {res.needs.map((n) => (
                <li key={n.code} className="panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg font-bold">{n.code}</p>
                    <span className={n.closed ? "chip bg-ok-soft text-ok" : "chip bg-brand-soft text-brand"}>{n.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{n.category}</p>
                  <p className="mt-2">{n.title}</p>
                  {n.response && (
                    <div className="mt-4 rounded-xl bg-leaf p-4">
                      <p className="text-sm font-bold text-brand">Respuesta del hospital{n.respondedOn ? `, ${fmt(n.respondedOn)}` : ""}</p>
                      <p className="mt-1">{n.response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
