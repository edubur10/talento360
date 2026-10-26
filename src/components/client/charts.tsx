"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND = "rgb(30 91 79)";
const SUN = "rgb(212 145 20)";
const GRID = "#E3EBE6";
const AXIS = { fontSize: 12, fill: "#55665F" };

export function ParetoChart({ data }: { data: { label: string; value: number; cumulative: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} interval={0} angle={-25} textAnchor="end" height={60} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis yAxisId="l" tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
        <Tooltip formatter={(v, n) => (n === "Acumulado" ? [`${v} %`, n] : [v, n])} contentStyle={{ borderRadius: 12, borderColor: GRID }} />
        <Bar yAxisId="l" dataKey="value" name="Necesidades" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={44} />
        <Line yAxisId="r" dataKey="cumulative" name="Acumulado" stroke={SUN} strokeWidth={2.5} dot={{ r: 3, fill: SUN }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: { label: string; recibidas: number; cerradas: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, borderColor: GRID }} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line dataKey="recibidas" name="Recibidas" stroke={BRAND} strokeWidth={2.5} dot={false} />
        <Line dataKey="cerradas" name="Cerradas" stroke={SUN} strokeWidth={2.5} dot={false} strokeDasharray="5 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HBarChart({ data, height = 300 }: { data: { label: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} width={150} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, borderColor: GRID }} />
        <Bar dataKey="value" name="Necesidades" fill={BRAND} radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Distribución 1–5 de una pregunta de escala (barras apiladas horizontales sencillas). */
export function ScaleDistribution({ dist }: { dist: number[] }) {
  const total = dist.reduce((s, x) => s + x, 0) || 1;
  const colors = ["#B93A26", "#E08A6E", "#C9D3CE", "#6FA391", "#1E5B4F"];
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label={`Distribución: ${dist.map((d, i) => `${i + 1}: ${d}`).join(", ")}`}>
      {dist.map((d, i) => (d > 0 ? <div key={i} style={{ width: `${(d / total) * 100}%`, background: colors[i] }} title={`${i + 1}: ${d}`} /> : null))}
    </div>
  );
}
