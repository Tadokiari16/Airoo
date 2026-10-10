import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

export const CONTRASENA = process.env.SEMILLA_CONTRASENA ?? "airoo-local-2026";
export const CORREOS = {
  dueno: "dueno@airoo.local",
  asesora: "asesora1@airoo.local",
  contador: "contador@airoo.local",
};

export async function entrarComo(page: Page, correo: string, contrasena = CONTRASENA) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/viajes$/);
}

export const navegacion = (page: Page) => page.getByRole("complementary", { name: "Navegación" });
