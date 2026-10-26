import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePageUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CATEGORY_LABEL, th1Name } from "@/lib/th1";
import { ESCALATION_LABEL, STATUS_LABEL } from "@/lib/workflow";
import { PRIORITY_CRITERIA } from "@/lib/priority";
import { assignableUsers, getNeed } from "@/server/needs";
import { PriorityBadge, StatusBadge, fmtDate, fmtDateTime } from "@/components/ui";
import { ActionUpdate, AddActionForm, NeedWorkbench } from "@/components/client/need-workbench";

const EVENT_LABEL: Record<string, string> = {
  CREADA: "Necesidad registrada",
  CLASSIFY: "Clasificada",
  ANALYZE: "Análisis registrado",
  PRIORITIZE: "Priorizada",
  ASSIGN: "Responsable asignado",
  START: "Ejecución iniciada",
  RESPOND: "Respuesta emitida",
  TOVERIFICATION: "Enviada a verificación de efectividad",
  EVALUACION_EFECTIVIDAD: "Evaluación de efectividad",
  CLOSEADMINISTRATIVE: "Cierre administrativo",
  REOPEN: "Reabierta",
  COMMENT: "Nota de seguimiento",
  GROUP: "Agrupación actualizada",
  PUBLISH: "Publicación en el portal",
  ACCION_REGISTRADA: "Acción registrada",
  ACCION_ACTUALIZADA: "Acción actualizada",
};
const RESULT_LABEL: Record<string, string> = { EFECTIVA: "Efectiva", PARCIALMENTE_EFECTIVA: "Parcialmente efectiva", NO_EFECTIVA: "No efectiva" };
const ACTION_LABEL: Record<string, string> = { PROGRAMADA: "Programada", EN_CURSO: "En curso", COMPLETADA: "Completada", CANCELADA: "Cancelada" };

