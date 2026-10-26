/**
 * Auditoría automática de accesibilidad (axe-core, etiquetas WCAG 2.0/2.1/2.2 A y AA).
 * Uso: BASE_URL=http://localhost:3000 npx tsx tests/e2e/accesibilidad.ts
 * Nota: la revisión automática detecta solo una parte de los problemas; se requiere revisión manual.
 */
import chromium from "@sparticuz/chromium";
import puppeteer, { type Page } from "puppeteer-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function audit(page: Page, name: string) {
  await page.evaluate(axeSrc);
  const r: any = await page.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
  const v = r.violations.map((x: any) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, ejemplo: x.nodes[0]?.target?.join(" "), ayuda: x.help }));
  console.log(`${v.length === 0 ? "✔" : "✘"} ${name}: ${v.length} reglas incumplidas`);
  for (const x of v) console.log(`    - [${x.impact}] ${x.id} (${x.nodes}): ${x.ayuda} → ${x.ejemplo}`);
  return { pagina: name, violaciones: v };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  const out: any[] = [];
  const go = async (path: string, name: string) => { await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 }); await new Promise((r) => setTimeout(r, 700)); out.push(await audit(page, name)); };
  await go("/", "Portal (móvil)");
  await go("/c/demo-necesidades-2026", "Formulario: presentación (móvil)");
  await page.click("input[type=checkbox]");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Comenzar"))?.click());
  await new Promise((r) => setTimeout(r, 900));
  out.push(await audit(page, "Formulario: paso 1 (móvil)"));
  await go("/seguimiento", "Consultar mi caso");
  await go("/ingresar", "Ingreso");
  await go("/privacidad", "Aviso de privacidad");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + "/ingresar", { waitUntil: "networkidle0" });
  await page.type("#email", "talento@demo.t360");
  await page.type("#password", "Demo-T360-2026");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("form button")]);
  await go("/panel", "Tablero");
  await go("/panel/necesidades", "Bandeja");
  const href = await page.evaluate(() => document.querySelector("tbody a")?.getAttribute("href"));
  if (href) await go(href, "Detalle de necesidad");
  await go("/panel/campanas", "Campañas");
  await go("/panel/indicadores", "Indicadores");
  await browser.close();
  fs.writeFileSync("tests/e2e/accesibilidad.json", JSON.stringify(out, null, 2));
  const total = out.reduce((s, p) => s + p.violaciones.length, 0);
  console.log(`\nTotal: ${total} reglas incumplidas en ${out.length} pantallas.`);
})();
