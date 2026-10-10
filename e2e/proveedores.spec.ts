import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const sufijo = Date.now().toString(36);
const CLABE_BBVA = "012180000123456782";
const CLABE_SANTANDER = "014180000987654320";

const panel = (page: Page, nombre: string) => page.getByRole("complementary", { name: nombre });
const cuentas = (page: Page, nombre: string) =>
  panel(page, nombre).getByRole("region", { name: "Cuentas donde recibe" });

async function crearDirecto(page: Page, nombre: string, conCuenta = true) {
  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await d.getByLabel("Nombre", { exact: true }).first().fill(nombre);
  await d.getByRole("button", { name: "Traslados" }).click();
  await d.getByRole("radio", { name: /Directo con ellos/ }).click();
  if (conCuenta) {
    await d.getByLabel("Banco").fill("BBVA");
    await d.getByLabel("CLABE").fill(CLABE_BBVA);
    await d.getByLabel("A nombre de").fill("Transportes de Prueba SA");
  }
  await d.locator("#contacto_nombre").fill("Contacto 9");
  await d.getByLabel("WhatsApp").fill("+52 998 100 0199");
  await d.getByRole("button", { name: "Crear proveedor" }).click();
  // Corridas anteriores dejan proveedores de prueba con nombre parecido.
  const deTodos = d.getByRole("button", { name: "Crear de todos modos" });
  await expect(async () => {
    if (await deTodos.isVisible()) await deTodos.click();
    await expect(d).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await expect(panel(page, nombre)).toBeVisible();
}

test("una cuenta nueva queda por verificar y solo se aprueba con la llamada y el estado de cuenta", async ({
  page,
}) => {
  const nombre = `Traslados Prueba ${sufijo}`;
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/proveedores");

  // Una CLABE con el dígito verificador mal no se guarda.
  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await d.getByLabel("Nombre", { exact: true }).first().fill(nombre);
  await d.getByRole("button", { name: "Traslados" }).click();
  await d.getByRole("radio", { name: /Directo con ellos/ }).click();
  await d.getByLabel("Banco").fill("BBVA");
  await d.getByLabel("CLABE").fill("012180000123456781");
  await d.getByLabel("A nombre de").fill("Transportes de Prueba SA");
  await d.getByRole("button", { name: "Crear proveedor" }).click();
  await expect(d.getByRole("alert")).toHaveText(
    "El último dígito de la CLABE no coincide; puede haber un número cambiado.",
  );
  // Lo capturado no se pierde con el error.
  await expect(d.getByLabel("A nombre de")).toHaveValue("Transportes de Prueba SA");
  await page.keyboard.press("Escape");

  await crearDirecto(page, nombre);
  const c = cuentas(page, nombre);
  await expect(c.getByText("Por verificar")).toBeVisible();
  await expect(c.getByText("CLABE ••6782")).toBeVisible();
  await expect(c.getByText(/se confirma llamando al \+52 998 100 0199/)).toBeVisible();

  // Aprobar pide las dos casillas.
  await c.getByRole("button", { name: "Verificar", exact: true }).click();
  const v = page.getByRole("dialog", { name: "Verificar cuenta nueva" });
  const aprobar = v.getByRole("button", { name: "Aprobar cuenta nueva" });
  await expect(aprobar).toBeDisabled();
  await v.getByText("Confirmé el cambio por teléfono").click();
  await expect(aprobar).toBeDisabled();
  await v.getByText("El estado de cuenta coincide").click();
  await expect(aprobar).toBeEnabled();
  await aprobar.click();
  await expect(v).toBeHidden();
  await expect(c.getByText("Verificada", { exact: true })).toBeVisible();
  await expect(c.getByText(/Verificada por Luis · .* · llamada al \+52 998 100 0199/)).toBeVisible();

  // Un cambio de cuenta queda pendiente y se sigue mostrando la anterior.
  await c.getByRole("button", { name: "Cambiar" }).click();
  await c.getByLabel("Banco").fill("Santander");
  await c.getByRole("textbox", { name: "CLABE" }).fill(CLABE_SANTANDER);
  await c.getByLabel("A nombre de").fill("Otra Persona");
  await c.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(c.getByLabel("CLABE BBVA ••6782").getByText("Verificada", { exact: true })).toBeVisible();
  await expect(
    c.getByLabel("CLABE Santander ••4320").getByText("Por verificar", { exact: true }),
  ).toBeVisible();
  // Se llama al número de la cuenta anterior, no a uno nuevo.
  await expect(c.getByText(/se confirma llamando al \+52 998 100 0199/)).toBeVisible();

  await c.getByRole("button", { name: "Verificar cambio" }).click();
  await expect(
    v.getByText(`${nombre} pidió pagar a otra cuenta. Hasta aprobarla, se sigue usando la anterior.`),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/proveedores-verificar-cambio.png" });
  await v.getByRole("button", { name: "Rechazar cambio" }).click();
  await expect(v).toBeHidden();
  await expect(c.getByLabel("CLABE Santander ••4320")).toHaveCount(0);
  await expect(c.getByLabel("CLABE BBVA ••6782")).toBeVisible();

  await page.goto("/configuracion/bitacora");
  await expect(
    page.getByText(`Cuenta registrada para ${nombre}: CLABE BBVA ••6782, por verificar con una llamada`),
  ).toBeVisible();
  await expect(
    page.getByText(new RegExp(`Cuenta aprobada para ${nombre}: CLABE BBVA ••6782, confirmada por llamada`)),
  ).toBeVisible();
  await expect(page.getByText(`Cuenta rechazada para ${nombre}: CLABE Santander ••4320`)).toBeVisible();
});

test("Dueño y Contador ven la cuenta completa y cada vista queda en la bitácora; la Asesora la ve enmascarada", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();

  await entrarComo(page, CORREOS.contador);
  await page.goto("/proveedores");
  await expect(page.getByRole("button", { name: "Nuevo proveedor" })).toHaveCount(0);
  await page.getByRole("row", { name: "Holbox Mar Azul" }).click();
  const c = cuentas(page, "Holbox Mar Azul");
  await expect(c.getByText("Tarjeta ••8812")).toBeVisible();
  await c.getByRole("button", { name: "Ver completa" }).click();
  await expect(c.getByText(/Tarjeta 5204 \d{4} \d{4} 8812/)).toBeVisible();
  await c.getByRole("button", { name: "Copiar completa" }).click();
  await expect(page.getByText("Tarjeta copiada · queda en la bitácora")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^5204\d{8}8812$/);
  // El contador no edita, no archiva ni cambia cuentas.
  await expect(panel(page, "Holbox Mar Azul").getByRole("button", { name: "Editar proveedor" })).toHaveCount(
    0,
  );
  await expect(panel(page, "Holbox Mar Azul").getByRole("button", { name: "Archivar" })).toHaveCount(0);
  await expect(c.getByRole("button", { name: "Cambiar" })).toHaveCount(0);
  await ctx.close();

  const dueno = await browser.newPage();
  await entrarComo(dueno, CORREOS.dueno);
  await dueno.goto("/configuracion/bitacora");
  await expect(
    dueno.getByText("Vio completa la Tarjeta de Holbox Mar Azul (Banamex ••8812)").first(),
  ).toBeVisible();
  await expect(
    dueno.getByText("Copió completa la Tarjeta de Holbox Mar Azul (Banamex ••8812)").first(),
  ).toBeVisible();
  await dueno.close();

  const asesora = await browser.newPage();
  await entrarComo(asesora, CORREOS.asesora);
  await asesora.goto("/proveedores");
  await asesora.getByRole("row", { name: "Holbox Mar Azul" }).click();
  const ca = cuentas(asesora, "Holbox Mar Azul");
  await expect(ca.getByText("Tarjeta ••8812")).toBeVisible();
  await expect(ca.getByRole("button", { name: "Ver completa" })).toHaveCount(0);
  await expect(ca.getByRole("button", { name: "Copiar completa" })).toHaveCount(0);
  await expect(ca.getByRole("button", { name: "Agregar" })).toHaveCount(0);
  await expect(ca.getByRole("button", { name: "Cambiar" })).toHaveCount(0);
  // Ningún número completo llega a su navegador.
  expect(await asesora.content()).not.toMatch(/5204\s?\d{4}/);
  await asesora.close();
});

test("la Asesora archiva y reactiva; solo el Dueño elimina, y solo lo que nunca se usó", async ({
  browser,
}) => {
  const nombre = `Operador Prueba ${sufijo}`;
  const dueno = await browser.newPage();
  await entrarComo(dueno, CORREOS.dueno);
  await dueno.goto("/proveedores");
  await crearDirecto(dueno, nombre, false);

  const asesora = await browser.newPage();
  await entrarComo(asesora, CORREOS.asesora);
  await asesora.goto("/proveedores");
  await asesora.getByRole("row", { name: nombre }).click();
  const p = panel(asesora, nombre);
  await expect(p.getByRole("button", { name: "Eliminar proveedor" })).toHaveCount(0);
  await p.getByRole("button", { name: "Archivar" }).click();
  const conf = asesora.getByRole("dialog", { name: `¿Archivar ${nombre}?` });
  await conf.getByPlaceholder("Ej. Ya no trabajamos con ellos").fill("Cerró en 2026");
  await conf.getByRole("button", { name: "Archivar" }).click();
  await expect(asesora.getByRole("tab", { name: /Archivados/ })).toHaveAttribute("aria-selected", "true");
  await expect(p.getByText("Cerró en 2026")).toBeVisible();
  await p.getByRole("button", { name: "Reactivar" }).click();
  await expect(asesora.getByRole("tab", { name: /Todos/ })).toHaveAttribute("aria-selected", "true");
  await asesora.close();

  await dueno.reload();
  await dueno.getByRole("row", { name: nombre }).click();
  await panel(dueno, nombre).getByRole("button", { name: "Eliminar proveedor" }).click();
  const el = dueno.getByRole("dialog", { name: `¿Eliminar ${nombre}?` });
  await expect(el.getByText(/Solo se puede porque nunca se usó/)).toBeVisible();
  await el.getByRole("button", { name: "Eliminar" }).click();
  await expect(dueno.getByRole("row", { name: nombre })).toHaveCount(0);
  await dueno.close();
});

test("avisa de un proveedor con nombre parecido, agrega contactos y busca por contacto", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/proveedores");

  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await d.getByLabel("Nombre", { exact: true }).first().fill("Ratehawk");
  await d.getByRole("button", { name: "Hoteles" }).click();
  await d.getByLabel("Sitio para agencias").fill("ratehawk.com");
  await d.getByRole("button", { name: "Crear proveedor" }).click();
  await expect(d.getByText("Ya hay proveedores con nombre parecido")).toBeVisible();
  await expect(d.getByRole("listitem").filter({ hasText: "RateHawk" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Contacto nuevo y búsqueda por su nombre.
  await page.getByRole("row", { name: "Yucatán Destinos DMC" }).click();
  const p = panel(page, "Yucatán Destinos DMC");
  const contactos = p.getByRole("region", { name: "Contactos" });
  await contactos.getByRole("button", { name: "Agregar" }).click();
  await contactos.getByLabel("Nombre").fill(`Contacto ${sufijo}`);
  await contactos.getByRole("button", { name: "Pagos" }).click();
  await contactos.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(contactos.getByRole("alert")).toHaveText(
    "El contacto necesita WhatsApp o correo para poder escribirle.",
  );
  await contactos.getByLabel("Correo").fill("pagos@yucatandestinos.example");
  await contactos.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(contactos.getByText(`Contacto ${sufijo}`)).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByPlaceholder("Buscar proveedor o contacto").fill(`contacto ${sufijo}`);
  await expect(page.getByRole("row", { name: "Yucatán Destinos DMC" })).toBeVisible();
  await expect(page.getByRole("row", { name: "RateHawk" })).toHaveCount(0);
});
