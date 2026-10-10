import { expect, test } from "@playwright/test";
import { CORREOS, entrarComo, navegacion } from "./ayuda";

test("sin sesión, el panel manda a Entrar", async ({ page }) => {
  await page.goto("/configuracion/ciudades");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar al panel" })).toBeVisible();
});

test("contraseña equivocada", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(CORREOS.dueno);
  await page.getByLabel("Contraseña").fill("no-es-esta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText("El correo o la contraseña no coinciden.");
});

test("Dueño ve todo el panel", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  const nav = navegacion(page);
  for (const s of [
    "Viajes",
    "Avisos",
    "Clientes",
    "Finanzas",
    "Hoteles",
    "Actividades",
    "Servicios",
    "Aerolíneas",
    "Proveedores",
    "Configuración",
  ])
    await expect(nav.getByRole("link", { name: s, exact: true })).toBeVisible();
  await expect(nav.getByText("Administrador")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Buen(os|as) (días|tardes|noches)$/ })).toBeVisible();
  await expect(page.getByText("Todavía no hay viajes")).toBeVisible();
  await page.screenshot({ path: "test-results/panel-dueno.png", fullPage: true });
});

test("Asesora no ve Finanzas ni Configuración", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  const nav = navegacion(page);
  await expect(nav.getByRole("link", { name: "Hoteles" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Finanzas" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Configuración" })).toHaveCount(0);
  await page.goto("/finanzas");
  await expect(page.getByText("Esta sección no está disponible para tu rol")).toBeVisible();
  await page.goto("/configuracion/ciudades");
  await expect(page.getByText("Esta sección no está disponible para tu rol")).toBeVisible();
});

test("Asesora no entra a Configuración ni por liga directa", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await expect(navegacion(page).getByRole("link", { name: "Configuración" })).toHaveCount(0);
  for (const ruta of [
    "/configuracion",
    "/configuracion/equipo",
    "/configuracion/ciudades",
    "/configuracion/bitacora",
  ]) {
    await page.goto(ruta);
    await expect(page.getByText("Esta sección no está disponible para tu rol")).toBeVisible();
    await expect(page.getByRole("button", { name: /Invitar|Agregar ciudad/ })).toHaveCount(0);
  }
  await page.screenshot({ path: "test-results/asesora-sin-acceso.png" });
  const csv = await page.request.get("/configuracion/bitacora/exportar");
  expect(csv.status()).toBe(403);
});

test("Contador ve Finanzas y Proveedores, sin catálogos de cotizar", async ({ page }) => {
  await entrarComo(page, CORREOS.contador);
  const nav = navegacion(page);
  await expect(nav.getByRole("link", { name: "Finanzas" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Proveedores" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Hoteles" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Configuración" })).toHaveCount(0);
});

test("buscador sin resultados todavía", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await page.keyboard.press("Control+k");
  await page.keyboard.type("AIR-2458");
  await expect(page.getByRole("status")).toContainText("Sin resultados para «AIR-2458»");
});

test("salir cierra la sesión", async ({ page }) => {
  await entrarComo(page, CORREOS.contador);
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/viajes");
  await expect(page).toHaveURL(/\/entrar$/);
});
