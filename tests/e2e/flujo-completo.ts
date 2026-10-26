/**
 * PRUEBA DE EXTREMO A EXTREMO — Criterios de aceptación 1 a 15 de la Fase 1.
 *
 * Se ejecuta contra un servidor real y una base de datos de prueba con datos de
 * demostración (ver scripts/test-e2e.sh). Usa la API HTTP con sesiones reales y un
 * navegador Chromium en modo móvil (390×844) para la Prueba 4.
 *
 * Genera tests/e2e/resultados.json con el detalle de cada verificación.
 */
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import ExcelJS from "exceljs";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PW = "Demo-T360-2026";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Check = { prueba: number; descripcion: string; ok: boolean; detalle?: string };
const results: Check[] = [];
function check(prueba: number, descripcion: string, ok: boolean, detalle?: unknown) {
  results.push({ prueba, descripcion, ok, detalle: detalle === undefined ? undefined : typeof detalle === "string" ? detalle : JSON.stringify(detalle).slice(0, 300) });
  console.log(`${ok ? "  ✔" : "  ✘"} [P${prueba}] ${descripcion}${!ok && detalle ? `  →  ${JSON.stringify(detalle).slice(0, 300)}` : ""}`);
}

class Client {
  cookie = "";
  constructor(public label: string) {}
  async req(method: string, url: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
    const res = await fetch(BASE + url, {
      method,
      redirect: "manual",
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...extraHeaders },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) {
      const m = /t360_session=([^;]*)/.exec(set);
      if (m) this.cookie = m[1] ? `t360_session=${m[1]}` : "";
    }
    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("json") ? await res.json() : ct.includes("spreadsheet") ? Buffer.from(await res.arrayBuffer()) : await res.text();
    return { status: res.status, data: data as any, headers: res.headers };
  }
  async login(email: string, password = PW) {
    const r = await this.req("POST", "/api/auth/login", { email, password });
    if (r.status !== 200) throw new Error(`No se pudo ingresar como ${email}: ${JSON.stringify(r.data)}`);
    return r;
  }
}

const today = (n = 0) => new Date(Date.now() + n * 86_400_000 - 5 * 3600_000).toISOString().slice(0, 10);

