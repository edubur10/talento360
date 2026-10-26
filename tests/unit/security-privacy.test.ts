import { describe, expect, it } from "vitest";
import { can, permissionsOf, ROLES } from "@/lib/permissions";
import { hashToken, newTrackingCode, normalizeTrackingCode, startOfDayBogota, suppressDistribution, suppressSmall, todayDateOnly } from "@/lib/privacy";
import { DEFAULT_WEIGHTS, priorityBand, priorityScore } from "@/lib/priority";
import { isVisible, validateAnswer, type QLogic } from "@/lib/form-logic";

describe("Permisos (mínimo privilegio)", () => {
  it("el administrador técnico no puede ver necesidades ni identidad", () => {
    expect(can("ADMIN_TECNICO", "needs.viewAll")).toBe(false);
    expect(can("ADMIN_TECNICO", "needs.viewReporterIdentity")).toBe(false);
    expect(can("ADMIN_TECNICO", "users.manage")).toBe(true);
  });
  it("solo Talento Humano ve la identidad en campañas confidenciales", () => {
    expect(ROLES.filter((r) => can(r, "needs.viewReporterIdentity"))).toEqual(["TALENTO_HUMANO"]);
  });
  it("el colaborador no accede al panel", () => {
    expect(permissionsOf("COLABORADOR")).toEqual([]);
  });
  it("el auditor solo consulta", () => {
    expect(can("AUDITOR", "needs.manage")).toBe(false);
    expect(can("AUDITOR", "export.data")).toBe(false);
    expect(can("AUDITOR", "audit.view")).toBe(true);
  });
});

describe("Privacidad", () => {
  it("genera códigos de seguimiento con formato y sin caracteres confundibles", () => {
    const codes = new Set(Array.from({ length: 500 }, newTrackingCode));
    expect(codes.size).toBe(500);
    for (const c of codes) expect(c).toMatch(/^T360-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeTrackingCode(" t360-abcd-efgh ")).toBe("T360-ABCD-EFGH");
    expect(hashToken("a")).toHaveLength(64);
  });
  it("trunca la fecha al día en hora de Colombia", () => {
    expect(todayDateOnly(new Date("2026-10-09T03:00:00Z"))).toBe("2026-10-08");
    expect(startOfDayBogota("2026-10-08").toISOString()).toBe("2026-10-08T05:00:00.000Z");
  });
  it("suprime grupos pequeños", () => {
    expect(suppressSmall(4, 5)).toBeNull();
    expect(suppressSmall(5, 5)).toBe(5);
  });
  it("no permite deducir un único grupo oculto por diferencia", () => {
    const r = suppressDistribution([{ label: "A", count: 10 }, { label: "B", count: 3 }], 5);
    expect(r.find((b) => b.label.startsWith("Otros"))!.value).toBeNull();
    const r2 = suppressDistribution([{ label: "A", count: 10 }, { label: "B", count: 3 }, { label: "C", count: 3 }], 5);
    expect(r2.find((b) => b.label.startsWith("Otros"))!.value).toBe(6);
  });
});

describe("Priorización propuesta", () => {
  it("normaliza a 0–100", () => {
    const all5 = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 5]));
    const all1 = Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 1]));
    expect(priorityScore(all5)).toBe(100);
    expect(priorityScore(all1)).toBe(0);
    expect(priorityScore({})).toBeNull();
  });
  it("impacto máximo en seguridad del paciente es siempre crítico", () => {
    expect(priorityBand(10, { seguridadPaciente: 5 })).toBe("CRITICA");
    expect(priorityBand(40, {})).toBe("MEDIA");
  });
  it("rechaza calificaciones fuera de rango", () => {
    expect(() => priorityScore({ trabajador: 7 })).toThrow();
  });
});

describe("Lógica del formulario", () => {
  const q = (o: Partial<QLogic>): QLogic => ({ code: "X", type: "ESCALA", required: false, allowNA: true, showIfCode: null, showIfValues: null, onlyForEmploymentCodes: null, ...o });
  it("muestra preguntas condicionales solo cuando aplica", () => {
    const cond = q({ showIfCode: "A1", showIfValues: ["1", "2"] });
    expect(isVisible(cond, { A1: { value: 2 } }, null)).toBe(true);
    expect(isVisible(cond, { A1: { value: 4 } }, null)).toBe(false);
    expect(isVisible(cond, { A1: { value: null, na: true } }, null)).toBe(false);
  });
  it("ramifica por modalidad de vinculación", () => {
    const docencia = q({ onlyForEmploymentCodes: ["FORMACION"] });
    expect(isVisible(docencia, {}, "FORMACION")).toBe(true);
    expect(isVisible(docencia, {}, "PLANTA")).toBe(false);
    expect(isVisible(docencia, {}, null)).toBe(false);
  });
  it("valida tipos y rangos en el servidor", () => {
    expect(validateAnswer(q({}), { value: 6 })).not.toBeNull();
    expect(validateAnswer(q({ type: "UNICA", options: ["a"] }), { value: "b" })).not.toBeNull();
    expect(validateAnswer(q({ allowNA: false }), { value: null, na: true })).not.toBeNull();
    expect(validateAnswer(q({ type: "MULTIPLE", options: ["a", "b"] }), { value: ["a"] })).toBeNull();
  });
});
