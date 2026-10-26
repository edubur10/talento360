"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "./api";
import { isAnswered, isVisible, type AnswerState } from "@/lib/form-logic";
import { SECTIONS } from "@/lib/instrument";
import { CATEGORY_LABEL } from "@/lib/th1";
import type { NeedCategory } from "@/db/schema";

interface Q {
  id: string;
  code: string;
  section: string;
  text: string;
  help: string | null;
  type: "ESCALA" | "UNICA" | "MULTIPLE" | "TEXTO" | "SI_NO";
  options: string[] | null;
  required: boolean;
  allowNA: boolean;
  showIfCode: string | null;
  showIfValues: string[] | null;
  onlyForEmploymentCodes: string[] | null;
}
interface Props {
  slug: string;
  title: string;
  description: string;
  mode: "ANONIMA" | "CONFIDENCIAL";
  questions: Q[];
  employmentTypes: { code: string; name: string }[];
  services: { id: string; name: string }[];
  userName?: string | null;
}
interface NeedDraft {
  category: NeedCategory | "";
  description: string;
  proposal: string;
  affectsPatientSafety: boolean;
}
const emptyNeed = (): NeedDraft => ({ category: "", description: "", proposal: "", affectsPatientSafety: false });
const NEED_CATEGORIES = Object.entries(CATEGORY_LABEL).filter(([k]) => k !== "OTRA").concat([["OTRA", "Otra"]]) as [NeedCategory, string][];