async function main() {
  const admin = new Client("admin");
  const th = new Client("talento");
  const cal = new Client("calidad");
  const lider = new Client("lider");
  const colab = new Client("colaborador");
  const thB = new Client("talento B");
  const anon = new Client("anónimo");
  const auditor = new Client("auditor");
  await Promise.all([admin.login("admin@demo.t360"), th.login("talento@demo.t360"), cal.login("calidad@demo.t360"), lider.login("lider.urgencias@demo.t360"), colab.login("colaborador@demo.t360"), thB.login("talento@demob.t360"), auditor.login("auditor@demo.t360")]);
  const uniq = `E2E-${Date.now().toString(36)}`;

  // ── Prueba 1: configuración institucional por administrador autorizado ──
  console.log("\nPrueba 1. Configuración institucional");
  let r = await admin.req("PATCH", "/api/institution", {
    name: "ESE Hospital Pío XII",
    shortName: "Hospital Pío XII",
    nit: "000000000-0",
    city: "Colón, Putumayo",
    slogan: "Tu voz transforma nuestra institución",
    primaryColor: "#1E5B4F",
    accentColor: "#F2B33D",
    minGroupSize: 5,
    responseDays: 15,
  });
  check(1, "El administrador técnico actualiza los datos de la institución", r.status === 200, r.data);
  r = await admin.req("POST", "/api/institution/catalog", { kind: "service", name: `Servicio ${uniq}`, serviceKind: "ASISTENCIAL" });
  check(1, "El administrador registra un nuevo servicio", r.status === 201, r.data);
  r = await th.req("PATCH", "/api/institution", { name: "x", shortName: "x", slogan: "xxx", primaryColor: "#000000", accentColor: "#000000", minGroupSize: 5, responseDays: 5 });
  check(1, "Talento Humano NO puede cambiar la configuración técnica (403)", r.status === 403, r.status);
  r = await admin.req("POST", "/api/users", { name: "Usuario prueba E2E", email: `${uniq.toLowerCase()}@hospital-ejemplo.co`, role: "LIDER_SERVICIO", tempPassword: "Temporal-2026-xyz" });
  check(1, "El administrador crea un usuario con rol y contraseña temporal", r.status === 201, r.data);
  const tmpUser = new Client("nuevo");
  r = await tmpUser.login(`${uniq.toLowerCase()}@hospital-ejemplo.co`, "Temporal-2026-xyz");
  check(1, "El usuario nuevo queda obligado a cambiar la contraseña", r.data.mustChangePassword === true, r.data);

  // ── Prueba 2: Talento Humano crea campaña ──
  console.log("\nPrueba 2. Creación de campaña");
  r = await th.req("POST", "/api/campaigns", { title: `Necesidades ${uniq}`, description: "Campaña creada por la prueba automática de extremo a extremo.", mode: "ANONIMA", eligibleCount: 50 });
  check(2, "Talento Humano crea una campaña anónima de identificación de necesidades", r.status === 201 && !!r.data.slug, r.data);
  const camp = r.data as { id: string; slug: string; link: string };
  r = await th.req("PATCH", `/api/campaigns/${camp.id}`, { status: "ACTIVA" });
  check(2, "La campaña se activa para recibir respuestas", r.status === 200, r.data);
  r = await lider.req("POST", "/api/campaigns", { title: "No autorizado", description: "Intento de un rol sin permiso", mode: "ANONIMA" });
  check(2, "Un líder de servicio NO puede crear campañas (403)", r.status === 403, r.status);

  // ── Prueba 3: enlace compartible ──
  console.log("\nPrueba 3. Enlace compartible");
  check(3, "Se genera un enlace con identificador aleatorio", /\/c\/[a-z0-9]{6,}$/.test(camp.link), camp.link);
  r = await anon.req("GET", `/c/${camp.slug}`);
  check(3, "El enlace abre la campaña sin iniciar sesión", r.status === 200 && String(r.data).includes(`Necesidades ${uniq}`), r.status);
  r = await th.req("GET", `/panel/campanas/${camp.id}`);
  check(3, "El panel muestra el enlace y el código QR", r.status === 200 && String(r.data).includes(`/c/${camp.slug}`) && String(r.data).includes("<svg"), r.status);

  // ── Prueba 4: trabajador desde celular completa el formulario ──
  console.log("\nPrueba 4. Participación desde un celular (Chromium 390×844)");
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36");
  let trackingCode = "";
  const needText = `Prueba ${uniq}: falta un tensiómetro adicional en el turno de la noche para el área de observación.`;
  try {
    await page.goto(`${BASE}/c/${camp.slug}`, { waitUntil: "networkidle0" });
    const clickText = (t: string) => page.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim().startsWith(t)); b?.click(); return !!b; }, t);
    await page.click("input[type=checkbox]");
    await clickText("Comenzar");
    for (let step = 0; step < 12; step++) {
      await new Promise((res) => setTimeout(res, 250));
      const title = await page.$eval("#titulo-seccion", (e) => e.textContent ?? "").catch(() => "");
      if (title.includes("necesidad concreta")) break;
      // Responde cada pregunta visible según su tipo
      await page.evaluate(() => {
        for (const fs of document.querySelectorAll("fieldset")) {
          const radios = fs.querySelectorAll<HTMLButtonElement>("button[role=radio]");
          if (radios.length === 5) radios[3].click(); // escala → 4
          else if (radios.length === 2) radios[1].click(); // Sí/No → No
          const opt = fs.querySelectorAll<HTMLInputElement>("input[type=radio]");
          if (opt.length) (opt[opt.length > 2 ? 2 : 0] as HTMLInputElement).click(); // única
        }
      });
      await new Promise((res) => setTimeout(res, 150));
      const ta = await page.$("fieldset textarea");
      if (ta) await ta.type("Más equipos y personal en la noche.");
      await clickText("Siguiente");
    }
    await page.screenshot({ path: path.join("tests/e2e", "p4-paso-necesidades.png") });
    await clickText("Registrar una necesidad concreta");
    await page.select("#nc-0", "CONDICIONES_TRABAJO");
    await page.type("#nd-0", needText);
    await page.click("input[type=checkbox]");
    await clickText("Enviar mi participación");
    await page.waitForSelector("[data-testid=tracking-code]", { timeout: 15000 });
    trackingCode = (await page.$eval("[data-testid=tracking-code]", (e) => e.textContent ?? "")).trim();
    await page.screenshot({ path: path.join("tests/e2e", "p4-confirmacion-movil.png") });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(4, "El formulario se completa en un celular hasta recibir código de seguimiento", /^T360-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trackingCode), trackingCode);
    check(4, "La página no tiene desplazamiento horizontal en 390 px", !overflow);
  } catch (e) {
    await page.screenshot({ path: path.join("tests/e2e", "p4-error.png") }).catch(() => null);
    check(4, "El formulario se completa en un celular hasta recibir código de seguimiento", false, String(e));
  }

  // Participación confidencial del colaborador (para Pruebas 11 y privacidad)
  r = await th.req("POST", "/api/campaigns", { title: `Confidencial ${uniq}`, description: "Campaña confidencial de la prueba automática.", mode: "CONFIDENCIAL", eligibleCount: 20 });
  const conf = r.data as { id: string; slug: string };
  await th.req("PATCH", `/api/campaigns/${conf.id}`, { status: "ACTIVA" });
  const pub = await anon.req("GET", `/api/public/campaigns/${conf.slug}`);
  const answersFor = (qs: any[]) => {
    const a: Record<string, unknown> = {};
    for (const q of qs) {
      if (!q.required || q.showIfCode || q.onlyForEmploymentCodes) continue;
      a[q.code] = q.type === "ESCALA" ? { value: 3 } : q.type === "UNICA" ? { value: q.options[0] } : { value: "No" };
    }
    return a;
  };
  r = await anon.req("POST", `/api/public/campaigns/${conf.slug}/submit`, { answers: answersFor(pub.data.questions), needs: [], consent: true });
  check(12, "Una campaña confidencial rechaza participación sin sesión (401)", r.status === 401, r.status);
  r = await colab.req("POST", `/api/public/campaigns/${conf.slug}/submit`, {
    answers: answersFor(pub.data.questions),
    needs: [{ category: "COMUNICACION", description: `Confidencial ${uniq}: no recibo la programación de capacitaciones a tiempo.` }],
    consent: true,
  });
  check(5, "El colaborador participa en una campaña confidencial", r.status === 201, r.data);
  r = await colab.req("POST", `/api/public/campaigns/${conf.slug}/submit`, { answers: answersFor(pub.data.questions), needs: [], consent: true });
  check(5, "El sistema impide participar dos veces en la misma campaña confidencial (409)", r.status === 409, r.status);
  r = await anon.req("POST", `/api/public/campaigns/${camp.slug}/submit`, { answers: { P1: { value: "Personal de planta" } }, needs: [], consent: true });
  check(5, "El servidor valida preguntas obligatorias aunque el navegador se salte la validación (400)", r.status === 400, r.data);

  // ── Prueba 5: persistencia y visibilidad en el panel autorizado ──
  console.log("\nPrueba 5. Almacenamiento y panel");
  r = await th.req("GET", `/api/needs?q=${encodeURIComponent(uniq)}&abiertas=1`);
  const anonNeed = (r.data.needs as any[]).find((n) => n.title.includes("Prueba"));
  const confNeed = (r.data.needs as any[]).find((n) => n.title.includes("Confidencial"));
  check(5, "La necesidad enviada desde el celular aparece en la bandeja de Talento Humano", !!anonNeed && anonNeed.status === "RECIBIDA", r.data.needs?.length);
  const db1 = await pool.query("select s.user_id, s.submitted_on::text, n.reporter_id, n.received_at, n.is_anonymous from submissions s join campaigns c on c.id=s.campaign_id join needs n on n.submission_id=s.id where c.slug=$1", [camp.slug]);
  const row = db1.rows[0];
  check(5, "Quedó almacenada en PostgreSQL", db1.rowCount === 1, db1.rowCount);
  check(5, "Anonimato real: sin usuario, sin reportante y con hora truncada a medianoche (Colombia)", row && row.user_id === null && row.reporter_id === null && row.is_anonymous === true && new Date(row.received_at).toISOString().endsWith("T05:00:00.000Z"), row);
  const auditAnon = await pool.query("select actor_id from audit_logs where action='PARTICIPACION_REGISTRADA' and entity_id=$1", [camp.id]);
  check(5, "La auditoría de la participación anónima no guarda actor", auditAnon.rows.every((x) => x.actor_id === null), auditAnon.rows);

  // ── Prueba 6: clasificación ──
  console.log("\nPrueba 6. Clasificación");
  const needId = anonNeed?.id as string;
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "review", result: "EFECTIVA", method: "x".repeat(6), evidence: "y".repeat(6) });
  check(6, "El sistema rechaza transiciones fuera de orden (evaluar una necesidad recién recibida → 409)", r.status === 409, r.data);
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "classify", category: "CONDICIONES_TRABAJO", th1Criterion: 7, isUrgent: false, escalation: "NINGUNO", note: "Clasificada en prueba automática" });
  check(6, "Talento Humano clasifica la necesidad y la relaciona con el criterio TH1 7", r.status === 200 && r.data.status === "CLASIFICADA", r.data);
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "analyze", analysis: "Se verificó con el líder de urgencias que hay un solo tensiómetro en la noche.", impact: "Retrasa la toma de signos vitales." });
  check(6, "Se registra el análisis", r.status === 200 && r.data.status === "EN_ANALISIS", r.data);
  r = await cal.req("POST", `/api/needs/${needId}/operations`, { op: "prioritize", scores: { seguridadPaciente: 4, trabajador: 3, riesgoLegal: 2, frecuencia: 3, magnitud: 3, urgencia: 4, factibilidad: 4 } });
  check(6, "Calidad prioriza con la matriz ponderada y queda registrada la metodología", r.status === 200 && r.data.status === "PRIORIZADA", r.data);

  // ── Prueba 7: responsable recibe y gestiona ──
  console.log("\nPrueba 7. Gestión por responsable autorizado");
  const users = await th.req("GET", "/api/needs/" + needId);
  const liderId = (await pool.query("select id from users where email='lider.urgencias@demo.t360'")).rows[0].id;
  r = await lider.req("GET", `/api/needs/${needId}`);
  check(7, "Antes de la asignación el líder NO ve la necesidad (404)", r.status === 404, r.status);
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "assign", assignedToId: liderId, dueDate: today(10), resourcesRequired: "Compra de un tensiómetro" });
  check(7, "Talento Humano asigna responsable y fecha de compromiso", r.status === 200 && r.data.status === "ASIGNADA", r.data);
  r = await lider.req("GET", `/api/needs?abiertas=1`);
  check(7, "El líder ve la necesidad en «Necesidades a mi cargo»", (r.data.needs as any[]).some((n) => n.id === needId), r.data.needs?.length);
  r = await lider.req("POST", `/api/needs/${needId}/operations`, { op: "start", note: "Se solicitó cotización." });
  check(7, "El responsable inicia la ejecución", r.status === 200 && r.data.status === "EN_EJECUCION", r.data);
  r = await lider.req("POST", `/api/needs/${needId}/operations`, { op: "closeAdministrative", justification: "Intento de cierre por un rol sin permiso" });
  check(7, "El responsable NO puede cerrar administrativamente (403)", r.status === 403, r.status);

  // ── Prueba 8: acción con fecha, responsable y medio de verificación ──
  console.log("\nPrueba 8. Registro de acción");
  r = await th.req("POST", `/api/needs/${needId}/actions`, { description: "Adquirir e instalar un tensiómetro para el turno nocturno", responsibleId: liderId, dueDate: today(7), verificationMeans: "Acta de entrega y registro fotográfico" });
  check(8, "Se registra una acción con fecha, responsable y medio de verificación", r.status === 201, r.data);
  const actionId = r.data.id;
  r = await th.req("POST", `/api/needs/${needId}/actions`, { description: "Acción sin medio de verificación", responsibleId: liderId, dueDate: today(7), verificationMeans: "" });
  check(8, "No se acepta una acción sin medio de verificación (400)", r.status === 400, r.status);
  r = await lider.req("PATCH", `/api/actions/${actionId}`, { status: "COMPLETADA" });
  check(8, "No se puede completar una acción sin evidencia (400)", r.status === 400, r.data);
  r = await lider.req("PATCH", `/api/actions/${actionId}`, { status: "COMPLETADA", evidence: "Acta de entrega No. 45 (prueba) y foto del equipo instalado" });
  check(8, "El responsable completa la acción registrando la evidencia", r.status === 200, r.data);

  const before = await cal.req("GET", "/api/dashboard");
  const ind = (d: any, k: string) => d.indicators.find((i: any) => i.key === k);
  r = await lider.req("POST", `/api/needs/${needId}/operations`, { op: "respond", response: "Se adquirió e instaló un tensiómetro adicional para el turno de la noche en observación." });
  check(7, "El responsable emite la respuesta al trabajador", r.status === 200 && r.data.status === "RESPUESTA_EMITIDA", r.data);

  // Seguimiento público con el código del celular
  r = await anon.req("POST", "/api/public/tracking", { code: trackingCode });
  check(7, "El trabajador consulta su caso con el código y ve la respuesta (sin notas internas)", r.status === 200 && r.data.needs?.[0]?.response?.includes("tensiómetro") && !JSON.stringify(r.data).includes("Se verificó con el líder"), r.data);
  r = await anon.req("POST", "/api/public/tracking", { code: "T360-ZZZZ-ZZZZ" });
  check(7, "Un código inexistente no revela información (404)", r.status === 404, r.status);

  // ── Prueba 10: tablero actualiza indicadores ──
  console.log("\nPrueba 10. Tablero e indicadores");
  const after = await cal.req("GET", "/api/dashboard");
  const b = ind(before.data, "necesidadesConRespuesta"), a = ind(after.data, "necesidadesConRespuesta");
  check(10, "«Necesidades con respuesta» aumenta en 1 tras emitir la respuesta", a.numerator === b.numerator + 1 && a.denominator === b.denominator, { antes: `${b.numerator}/${b.denominator}`, despues: `${a.numerator}/${a.denominator}` });
  check(10, "La participación cuenta la nueva participación del periodo", after.data.kpis.participations >= 27, after.data.kpis.participations);
  check(10, "Cada indicador expone numerador, denominador y meta", after.data.indicators.every((i: any) => typeof i.numerator === "number" && typeof i.denominator === "number" && typeof i.target === "number"));

  // ── Prueba 14: efectividad distinta del cierre administrativo ──
  console.log("\nPrueba 14. Efectividad frente a cierre administrativo");
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "toVerification", note: "Listo para verificar" });
  check(14, "La necesidad pasa a «Pendiente de verificar efectividad»", r.status === 200 && r.data.status === "PENDIENTE_EFECTIVIDAD", r.data);
  const efBefore = ind((await cal.req("GET", "/api/dashboard")).data, "efectividad");
  r = await cal.req("POST", `/api/needs/${needId}/operations`, { op: "review", result: "EFECTIVA", method: "Ronda nocturna y consulta a 3 auxiliares del turno", evidence: "Registro de ronda del 8/10 (prueba)" });
  check(14, "Calidad registra evaluación EFECTIVA y el caso se cierra con efectividad verificada", r.status === 200 && r.data.status === "CERRADA", r.data);
  const confNeedId = confNeed?.id;
  r = await th.req("POST", `/api/needs/${confNeedId}/operations`, { op: "closeAdministrative", justification: "Duplicada con una necesidad ya en gestión por comunicaciones" });
  check(14, "Otra necesidad se cierra administrativamente", r.status === 200 && r.data.status === "CERRADA", r.data);
  const types = await pool.query("select id, close_type, (select count(*) from effectiveness_reviews e where e.need_id=n.id)::int reviews from needs n where id = any($1)", [[needId, confNeedId]]);
  const tA = types.rows.find((x) => x.id === needId), tB = types.rows.find((x) => x.id === confNeedId);
  check(14, "Los tipos de cierre quedan diferenciados (EFECTIVIDAD_VERIFICADA vs ADMINISTRATIVO)", tA?.close_type === "EFECTIVIDAD_VERIFICADA" && tA?.reviews === 1 && tB?.close_type === "ADMINISTRATIVO" && tB?.reviews === 0, types.rows);
  const efAfter = ind((await cal.req("GET", "/api/dashboard")).data, "efectividad");
  check(14, "El indicador de efectividad cuenta la evaluación y no el cierre administrativo", efAfter.denominator === efBefore.denominator + 1 && efAfter.numerator === efBefore.numerator + 1, { antes: efBefore, despues: efAfter });
  r = await th.req("POST", `/api/needs/${confNeedId}/operations`, { op: "publish", publish: true, publicSummary: "Una mejora que no fue verificada por Calidad." });
  check(14, "No se puede publicar como mejora un cierre administrativo (409)", r.status === 409, r.status);
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "publish", publish: true, publicSummary: "Instalamos un tensiómetro adicional para el turno de la noche." });
  check(14, "Sí se publica la mejora con efectividad verificada", r.status === 200, r.data);
  r = await anon.req("GET", "/");
  check(14, "La mejora aparece en «Tú lo propusiste, el hospital lo hizo»", String(r.data).includes("tensiómetro adicional"), r.status);

  // ── Prueba 9: historial y trazabilidad ──
  console.log("\nPrueba 9. Trazabilidad");
  r = await th.req("GET", `/api/needs/${needId}`);
  const evTypes = (r.data.need.events as any[]).map((e) => e.type);
  const expected = ["CREADA", "CLASSIFY", "ANALYZE", "PRIORITIZE", "ASSIGN", "START", "ACCION_REGISTRADA", "ACCION_ACTUALIZADA", "RESPOND", "TOVERIFICATION", "EVALUACION_EFECTIVIDAD", "PUBLISH"];
  check(9, "El historial conserva cada paso del ciclo en orden", expected.every((t) => evTypes.includes(t)), evTypes);
  check(9, "Cada paso registra quién lo hizo", (r.data.need.events as any[]).filter((e) => e.type !== "CREADA").every((e) => e.actor?.name), null);
  check(9, "La priorización registra método y aprobador", !!r.data.need.priorityMethod && !!r.data.need.priorityApprovedById, r.data.need.priorityMethod);
  r = await cal.req("GET", "/api/audit");
  check(9, "La auditoría registra las acciones del personal", (r.data.entries as any[]).some((e) => e.action === "NECESIDAD_EVALUACION_EFECTIVIDAD"), r.data.entries?.length);
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "reopen", reason: "Prueba de reapertura: el equipo se dañó" });
  check(9, "Una necesidad cerrada puede reabrirse con motivo, sin perder su historial", r.status === 200 && r.data.status === "REABIERTA", r.data);

  // ── Prueba 11: exportación sin comprometer confidencialidad ──
  console.log("\nPrueba 11. Exportación");
  r = await th.req("GET", "/api/export/needs");
  check(11, "Talento Humano exporta a Excel", r.status === 200 && String(r.headers.get("content-type")).includes("spreadsheet"), r.status);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(r.data);
  let text = "";
  wb.eachSheet((ws) => ws.eachRow((row) => (text += JSON.stringify(row.values))));
  check(11, "El archivo incluye las hojas Necesidades, Acciones e Indicadores", ["Necesidades", "Acciones", "Indicadores"].every((n) => wb.getWorksheet(n)), wb.worksheets.map((w) => w.name));
  check(11, "El archivo contiene la necesidad confidencial pero NO el nombre ni el correo de quien la reportó", text.includes(`Confidencial ${uniq}`) && !text.includes("Colaborador de prueba") && !text.includes("colaborador@demo.t360"), null);
  check(11, "El archivo no contiene códigos de seguimiento", !text.includes(trackingCode) && !/T360-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(text), null);
  r = await lider.req("GET", "/api/export/needs");
  check(11, "Un líder de servicio no puede exportar (403)", r.status === 403, r.status);
  r = await cal.req("GET", `/api/needs/${confNeedId}`);
  check(11, "Calidad ve la necesidad confidencial sin la identidad de quien reporta", r.status === 200 && r.data.need.reporter === null && r.data.need.reporterId === null, r.data.need?.reporter);
  r = await th.req("GET", `/api/needs/${confNeedId}`);
  check(11, "Talento Humano sí ve la identidad en la campaña confidencial (y queda auditado)", r.data.need.reporter?.email === "colaborador@demo.t360", r.data.need?.reporter);

  // ── Prueba 12: acceso no autorizado por URL o API ──
  console.log("\nPrueba 12. Control de acceso");
  const probes: [Client, string, string, number[]][] = [
    [anon, "GET", "/api/needs", [401]],
    [anon, "GET", "/api/dashboard", [401]],
    [anon, "GET", `/api/needs/${needId}`, [401]],
    [colab, "GET", "/api/needs", [403]],
    [colab, "GET", "/api/dashboard", [403]],
    [admin, "GET", "/api/needs", [403]],
    [admin, "GET", `/api/needs/${needId}`, [403]],
    [admin, "GET", "/api/export/needs", [403]],
    [auditor, "POST", `/api/needs/${needId}/operations`, [403]],
    [lider, "GET", `/api/needs/${confNeedId}`, [404]],
    [lider, "GET", "/api/users", [403]],
    [th, "GET", "/api/users", [403]],
    [th, "GET", "/api/audit", [403]],
  ];
  for (const [c, m, url, codes] of probes) {
    const res = await c.req(m, url, m === "POST" ? { op: "comment", note: "intento" } : undefined);
    check(12, `${c.label}: ${m} ${url.replace(/[0-9a-f-]{36}/, ":id")} → ${codes.join("/")}`, codes.includes(res.status), res.status);
  }
  r = await anon.req("GET", "/panel");
  check(12, "Sin sesión, /panel redirige al ingreso", r.status === 307 && String(r.headers.get("location")).includes("/ingresar"), r.headers.get("location"));
  r = await colab.req("GET", "/panel/necesidades");
  check(12, "El colaborador que intenta abrir el panel por URL es redirigido a «Mi espacio»", r.status === 307 && String(r.headers.get("location")).includes("/mi-espacio"), r.headers.get("location"));
  r = await lider.req("GET", `/panel/necesidades/${confNeedId}`);
  check(12, "El líder que abre por URL una necesidad que no le corresponde recibe «no encontrada»", r.status === 404, r.status);
  r = await admin.req("GET", "/panel/necesidades");
  check(12, "El administrador técnico que abre la bandeja por URL es redirigido a «sin permiso»", r.status === 307 && String(r.headers.get("location")).includes("sin-permiso"), r.headers.get("location"));
  r = await th.req("POST", `/api/needs/${needId}/operations`, { op: "comment", note: "intento cruzado" }, { Origin: "https://sitio-malicioso.example" });
  check(12, "Una petición desde otro origen es rechazada (protección CSRF, 403)", r.status === 403, r.status);

  // ── Prueba 13: aislamiento entre instituciones ──
  console.log("\nPrueba 13. Aislamiento entre instituciones");
  r = await thB.req("GET", `/api/needs/${needId}`);
  check(13, "Talento Humano de la institución B no puede leer una necesidad de A (404)", r.status === 404, r.status);
  r = await thB.req("GET", "/api/needs");
  check(13, "La bandeja de B solo contiene registros de B", (r.data.needs as any[]).length === 1 && r.data.needs[0].title.includes("institución B"), r.data.needs?.map((n: any) => n.title));
  r = await thB.req("POST", `/api/needs/${needId}/operations`, { op: "comment", note: "intento" });
  check(13, "B no puede modificar necesidades de A (404)", r.status === 404, r.status);
  r = await thB.req("PATCH", `/api/actions/${actionId}`, { status: "CANCELADA" });
  check(13, "B no puede modificar acciones de A (404)", r.status === 404, r.status);
  r = await thB.req("GET", `/api/campaigns/${camp.id}/results`);
  check(13, "B no puede ver resultados de campañas de A (404)", r.status === 404, r.status);
  r = await thB.req("POST", `/api/needs/${needId}/actions`, { description: "x".repeat(10), responsibleId: liderId, dueDate: today(3), verificationMeans: "acta" });
  check(13, "B no puede crear acciones sobre necesidades de A", r.status === 403 || r.status === 404, r.status);
  r = await thB.req("GET", "/api/dashboard");
  check(13, "El tablero de B no incluye datos de A", r.data.kpis.received <= 1 && r.data.kpis.participations === 0, r.data.kpis);
  r = await thB.req("POST", `/api/public/campaigns/${conf.slug}/submit`, { answers: answersFor(pub.data.questions), needs: [], consent: true });
  check(13, "Un usuario de B no puede participar en una campaña confidencial de A (403)", r.status === 403, r.status);

  // ── Prueba 15: persistencia tras cerrar sesión ──
  console.log("\nPrueba 15. Persistencia");
  const snapshot = (await th.req("GET", `/api/needs/${needId}`)).data.need;
  await th.req("POST", "/api/auth/logout");
  r = await th.req("GET", `/api/needs/${needId}`);
  check(15, "Tras cerrar sesión, la API exige autenticación de nuevo (401)", r.status === 401, r.status);
  await th.login("talento@demo.t360");
  r = await th.req("GET", `/api/needs/${needId}`);
  check(15, "Al volver a ingresar, la necesidad conserva estado, historial y acciones", r.status === 200 && r.data.need.status === snapshot.status && r.data.need.events.length === snapshot.events.length && r.data.need.actions.length === 1, { status: r.data.need?.status, eventos: r.data.need?.events?.length });

  await browser.close();
  await pool.end();

  const byTest = new Map<number, Check[]>();
  for (const c of results) byTest.set(c.prueba, [...(byTest.get(c.prueba) ?? []), c]);
  const summary = [...byTest.entries()].sort((a, b) => a[0] - b[0]).map(([p, cs]) => ({ prueba: p, verificaciones: cs.length, aprobadas: cs.filter((c) => c.ok).length, ok: cs.every((c) => c.ok) }));
  const failed = results.filter((c) => !c.ok);
  fs.writeFileSync("tests/e2e/resultados.json", JSON.stringify({ fecha: new Date().toISOString(), base: BASE, resumen: summary, verificaciones: results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} verificaciones aprobadas en ${summary.length} pruebas de aceptación.`);
  if (failed.length) {
    console.log("FALLAS:");
    for (const f of failed) console.log(` - P${f.prueba} ${f.descripcion}: ${f.detalle}`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => null);
  process.exit(1);
});
