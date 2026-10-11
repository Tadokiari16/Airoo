import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

test.describe.configure({ timeout: 60_000 });

const panel = (page: Page, nombre: string) => page.getByRole("complementary", { name: nombre });

async function abrir(page: Page, nombre: string) {
  await page.goto("/aerolineas");
  await page.getByRole("row", { name: nombre }).click();
  await expect(panel(page, nombre)).toBeVisible();
}

test("se agrega desde la lista IATA y solo el dueño la elimina", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/aerolineas");
  // Si una corrida anterior dejó Iberia, se quita primero.
  if (await page.getByRole("row", { name: "Iberia" }).isVisible()) {
    await page.getByRole("row", { name: "Iberia" }).click();
    await panel(page, "Iberia").getByRole("button", { name: "Editar" }).click();
    await panel(page, "Iberia").getByRole("button", { name: "Eliminar aerolínea" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar aerolínea" }).click();
    await expect(page.getByRole("row", { name: "Iberia" })).toBeHidden();
  }

  await page.getByRole("button", { name: "Nueva aerolínea" }).click();
  const d = page.getByRole("dialog", { name: "Nueva aerolínea" });
  await d.getByLabel("Código o nombre").fill("VB");
  await expect(d.getByRole("option", { name: /VivaAerobus/ })).toBeDisabled();
  await expect(d.getByRole("option", { name: /VivaAerobus/ })).toContainText("Ya está en el catálogo");

  await d.getByLabel("Código o nombre").fill("IB");
  await d.getByRole("option", { name: /^Iberia Código IB/ }).click();
  await d.getByRole("button", { name: "Agregar aerolínea" }).click();
  await expect(page.getByText("Iberia agregada · faltan sus tarifas y el check-in")).toBeVisible();
  const fila = page.getByRole("row", { name: "Iberia" });
  await expect(fila).toContainText("Sin tarifas");
  await expect(fila).toContainText("2 ventanas por verificar");
  await expect(panel(page, "Iberia")).toBeVisible();

  await panel(page, "Iberia").getByRole("button", { name: "Editar" }).click();
  await panel(page, "Iberia").getByRole("button", { name: "Eliminar aerolínea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar aerolínea" }).click();
  await expect(page.getByText("Iberia eliminada del catálogo")).toBeVisible();
  await expect(fila).toBeHidden();
});

test("un código que ya está no se agrega a mano", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/aerolineas");
  await page.getByRole("button", { name: "Nueva aerolínea" }).click();
  const d = page.getByRole("dialog", { name: "Nueva aerolínea" });
  await d.getByRole("button", { name: "No está en la lista" }).click();
  await d.getByLabel("Código IATA").fill("y4");
  await d.getByLabel("Nombre").fill("Otra Volaris");
  await d.getByRole("button", { name: "Agregar aerolínea" }).click();
  await expect(d.getByRole("alert")).toHaveText("Volaris (Y4) ya está en el catálogo.");
});

test("el check-in se verifica y deja de estarlo si cambia la hora", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await abrir(page, "Aeroméxico");
  const p = panel(page, "Aeroméxico");

  await p.getByRole("button", { name: "Editar" }).click();
  await p.getByLabel("Abre, Nacional").fill("24 h antes");
  await p.getByLabel("Cierra, Nacional").fill("1 h antes");
  await p.getByLabel("Fuente, Nacional").selectOption("terceros");
  await p.getByLabel("Cuál guía, Nacional").fill("sitio de la aerolínea");
  await p.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByText("Aeroméxico guardada · las cotizaciones nuevas ya usan estos datos"),
  ).toBeVisible();

  const nacional = p.getByRole("row", { name: "Check-in nacional" });
  await expect(nacional).toContainText("Guía de terceros (sitio de la aerolínea)");
  await nacional.getByRole("button", { name: "Marcar verificado" }).click();
  await expect(page.getByText("Ventana verificada · el check-in asistido usará esta hora")).toBeVisible();
  await expect(nacional).toContainText("Verificado por Luis");

  // Internacional no tiene horas: no se puede verificar todavía.
  await p
    .getByRole("row", { name: "Check-in internacional" })
    .getByRole("button", { name: "Marcar verificado" })
    .click();
  await expect(page.getByText(/Faltan la apertura y el cierre de esa ruta/)).toBeVisible();

  await p.getByRole("button", { name: "Editar" }).click();
  await p.getByLabel("Cierra, Nacional").fill("45 min antes");
  await expect(p).toContainText("Con otra hora deja de estar verificada");
  await p.getByRole("button", { name: "Guardar" }).click();
  await expect(nacional).toContainText("Guía de terceros (sitio de la aerolínea)");
  await expect(nacional.getByRole("button", { name: "Marcar verificado" })).toBeVisible();
});

test("tarifas y equipaje se editan en el panel", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await abrir(page, "Volaris");
  const p = panel(page, "Volaris");
  await p.getByRole("button", { name: "Editar" }).click();
  await expect(p.getByRole("button", { name: "Eliminar aerolínea" })).toBeHidden();
  await p.getByLabel("Documentada, Plus").fill("35 kg");
  await p.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("row", { name: "Volaris" })).toContainText("Hasta 35 kg");

  await p.getByRole("button", { name: "Editar" }).click();
  await p.getByLabel("Documentada, Plus").fill("25 kg");
  await p.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("row", { name: "Volaris" })).toContainText("Hasta 25 kg");
});
