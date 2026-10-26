"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { api } from "./api";
import { CATEGORY_LABEL, TH1_CRITERIA, CATEGORY_DEFAULT_TH1 } from "@/lib/th1";
import { availableOperations, type Operation } from "@/lib/workflow";
import { DEFAULT_WEIGHTS, PRIORITY_CRITERIA, PRIORITY_LABEL, priorityBand, priorityScore, type Scores } from "@/lib/priority";
import type { NeedCategory, NeedStatus, Priority } from "@/db/schema";

type Op = Operation | "comment" | "group" | "publish";

export interface WorkbenchProps {
  need: {
    id: string;
    code: string;
    status: NeedStatus;
    category: NeedCategory;
    th1Criterion: number | null;
    serviceId: string | null;
    isUrgent: boolean;
    escalation: string;
    scores: Record<string, number> | null;
    priority: Priority | null;
    assignedToId: string | null;
    closeType: string | null;
    publishImprovement: boolean;
    publicSummary: string | null;
    groupParentId: string | null;
    title: string;
  };
  perms: { manage: boolean; prioritize: boolean; review: boolean; isAssignee: boolean };
  users: { id: string; name: string; role: string }[];
  services: { id: string; name: string }[];
  weights: Record<string, number> | null;
  responseDays: number;
  groupCandidates: { id: string; code: string; title: string }[];
}

const OP_LABEL: Record<Op, string> = {
  classify: "Clasificar",
  analyze: "Registrar análisis",
  prioritize: "Priorizar",
  assign: "Asignar responsable",
  start: "Iniciar ejecución",
  respond: "Emitir respuesta",
  toVerification: "Enviar a verificación de efectividad",
  review: "Evaluar efectividad",
  closeAdministrative: "Cierre administrativo",
  reopen: "Reabrir",
  comment: "Agregar nota",
  group: "Agrupar con otra",
  publish: "Publicar mejora",
};
const PRIMARY_ORDER: Op[] = ["classify", "analyze", "prioritize", "assign", "start", "respond", "toVerification", "review", "reopen"];

const plusDays = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000 - 5 * 3600_000);
  return d.toISOString().slice(0, 10);
};

