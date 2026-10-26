"use client";

import { useState } from "react";
import clsx from "clsx";
import { api } from "./api";
import { PRIORITY_CRITERIA } from "@/lib/priority";

function useSave() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, okText = "Cambios guardados.", reload = true) => {
    setMsg(null);
    setBusy(true);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      if (reload) setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const view = msg && (
    <p role={msg.ok ? "status" : "alert"} className={clsx("rounded-xl px-4 py-2 text-sm", msg.ok ? "bg-ok-soft text-ok" : "bg-risk-soft text-risk")}>
      {msg.text}
    </p>
  );
  return { run, busy, view };
}

export function InstitutionForm({ initial }: { initial: { name: string; shortName: string; nit: string | null; city: string | null; slogan: string; primaryColor: string; accentColor: string; minGroupSize: number; responseDays: number } }) {
  const [f, setF] = useState(initial);
  const s = useSave();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        s.run(() => api("/api/institution", "PATCH", { ...f, nit: f.nit || null, city: f.city || null }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="i-n">Nombre oficial</label>
          <input id="i-n" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="i-s">Nombre corto</label>
          <input id="i-s" className="input" value={f.shortName} onChange={(e) => setF({ ...f, shortName: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="i-nit">NIT</label>
          <input id="i-nit" className="input" value={f.nit ?? ""} onChange={(e) => setF({ ...f, nit: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="i-c">Municipio y departamento</label>
          <input id="i-c" className="input" value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="i-sl">Lema del portal</label>
        <input id="i-sl" className="input" value={f.slogan} onChange={(e) => setF({ ...f, slogan: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="i-p">Color principal</label>
          <div className="flex gap-2">
            <input type="color" aria-label="Selector de color principal" value={f.primaryColor} onChange={(e) => setF({ ...f, primaryColor: e.target.value })} className="h-11 w-12 rounded-lg border border-line" />
            <input id="i-p" className="input font-mono" value={f.primaryColor} onChange={(e) => setF({ ...f, primaryColor: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="i-a">Color de acento</label>
          <div className="flex gap-2">
            <input type="color" aria-label="Selector de color de acento" value={f.accentColor} onChange={(e) => setF({ ...f, accentColor: e.target.value })} className="h-11 w-12 rounded-lg border border-line" />
            <input id="i-a" className="input font-mono" value={f.accentColor} onChange={(e) => setF({ ...f, accentColor: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="i-k">Grupo mínimo para resultados</label>
          <input id="i-k" type="number" min={3} className="input" value={f.minGroupSize} onChange={(e) => setF({ ...f, minGroupSize: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label" htmlFor="i-d">Días para responder</label>
          <input id="i-d" type="number" min={1} className="input" value={f.responseDays} onChange={(e) => setF({ ...f, responseDays: Number(e.target.value) })} />
        </div>
      </div>
      <p className="hint">El grupo mínimo protege la confidencialidad: ningún resultado agregado se muestra si lo respondieron menos personas. Se recomienda 5 o más.</p>
      {s.view}
      <button className="btn-primary" disabled={s.busy}>Guardar institución</button>
    </form>
  );
}

type Item = { id: string; name: string; active: boolean; code?: string; kind?: string };
export function CatalogEditor({ kind, title, items, sites }: { kind: "site" | "service" | "employment"; title: string; items: Item[]; sites?: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [serviceKind, setServiceKind] = useState("ASISTENCIAL");
  const [siteId, setSiteId] = useState("");
  const s = useSave();
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
        {items.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">Sin registros.</li>}
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className={clsx(!i.active && "text-ink-faint line-through")}>
              {i.name}
              {i.code && <span className="ml-2 font-mono text-xs text-ink-faint">{i.code}</span>}
              {i.kind && <span className="ml-2 text-xs text-ink-faint">{i.kind.toLowerCase()}</span>}
            </span>
            <button type="button" className="text-xs font-bold text-brand underline" onClick={() => s.run(() => api("/api/institution/catalog", "PATCH", { kind, id: i.id, active: !i.active }))}>
              {i.active ? "Desactivar" : "Activar"}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          s.run(() =>
            api("/api/institution/catalog", "POST", kind === "employment" ? { kind, name, code } : kind === "service" ? { kind, name, serviceKind, siteId: siteId || null } : { kind, name }),
          );
        }}
      >
        <input aria-label={`Nombre del nuevo elemento en ${title}`} className="input min-w-[12rem] flex-1 py-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        {kind === "employment" && <input aria-label="Código" className="input w-40 py-2 font-mono" placeholder="CODIGO" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />}
        {kind === "service" && (
          <>
            <select aria-label="Tipo de servicio" className="input w-40 py-2" value={serviceKind} onChange={(e) => setServiceKind(e.target.value)}>
              <option value="ASISTENCIAL">Asistencial</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
              <option value="APOYO">Apoyo</option>
            </select>
            {sites && sites.length > 0 && (
              <select aria-label="Sede" className="input w-44 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">Sin sede</option>
                {sites.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            )}
          </>
        )}
        <button className="btn-ghost py-2" disabled={s.busy}>Agregar</button>
      </form>
      <div className="mt-2">{s.view}</div>
    </div>
  );
}

export function AnnouncementForm() {
  const [f, setF] = useState({ title: "", body: "" });
  const s = useSave();
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(() => api("/api/announcements", "POST", f), "Comunicado publicado."); }}>
      <div>
        <label className="label" htmlFor="an-t">Título</label>
        <input id="an-t" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      </div>
      <div>
        <label className="label" htmlFor="an-b">Mensaje</label>
        <textarea id="an-b" className="input min-h-[90px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required />
      </div>
      {s.view}
      <button className="btn-primary" disabled={s.busy}>Publicar comunicado</button>
    </form>
  );
}

export function WeightsForm({ initial, approvedBy, approvedAt }: { initial: Record<string, number>; approvedBy: string | null; approvedAt: string | null }) {
  const [w, setW] = useState(initial);
  const total = Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0);
  const s = useSave();
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {PRIORITY_CRITERIA.map((c) => (
          <li key={c.key} className="flex items-center justify-between gap-3 py-2.5">
            <label htmlFor={`w-${c.key}`}>{c.label}</label>
            <div className="flex items-center gap-2">
              <input id={`w-${c.key}`} type="number" min={0} max={100} className="input w-24 py-1.5 text-right" value={w[c.key] ?? 0} onChange={(e) => setW({ ...w, [c.key]: Number(e.target.value) })} />
              <span className="text-ink-muted">%</span>
            </div>
          </li>
        ))}
      </ul>
      <p className={clsx("font-bold", total === 100 ? "text-ok" : "text-risk")}>Total: {total} % {total !== 100 && "(debe sumar 100)"}</p>
      <p className="text-sm text-ink-muted">
        {approvedBy && approvedAt ? `Metodología vigente aprobada por ${approvedBy} el ${new Date(approvedAt).toLocaleDateString("es-CO")}.` : "Los pesos actuales no han sido aprobados formalmente."}
      </p>
      {s.view}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={s.busy || total !== 100} onClick={() => s.run(() => api("/api/institution/priority", "PUT", { weights: w, approve: true }), "Metodología aprobada.")}>
          Guardar y aprobar
        </button>
        <button type="button" className="btn-ghost" disabled={s.busy || total !== 100} onClick={() => s.run(() => api("/api/institution/priority", "PUT", { weights: w, approve: false }), "Borrador guardado.")}>
          Guardar sin aprobar
        </button>
      </div>
    </div>
  );
}

export function TargetsForm({ fichas, initial }: { fichas: { key: string; name: string }[]; initial: Record<string, number> }) {
  const [t, setT] = useState(initial);
  const s = useSave();
  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {fichas.map((f) => (
          <li key={f.key} className="flex items-center justify-between gap-2 rounded-xl bg-leaf px-3 py-2">
            <label htmlFor={`t-${f.key}`} className="text-sm">{f.name}</label>
            <input id={`t-${f.key}`} type="number" min={0} max={100} className="input w-20 py-1.5 text-right" value={t[f.key]} onChange={(e) => setT({ ...t, [f.key]: Number(e.target.value) })} />
          </li>
        ))}
      </ul>
      {s.view}
      <button type="button" className="btn-primary" disabled={s.busy} onClick={() => s.run(() => api("/api/institution/targets", "PUT", t), "Metas actualizadas.")}>
        Guardar metas
      </button>
    </div>
  );
}

export function UserCreateForm({ roles, services }: { roles: [string, string][]; services: { id: string; name: string }[] }) {
  const [f, setF] = useState({ name: "", email: "", role: "TALENTO_HUMANO", serviceId: "", tempPassword: "" });
  const s = useSave();
  return (
    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:items-end" onSubmit={(e) => { e.preventDefault(); s.run(() => api("/api/users", "POST", { ...f, serviceId: f.serviceId || null }), "Usuario creado. Entregue la contraseña temporal por un canal seguro."); }}>
      <div>
        <label className="label text-xs" htmlFor="u-n">Nombre</label>
        <input id="u-n" className="input py-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      </div>
      <div>
        <label className="label text-xs" htmlFor="u-e">Correo</label>
        <input id="u-e" type="email" className="input py-2" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      </div>
      <div>
        <label className="label text-xs" htmlFor="u-r">Rol</label>
        <select id="u-r" className="input py-2" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {roles.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label text-xs" htmlFor="u-s">Servicio</label>
        <select id="u-s" className="input py-2" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}>
          <option value="">—</option>
          {services.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label text-xs" htmlFor="u-p">Contraseña temporal</label>
        <input id="u-p" className="input py-2" value={f.tempPassword} onChange={(e) => setF({ ...f, tempPassword: e.target.value })} required minLength={12} placeholder="12+ caracteres" />
      </div>
      <button className="btn-primary" disabled={s.busy}>Crear</button>
      <div className="sm:col-span-2 lg:col-span-6">{s.view}</div>
    </form>
  );
}

export function UserRowActions({ id, active, role, roles, self }: { id: string; active: boolean; role: string; roles: [string, string][]; self: boolean }) {
  const s = useSave();
  const [r, setR] = useState(role);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Rol" className="input w-auto py-1 text-sm" value={r} disabled={self} onChange={(e) => setR(e.target.value)}>
        {roles.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {r !== role && <button type="button" className="text-xs font-bold text-brand underline" onClick={() => s.run(() => api(`/api/users/${id}`, "PATCH", { role: r }))}>Cambiar rol</button>}
      {!self && (
        <button type="button" className="text-xs font-bold text-brand underline" onClick={() => s.run(() => api(`/api/users/${id}`, "PATCH", { active: !active }))}>
          {active ? "Desactivar" : "Activar"}
        </button>
      )}
      <button
        type="button"
        className="text-xs font-bold text-brand underline"
        onClick={() => {
          const p = prompt("Nueva contraseña temporal (12+ caracteres, letras y números). El usuario deberá cambiarla al ingresar:");
          if (p) s.run(() => api(`/api/users/${id}`, "PATCH", { resetPassword: p }), "Contraseña restablecida.");
        }}
      >
        Restablecer contraseña
      </button>
      {s.view}
    </div>
  );
}

export function PasswordForm({ forced }: { forced: boolean }) {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const s = useSave();
  return (
    <form
      className="max-w-md space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.next !== f.confirm) return s.run(async () => { throw new Error("La confirmación no coincide."); });
        s.run(async () => {
          await api("/api/auth/password", "POST", { current: f.current, next: f.next });
          if (forced) window.location.assign("/panel");
        }, "Contraseña actualizada.", false);
      }}
    >
      <div>
        <label className="label" htmlFor="p-c">Contraseña actual</label>
        <input id="p-c" type="password" autoComplete="current-password" className="input" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required />
      </div>
      <div>
        <label className="label" htmlFor="p-n">Nueva contraseña</label>
        <input id="p-n" type="password" autoComplete="new-password" className="input" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required minLength={12} />
        <p className="hint">Mínimo 12 caracteres, con letras y números.</p>
      </div>
      <div>
        <label className="label" htmlFor="p-k">Confirmar nueva contraseña</label>
        <input id="p-k" type="password" autoComplete="new-password" className="input" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required />
      </div>
      {s.view}
      <button className="btn-primary" disabled={s.busy}>Cambiar contraseña</button>
    </form>
  );
}
