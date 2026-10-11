import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const antesDeEnviar = (page: Page) => page.getByRole("region", { name: "Antes de enviar" });
const total = (page: Page) => page.getByRole("region", { name: /^Total/ });

test("el viaje de ejemplo se arma con tres opciones y el total del prototipo", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/viajes/2458");
  await expect(page.getByRole("heading", { name: "Nataly Cervantes", exact: true })).toBeVisible();
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
  // Un solo costo neto por servicio: lo que cobra el proveedor por todo.
  await expect(hotel.getByLabel(/Neto de la habitación/)).toHaveCount(0);
  await hotel.getByLabel("Costo neto total").fill("15000");
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  // $15,000 más 10% de utilidad base.
  await expect(hotel.getByText("$16,500")).toBeVisible();

  // Lo guardado sigue ahí al volver a abrir.
  await page.reload();
  await expect(page.getByRole("article", { name: /Seadust/ }).getByLabel("Costo neto total")).toHaveValue(
    "15,000",
  );

  // Quitar el hotel lo saca de la cotización.
  await page.getByRole("button", { name: /^Quitar Seadust/ }).click();
  await page.getByRole("dialog", { name: "Quitar de la cotización" }).getByRole("button", { name: "Quitar" }).click();
  await expect(antesDeEnviar(page).getByText("La cotización no tiene servicios")).toBeVisible();
});

