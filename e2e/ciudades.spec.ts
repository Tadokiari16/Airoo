import { expect, test } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const sufijo = Date.now().toString(36);

test("agregar, avisar de parecidas, archivar y reactivar", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion/ciudades");
  await expect(page.getByRole("cell", { name: "Cancún" })).toBeVisible();

  // Búsqueda sin acentos
  await page.getByPlaceholder("Buscar ciudad, estado o país").fill("merida");
  await expect(page.getByRole("cell", { name: "Mérida" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Cancún" })).toHaveCount(0);
  await page.getByPlaceholder("Buscar ciudad, estado o país").fill("");

  // Duplicado exacto (sin acentos) se bloquea
  await page.getByRole("button", { name: "Agregar ciudad" }).click();
  const dialogo = page.getByRole("dialog", { name: "Agregar ciudad" });
  await dialogo.getByLabel("Ciudad").fill("cancun");
  await dialogo.getByLabel("Estado o región").fill("Quintana Roo");
  await dialogo.getByRole("button", { name: "Agregar a la lista" }).click();
  await expect(dialogo.getByRole("alert")).toHaveText("cancun, Quintana Roo ya está en la lista.");

  // Parecida: «San Cristóbal» en Venezuela avisa por San Cristóbal de las Casas
  await dialogo.getByLabel("Ciudad").fill("San Cristóbal");
  await dialogo.getByLabel("Estado o región").fill(`Táchira ${sufijo}`);
  await dialogo.getByLabel("País").fill("Venezuela");
  await dialogo.getByRole("button", { name: "Agregar a la lista" }).click();
  await expect(dialogo.getByText("Ya hay ciudades con nombre parecido")).toBeVisible();
  await expect(dialogo.getByText("San Cristóbal de las Casas · Chiapas, México")).toBeVisible();
  await page.screenshot({ path: "test-results/ciudades-parecidas.png" });
  await dialogo.getByRole("button", { name: "Agregar de todos modos" }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText("San Cristóbal, Táchira")).toBeVisible();

  // Archivar con confirmación y reactivar
  const fila = page.getByRole("row").filter({ hasText: `Táchira ${sufijo}` });
  await fila.getByRole("button", { name: "Archivar" }).click();
  await page
    .getByRole("dialog", { name: "¿Archivar San Cristóbal?" })
    .getByRole("button", { name: "Archivar ciudad" })
    .click();
  await expect(fila).toHaveCount(0);
  await page.getByRole("tab", { name: /Archivadas/ }).click();
  await page
    .getByRole("row")
    .filter({ hasText: `Táchira ${sufijo}` })
    .getByRole("button", { name: "Reactivar" })
    .click();
  await expect(page.getByRole("row").filter({ hasText: `Táchira ${sufijo}` })).toHaveCount(0);

  // Eliminar (nadie la usa todavía)
  await page.getByRole("tab", { name: /Activas/ }).click();
  await page
    .getByRole("row")
    .filter({ hasText: `Táchira ${sufijo}` })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await page
    .getByRole("dialog", { name: "¿Eliminar San Cristóbal?" })
    .getByRole("button", { name: "Eliminar ciudad" })
    .click();
  await expect(page.getByRole("row").filter({ hasText: `Táchira ${sufijo}` })).toHaveCount(0);

  // Todo queda en la bitácora
  await page.goto("/configuracion/bitacora");
  await expect(page.getByText(`Ciudad agregada: San Cristóbal, Táchira ${sufijo}, Venezuela`)).toBeVisible();
  await expect(page.getByText(`Ciudad eliminada: San Cristóbal, Táchira ${sufijo}`)).toBeVisible();
});
