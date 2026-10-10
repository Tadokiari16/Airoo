import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

test.describe.configure({ timeout: 60_000 });

const seccion = (page: Page, nombre: string) => page.getByRole("region", { name: nombre });

async function cambiarCampo(page: Page, etiqueta: string, valor: string) {
  const campo = page.getByLabel(etiqueta, { exact: true });
  await campo.fill(valor);
  await campo.press("Enter");
  await expect(page.getByText("Guardado · queda en la bitácora")).toBeVisible();
}

test("cambiar la tolerancia se ve en el ejemplo y en la bitácora", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion");
  await expect(page).toHaveURL(/configuracion\/precios/);
  const tolerancia = seccion(page, "Cuando un precio cambia al validar");
  await expect(tolerancia).toContainText("el vuelo subió $448.95 y se le mandó la versión 2");

  await cambiarCampo(page, "Límite", "450");
  await expect(tolerancia).toContainText("el vuelo subió $448.95 y se absorbió");

  await page.getByRole("link", { name: "Bitácora" }).click();
  await expect(page.getByText("Tolerancia de precio: $450 por servicio").first()).toBeVisible();

  // Deja el valor de CLAUDE.md para la siguiente corrida.
  await page.goto("/configuracion/precios");
  await expect(page.getByLabel("Límite", { exact: true })).toHaveValue("450");
  await cambiarCampo(page, "Límite", "300");
  await page.reload();
  await expect(page.getByLabel("Límite", { exact: true })).toHaveValue("300");
});

test("un valor fuera de rango no se guarda y lo dice", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion/precios");
  const campo = page.getByLabel("Hoteles", { exact: true });
  await campo.fill("150");
  await campo.press("Enter");
  await expect(page.getByText("Hasta 100%.")).toBeVisible();
  await campo.press("Escape");
  await expect(campo).toHaveValue("10");
});

test("el colchón cambia el ejemplo del tipo de cambio", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion/precios");
  const fx = seccion(page, "Tipo de cambio");
  await fx.getByRole("button", { name: "2%" }).click();
  await expect(page.getByText("Guardado · queda en la bitácora")).toBeVisible();
  await expect(fx).toContainText("= 18.79 por dólar");
  await page.reload();
  await expect(fx.getByRole("button", { name: "2%" })).toHaveAttribute("aria-pressed", "true");
  await fx.getByRole("button", { name: "1.5%" }).click();
  await expect(fx).toContainText("= 18.70 por dólar");
});

test("la cuenta para recibir pagos pide contraseña y se activa 24 h después", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion/cobros");
  const cuentas = seccion(page, "Cuentas para recibir pagos");
  await expect(cuentas).toContainText("Cuenta de Airoo · CLABE ··3390");

  await cuentas.getByRole("button", { name: "Cambiar" }).click();
  const d = page.getByRole("dialog", { name: "Cambiar la cuenta para recibir pagos" });
  await d.getByLabel("Banco").fill("Banorte");
  await d.getByLabel("CLABE").fill("012180000100005128");
  await expect(d.getByText("El último dígito de la CLABE no coincide")).toBeVisible();
  await d.getByLabel("CLABE").fill("012180000100005127");
  await d.getByRole("button", { name: "Contraseña" }).click();
  await d.getByLabel("Tu contraseña").fill("otra-cosa");
  await d.getByRole("button", { name: "Guardar cuenta nueva" }).click();
  await expect(d.getByRole("alert")).toHaveText("La contraseña no coincide. La cuenta sigue sin cambios.");

  await d.getByLabel("Tu contraseña").fill("airoo-local-2026");
  await d.getByRole("button", { name: "Guardar cuenta nueva" }).click();
  await expect(page.getByText(/Cuenta nueva guardada · se activa el/)).toBeVisible();
  // La anterior sigue como principal; la nueva espera sus 24 h.
  await expect(cuentas).toContainText("Cuenta de Airoo · CLABE ··3390");
  await expect(cuentas).toContainText("Cuenta nueva · CLABE ··5127");
  await expect(cuentas).toContainText("Por activar");

  await page.getByRole("link", { name: "Bitácora" }).click();
  await expect(
    page.getByText(/Cambio de cuenta para recibir pagos · CLABE ··5127 · se activa/).first(),
  ).toBeVisible();

  await page.goto("/configuracion/cobros");
  await cuentas.getByRole("button", { name: "Cancelar cambio" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar cambio" }).click();
  await expect(page.getByText("Cambio cancelado · queda en la bitácora")).toBeVisible();
  await expect(cuentas).not.toContainText("··5127");
});

test("las formas de pago se agregan y se dejan de usar", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion/pagos-proveedores");
  const pagos = seccion(page, "Pagos a proveedores");
  await expect(pagos.getByRole("group", { name: "Tarjeta Airoo ··4417" })).toContainText("Crédito · BBVA");
  const ultimos = String(Date.now()).slice(-4);
  await pagos.getByRole("button", { name: "Agregar forma de pago" }).click();
  const d = page.getByRole("dialog", { name: "Nueva forma de pago" });
  await d.getByLabel("Nombre").fill("Tarjeta de prueba");
  await d.getByLabel("Últimos 4 dígitos").fill(ultimos);
  await d.getByRole("button", { name: "Agregar forma de pago" }).click();
  const nueva = pagos.getByRole("group", { name: `Tarjeta de prueba ··${ultimos}` });
  await expect(nueva).toBeVisible();
  await nueva.getByRole("button", { name: "Dejar de usar" }).click();
  await expect(nueva).toContainText("En desuso");
});

test("solo el dueño entra a Configuración", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  for (const ruta of ["/configuracion/precios", "/configuracion/cobros"]) {
    await page.goto(ruta);
    await expect(page.getByText("Esta sección no está disponible para tu rol")).toBeVisible();
    await expect(page.getByLabel("Límite", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "Cambiar" })).toBeHidden();
  }
});