export function CampaignForm(p: Props) {
  const confidential = p.mode === "CONFIDENCIAL";
  const draftKey = `t360-borrador-${p.slug}`;
  const [step, setStep] = useState(-1); // -1 = presentación
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [serviceId, setServiceId] = useState<string>("");
  const [needs, setNeeds] = useState<NeedDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ trackingCode: string; needCodes: string[] } | null>(null);
  const [restored, setRestored] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Borrador solo en participación identificada (en anónima no se guarda nada en el dispositivo: puede ser compartido).
  useEffect(() => {
    if (!confidential) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setAnswers(d.answers ?? {});
        setNeeds(d.needs ?? []);
        setServiceId(d.serviceId ?? "");
        setRestored(true);
      }
    } catch {
      /* almacenamiento no disponible */
    }
  }, [confidential, draftKey]);
  useEffect(() => {
    if (!confidential || done) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ answers, needs, serviceId }));
    } catch {
      /* sin almacenamiento */
    }
  }, [answers, needs, serviceId, confidential, draftKey, done]);

  const employmentCode = useMemo(() => p.employmentTypes.find((t) => t.name === answers.P1?.value)?.code ?? null, [answers.P1, p.employmentTypes]);
  const sectionKeys = useMemo(() => [...new Set(p.questions.map((q) => q.section))].concat("N"), [p.questions]);
  const currentSection = sectionKeys[step];
  const visibleIn = (s: string) => p.questions.filter((q) => q.section === s && isVisible(q, answers, employmentCode));
  const total = sectionKeys.length;

  const setAnswer = (code: string, a: AnswerState) => {
    setAnswers((prev) => ({ ...prev, [code]: a }));
    setMissing((m) => m.filter((x) => x !== code));
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validateStep = () => {
    if (currentSection === "N") {
      const bad = needs.findIndex((n) => !n.category || n.description.trim().length < 10);
      if (bad >= 0) {
        setError(`Completa la necesidad ${bad + 1}: elige un tema y descríbela con al menos 10 caracteres, o quítala.`);
        return false;
      }
      return true;
    }
    const miss = visibleIn(currentSection).filter((q) => q.required && !isAnswered(answers[q.code])).map((q) => q.code);
    setMissing(miss);
    if (miss.length) {
      setError(miss.length === 1 ? "Falta responder una pregunta marcada como obligatoria." : `Faltan ${miss.length} preguntas obligatorias.`);
      setTimeout(() => document.getElementById(`q-${miss[0]}`)?.focus(), 50);
      return false;
    }
    return true;
  };

  const next = () => {
    setError(null);
    if (step >= 0 && !validateStep()) return;
    setStep((s) => s + 1);
    scrollTop();
  };
  const prev = () => {
    setError(null);
    setStep((s) => s - 1);
    scrollTop();
  };

  const submit = async () => {
    setError(null);
    if (!validateStep()) return;
    setSending(true);
    try {
      const visibleAnswers: Record<string, AnswerState> = {};
      for (const q of p.questions) if (isVisible(q, answers, employmentCode) && isAnswered(answers[q.code])) visibleAnswers[q.code] = answers[q.code];
      const r = await api<{ trackingCode: string; needCodes: string[] }>(`/api/public/campaigns/${p.slug}/submit`, "POST", {
        answers: visibleAnswers,
        serviceId: serviceId || null,
        needs: needs.map((n) => ({ category: n.category, description: n.description.trim(), proposal: n.proposal.trim() || undefined, affectsPatientSafety: n.affectsPatientSafety })),
        consent: true,
      });
      setDone(r);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      scrollTop();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (done) return <Confirmation done={done} confidential={confidential} />;

  return (
    <div ref={topRef} className="scroll-mt-4">
      {step === -1 ? (
        <section aria-labelledby="titulo-campana">
          <span className={clsx("chip", confidential ? "bg-violet-50 text-violet-800" : "bg-brand-soft text-brand")}>{confidential ? "Participación confidencial" : "Participación anónima"}</span>
          <h1 id="titulo-campana" className="mt-3 text-3xl font-extrabold sm:text-4xl">
            {p.title}
          </h1>
          {p.userName && <p className="mt-2 text-lg">Hola, {p.userName.split(" ")[0]}.</p>}
          <p className="mt-3 text-lg text-ink-muted">{p.description}</p>
          <ul className="mt-6 space-y-3">
            <li className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sun" aria-hidden />
              <span>Toma unos 10 minutos. Son {total} pasos cortos y puedes volver atrás cuando quieras.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sun" aria-hidden />
              <span>Las preguntas con asterisco (*) son obligatorias. Si una no aplica a tu trabajo, marca «No aplica».</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sun" aria-hidden />
              {confidential ? (
                <span>Tus respuestas quedan asociadas a tu usuario para que Talento Humano pueda contactarte. Se guarda un borrador en este dispositivo mientras respondes.</span>
              ) : (
                <span>No pedimos tu nombre ni guardamos la hora o el equipo desde el que respondes. Por eso no se guarda borrador: si cierras la página, tus respuestas se pierden.</span>
              )}
            </li>
          </ul>
          {restored && <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-brand">Recuperamos las respuestas que dejaste guardadas en este dispositivo.</p>}
          <div className="mt-6 rounded-2xl border border-line bg-leaf p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--brand))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Leí el{" "}
                <Link href="/privacidad" target="_blank" className="link">
                  aviso de tratamiento de datos
                </Link>{" "}
                y acepto participar. Entiendo que mis respuestas se usarán para mejorar las condiciones de trabajo y que los resultados se publican de forma agrupada.
              </span>
            </label>
          </div>
          <button type="button" className="btn-sun mt-6 w-full px-6 py-4 text-lg sm:w-auto" disabled={!consent} onClick={next}>
            Comenzar
          </button>
        </section>
      ) : (
        <section aria-labelledby="titulo-seccion">
          <Progress step={step} total={total} />
          <h2 id="titulo-seccion" className="mt-6 text-2xl font-bold sm:text-3xl">
            {SECTIONS[currentSection]?.title}
          </h2>
          <p className="mt-1 text-ink-muted">{SECTIONS[currentSection]?.intro}</p>

          <div className="mt-6 space-y-5">
            {currentSection === "N" ? (
              <NeedsStep needs={needs} setNeeds={setNeeds} />
            ) : (
              <>
                {visibleIn(currentSection).map((q) => (
                  <QuestionCard key={q.code} q={q} value={answers[q.code]} onChange={(a) => setAnswer(q.code, a)} invalid={missing.includes(q.code)} />
                ))}
                {currentSection === "P" && p.services.length > 0 && (
                  <div className="panel p-4 sm:p-5">
                    <label htmlFor="servicio" className="font-bold">
                      ¿En qué servicio trabajas? <span className="font-normal text-ink-muted">(opcional)</span>
                    </label>
                    <p className="hint">
                      {confidential ? "Ayuda a dirigir tu necesidad al área correcta." : "Si tu servicio tiene muy pocas personas, puedes no indicarlo. Los resultados de grupos pequeños nunca se muestran."}
                    </p>
                    <select id="servicio" className="input mt-2" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                      <option value="">Prefiero no indicarlo</option>
                      {p.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-risk/30 bg-risk-soft px-4 py-3 text-risk">
              {error}
            </p>
          )}

          <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <button type="button" className="btn-ghost flex-1 sm:flex-none" onClick={prev}>
              Anterior
            </button>
            {step < total - 1 ? (
              <button type="button" className="btn-primary flex-[2] sm:flex-none sm:px-8" onClick={next}>
                Siguiente
              </button>
            ) : (
              <button type="button" className="btn-sun flex-[2] sm:flex-none sm:px-8" onClick={submit} disabled={sending}>
                {sending ? "Enviando…" : "Enviar mi participación"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm text-ink-muted">
        <span>
          Paso {step + 1} de {total}
        </span>
        <span>{pct} %</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-leaf" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del formulario">
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionCard({ q, value, onChange, invalid }: { q: Q; value: AnswerState | undefined; onChange: (a: AnswerState) => void; invalid: boolean }) {
  const na = value?.na;
  const labelId = `l-${q.code}`;
  return (
    <fieldset
      id={`q-${q.code}`}
      tabIndex={-1}
      aria-describedby={q.help ? `h-${q.code}` : undefined}
      className={clsx("panel p-4 outline-none sm:p-5", invalid && "border-risk ring-2 ring-risk/20")}
    >
      <legend id={labelId} className="float-left w-full font-bold leading-snug">
        {q.text}
        {q.required && <span className="text-risk"> *</span>}
      </legend>
      {q.help && (
        <p id={`h-${q.code}`} className="hint clear-both pt-1">
          {q.help}
        </p>
      )}
      <div className="clear-both pt-3">
        {q.type === "ESCALA" && (
          <div>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby={labelId}>
              {[1, 2, 3, 4, 5].map((n) => {
                const sel = !na && Number(value?.value) === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => onChange({ value: n })}
                    className={clsx(
                      "min-h-[52px] rounded-xl border-2 font-display text-xl font-bold transition-colors",
                      sel ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-xs text-ink-muted">
              <span>{q.code === "D4" ? "Nunca" : "En desacuerdo"}</span>
              <span>{q.code === "D4" ? "Casi siempre" : "De acuerdo"}</span>
            </div>
          </div>
        )}
        {q.type === "SI_NO" && (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby={labelId}>
            {["Sí", "No"].map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={!na && value?.value === o}
                onClick={() => onChange({ value: o })}
                className={clsx("min-h-[48px] rounded-xl border-2 font-bold", !na && value?.value === o ? "border-brand bg-brand text-white" : "border-line hover:border-brand")}
              >
                {o}
              </button>
            ))}
          </div>
        )}
        {q.type === "UNICA" && (
          <div className="space-y-2" role="radiogroup" aria-labelledby={labelId}>
            {(q.options ?? []).map((o) => (
              <label key={o} className={clsx("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2", value?.value === o ? "border-brand bg-brand-soft" : "border-line hover:border-brand")}>
                <input type="radio" name={q.code} className="h-5 w-5 accent-[rgb(var(--brand))]" checked={value?.value === o} onChange={() => onChange({ value: o })} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        )}
        {q.type === "MULTIPLE" && (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Puedes elegir varias.</p>
            {(q.options ?? []).map((o) => {
              const arr = Array.isArray(value?.value) ? (value!.value as string[]) : [];
              const on = arr.includes(o);
              return (
                <label key={o} className={clsx("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2", on ? "border-brand bg-brand-soft" : "border-line hover:border-brand")}>
                  <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--brand))]" checked={on} onChange={() => onChange({ value: on ? arr.filter((x) => x !== o) : [...arr, o] })} />
                  <span>{o}</span>
                </label>
              );
            })}
          </div>
        )}
        {q.type === "TEXTO" && (
          <div>
            <textarea
              aria-labelledby={labelId}
              className="input min-h-[110px]"
              maxLength={2000}
              value={typeof value?.value === "string" ? value.value : ""}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Escribe aquí con tus palabras…"
            />
            <p className="mt-1 text-right text-xs text-ink-faint">{(typeof value?.value === "string" ? value.value.length : 0).toLocaleString("es-CO")} / 2.000</p>
          </div>
        )}
        {q.allowNA && q.type !== "TEXTO" && (
          <button
            type="button"
            aria-pressed={!!na}
            onClick={() => onChange(na ? { value: null } : { value: null, na: true })}
            className={clsx("mt-3 rounded-lg px-3 py-1.5 text-sm font-bold", na ? "bg-ink text-white" : "text-ink-muted underline underline-offset-4 hover:text-ink")}
          >
            {na ? "Marcado como «No aplica»" : "No aplica a mi trabajo"}
          </button>
        )}
      </div>
    </fieldset>
  );
}

function NeedsStep({ needs, setNeeds }: { needs: NeedDraft[]; setNeeds: (n: NeedDraft[]) => void }) {
  const update = (i: number, patch: Partial<NeedDraft>) => setNeeds(needs.map((n, j) => (j === i ? { ...n, ...patch } : n)));
  return (
    <div className="space-y-5">
      {needs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-leaf/60 px-5 py-6">
          <p>Este paso es opcional. Si hay algo concreto que quieras que el hospital resuelva, regístralo aquí y recibirá seguimiento con fecha y responsable.</p>
        </div>
      )}
      {needs.map((n, i) => (
        <div key={i} className="panel space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Necesidad {i + 1}</h3>
            <button type="button" className="text-sm font-bold text-risk underline underline-offset-4" onClick={() => setNeeds(needs.filter((_, j) => j !== i))}>
              Quitar
            </button>
          </div>
          <div>
            <label className="label" htmlFor={`nc-${i}`}>
              ¿Sobre qué tema es? <span className="text-risk">*</span>
            </label>
            <select id={`nc-${i}`} className="input" value={n.category} onChange={(e) => update(i, { category: e.target.value as NeedCategory })}>
              <option value="">Elige un tema</option>
              {NEED_CATEGORIES.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`nd-${i}`}>
              ¿Qué necesitas o qué está pasando? <span className="text-risk">*</span>
            </label>
            <textarea id={`nd-${i}`} className="input min-h-[100px]" maxLength={2000} value={n.description} onChange={(e) => update(i, { description: e.target.value })} />
            {!n.description.trim() || n.description.trim().length >= 10 ? null : <p className="hint text-risk">Escribe al menos 10 caracteres.</p>}
            <p className="hint">Evita escribir nombres de personas o datos de pacientes.</p>
          </div>
          <div>
            <label className="label" htmlFor={`np-${i}`}>
              ¿Tienes una propuesta para resolverlo? <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <textarea id={`np-${i}`} className="input min-h-[80px]" maxLength={1000} value={n.proposal} onChange={(e) => update(i, { proposal: e.target.value })} />
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--brand))]" checked={n.affectsPatientSafety} onChange={(e) => update(i, { affectsPatientSafety: e.target.checked })} />
            <span>Esta situación puede afectar la seguridad de los pacientes</span>
          </label>
        </div>
      ))}
      {needs.length < 3 && (
        <button type="button" className="btn-ghost w-full border-dashed py-3" onClick={() => setNeeds([...needs, emptyNeed()])}>
          {needs.length === 0 ? "Registrar una necesidad concreta" : "Agregar otra necesidad"}
        </button>
      )}
      <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
        Si se trata de acoso laboral, una emergencia o un riesgo inmediato para pacientes o trabajadores, usa también los canales institucionales directos (Comité de Convivencia Laboral, Seguridad y Salud en el Trabajo o el líder de tu servicio). Esta plataforma no reemplaza esos canales.
      </p>
    </div>
  );
}

function Confirmation({ done, confidential }: { done: { trackingCode: string; needCodes: string[] }; confidential: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="rise text-center" aria-live="polite">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-ok" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-4 text-3xl font-extrabold">Gracias, recibimos tu participación</h1>
      <p className="mx-auto mt-2 max-w-md text-lg text-ink-muted">Tu voz ya está en manos del equipo de Talento Humano.</p>
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border-2 border-dashed border-brand bg-brand-soft px-5 py-6">
        <p className="text-sm font-bold text-brand">Tu código de seguimiento</p>
        <p className="mt-1 select-all font-display text-3xl font-extrabold tracking-wide text-ink" data-testid="tracking-code">
          {done.trackingCode}
        </p>
        <button
          type="button"
          className="btn-ghost mt-3 text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(done.trackingCode);
              setCopied(true);
            } catch {}
          }}
        >
          {copied ? "Código copiado" : "Copiar código"}
        </button>
      </div>
      <p className="mx-auto mt-4 max-w-md text-sm text-ink-muted">
        {confidential
          ? "También puedes ver el estado de tus necesidades en «Mi espacio»."
          : "Anota o toma una foto de este código. Como tu participación es anónima, no podemos recuperarlo si lo pierdes."}
      </p>
      {done.needCodes.length > 0 && (
        <p className="mt-4">
          Necesidades registradas: <strong>{done.needCodes.join(", ")}</strong>
        </p>
      )}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/seguimiento" className="btn-primary">
          Consultar mi caso
        </Link>
        <Link href={confidential ? "/mi-espacio" : "/"} className="btn-ghost">
          {confidential ? "Ir a Mi espacio" : "Volver al inicio"}
        </Link>
      </div>
    </section>
  );
}
