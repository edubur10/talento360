import clsx from "clsx";
import type { IndicatorResult } from "@/lib/indicators";

const TONE = {
  ok: { bar: "bg-ok", text: "text-ok", label: "Cumple la meta" },
  warn: { bar: "bg-warn", text: "text-warn", label: "Cerca de la meta" },
  risk: { bar: "bg-risk", text: "text-risk", label: "Por debajo de la meta" },
  na: { bar: "bg-line", text: "text-ink-faint", label: "Sin datos suficientes" },
};

/** Indicador con semáforo, meta y numerador/denominador visibles (fórmula transparente). */
export function IndicatorRow({ i }: { i: IndicatorResult }) {
  const t = TONE[i.status];
  const w = i.value == null ? 0 : Math.min(100, i.value);
  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold">{i.name}</p>
        <p className={clsx("font-display text-2xl font-bold tabular-nums", i.value == null ? "text-base text-ink-faint" : t.text)}>{i.display}</p>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-leaf">
        <div className={clsx("h-full rounded-full", t.bar)} style={{ width: `${w}%` }} />
        <div className="absolute -top-1 h-[18px] w-0.5 bg-ink/60" style={{ left: `${Math.min(100, i.target)}%` }} title={`Meta ${i.target} %`} aria-hidden="true" />
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-sm text-ink-muted">
        <span>
          {i.numerator} de {i.denominator}
          {i.note ? `. ${i.note}` : ""}
        </span>
        <span>
          <span className="sr-only">{t.label}. </span>Meta {i.target} %
        </span>
      </div>
    </li>
  );
}
