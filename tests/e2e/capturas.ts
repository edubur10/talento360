/**
 * Capturas de pantalla para revisión visual (escritorio y celular).
 * Uso: BASE_URL=http://localhost:3000 npx tsx tests/e2e/capturas.ts
 */
import chromium from "@sparticuz/chromium";
import puppeteer, { type Page } from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tests/e2e/capturas");
fs.mkdirSync(OUT, { recursive: true });

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/ingresar`, { waitUntil: "networkidle0" });
  await page.type("#email", email);
  await page.type("#password", "Demo-T360-2026");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit], form button")]);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  const shots = (process.env.SHOTS ?? "all").split(",");
  const want = (n: string) => shots.includes("all") || shots.includes(n);

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (want("portal-movil")) {
    await mobile.goto(`${BASE}/`, { waitUntil: "networkidle0" });
    await mobile.screenshot({ path: `${OUT}/portal-movil.png`, fullPage: true });
  }
  if (want("form-movil")) {
    await mobile.goto(`${BASE}/c/demo-necesidades-2026`, { waitUntil: "networkidle0" });
    await mobile.screenshot({ path: `${OUT}/form-intro-movil.png`, fullPage: true });
    await mobile.click("input[type=checkbox]");
    await mobile.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Comenzar"))?.click());
    await new Promise((r) => setTimeout(r, 400));
    await mobile.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Siguiente"))?.click());
    await new Promise((r) => setTimeout(r, 400));
    await mobile.screenshot({ path: `${OUT}/form-validacion-movil.png`, fullPage: false });
  }

  const desk = await browser.newPage();
  await desk.setViewport({ width: 1440, height: 900 });
  if (want("portal")) {
    await desk.goto(`${BASE}/`, { waitUntil: "networkidle0" });
    await desk.screenshot({ path: `${OUT}/portal-escritorio.png`, fullPage: true });
  }
  if (want("panel")) {
    await login(desk, "talento@demo.t360");
    await desk.goto(`${BASE}/panel`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));
    await desk.screenshot({ path: `${OUT}/tablero.png`, fullPage: true });
    await desk.goto(`${BASE}/panel/necesidades`, { waitUntil: "networkidle0" });
    await desk.screenshot({ path: `${OUT}/bandeja.png`, fullPage: true });
    const href = await desk.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Cansancio por turnos"))?.getAttribute("href"));
    if (href) {
      await desk.goto(`${BASE}${href}`, { waitUntil: "networkidle0" });
      await desk.screenshot({ path: `${OUT}/detalle.png`, fullPage: true });
    }
    await desk.goto(`${BASE}/panel/campanas`, { waitUntil: "networkidle0" });
    const camp = await desk.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("2026 (demostración)"))?.getAttribute("href"));
    if (camp) {
      await desk.goto(`${BASE}${camp}`, { waitUntil: "networkidle0" });
      await desk.screenshot({ path: `${OUT}/campana.png`, fullPage: true });
    }
  }
  await browser.close();
  console.log("Capturas en", OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
