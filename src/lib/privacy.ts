/**
 * Utilidades de privacidad desde el diseño.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin caracteres confundibles (0/O, 1/I/L)

/** Código de seguimiento que se entrega al participante una sola vez. Se guarda solo su hash. */
export function newTrackingCode() {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `T360-${pick(4)}-${pick(4)}`;
}

export function normalizeTrackingCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

/** Fecha del día (YYYY-MM-DD, hora de Colombia) sin componente horario. */
export function todayDateOnly(now = new Date()) {
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

/** Medianoche (hora de Colombia) del día dado: se usa como fecha de recepción en participaciones anónimas. */
export function startOfDayBogota(dateOnly: string) {
  return new Date(`${dateOnly}T05:00:00.000Z`);
}

/**
 * Supresión de grupos pequeños: devuelve el conteo solo si alcanza el umbral;
 * si no, null (la interfaz muestra «Grupo pequeño: oculto»).
 */
export function suppressSmall(count: number, minGroupSize: number): number | null {
  return count >= minGroupSize ? count : null;
}

export interface Bucket {
  label: string;
  value: number | null;
  suppressed: boolean;
}

/**
 * Aplica la supresión a una distribución por grupos. Los grupos pequeños se
 * combinan en «Otros (grupos pequeños)» solo si la suma alcanza el umbral, y nunca
 * se permite deducir un grupo oculto restando del total cuando hay un único grupo oculto.
 */
export function suppressDistribution(rows: { label: string; count: number }[], minGroupSize: number): Bucket[] {
  const visible = rows.filter((r) => r.count >= minGroupSize);
  const hidden = rows.filter((r) => r.count > 0 && r.count < minGroupSize);
  const out: Bucket[] = visible.map((r) => ({ label: r.label, value: r.count, suppressed: false }));
  if (hidden.length > 0) {
    const sum = hidden.reduce((a, r) => a + r.count, 0);
    // Un solo grupo oculto con suma publicable lo revelaría por diferencia: se mantiene oculto.
    const publish = hidden.length > 1 && sum >= minGroupSize;
    out.push({ label: `Otros (${hidden.length} grupos pequeños)`, value: publish ? sum : null, suppressed: !publish });
  }
  return out;
}
