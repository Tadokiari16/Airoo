import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const sufijo = Date.now().toString(36);

// La primera ficha que se abre en modo desarrollo tarda en compilarse.
test.describe.configure({ timeout: 60_000 });

const bloque = (page: Page, titulo: string) => page.getByRole("region", { name: titulo, exact: true });
const barra = (page: Page) => page.getByRole("region", { name: "Cambios sin guardar" });
const pide = (page: Page) => page.getByRole("list", { name: "En el armador se va a pedir" });

async function crearServicio(page: Page, nombre: string, tipo: string, destino: string) {
  await page.goto("/servicios");
  await page.getByRole("button", { name: "Nuevo servicio" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo servicio" });
  await d.getByLabel("Nombre").fill(nombre);
  await d.getByRole("group", { name: "Tipo" }).getByRole("button", { name: tipo, exact: true }).click();
  await d.getByLabel("Destino").fill(destino);
  await d.getByRole("button", { name: "Crear y abrir ficha" }).click();
  const deTodos = d.getByRole("button", { name: "Crear de todos modos" });
  await expect(async () => {
    if (await deTodos.isVisible()) await deTodos.click();
    await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]{36}/, { timeout: 500 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
}

async function guardar(page: Page) {
  await barra(page).getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Ficha guardada · las cotizaciones nuevas ya usan estos datos")).toBeVisible();
  await expect(barra(page)).toBeHidden();
}

test("un traslado nuevo se cobra por vehículo y pide sus unidades", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  const nombre = `Traslado de prueba ${sufijo}`;
  await crearServicio(page, nombre, "Traslado", "Tulum");

  await expect(
    bloque(page, "Cómo se cobra").getByRole("button", { name: "Por vehículo", pressed: true }),
  ).toBeVisible();
  await expect(pide(page)).not.toContainText("Unidad");

  const unidades = bloque(page, "Unidades");
  await unidades.getByRole("button", { name: "Agregar unidad" }).click();
  await unidades.getByLabel("Nombre, unidad 1").fill("Van privada");
  await unidades.getByLabel("Pasajeros, Van privada").fill("10");
  await unidades.getByLabel("Maletas, Van privada").fill("8");
  await expect(pide(page)).toContainText("Unidad");
  await page.getByLabel("El cliente recibe").fill("Datos del chofer un día antes");
  await guardar(page);

  await page.goto("/servicios");
  const fila = page.getByRole("row", { name: nombre });
  await expect(fila).toContainText("1 unidad");
  await expect(fila).toContainText("Por vehículo");
  await expect(fila).toContainText("Por definir");
  await fila.click();
  const panel = page.getByRole("complementary", { name: nombre });
  await expect(panel.getByRole("region", { name: "Unidades" })).toContainText("Hasta 10");
  await expect(panel.getByRole("region", { name: "Para completar" })).toContainText("Falta el proveedor");
});

test("los pasajeros van en números", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await crearServicio(page, `Traslado con error ${sufijo}`, "Traslado", "Cancún");
  const unidades = bloque(page, "Unidades");
  await unidades.getByRole("button", { name: "Agregar unidad" }).click();
  await unidades.getByLabel("Nombre, unidad 1").fill("Sedán");
  await unidades.getByLabel("Pasajeros, Sedán").fill("tres");
  await barra(page).getByRole("button", { name: "Guardar" }).click();
  await expect(barra(page)).toContainText("Los pasajeros van en números, del 1 al 99.");
});

test("«Varía por reserva» quita los proveedores ligados", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  const nombre = `Seguro de prueba ${sufijo}`;
  await crearServicio(page, nombre, "Seguro", "Cualquier destino");
  await expect(
    bloque(page, "Cómo se cobra").getByRole("button", { name: "Por persona y día", pressed: true }),
  ).toBeVisible();

  const reservar = bloque(page, "Dónde se puede reservar");
  await reservar.getByRole("button", { name: "Ligar proveedor" }).click();
  await reservar.getByLabel("Proveedor para ligar").selectOption({ label: "Assist Card" });
  await expect(reservar.getByRole("listitem", { name: "Assist Card" })).toBeVisible();

  await reservar.getByRole("button", { name: "Varía por reserva" }).click();
  const d = page.getByRole("dialog", { name: "¿Varía por reserva?" });
  await expect(d).toContainText("Se quita Assist Card de este servicio.");
  await d.getByRole("button", { name: "Varía por reserva" }).click();
  await expect(reservar).toContainText("Varía por reserva: no hay un proveedor fijo.");
  await expect(reservar.getByRole("listitem", { name: "Assist Card" })).toBeHidden();

  await page.goto("/servicios");
  await expect(page.getByRole("row", { name: nombre })).toContainText("Varía por reserva");
});

test("la asesora archiva servicios pero no los elimina", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await page.goto("/servicios");
  await page.getByRole("row", { name: "eSIM de datos" }).click();
  await page.getByRole("link", { name: "Abrir ficha" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "eSIM de datos" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Servicio activo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eliminar servicio" })).toBeHidden();
});