export function NeedWorkbench(p: WorkbenchProps) {
  const { need, perms } = p;
  const ops = useMemo(() => {
    const base = availableOperations(need.status) as Op[];
    const allowed = base.filter((op) => {
      if (op === "prioritize") return perms.prioritize;
      if (op === "review") return perms.review;
      if (op === "start" || op === "respond") return perms.manage || perms.isAssignee;
      return perms.manage;
    });
    const primary = PRIMARY_ORDER.filter((o) => allowed.includes(o));
    const secondary: Op[] = [];
    if (perms.manage || perms.isAssignee) secondary.push("comment");
    if (perms.manage && need.status !== "CERRADA") secondary.push("group");
    if (allowed.includes("closeAdministrative")) secondary.push("closeAdministrative");
    if (perms.manage && need.status === "CERRADA" && need.closeType === "EFECTIVIDAD_VERIFICADA") secondary.push("publish");
    return { primary, secondary };
  }, [need.status, need.closeType, perms]);

  // Pestaña inicial: el siguiente paso lógico del ciclo, no la repetición del paso actual.
  const NEXT: Partial<Record<NeedStatus, Op>> = {
    RECIBIDA: "classify", CLASIFICADA: "prioritize", EN_ANALISIS: "prioritize", PRIORIZADA: "assign", ASIGNADA: "start",
    EN_EJECUCION: "respond", RESPUESTA_EMITIDA: "toVerification", PENDIENTE_EFECTIVIDAD: "review", REABIERTA: "classify", CERRADA: "reopen",
  };
  const preferred = NEXT[need.status];
  const [op, setOp] = useState<Op | null>(preferred && ops.primary.includes(preferred) ? preferred : (ops.primary[0] ?? ops.secondary[0] ?? null));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (body: Record<string, unknown>) => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/needs/${need.id}/operations`, "POST", { op, ...body });
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (ops.primary.length === 0 && ops.secondary.length === 0) {
    return <p className="text-sm text-ink-muted">No hay operaciones disponibles para su rol en este estado.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Operaciones disponibles">
        {ops.primary.map((o) => (
          <button key={o} type="button" role="tab" aria-selected={op === o} onClick={() => { setOp(o); setErr(null); }} className={clsx("rounded-xl px-3 py-2 text-sm font-bold", op === o ? "bg-brand text-white" : "bg-brand-soft text-brand hover:bg-brand/15")}>
            {OP_LABEL[o]}
          </button>
        ))}
        {ops.secondary.map((o) => (
          <button key={o} type="button" role="tab" aria-selected={op === o} onClick={() => { setOp(o); setErr(null); }} className={clsx("rounded-xl px-3 py-2 text-sm font-bold", op === o ? "bg-ink text-white" : "border border-line text-ink-muted hover:text-ink")}>
            {OP_LABEL[o]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {op && <OpForm key={op} op={op} {...p} busy={busy} onSend={send} />}
        {err && (
          <p role="alert" className="mt-3 rounded-xl border border-risk/30 bg-risk-soft px-4 py-3 text-sm text-risk">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

function OpForm({ op, need, users, services, weights, responseDays, groupCandidates, busy, onSend }: WorkbenchProps & { op: Op; busy: boolean; onSend: (b: Record<string, unknown>) => void }) {
  const [f, setF] = useState<Record<string, string | boolean>>({});
  const v = (k: string, d = "") => (f[k] as string) ?? d;
  const set = (k: string, val: string | boolean) => setF((x) => ({ ...x, [k]: val }));
  const btn = (label: string, body: () => Record<string, unknown>, tone = "btn-primary") => (
    <button type="button" className={clsx(tone, "mt-2")} disabled={busy} onClick={() => onSend(body())}>
      {busy ? "Guardando…" : label}
    </button>
  );
  const ta = (k: string, label: string, hint?: string, req = true) => (
    <div>
      <label className="label" htmlFor={`f-${k}`}>
        {label}
        {!req && <span className="font-normal text-ink-muted"> (opcional)</span>}
      </label>
      <textarea id={`f-${k}`} className="input min-h-[90px]" value={v(k)} onChange={(e) => set(k, e.target.value)} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  switch (op) {
    case "classify": {
      const cat = v("category", need.category) as NeedCategory;
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-cat">Temática</label>
              <select id="f-cat" className="input" value={cat} onChange={(e) => { set("category", e.target.value); set("th1", String(CATEGORY_DEFAULT_TH1[e.target.value as NeedCategory])); }}>
                {Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-th1">Criterio TH1 relacionado</label>
              <select id="f-th1" className="input" value={v("th1", String(need.th1Criterion ?? CATEGORY_DEFAULT_TH1[cat]))} onChange={(e) => set("th1", e.target.value)}>
                {TH1_CRITERIA.map((c) => <option key={c.n} value={c.n}>{c.n}. {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-svc">Servicio o proceso</label>
              <select id="f-svc" className="input" value={v("serviceId", need.serviceId ?? "")} onChange={(e) => set("serviceId", e.target.value)}>
                <option value="">Institucional / no indicado</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-esc">Escalamiento a canal especial</label>
              <select id="f-esc" className="input" value={v("escalation", need.escalation)} onChange={(e) => set("escalation", e.target.value)}>
                <option value="NINGUNO">No requiere</option>
                <option value="SST">Seguridad y Salud en el Trabajo</option>
                <option value="CONVIVENCIA_LABORAL">Comité de Convivencia Laboral</option>
                <option value="SEGURIDAD_PACIENTE">Programa de Seguridad del Paciente</option>
                <option value="CONTROL_INTERNO">Control Interno</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-title">Título</label>
            <input id="f-title" className="input" value={v("title", need.title)} onChange={(e) => set("title", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" className="h-5 w-5" checked={(f.urgent as boolean) ?? need.isUrgent} onChange={(e) => set("urgent", e.target.checked)} />
            Atención urgente u obligatoria (se separa de las necesidades ordinarias)
          </label>
          {ta("note", "Nota de clasificación", undefined, false)}
          {btn("Guardar clasificación", () => ({
            category: cat,
            th1Criterion: Number(v("th1", String(need.th1Criterion ?? CATEGORY_DEFAULT_TH1[cat]))),
            serviceId: v("serviceId", need.serviceId ?? "") || null,
            escalation: v("escalation", need.escalation),
            isUrgent: (f.urgent as boolean) ?? need.isUrgent,
            title: v("title", need.title),
            note: v("note") || undefined,
          }))}
        </div>
      );
    }
    case "analyze":
      return (
        <div className="space-y-3">
          {ta("analysis", "Análisis", "Causas identificadas, personas consultadas, información revisada.")}
          {ta("impact", "Impacto en trabajadores y en la prestación del servicio", undefined, false)}
          {btn("Guardar análisis", () => ({ analysis: v("analysis"), impact: v("impact") || undefined }))}
        </div>
      );
    case "prioritize": {
      const w = weights ?? DEFAULT_WEIGHTS;
      const scores: Scores = Object.fromEntries(PRIORITY_CRITERIA.map((c) => [c.key, f[`s_${c.key}`] ? Number(f[`s_${c.key}`]) : need.scores?.[c.key]]).filter(([, x]) => x != null));
      const score = priorityScore(scores, w);
      const band = priorityBand(score, scores);
      const override = v("override");
      return (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Califique de 1 (muy bajo) a 5 (muy alto). Para «Factibilidad», 5 significa muy fácil de resolver. La metodología y sus pesos son una propuesta institucional, no una exigencia normativa.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRIORITY_CRITERIA.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2 rounded-xl bg-leaf px-3 py-2">
                <label htmlFor={`s-${c.key}`} className="text-sm">
                  {c.label} <span className="text-ink-faint">({w[c.key] ?? 0} %)</span>
                </label>
                <select id={`s-${c.key}`} className="input w-20 py-1.5" value={String(scores[c.key] ?? "")} onChange={(e) => set(`s_${c.key}`, e.target.value)}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
          <p className="rounded-xl border border-line px-4 py-3">
            Puntaje calculado: <strong className="font-display text-lg">{score ?? "—"}</strong> / 100 · Prioridad sugerida: <strong>{band ? PRIORITY_LABEL[band] : "—"}</strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-ov">Ajuste manual de prioridad</label>
              <select id="f-ov" className="input" value={override} onChange={(e) => set("override", e.target.value)}>
                <option value="">Usar la prioridad calculada</option>
                {Object.entries(PRIORITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
          {override && ta("justification", "Justificación del ajuste")}
          {btn("Aprobar prioridad", () => ({ scores, override: override || undefined, justification: v("justification") || undefined }))}
        </div>
      );
    }
    case "assign":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-as">Responsable</label>
              <select id="f-as" className="input" value={v("assignedToId", need.assignedToId ?? "")} onChange={(e) => set("assignedToId", e.target.value)}>
                <option value="">Elija una persona</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-due">Fecha de compromiso de respuesta</label>
              <input id="f-due" type="date" className="input" value={v("dueDate", plusDays(responseDays))} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>
          {ta("resources", "Recursos requeridos", undefined, false)}
          {btn("Asignar", () => ({ assignedToId: v("assignedToId", need.assignedToId ?? ""), dueDate: v("dueDate", plusDays(responseDays)), resourcesRequired: v("resources") || undefined }))}
        </div>
      );
    case "start":
      return (
        <div className="space-y-3">
          {ta("note", "Nota de inicio", undefined, false)}
          {btn("Iniciar ejecución", () => ({ note: v("note") || undefined }))}
        </div>
      );
    case "respond":
      return (
        <div className="space-y-3">
          {ta("response", "Respuesta al trabajador", "Este texto lo verá quien reportó al consultar su código. Use lenguaje claro y no incluya datos personales.")}
          {btn("Emitir respuesta", () => ({ response: v("response") }))}
        </div>
      );
    case "toVerification":
      return (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">La respuesta ya fue emitida. Envíe el caso a Calidad para verificar si la solución fue efectiva antes de cerrarlo.</p>
          {ta("note", "Nota", undefined, false)}
          {btn("Enviar a verificación", () => ({ note: v("note") || undefined }))}
        </div>
      );
    case "review":
      return (
        <div className="space-y-3">
          <fieldset>
            <legend className="label">Resultado de la evaluación</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[["EFECTIVA", "Efectiva", "Se cierra el caso"], ["PARCIALMENTE_EFECTIVA", "Parcialmente efectiva", "Se reabre"], ["NO_EFECTIVA", "No efectiva", "Se reabre"]].map(([k, l, h]) => (
                <label key={k} className={clsx("cursor-pointer rounded-xl border-2 px-3 py-2", v("result") === k ? "border-brand bg-brand-soft" : "border-line")}>
                  <input type="radio" name="result" className="sr-only" checked={v("result") === k} onChange={() => set("result", k)} />
                  <span className="block font-bold">{l}</span>
                  <span className="text-xs text-ink-muted">{h}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {ta("method", "¿Cómo se verificó?", "Ej.: ronda en el servicio, consulta breve al personal, revisión de registros, nueva medición.")}
          {ta("evidence", "Evidencia de la verificación", "Describa el soporte y dónde reposa (acta, registro, lista).")}
          {ta("notes", "Observaciones", undefined, false)}
          {btn("Registrar evaluación", () => ({ result: v("result"), method: v("method"), evidence: v("evidence"), notes: v("notes") || undefined }))}
        </div>
      );
    case "closeAdministrative":
      return (
        <div className="space-y-3">
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            El cierre administrativo NO es una evaluación de efectividad: se usa para duplicados, casos fuera de alcance o retirados. Se distingue en indicadores e informes.
          </p>
          {ta("justification", "Justificación")}
          {btn("Cerrar administrativamente", () => ({ justification: v("justification") }), "btn-danger")}
        </div>
      );
    case "reopen":
      return (
        <div className="space-y-3">
          {ta("reason", "Motivo de reapertura")}
          {btn("Reabrir", () => ({ reason: v("reason") }))}
        </div>
      );
    case "comment":
      return (
        <div className="space-y-3">
          {ta("note", "Nota de seguimiento")}
          {btn("Agregar nota", () => ({ note: v("note") }), "btn-ghost")}
        </div>
      );
    case "group":
      return (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Agrupe necesidades repetidas bajo una principal. Esta conserva su origen y trazabilidad; la gestión se hace en la principal.</p>
          <select className="input" aria-label="Necesidad principal" value={v("parentId", need.groupParentId ?? "")} onChange={(e) => set("parentId", e.target.value)}>
            <option value="">No agrupar (quitar agrupación)</option>
            {groupCandidates.map((g) => <option key={g.id} value={g.id}>{g.code}: {g.title}</option>)}
          </select>
          {btn("Guardar agrupación", () => ({ parentId: v("parentId", need.groupParentId ?? "") || null }), "btn-ghost")}
        </div>
      );
    case "publish":
      return (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Aparecerá en «Tú lo propusiste, el hospital lo hizo» del portal. Describa la mejora sin datos personales ni detalles que permitan identificar a quien la propuso.</p>
          <textarea className="input min-h-[90px]" aria-label="Resumen público" maxLength={600} value={v("publicSummary", need.publicSummary ?? "")} onChange={(e) => set("publicSummary", e.target.value)} />
          <div className="flex gap-2">
            {btn(need.publishImprovement ? "Actualizar publicación" : "Publicar en el portal", () => ({ publish: true, publicSummary: v("publicSummary", need.publicSummary ?? "") }))}
            {need.publishImprovement && btn("Retirar del portal", () => ({ publish: false }), "btn-ghost")}
          </div>
        </div>
      );
  }
}

// ─── Acciones ───────────────────────────────────────────────────
export function AddActionForm({ needId, users }: { needId: string; users: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ description: "", responsibleId: "", startDate: "", dueDate: plusDays(15), verificationMeans: "", resources: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setOpen(true)}>Registrar acción</button>;
  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/needs/${needId}/actions`, "POST", { ...f, startDate: f.startDate || undefined, resources: f.resources || undefined });
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <div>
        <label className="label" htmlFor="a-d">Acción</label>
        <textarea id="a-d" className="input min-h-[70px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="a-r">Responsable</label>
          <select id="a-r" className="input" value={f.responsibleId} onChange={(e) => setF({ ...f, responsibleId: e.target.value })}>
            <option value="">Elija</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-due">Fecha límite</label>
          <input id="a-due" type="date" className="input" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="a-s">Fecha de inicio <span className="font-normal text-ink-muted">(opcional)</span></label>
          <input id="a-s" type="date" className="input" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="a-v">Medio de verificación</label>
          <input id="a-v" className="input" placeholder="Acta, registro fotográfico, lista de asistencia…" value={f.verificationMeans} onChange={(e) => setF({ ...f, verificationMeans: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="a-res">Recursos <span className="font-normal text-ink-muted">(opcional)</span></label>
        <input id="a-res" className="input" value={f.resources} onChange={(e) => setF({ ...f, resources: e.target.value })} />
      </div>
      {err && <p role="alert" className="rounded-xl bg-risk-soft px-3 py-2 text-sm text-risk">{err}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={submit}>{busy ? "Guardando…" : "Guardar acción"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}

export function ActionUpdate({ actionId, status, evidence }: { actionId: string; status: string; evidence: string | null }) {
  const [s, setS] = useState(status);
  const [ev, setEv] = useState(evidence ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/actions/${actionId}`, "PATCH", { status: s, evidence: ev || undefined });
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Estado de la acción" className="input w-auto py-1.5 text-sm" value={s} onChange={(e) => setS(e.target.value)}>
          <option value="PROGRAMADA">Programada</option>
          <option value="EN_CURSO">En curso</option>
          <option value="COMPLETADA">Completada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <button type="button" className="btn-ghost min-h-0 py-1.5 text-sm" disabled={busy} onClick={save}>Actualizar</button>
      </div>
      <textarea aria-label="Evidencia" className="input min-h-[60px] text-sm" placeholder="Evidencia (obligatoria para completar)" value={ev} onChange={(e) => setEv(e.target.value)} />
      {err && <p role="alert" className="text-sm text-risk">{err}</p>}
    </div>
  );
}
