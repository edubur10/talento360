import { describe, expect, it } from "vitest";
import { availableOperations, canApply, nextStatus, WorkflowError } from "@/lib/workflow";

describe("Ciclo de vida de la necesidad", () => {
  it("recorre el flujo completo hasta el cierre con efectividad verificada", () => {
    let s = nextStatus("classify", "RECIBIDA");
    expect(s).toBe("CLASIFICADA");
    s = nextStatus("analyze", s);
    expect(s).toBe("EN_ANALISIS");
    s = nextStatus("prioritize", s);
    expect(s).toBe("PRIORIZADA");
    s = nextStatus("assign", s);
    expect(s).toBe("ASIGNADA");
    s = nextStatus("start", s);
    expect(s).toBe("EN_EJECUCION");
    s = nextStatus("respond", s);
    expect(s).toBe("RESPUESTA_EMITIDA");
    s = nextStatus("toVerification", s);
    expect(s).toBe("PENDIENTE_EFECTIVIDAD");
    expect(nextStatus("review", s, { reviewResult: "EFECTIVA" })).toBe("CERRADA");
  });

  it("reabre cuando la evaluación es no efectiva o parcial", () => {
    expect(nextStatus("review", "PENDIENTE_EFECTIVIDAD", { reviewResult: "NO_EFECTIVA" })).toBe("REABIERTA");
    expect(nextStatus("review", "PENDIENTE_EFECTIVIDAD", { reviewResult: "PARCIALMENTE_EFECTIVA" })).toBe("REABIERTA");
  });

  it("no permite saltarse pasos", () => {
    expect(() => nextStatus("respond", "RECIBIDA")).toThrow(WorkflowError);
    expect(() => nextStatus("review", "RESPUESTA_EMITIDA", { reviewResult: "EFECTIVA" })).toThrow(WorkflowError);
    expect(() => nextStatus("assign", "CLASIFICADA")).toThrow(WorkflowError);
  });

  it("la evaluación de efectividad exige resultado", () => {
    expect(() => nextStatus("review", "PENDIENTE_EFECTIVIDAD")).toThrow(/resultado/);
  });

  it("una necesidad cerrada solo puede reabrirse", () => {
    expect(availableOperations("CERRADA")).toEqual(["reopen"]);
    expect(canApply("closeAdministrative", "CERRADA")).toBe(false);
  });

  it("el cierre administrativo es un camino distinto de la verificación", () => {
    expect(nextStatus("closeAdministrative", "CLASIFICADA")).toBe("CERRADA");
  });
});
