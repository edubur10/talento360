import { describe, expect, it } from "vitest";
import { computeIndicators, parsePeriod, type NeedLite } from "@/lib/indicators";

const period = { from: new Date("2026-01-01T05:00:00Z"), to: new Date("2026-12-31T23:59:59Z") };
const now = new Date("2026-10-08T12:00:00Z");
const base: NeedLite = { id: "x", status: "RECIBIDA", receivedAt: new Date("2026-03-01T05:00:00Z"), respondedAt: null, dueDate: null, closedAt: null, closeType: null, groupParentId: null, hasEvidence: false };
const by = (r: ReturnType<typeof computeIndicators>, k: string) => r.find((i) => i.key === k)!;

describe("Indicadores", () => {
  it("muestra «No calculable» cuando el denominador es cero", () => {
    const r = computeIndicators({ period, now, needs: [], actions: [], reviews: [], campaigns: [] });
    for (const i of r) {
      expect(i.value).toBeNull();
      expect(i.display).toBe("No calculable");
      expect(i.status).toBe("na");
    }
  });

  it("calcula necesidades con respuesta excluyendo agrupadas y cierres administrativos sin respuesta", () => {
    const needs: NeedLite[] = [
      { ...base, id: "1", respondedAt: new Date("2026-03-05") },
      { ...base, id: "2" },
      { ...base, id: "3", groupParentId: "1" },
      { ...base, id: "4", status: "CERRADA", closeType: "ADMINISTRATIVO", closedAt: new Date("2026-03-02") },
    ];
    const i = by(computeIndicators({ period, now, needs, actions: [], reviews: [], campaigns: [] }), "necesidadesConRespuesta");
    expect(i.numerator).toBe(1);
    expect(i.denominator).toBe(2);
    expect(i.value).toBe(50);
  });

  it("oportunidad: cuenta respondidas a tiempo y vencidas sin respuesta", () => {
    const needs: NeedLite[] = [
      { ...base, id: "a", dueDate: new Date("2026-03-20T04:59:59Z"), respondedAt: new Date("2026-03-15") },
      { ...base, id: "b", dueDate: new Date("2026-03-10T04:59:59Z"), respondedAt: new Date("2026-03-15") },
      { ...base, id: "c", dueDate: new Date("2026-04-01T04:59:59Z") },
      { ...base, id: "d", dueDate: new Date("2026-11-30T04:59:59Z") }, // aún no vence
    ];
    const i = by(computeIndicators({ period, now, needs, actions: [], reviews: [], campaigns: [] }), "oportunidadRespuesta");
    expect([i.numerator, i.denominator]).toEqual([1, 3]);
  });

  it("efectividad se basa en evaluaciones, no en cierres", () => {
    const r = computeIndicators({
      period,
      now,
      needs: [{ ...base, status: "CERRADA", closeType: "ADMINISTRATIVO", closedAt: new Date("2026-05-01") }],
      actions: [],
      reviews: [
        { needId: "1", result: "EFECTIVA", reviewedAt: new Date("2026-05-01") },
        { needId: "2", result: "NO_EFECTIVA", reviewedAt: new Date("2026-05-02") },
      ],
      campaigns: [],
    });
    expect(by(r, "efectividad").value).toBe(50);
  });

  it("participación excluye campañas sin elegibles e informa la exclusión", () => {
    const i = by(
      computeIndicators({
        period,
        now,
        needs: [],
        actions: [],
        reviews: [],
        campaigns: [
          { id: "a", eligibleCount: 100, submissionsInPeriod: 40 },
          { id: "b", eligibleCount: null, submissionsInPeriod: 10 },
        ],
      }),
      "participacion",
    );
    expect(i.value).toBe(40);
    expect(i.note).toMatch(/excluida/);
  });

  it("cumplimiento de acciones ignora canceladas y aplica semáforo según meta", () => {
    const i = by(
      computeIndicators({
        period,
        now,
        needs: [],
        reviews: [],
        campaigns: [],
        actions: [
          { status: "COMPLETADA", dueDate: new Date("2026-02-01"), completedAt: new Date("2026-01-30") },
          { status: "PROGRAMADA", dueDate: new Date("2026-02-01"), completedAt: null },
          { status: "CANCELADA", dueDate: new Date("2026-02-01"), completedAt: null },
        ],
        targets: { cumplimientoAcciones: 90 },
      }),
      "cumplimientoAcciones",
    );
    expect([i.numerator, i.denominator, i.status]).toEqual([1, 2, "risk"]);
  });

  it("interpreta periodos en hora de Colombia", () => {
    const p = parsePeriod("2026-01-01", "2026-01-31");
    expect(p.from.toISOString()).toBe("2026-01-01T05:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-02-01T04:59:59.999Z");
  });
});
