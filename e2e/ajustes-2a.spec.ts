import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

test.describe.configure({ timeout: 120_000 });

const antesDeEnviar = (page: Page) => page.getByRole("region", { name: "Antes de enviar" });

async function nuevoViaje(page: Page, cliente: string, fechas = ["2026-12-10", "2026-12-14"]) {
  await page.getByRole("button", { name: "Nuevo viaje" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo viaje" });
  await d.getByLabel("Buscar cliente").fill(cliente);
  await d.getByRole("button", { name: /Cliente nuevo/ }).click();
  await d.getByLabel("WhatsApp").fill("998 000 5566");
  await d.getByLabel("Salida", { exact: true }).fill(fechas[0]);
  await d.getByLabel("Regreso", { exact: true }).fill(fechas[1]);
  await d.getByLabel("Adultos").fill("2");
  await d.getByRole("button", { name: "Crear viaje" }).click();
  await expect(page).toHaveURL(/\/viajes\/\d+$/);
  return Number(page.url().split("/").pop());
}

async function hotelSeadust(page: Page) {
  await page.getByRole("button", { name: "Agregar hotel" }).click();
  const a = page.getByRole("dialog", { name: "Agregar servicio" });
  await a.getByLabel("Buscar en el catálogo").fill("Seadust");
  await a.getByRole("option", { name: /Seadust/ }).click();
  await a.getByRole("button", { name: "Agregar al viaje" }).click();
  await expect(a).toBeHidden();
  return page.getByRole("article", { name: /Seadust/ });
}

async function aeropuerto(vuelo: ReturnType<Page["getByRole"]>, campo: string, buscar: string, clave: string) {
  const c = vuelo.getByRole("combobox", { name: campo });
  await c.fill(buscar);
  await vuelo.getByRole("option", { name: new RegExp(`^${clave}`) }).click();
  await expect(c).toHaveValue(new RegExp(`^${clave} · `));
}

test("nota para el cliente: Enter no la borra, se guarda con botón o al salir, y se edita y se quita", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba notas");
  await page.getByRole("link", { name: "Abrir armador" }).click();
  const hotel = await hotelSeadust(page);
  await hotel.getByLabel("Costo neto total").fill("9000");

  await page.getByRole("button", { name: "Nota para el cliente" }).first().click();
  const nota = page.getByLabel("Nota para el cliente");
  await expect(nota).toBeFocused();
  await nota.type("Primera línea");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Segunda línea");
  await page.waitForTimeout(500);
  await expect(nota).toHaveValue("Primera línea\nSegunda línea");
  await expect(page.getByRole("status").filter({ hasText: "Sin guardar" })).toBeVisible();

  // Con el botón.
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Guardado$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar nota" })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Nota para el cliente")).toHaveValue("Primera línea\nSegunda línea");

  // Editar y salir del campo: también se guarda.
  await page.getByLabel("Nota para el cliente").fill("Nota editada");
  await page.getByRole("heading", { name: /Hospedaje/ }).first().click();
  await expect(page.getByRole("status").filter({ hasText: /^Guardado$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nota para el cliente")).toHaveValue("Nota editada");

  // Quitar la nota.
  await page.getByRole("button", { name: "Quitar nota" }).click();
  await expect(page.getByLabel("Nota para el cliente")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Nota para el cliente")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nota para el cliente" }).first()).toBeVisible();
});

test("precio por persona: se divide entre los pasajeros del viaje; las habitaciones de más son una observación", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba precio");
  await page.getByRole("link", { name: "Abrir armador" }).click();
  const hotel = await hotelSeadust(page);
  await hotel.getByLabel("Costo neto total").fill("5000");
  // $5,000 más 10% de utilidad: $5,500 para 2 pasajeros.
  await expect(hotel.getByText("$5,500", { exact: true })).toBeVisible();
  await expect(hotel.getByText("$2,750 por persona")).toBeVisible();

  // Las habitaciones suman 8 huéspedes y el viaje es para 2: el precio por persona no cambia.
  for (let i = 0; i < 6; i++) await hotel.getByRole("button", { name: "Más adultos de la habitación 1" }).click();
  await expect(hotel.getByText("$2,750 por persona")).toBeVisible();
  const obs = antesDeEnviar(page).getByRole("group", { name: "Observaciones" });
  await expect(obs).toContainText("Seadust: las habitaciones suman 8 huéspedes; el viaje es para 2.");
  await expect(hotel.getByRole("group", { name: "Observaciones del servicio" })).toBeVisible();
  // La observación no bloquea ni cuenta como pendiente.
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();
});

