import { expect, test } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

// Cuida que las pantallas no dejen errores en la consola (por ejemplo, diferencias de
// hidratación), que en desarrollo aparecen como «Issues».
test("las pantallas del panel cargan sin errores en la consola", async ({ page }) => {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(`${page.url()}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => errores.push(`${page.url()}: ${e.message}`));
  await entrarComo(page, CORREOS.dueno);
  for (const ruta of [
    "/viajes",
    "/avisos",
    "/clientes",
    "/finanzas",
    "/hoteles",
    "/proveedores",
    "/configuracion/equipo",
    "/configuracion/ciudades",
    "/configuracion/bitacora",
  ]) {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");
  }
  expect(errores).toEqual([]);
});
