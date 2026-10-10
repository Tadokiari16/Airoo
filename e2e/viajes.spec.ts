import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const antesDeEnviar = (page: Page) => page.getByRole("region", { name: "Antes de enviar" });
const total = (page: Page) => page.getByRole("region", { name: /^Total/ });

test("el viaje de ejemplo se arma con tres opciones y el total del prototipo", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/viajes/2458");
  await expect(page.getByRole("heading", { name: "Nataly Cervantes" })).toBeVisible();
  await page.getByRole("link", { name: "Abrir armador" }).click();
  await expect(page).toHaveURL(/\/viajes\/2458\/armador$/);

  await expect(total(page).getByText("$42,248.48").first()).toBeVisible();
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();

  // Cada opción tiene su total; Seadust es la recomendada.
  const opciones = page.getByRole("tablist", { name: "Opciones de hospedaje" });
  await expect(opciones.getByRole("tab")).toHaveCount(3);
  await expect(opciones.getByRole("tab", { selected: true })).toContainText("Seadust");
  await total(page).getByRole("radio", { name: "Adhara" }).click();
  await expect(total(page).getByText("$42,248.48")).toHaveCount(0);
});

test("un viaje nuevo empieza en AIR-1001 o después y su cotización se arma desde cero", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.getByRole("button", { name: "Nuevo viaje" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo viaje" });
  await d.getByLabel("Buscar cliente").fill("Cliente prueba armador");
  await d.getByRole("button", { name: /Cliente nuevo/ }).click();
  await d.getByLabel("WhatsApp").fill("998 000 1122");
  await d.getByLabel("Salida", { exact: true }).fill("2026-12-10");
  await d.getByLabel("Regreso", { exact: true }).fill("2026-12-14");
  await d.getByLabel("Adultos").fill("2");
  await d.getByRole("button", { name: "Crear viaje" }).click();
  await expect(page).toHaveURL(/\/viajes\/\d+$/);
  const folio = Number(page.url().split("/").pop());
  expect(folio).toBeGreaterThanOrEqual(1001);
  expect(folio).toBeLessThan(2400);

  await page.getByRole("link", { name: "Abrir armador" }).click();
  await expect(antesDeEnviar(page).getByText("La cotización no tiene servicios")).toBeVisible();

  // Agregar hotel: buscar en el catálogo y llevarlo al viaje.
  await page.getByRole("button", { name: "Agregar hotel" }).click();
  const a = page.getByRole("dialog", { name: "Agregar servicio" });
  await a.getByLabel("Buscar en el catálogo").fill("Seadust");
  await a.getByRole("option", { name: /Seadust/ }).click();
  await a.getByRole("button", { name: "Agregar al viaje" }).click();
  await expect(a).toBeHidden();

  const hotel = page.getByRole("article", { name: /Seadust/ });
  await expect(antesDeEnviar(page).getByText(/Seadust sin costo neto/)).toBeVisible();
  await hotel.getByLabel("Neto de la habitación 1").fill("15000");
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  // $15,000 más 10% de utilidad base.
  await expect(hotel.getByText("$16,500")).toBeVisible();

  // Lo guardado sigue ahí al volver a abrir.
  await page.reload();
  await expect(page.getByRole("article", { name: /Seadust/ }).getByLabel("Neto de la habitación 1")).toHaveValue(
    "15,000",
  );

  // Quitar el hotel lo saca de la cotización.
  await page.getByRole("button", { name: /^Quitar Seadust/ }).click();
  await page.getByRole("dialog", { name: "Quitar de la cotización" }).getByRole("button", { name: "Quitar" }).click();
  await expect(antesDeEnviar(page).getByText("La cotización no tiene servicios")).toBeVisible();
});

test("la asesora no arma la cotización de un viaje que atiende otra persona", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await page.goto("/viajes/2458/armador");
  await expect(page.getByText("Este viaje lo atiende otra persona del equipo")).toBeVisible();
  await page.goto("/viajes/2441/armador");
  await expect(page.getByRole("region", { name: "Hospedaje" })).toBeVisible();
});

test("el contador no entra al armador", async ({ page }) => {
  await entrarComo(page, CORREOS.contador);
  await page.goto("/viajes/2458/armador");
  await expect(page.getByText("Armar cotizaciones no está disponible para tu rol")).toBeVisible();
});