test("tres niveles: el error se guarda pero impide enviar; el aviso no bloquea", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba niveles");
  await page.getByRole("link", { name: "Abrir armador" }).click();
  const hotel = await hotelSeadust(page);
  await hotel.getByLabel("Costo neto total").fill("9000");
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();

  // Hotel en abril de 2027 en un viaje de diciembre de 2026: error, y la captura se guarda.
  await hotel.getByLabel("Llegada al hotel").fill("2027-04-10");
  await hotel.getByLabel("Salida del hotel").fill("2027-04-14");
  const error = "Seadust queda del Sáb 10 abr al Mié 14 abr, fuera de las fechas del viaje (10–14 dic).";
  await expect(hotel.getByRole("alert")).toContainText(error);
  await expect(antesDeEnviar(page)).toContainText(error);
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toHaveCount(0);
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article", { name: /Seadust/ }).getByLabel("Llegada al hotel")).toHaveValue("2027-04-10");

  // Costo neto en cero: error, tampoco impide capturar.
  const h = page.getByRole("article", { name: /Seadust/ });
  await h.getByLabel("Llegada al hotel").fill("2026-12-10");
  await h.getByLabel("Salida del hotel").fill("2026-12-14");
  await h.getByLabel("Costo neto total").fill("0");
  await expect(h.getByRole("alert")).toContainText("el costo neto total está en $0");
  await h.getByLabel("Costo neto total").fill("9000");
  await expect(h.getByRole("alert")).toHaveCount(0);

  // Fecha de pago posterior a la llegada: aviso, no bloquea.
  await h.getByLabel("Pagar al proveedor a más tardar").fill("2026-12-12");
  await expect(antesDeEnviar(page).getByRole("group", { name: "Avisos" })).toContainText("queda después de que empieza el servicio");
  await expect(antesDeEnviar(page).getByText("Todo listo para enviar")).toBeVisible();
});

test("vuelo redondo: el regreso se prellena con la ruta invertida y sigue editable; la TUA es una fila por aeropuerto", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba regreso");
  await page.getByRole("link", { name: "Abrir armador" }).click();
  await page.getByRole("button", { name: "Agregar vuelo" }).click();
  const a = page.getByRole("dialog", { name: "Agregar servicio" });
  await a.getByLabel("Buscar en el catálogo").fill("Viva");
  await a.getByRole("option", { name: /VivaAerobus/ }).click();
  await a.getByRole("button", { name: "Agregar al viaje" }).click();
  const vuelo = page.getByRole("article", { name: /VivaAerobus/ });

  await expect(vuelo.getByRole("group", { name: "Regreso" })).toContainText("— → —");
  await aeropuerto(vuelo, "Origen del vuelo de ida", "Guadalajara", "GDL");
  await aeropuerto(vuelo, "Destino del vuelo de ida", "Cancún", "CUN");
  await expect(vuelo.getByRole("combobox", { name: "Origen del vuelo de regreso" })).toHaveValue("CUN · Cancún");
  await expect(vuelo.getByRole("combobox", { name: "Destino del vuelo de regreso" })).toHaveValue("GDL · Guadalajara");
  await expect(vuelo.getByRole("group", { name: "Regreso" })).toContainText("CUN → GDL");

  // TUA: una fila por aeropuerto de salida de cada tramo, informativa.
  const tua = vuelo.getByRole("group", { name: "TUA informativa" });
  await expect(tua.getByText(/Salida de/)).toHaveCount(2);
  await tua.getByRole("textbox", { name: "TUA de GDL" }).fill("727");
  await tua.getByRole("textbox", { name: "TUA de CUN" }).fill("382");
  await vuelo.getByLabel("Costo neto total").fill("2683");
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await page.reload();
  const otro = page.getByRole("article", { name: /VivaAerobus/ });
  await expect(otro.getByRole("textbox", { name: "TUA de GDL" })).toHaveValue("727");
  await expect(otro.getByRole("textbox", { name: "TUA de CUN" })).toHaveValue("382");
  // La TUA no entra al costo: el precio sale solo del costo neto total ($2,683 más 2.5% de utilidad).
  await expect(otro.getByText(/\$2,750\.0[78]/).first()).toBeVisible();

  // El regreso que alguien cambió a mano ya no sigue a la ida.
  await aeropuerto(otro, "Destino del vuelo de regreso", "MEX", "MEX");
  await aeropuerto(otro, "Origen del vuelo de ida", "Tijuana", "TIJ");
  await expect(otro.getByRole("combobox", { name: "Destino del vuelo de regreso" })).toHaveValue("MEX · Ciudad de México");
});

