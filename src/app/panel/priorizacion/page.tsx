import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { DEFAULT_WEIGHTS } from "@/lib/priority";
import { PageHeader } from "@/components/ui";
import { WeightsForm } from "@/components/client/settings";

export default async function Prioritization() {
  const user = await requirePageUser("priority.configure", "/panel/priorizacion");
  const inst = (await db.query.institutions.findFirst({ where: eq(schema.institutions.id, user.institutionId) }))!;
  return (
    <div>
      <PageHeader
        title="Metodología de priorización"
        description="Matriz ponderada propuesta. Los pesos no son una exigencia normativa: deben ser revisados y aprobados por un responsable autorizado. Cada priorización registra la versión de la metodología vigente."
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-2 text-lg font-bold">Pesos por criterio</h2>
          <WeightsForm initial={inst.priorityWeights ?? DEFAULT_WEIGHTS} approvedBy={inst.priorityApprovedBy} approvedAt={inst.priorityApprovedAt?.toISOString() ?? null} />
        </section>
        <section className="panel space-y-3 p-5 text-sm">
          <h2 className="text-lg font-bold">Cómo se calcula</h2>
          <p>Cada criterio se califica de 1 a 5. El puntaje es el promedio ponderado normalizado a 0–100.</p>
          <ul className="space-y-1">
            <li><strong>Crítica:</strong> 75 o más, o impacto 5 en seguridad del paciente.</li>
            <li><strong>Alta:</strong> 55 a 74.</li>
            <li><strong>Media:</strong> 35 a 54.</li>
            <li><strong>Baja:</strong> menos de 35.</li>
          </ul>
          <p>Las necesidades críticas se marcan como urgentes y se separan de las ordinarias en la bandeja y el tablero.</p>
          <p>Quien prioriza puede ajustar el resultado, pero debe justificarlo; el ajuste queda en la trazabilidad.</p>
        </section>
      </div>
    </div>
  );
}
