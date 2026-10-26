/** Convierte colores institucionales en variables CSS (canales RGB) con variantes oscura y suave. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [30, 91, 79];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (c: [number, number, number], t: [number, number, number], p: number) =>
  c.map((v, i) => Math.round(v + (t[i] - v) * p)) as [number, number, number];
const ch = (c: number[]) => c.join(" ");

export function themeVars(primary: string, accent: string) {
  const p = hexToRgb(primary);
  const a = hexToRgb(accent);
  return {
    "--brand": ch(p),
    "--brand-dark": ch(mix(p, [0, 0, 0], 0.35)),
    "--brand-soft": ch(mix(p, [255, 255, 255], 0.88)),
    "--sun": ch(a),
    "--sun-dark": ch(mix(a, [0, 0, 0], 0.3)),
  } as Record<string, string>;
}