export default async function NeedDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["needs.viewAll", "needs.viewScoped"], `/panel/necesidades/${id}`);
  const n = await getNeed(user, id);
  if (!n) notFound();
  const inst = (await db.query.institutions.findFirst({ where: eq(schema.institutions.id, user.institutionId) }))!;
  const manage = can(user.role, "needs.manage");
  const [users, services, groupCandidates] = await Promise.all([
    assignableUsers(user.institutionId),
    db.select({ id: schema.services.id, name: schema.services.name }).from(schema.services).where(and(eq(schema.services.institutionId, user.institutionId), eq(schema.services.active, true))).orderBy(asc(schema.services.name)),
    manage
      ? db
          .select({ id: schema.needs.id, code: schema.needs.code, title: schema.needs.title })
          .from(schema.needs)
          .where(and(eq(schema.needs.institutionId, user.institutionId), ne(schema.needs.id, n.id), isNull(schema.needs.groupParentId)))
          .orderBy(asc(schema.needs.code))
      : Promise.resolve([]),
  ]);
  const now = new Date();

  return (
    <div>
      <Link href="/panel/necesidades" className="text-sm font-bold text-brand">
        Volver a la bandeja
      </Link>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold text-ink-muted">{n.code}</span>
            <StatusBadge status={n.status} />
            <PriorityBadge priority={n.priority} />
            {n.isUrgent && <span className="chip bg-risk text-white">Urgente</span>}
            {n.affectsPatientSafety && <span className="chip bg-risk-soft text-risk">Seguridad del paciente</span>}
            {n.isDemo && <span className="chip bg-warn-soft text-warn">Demostración</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{n.title}</h1>
          <p className="mt-1 text-ink-muted">
            {CATEGORY_LABEL[n.category]}. Criterio TH1 {n.th1Criterion ?? "—"}: {th1Name(n.th1Criterion)}.
          </p>
        </div>
      </div>

      {n.parent && (
        <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-brand">
          Agrupada en{" "}
          <Link href={`/panel/necesidades/${n.parent.id}`} className="font-bold underline">
            {n.parent.code}
          </Link>
          : la gestión se realiza en la necesidad principal.
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-lg font-bold">Lo que se expresó</h2>
            <p className="mt-2 whitespace-pre-line">{n.description}</p>
            {n.proposal && (
              <div className="mt-4 rounded-xl bg-leaf p-4">
                <p className="text-sm font-bold text-brand">Propuesta</p>
                <p className="mt-1 whitespace-pre-line">{n.proposal}</p>
              </div>
            )}
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Origen</dt>
                <dd className="font-bold">{n.origin === "CAMPANA" ? `Campaña: ${n.campaign?.title ?? ""}` : "Registro directo"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Participación</dt>
                <dd className="font-bold">
                  {n.isAnonymous ? "Anónima: no hay datos de identidad" : n.reporter ? `Confidencial: ${n.reporter.name} (${n.reporter.email})` : n.origin === "CAMPANA" ? "Confidencial: identidad visible solo para Talento Humano" : "Institucional"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Recibida</dt>
                <dd className="font-bold">{fmtDate(n.receivedAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Servicio</dt>
                <dd className="font-bold">{n.service?.name ?? "No indicado"}</dd>
              </div>
            </dl>
          </section>

          {(n.analysis || n.response || n.closeJustification) && (
            <section className="panel space-y-4 p-5">
              {n.analysis && (
                <div>
                  <h2 className="font-bold">Análisis</h2>
                  <p className="mt-1 whitespace-pre-line">{n.analysis}</p>
                  {n.impact && <p className="mt-2 text-ink-muted">Impacto: {n.impact}</p>}
                </div>
              )}
              {n.response && (
                <div className="rounded-xl bg-ok-soft p-4">
                  <h2 className="font-bold text-ok">Respuesta emitida {n.respondedAt ? `el ${fmtDate(n.respondedAt)}` : ""}</h2>
                  <p className="mt-1 whitespace-pre-line">{n.response}</p>
                </div>
              )}
              {n.closeJustification && (
                <div className="rounded-xl bg-warn-soft p-4">
                  <h2 className="font-bold text-warn">Cierre administrativo</h2>
                  <p className="mt-1">{n.closeJustification}</p>
                </div>
              )}
            </section>
          )}

          <section className="panel p-5" aria-labelledby="hist">
            <h2 id="hist" className="text-lg font-bold">
              Trazabilidad
            </h2>
            <ol className="mt-4 space-y-0">
              {n.events.map((e, i) => (
                <li key={e.id} className="relative pb-5 pl-7">
                  {i < n.events.length - 1 && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-line" aria-hidden="true" />}
                  <span className={clsx("absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white", e.toStatus ? "bg-brand" : "bg-sun")} aria-hidden="true" />
                  <p className="font-bold">
                    {EVENT_LABEL[e.type] ?? e.type}
                    {e.toStatus && <span className="font-normal text-ink-muted"> → {STATUS_LABEL[e.toStatus]}</span>}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {n.isAnonymous && e.type === "CREADA" ? fmtDate(e.createdAt) : fmtDateTime(e.createdAt)}
                    {e.actor ? `, ${e.actor.name}` : ""}
                  </p>
                  {e.note && <p className="mt-1 whitespace-pre-line text-sm">{e.note}</p>}
                  {e.data && "result" in e.data && <p className="mt-1 text-sm font-bold">Resultado: {RESULT_LABEL[String(e.data.result)]}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="mb-3 text-lg font-bold">Gestionar</h2>
            <NeedWorkbench
              need={{
                id: n.id,
                code: n.code,
                status: n.status,
                category: n.category,
                th1Criterion: n.th1Criterion,
                serviceId: n.serviceId,
                isUrgent: n.isUrgent,
                escalation: n.escalation,
                scores: n.scores,
                priority: n.priority,
                assignedToId: n.assignedToId,
                closeType: n.closeType,
                publishImprovement: n.publishImprovement,
                publicSummary: n.publicSummary,
                groupParentId: n.groupParentId,
                title: n.title,
              }}
              perms={{ manage, prioritize: can(user.role, "needs.prioritizeApprove"), review: can(user.role, "needs.reviewEffectiveness"), isAssignee: n.assignedToId === user.id }}
              users={users}
              services={services}
              weights={inst.priorityWeights}
              responseDays={inst.responseDays}
              groupCandidates={groupCandidates}
            />
          </section>

          <section className="panel p-5">
            <h2 className="text-lg font-bold">Responsable y compromiso</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-ink-muted">Responsable</dt>
              <dd className="font-bold">{n.assignedTo?.name ?? "Sin asignar"}</dd>
              <dt className="text-ink-muted">Fecha de compromiso</dt>
              <dd className={clsx("font-bold", n.dueDate && n.dueDate < now && !n.respondedAt && "text-risk")}>{fmtDate(n.dueDate)}</dd>
              <dt className="text-ink-muted">Recursos</dt>
              <dd>{n.resourcesRequired ?? "—"}</dd>
              {n.priorityScore != null && (
                <>
                  <dt className="text-ink-muted">Puntaje de prioridad</dt>
                  <dd className="font-bold">{n.priorityScore} / 100</dd>
                </>
              )}
              {n.escalation !== "NINGUNO" && (
                <>
                  <dt className="text-ink-muted">Escalada a</dt>
                  <dd className="font-bold">{ESCALATION_LABEL[n.escalation]}</dd>
                </>
              )}
            </dl>
            {n.scores && (
              <ul className="mt-3 grid grid-cols-1 gap-1 text-xs text-ink-muted sm:grid-cols-2">
                {PRIORITY_CRITERIA.filter((c) => n.scores?.[c.key]).map((c) => (
                  <li key={c.key}>
                    {c.label}: <strong className="text-ink">{n.scores![c.key]}</strong>
                  </li>
                ))}
              </ul>
            )}
            {n.priorityMethod && <p className="mt-2 text-xs text-ink-faint">Metodología: {n.priorityMethod}</p>}
          </section>

          <section className="panel p-5">
            <h2 className="text-lg font-bold">Acciones</h2>
            {n.actions.length === 0 && <p className="mt-1 text-sm text-ink-muted">Aún no hay acciones registradas.</p>}
            <ul className="mt-3 space-y-3">
              {n.actions.map((a) => {
                const overdue = (a.status === "PROGRAMADA" || a.status === "EN_CURSO") && a.dueDate < now;
                return (
                  <li key={a.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold">{a.description}</p>
                      <span className={clsx("chip shrink-0", a.status === "COMPLETADA" ? "bg-ok-soft text-ok" : overdue ? "bg-risk-soft text-risk" : "bg-leaf text-ink")}>
                        {overdue ? "Vencida" : ACTION_LABEL[a.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {a.responsible?.name ?? "Sin responsable"}, hasta el {fmtDate(a.dueDate)}. Verificación: {a.verificationMeans}
                    </p>
                    {a.evidence && <p className="mt-2 rounded-lg bg-leaf px-3 py-2 text-sm">Evidencia: {a.evidence}</p>}
                    {n.status !== "CERRADA" && (manage || a.responsibleId === user.id) && <ActionUpdate actionId={a.id} status={a.status} evidence={a.evidence} />}
                  </li>
                );
              })}
            </ul>
            {manage && n.status !== "CERRADA" && (
              <div className="mt-3">
                <AddActionForm needId={n.id} users={users} />
              </div>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-lg font-bold">Evaluación de efectividad</h2>
            <p className="text-sm text-ink-muted">Distinta del cierre administrativo: verifica si la respuesta resolvió la necesidad.</p>
            {n.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">Sin evaluaciones registradas.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {n.reviews.map((r) => (
                  <li key={r.id} className={clsx("rounded-xl p-4", r.result === "EFECTIVA" ? "bg-ok-soft" : "bg-risk-soft")}>
                    <p className={clsx("font-bold", r.result === "EFECTIVA" ? "text-ok" : "text-risk")}>
                      {RESULT_LABEL[r.result]}, {fmtDate(r.reviewedAt)}
                    </p>
                    <p className="mt-1 text-sm">Método: {r.method}</p>
                    <p className="text-sm">Evidencia: {r.evidence}</p>
                    <p className="mt-1 text-xs text-ink-muted">Evaluó: {r.reviewedBy?.name}</p>
                  </li>
                ))}
              </ul>
            )}
            {n.closeType && (
              <p className="mt-3 text-sm">
                Tipo de cierre: <strong>{n.closeType === "EFECTIVIDAD_VERIFICADA" ? "con efectividad verificada" : "administrativo (sin verificación de efectividad)"}</strong>
              </p>
            )}
            {n.publishImprovement && <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">Publicada en «Tú lo propusiste, el hospital lo hizo».</p>}
          </section>

          {n.children.length > 0 && (
            <section className="panel p-5">
              <h2 className="text-lg font-bold">Necesidades agrupadas aquí</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {n.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/panel/necesidades/${c.id}`} className="link">
                      {c.code}
                    </Link>{" "}
                    {c.title}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