async function nuevoViaje(page: Page, cliente: string) {
  await page.getByRole("button", { name: "Nuevo viaje" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo viaje" });
  await d.getByLabel("Buscar cliente").fill(cliente);
  await d.getByRole("button", { name: /Cliente nuevo/ }).click();
  await d.getByLabel("WhatsApp").fill("998 000 3344");
  await d.getByLabel("Salida", { exact: true }).fill("2026-12-10");
  await d.getByLabel("Regreso", { exact: true }).fill("2026-12-14");
  await d.getByLabel("Adultos").fill("2");
  await d.getByRole("button", { name: "Crear viaje" }).click();
  await expect(page).toHaveURL(/\/viajes\/\d+$/);
  await page.getByRole("link", { name: "Abrir armador" }).click();
}

async function aeropuerto(vuelo: ReturnType<Page["getByRole"]>, campo: string, buscar: string, clave: string) {
  const c = vuelo.getByRole("combobox", { name: campo });
  await c.fill(buscar);
  await vuelo.getByRole("option", { name: new RegExp(`^${clave}`) }).click();
  await expect(c).toHaveValue(new RegExp(`^${clave} · `));
}

test("vuelo con escala: aeropuertos de la lista, duración, conexión, errores y avisos", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba vuelos");

  await page.getByRole("button", { name: "Agregar vuelo" }).click();
  const a = page.getByRole("dialog", { name: "Agregar servicio" });
  await a.getByLabel("Buscar en el catálogo").fill("Viva");
  await a.getByRole("option", { name: /VivaAerobus/ }).click();
  await a.getByRole("button", { name: "Agregar al viaje" }).click();
  await expect(a).toBeHidden();
  const vuelo = page.getByRole("article", { name: /VivaAerobus/ });

  // El campo busca por clave, ciudad o nombre y no acepta texto libre.
  const origen = vuelo.getByRole("combobox", { name: "Origen del vuelo de ida" });
  await origen.fill("zzzz");
  await expect(vuelo.getByText(/Sin aeropuertos con «zzzz»/)).toBeVisible();
  await origen.blur();
  await expect(origen).toHaveValue("");
  await aeropuerto(vuelo, "Origen del vuelo de ida", "Guadalajara", "GDL");
  await aeropuerto(vuelo, "Destino del vuelo de ida", "MEX", "MEX");
  await vuelo.getByLabel("Número del vuelo de ida").fill("vb1100");
  await vuelo.getByLabel("Hora de salida de ida").fill("6a");
  await vuelo.getByLabel("Hora de llegada de ida").fill("730a");
  await vuelo.getByLabel("Hora de llegada de ida").blur();
  await expect(vuelo.getByLabel("Número del vuelo de ida")).toHaveValue("VB 1100");
  await expect(vuelo.getByText("1 h 30 min")).toBeVisible();

  // Escala en Ciudad de México: el tramo nuevo sale de donde llegó el anterior.
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await vuelo.getByRole("group", { name: "Ida" }).getByRole("button", { name: "+ Agregar escala" }).click();
  await expect(vuelo.getByRole("combobox", { name: "Origen del vuelo de ida tramo 2" })).toHaveValue("MEX · Ciudad de México");
  await aeropuerto(vuelo, "Destino del vuelo de ida tramo 2", "Cancún", "CUN");
  await vuelo.getByLabel("Número del vuelo de ida tramo 2").fill("VB 2200");
  await vuelo.getByLabel("Hora de salida de ida tramo 2").fill("810a");
  await vuelo.getByLabel("Hora de llegada de ida tramo 2").fill("1140a");
  await vuelo.getByLabel("Hora de llegada de ida tramo 2").blur();
  // MEX 08:10 → CUN 11:40: Cancún va una hora adelante.
  await expect(vuelo.getByText("2 h 30 min", { exact: true })).toBeVisible();
  await expect(vuelo.getByText(/Conexión en Ciudad de México \(MEX\) · 40 min/)).toBeVisible();
  await expect(vuelo.getByText("1 escala")).toBeVisible();

  // Aviso: se guarda y aparece en «Antes de enviar».
  const aviso = "La conexión en Ciudad de México (MEX) es de 40 min. Entre dos vuelos se recomienda al menos 1 h.";
  await expect(vuelo.getByRole("group", { name: "Avisos del servicio" }).getByText(aviso)).toBeVisible();
  await expect(antesDeEnviar(page).getByRole("group", { name: "Avisos" }).getByText(aviso)).toBeVisible();

  // Regreso desde Cancún a Cancún: error. Se guarda igual y impide enviar.
  await aeropuerto(vuelo, "Origen del vuelo de regreso", "CUN", "CUN");
  await aeropuerto(vuelo, "Destino del vuelo de regreso", "Cancún", "CUN");
  await expect(vuelo.getByRole("alert").getByText("El regreso sale y llega al mismo aeropuerto, Cancún (CUN).")).toBeVisible();
  await expect(antesDeEnviar(page)).toContainText("El regreso sale y llega al mismo aeropuerto, Cancún (CUN).");
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toHaveCount(0);

  // Al corregirlo desaparece, y la ida con escala sigue ahí al volver a abrir.
  await aeropuerto(vuelo, "Destino del vuelo de regreso", "GDL", "GDL");
  await expect(vuelo.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await page.reload();
  const otra = page.getByRole("article", { name: /VivaAerobus/ });
  await expect(otra.getByRole("combobox", { name: "Destino del vuelo de ida tramo 2" })).toHaveValue("CUN · Cancún");
  await expect(otra.getByRole("combobox", { name: "Destino del vuelo de regreso" })).toHaveValue("GDL · Guadalajara");
});

test("vuelo nocturno: sin +1 la llegada queda antes de la salida", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba nocturno");
  await page.getByRole("button", { name: "Agregar vuelo" }).click();
  const a = page.getByRole("dialog", { name: "Agregar servicio" });
  await a.getByLabel("Buscar en el catálogo").fill("Viva");
  await a.getByRole("option", { name: /VivaAerobus/ }).click();
  await a.getByRole("button", { name: "Agregar al viaje" }).click();
  const vuelo = page.getByRole("article", { name: /VivaAerobus/ });
  await vuelo.getByRole("radio", { name: "Sencillo" }).click();
  await aeropuerto(vuelo, "Origen del vuelo de ida", "TIJ", "TIJ");
  await aeropuerto(vuelo, "Destino del vuelo de ida", "CUN", "CUN");
  await vuelo.getByLabel("Número del vuelo de ida").fill("VB 3300");
  await vuelo.getByLabel("Hora de salida de ida").fill("1145p");
  await vuelo.getByLabel("Hora de llegada de ida").fill("8a");
  await vuelo.getByLabel("Hora de llegada de ida").blur();
  await expect(vuelo.getByRole("alert")).toContainText("la llegada queda antes de la salida");
  await expect(vuelo.getByRole("alert")).toContainText("en hora local de Cancún");
  await vuelo.getByRole("radio", { name: "+1" }).click();
  await expect(vuelo.getByRole("alert")).toHaveCount(0);
  // TIJ 23:45 (UTC−7 hasta el 1 nov; en diciembre UTC−8) → CUN 08:00 (UTC−5) del día siguiente.
  await expect(vuelo.getByText("5 h 15 min", { exact: true })).toBeVisible();
  await expect(vuelo.getByText("Llega el Vie 11 dic")).toBeVisible();
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