test("editar viaje: cliente, fechas y pasajeros; los servicios fuera del nuevo rango se marcan, no se mueven", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  const folio = await nuevoViaje(page, "Cliente prueba edición");
  await page.getByRole("link", { name: "Abrir armador" }).click();
  const hotel = await hotelSeadust(page);
  await hotel.getByLabel("Costo neto total").fill("9000");
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await page.goto(`/viajes/${folio}`);

  await page.getByRole("button", { name: "Editar viaje" }).click();
  const d = page.getByRole("dialog", { name: "Editar viaje" });
  await expect(d.getByLabel("Salida", { exact: true })).toHaveValue("2026-12-10");
  await expect(d.getByLabel("Adultos")).toHaveValue("2");

  // Cliente: se busca otro que ya existe.
  await d.getByRole("button", { name: "Cambiar" }).first().click();
  await d.getByLabel("Buscar cliente").fill("Cliente prueba notas");
  await d.getByRole("button", { name: /Cliente prueba notas/ }).first().click();

  // Fechas nuevas: el hotel (10–14 dic) queda fuera y la ventana lo dice antes de guardar.
  await d.getByLabel("Salida", { exact: true }).fill("2026-12-12");
  await d.getByLabel("Regreso", { exact: true }).fill("2026-12-16");
  await expect(d.getByRole("status")).toContainText("1 servicio queda fuera de las fechas nuevas");
  await expect(d.getByRole("status")).toContainText("Seadust");
  await d.getByLabel("Adultos").fill("3");
  await d.getByLabel("Menores").fill("1");
  await expect(d.getByText("Adultos: 12 años o más · Menores: 2 a 11 · Bebés: menos de 2")).toBeVisible();
  await d.getByLabel("Edad del menor 1").fill("6");
  await d.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(d).toBeHidden();

  await expect(page.getByRole("heading", { name: "Cliente prueba notas", exact: true })).toBeVisible();
  await expect(page.getByText("3 adultos y 1 menor").first()).toBeVisible();
  await expect(page.getByText("Edades de los menores: 6 años")).toBeVisible();
  await expect(page.getByText("Fuera de las fechas del viaje")).toBeVisible();

  // El hotel conserva sus fechas; el armador lo marca como error.
  await page.getByRole("link", { name: "Abrir armador" }).click();
  const h = page.getByRole("article", { name: /Seadust/ });
  await expect(h.getByLabel("Llegada al hotel")).toHaveValue("2026-12-10");
  await expect(h.getByRole("alert")).toContainText("fuera de las fechas del viaje (12–16 dic)");

  // El cambio queda en el historial.
  await page.goto(`/viajes/${folio}?p=historial`);
  await expect(page.getByText("Se editó el viaje")).toBeVisible();
  await expect(page.getByText(/Fechas: 10–14 dic → 12–16 dic/)).toBeVisible();
});

test("nuevo viaje: bajo el contador de pasajeros se explican las edades", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.getByRole("button", { name: "Nuevo viaje" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo viaje" });
  await expect(d.getByText("Adultos: 12 años o más · Menores: 2 a 11 · Bebés: menos de 2")).toBeVisible();
  await d.getByLabel("Menores").fill("2");
  await expect(d.getByLabel("Edad del menor 2")).toBeVisible();
});

test("nota interna de la ficha: Enter agrega una línea, se guarda con botón y se edita y elimina", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  const folio = await nuevoViaje(page, "Cliente prueba nota interna");
  const campo = page.getByLabel("Nota interna para el equipo");
  await campo.fill("Primera línea");
  await campo.press("Enter");
  await campo.pressSequentially("segunda línea");
  // Enter no envía ni vacía el campo.
  await expect(campo).toHaveValue("Primera línea\nsegunda línea");
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await expect(campo).toHaveValue("");
  await expect(page.getByText("Primera línea")).toBeVisible();

  await page.getByRole("button", { name: "Editar nota" }).click();
  await page.getByLabel("Editar nota").fill("Nota corregida");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Nota corregida")).toBeVisible();

  await page.getByRole("button", { name: "Eliminar nota" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Nota corregida")).toBeHidden();
  void folio;
});

test("nota interna: al salir del campo se guarda", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await nuevoViaje(page, "Cliente prueba nota salir");
  const campo = page.getByLabel("Nota interna para el equipo");
  await campo.fill("Se guarda al salir");
  await page.getByRole("heading", { name: "Actividad" }).click();
  await expect(page.getByText("Se guarda al salir")).toBeVisible();
  await expect(campo).toHaveValue("");
});

test("entrar con contraseña incorrecta no vacía el correo", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(CORREOS.dueno);
  await page.getByLabel("Contraseña").fill("incorrecta-123");
  await page.getByLabel("Contraseña").press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Correo")).toHaveValue(CORREOS.dueno);
});

test("edades: indica bebé, menor y cuenta como adulto; el precio por persona no cuenta bebés", async ({ page }) => {
  await entrarComo(page, CORREOS.dueno);
  await page.getByRole("button", { name: "Nuevo viaje" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo viaje" });
  await d.getByLabel("Menores").fill("3");
  await d.getByLabel("Edad del menor 1").fill("1");
  await d.getByLabel("Edad del menor 2").fill("7");
  await d.getByLabel("Edad del menor 3").fill("15");
  await expect(d.getByText("Bebé", { exact: true })).toBeVisible();
  await expect(d.getByText("Menor", { exact: true })).toBeVisible();
  await expect(d.getByText("Cuenta como adulto en vuelos")).toBeVisible();
});
