"use client";

import { useState } from "react";
import { api } from "./api";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ role: string; mustChangePassword: boolean }>("/api/auth/login", "POST", { email, password });
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      const dest = r.mustChangePassword ? "/panel/cuenta?obligatorio=1" : safeNext !== "/" ? safeNext : r.role === "COLABORADOR" ? "/mi-espacio" : "/panel";
      window.location.assign(dest);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-5 sm:p-6">
      <div>
        <label htmlFor="email" className="label">
          Correo institucional
        </label>
        <input id="email" type="email" className="input" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input id="password" type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && (
        <p role="alert" className="rounded-xl border border-risk/30 bg-risk-soft px-4 py-3 text-risk">
          {err}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="text-sm text-ink-muted">¿Olvidaste tu contraseña? Solicita el restablecimiento al administrador técnico de la plataforma.</p>
    </form>
  );
}
