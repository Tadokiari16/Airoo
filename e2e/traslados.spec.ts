import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo, navegacion } from "./ayuda";

const sufijo = Date.now().toString(36);
test.describe.configure({ timeout: 90_000 });

const panel = (page: Page, nombre: string) => page.getByRole("complementary", { name: nombre });
const antesDeEnviar = (page: Page) => page.getByRole("region", { name: "Antes de enviar" });

test("el catálogo de traslados guarda tipos de unidad, sin ciudad, proveedor ni precio", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await navegacion(page).getByRole("link", { name: "Traslados" }).click();
  await expect(page).toHaveURL(/\/traslados$/);
  for (const n of ["Sedán", "SUV", "Van", "Sprinter", "Van adaptada"])
    await expect(page.getByRole("row", { name: n, exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Ciudad|Proveedor|Precio/ })).toHaveCount(0);

  const nombre = `Minivan ${sufijo}`;
  await page.getByRole("button", { name: "Nuevo tipo de unidad" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo tipo de unidad" });
  await d.getByLabel("Nombre").fill(nombre);
  await d.getByLabel("Pasajeros máximos").fill("2");
  await d.getByLabel("Maletas máximas").fill("1");
  await d.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText(`${nombre} agregada · faltan su foto y su descripción`)).toBeVisible();

  const fila = page.getByRole("row", { name: nombre });
  await expect(fila).toContainText("Hasta 2");
  await expect(fila).toContainText("Faltan foto y descripción");

  const p = panel(page, nombre);
  await p.getByRole("button", { name: "Editar" }).click();
  await p.getByLabel("Descripción").fill("Minivan con aire acondicionado.");
  await p.getByLabel("Maletas máximas").fill("2");
  await p.getByRole("button", { name: "Guardar" }).click();
  await expect(fila.getByRole("cell").nth(2)).toContainText("Hasta 2");
  await expect(fila).toContainText("Falta la foto");

  // Un nombre repetido no se agrega.
  await p.getByRole("button", { name: "Cerrar" }).first().click();
  await page.getByRole("button", { name: "Nuevo tipo de unidad" }).click();
  await d.getByLabel("Nombre").fill("van adaptada");
  await d.getByRole("button", { name: "Agregar" }).click();
  await expect(d.getByRole("alert")).toContainText("Van adaptada ya está en el catálogo.");
  await d.getByRole("button", { name: "Cancelar" }).click();

  // Se archiva: deja de aparecer al cotizar.
  await fila.click();
  await p.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("dialog", { name: `¿Archivar ${nombre}?` }).getByRole("button", { name: /Archivar/ }).click();
  await expect(page.getByText(`${nombre} archivada · ya no aparece al cotizar`)).toBeVisible();
});

test("el traslado del viaje de ejemplo queda por revisar si su vuelo cambia de horario", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/viajes/2458/armador");
  const t = page.getByRole("article", { name: "Traslado privado · Van adaptada" });
  await expect(t).toBeVisible();
  await expect(t.getByRole("radio", { name: "Aeropuerto–hotel", checked: true })).toBeVisible();
  await expect(t.getByRole("radio", { name: "Privado", checked: true })).toBeVisible();
  await expect(t.getByRole("radio", { name: "Redondo", checked: true })).toBeVisible();
  await expect(t.getByLabel("Desde, llegada")).toHaveValue("Aeropuerto de Cancún (CUN)");
  await expect(t.getByLabel("Hasta, llegada")).toHaveValue("Seadust Cancún Family Resort");
  await expect(t).toContainText("Llega VB 2124 a las 08:26 PM");
  await expect(t).toContainText("Hasta 6 pasajeros · 6 maletas: cabe el grupo.");

  // Más maletas de las que caben: aviso.
  await t.getByRole("button", { name: "Más maletas" }).click();
  await expect(t).toContainText("Son 7 maletas y la unidad Van adaptada lleva hasta 6.");
  await t.getByRole("button", { name: "Menos maletas" }).click();

  // El vuelo llega más tarde: el traslado queda por revisar y no se puede enviar.
  const vuelo = page.getByRole("article", { name: /Vuelo redondo/ });
  const llegada = vuelo.getByLabel("Hora de llegada de ida");
  await llegada.fill("930p");
  await llegada.blur();
  await expect(t.getByRole("status")).toContainText("VB 2124 ahora llega el Mié 21 oct, 09:30 PM");
  await expect(antesDeEnviar(page)).toContainText("Traslado por revisar");
  await t.getByRole("button", { name: "Dejar como está" }).click();
  await expect(t.getByRole("status")).toHaveCount(0);
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();

  // Se deja todo como estaba.
  await llegada.fill("826p");
  await llegada.blur();
  await t.getByRole("button", { name: "Dejar como está" }).click();
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
});

test("un traslado nuevo se propone con el vuelo y el hotel, y el compartido no lleva unidad", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/viajes/2458/armador");
  await page.getByRole("button", { name: "Agregar traslado" }).click();
  const a = page.getByRole("dialog", { name: "Agregar servicio" });
  await expect(a.getByRole("tab", { name: /Traslado/, selected: true })).toBeVisible();
  // 6 personas: la unidad más chica en la que caben es la Van.
  await expect(a.getByRole("option", { name: /^Van Hasta 10/, selected: true })).toBeVisible();
  await a.getByRole("option", { name: /Traslado compartido/ }).click();
  await a.getByRole("button", { name: "Agregar al viaje" }).click();

  const t = page.getByRole("article", { name: "Traslado compartido" });
  await expect(t).toBeVisible();
  await expect(t.getByLabel("Unidad")).toHaveCount(0);
  await expect(t.getByLabel("Hora, llegada")).toHaveValue("08:26 PM");
  await expect(t.getByLabel("Fecha, salida")).toHaveValue("2026-10-27");
  await expect(t).toContainText("Sale VB 2125 a las 06:13 PM · nacional: llegar al aeropuerto a las 04:13 PM");

  // Libre: origen y destino a mano; el regreso es el mismo camino al revés.
  await t.getByRole("radio", { name: "Libre" }).click();
  await t.getByLabel("Desde, ida").fill("Seadust Cancún Family Resort");
  await t.getByLabel("Hasta, ida").fill("Muelle de Playa del Carmen");
  await expect(t.getByLabel("Desde, regreso")).toHaveValue("Muelle de Playa del Carmen");

  // Se quita para no cambiar el total del viaje de ejemplo.
  await t.getByRole("button", { name: "Quitar Traslado compartido" }).click();
  await page.getByRole("dialog", { name: "Quitar de la cotización" }).getByRole("button", { name: "Quitar" }).click();
  await expect(t).toHaveCount(0);
});
