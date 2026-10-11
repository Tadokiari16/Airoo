import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const sufijo = Date.now().toString(36);
const CARPETA = path.join("test-results", "fotos-prueba");

/** Una foto de prueba con las medidas pedidas. */
async function fotoPrueba(nombre: string, ancho: number, alto: number) {
  mkdirSync(CARPETA, { recursive: true });
  const ruta = path.join(CARPETA, nombre);
  await sharp({ create: { width: ancho, height: alto, channels: 3, background: "#5fb7c9" } })
    .jpeg()
    .toFile(ruta);
  return ruta;
}

const subir = (page: Page, etiqueta: string) => page.locator(`input[data-subir="${etiqueta}"]`);
const bloque = (page: Page, titulo: string) => page.getByRole("region", { name: titulo, exact: true });
const barra = (page: Page) => page.getByRole("region", { name: "Cambios sin guardar" });

async function crearHotel(page: Page, nombre: string, ciudad = "Tulum") {
  await page.goto("/hoteles");
  await page.getByRole("button", { name: "Nuevo hotel" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo hotel" });
  // La importación está apagada: no hay proveedores conectados.
  await expect(d.getByRole("radio", { name: /Importar desde un proveedor/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await d.getByRole("radio", { name: /Captura manual/ }).click();
  await d.getByRole("button", { name: "Continuar" }).click();
  const m = page.getByRole("dialog", { name: "Nuevo hotel · captura manual" });
  await m.getByLabel("Nombre").fill(nombre);
  await m.getByLabel("Ciudad").fill(ciudad);
  await m
    .getByRole("option", { name: new RegExp(`^${ciudad}`) })
    .first()
    .click();
  await m.getByRole("button", { name: "Crear y abrir ficha" }).click();
  const deTodos = m.getByRole("button", { name: "Crear de todos modos" });
  await expect(async () => {
    if (await deTodos.isVisible()) await deTodos.click();
    await expect(page).toHaveURL(/\/hoteles\/[0-9a-f-]{36}/, { timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
}

test("un hotel nuevo empieza con lo mínimo y la ficha marca lo que falta", async ({ page }) => {
  const nombre = `Hotel Prueba ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearHotel(page, nombre);
  await expect(page.getByRole("region", { name: "Ficha · 0 de 9" })).toBeVisible();

  // Aparece en «Por completar» con la insignia «Mínima».
  await page.goto("/hoteles");
  await page.getByRole("tab", { name: /Por completar/ }).click();
  const fila = page.getByRole("row", { name: nombre });
  await expect(fila.getByText("Mínima")).toBeVisible();
  await expect(fila.getByText("Faltan 9 cosas")).toBeVisible();

  // Un nombre parecido avisa antes de crear otro.
  await page.getByRole("button", { name: "Nuevo hotel" }).click();
  await page.getByRole("radio", { name: /Captura manual/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  const m = page.getByRole("dialog", { name: "Nuevo hotel · captura manual" });
  await m.getByLabel("Nombre").fill(nombre);
  await m.getByLabel("Ciudad").fill("Tulum");
  await m.getByRole("option", { name: /^Tulum/ }).click();
  await m.getByRole("button", { name: "Crear y abrir ficha" }).click();
  await expect(m.getByRole("alert")).toContainText(/Ya hay (un hotel|hoteles) con nombre parecido/);
  await expect(m.getByRole("link", { name: nombre })).toBeVisible();
  await expect(m.getByRole("button", { name: "Crear de todos modos" })).toBeVisible();
});

test("la portada cuadrada avisa, se encuadra en 16:9 y la galería se sube", async ({ page }) => {
  const nombre = `Hotel Fotos ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearHotel(page, nombre);
  const fotos = bloque(page, "Portada y galería");

  await subir(page, "Subir portada").setInputFiles(await fotoPrueba("cuadrada.jpg", 1080, 1080));
  await expect(fotos.getByText("La foto es cuadrada (1080 × 1080)")).toBeVisible();
  await expect(
    fotos.getByText(
      "Para 16:9 se usa solo la franja marcada. Con 1080 px de ancho se ve pixeleada en pantallas grandes; conviene una horizontal de al menos 1600 px.",
    ),
  ).toBeVisible();
  // La portada cuadrada no cuenta como lista.
  await expect(
    page.getByRole("list", { name: "Qué tiene la ficha" }).getByRole("listitem").first(),
  ).toContainText("por ajustar");

  // Ajustar encuadre: el recuadro se mueve con el teclado y se guarda.
  await fotos.getByRole("button", { name: "Ajustar encuadre" }).click();
  const d = page.getByRole("dialog", { name: "Ajustar encuadre" });
  const recuadro = d.getByRole("slider", { name: "Recuadro de la portada" });
  await expect(recuadro).toHaveAttribute("aria-valuetext", "0% desde la izquierda, 22% desde arriba");
  await recuadro.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowUp");
  await expect(recuadro).toHaveAttribute("aria-valuetext", "0% desde la izquierda, 0% desde arriba");
  await d.getByRole("button", { name: "Guardar encuadre" }).click();
  await expect(d).toBeHidden();
  await expect(page.getByText("Encuadre guardado")).toBeVisible();

  // Una horizontal grande reemplaza a la cuadrada, que pasa a la galería.
  await subir(page, "Cambiar portada").setInputFiles(await fotoPrueba("horizontal.jpg", 2400, 1350));
  await expect(fotos.getByText("Portada lista")).toBeVisible();
  await expect(fotos.getByText("2400 × 1350 px · se ve nítida en celular y computadora.")).toBeVisible();
  const galeria = fotos.getByRole("list", { name: "Galería de la propiedad" });
  await expect(galeria.getByRole("listitem", { name: /^Foto/ })).toHaveCount(1);

  await subir(page, "Subir fotos a la galería").setInputFiles([
    await fotoPrueba("g1.jpg", 1600, 1200),
    await fotoPrueba("g2.jpg", 1600, 1200),
  ]);
  await expect(galeria.getByRole("listitem", { name: /^Foto/ })).toHaveCount(3);
  await expect(fotos.getByText("· 3 fotos · albercas")).toBeVisible();
});

test("la ficha se guarda con la barra de cambios y valida lo que se captura", async ({ page }) => {
  const nombre = `Hotel Datos ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearHotel(page, nombre);
  await expect(barra(page)).toBeHidden();

  // Descartar regresa a lo guardado.
  await page.getByLabel("Descripción").fill("Texto que no se guarda.");
  await expect(barra(page)).toBeVisible();
  await barra(page).getByRole("button", { name: "Descartar" }).click();
  await expect(page.getByLabel("Descripción")).toHaveValue("");
  await expect(barra(page)).toBeHidden();

  await page.getByRole("checkbox", { name: "Todo incluido" }).check({ force: true });
  await expect(page.getByText("Todo incluido · en cada cotización se elige cuál se vende")).toBeVisible();
  await page
    .getByLabel("ID de Tripadvisor")
    .fill("https://www.tripadvisor.com.mx/Hotel_Review-g150807-d7654321-Reviews-Hotel.html");
  await page.getByLabel("Calificación", { exact: true }).selectOption("4.5");
  await page.getByLabel("Opiniones").fill("1,234");
  await page.getByLabel("Descripción").fill("Frente al mar, con alberca y club de niños.");

  // Un cargo con monto mal escrito no se guarda y lo capturado se queda.
  const llegada = bloque(page, "Llegada, salida y cargos en el hotel");
  await llegada.getByRole("button", { name: "Agregar cargo" }).click();
  await llegada.getByLabel("Concepto").fill("Derecho de saneamiento ambiental");
  await llegada.getByLabel("Monto").fill("sesenta");
  await barra(page).getByRole("button", { name: "Guardar" }).click();
  await expect(barra(page).getByRole("alert")).toHaveText(
    "El monto de «Derecho de saneamiento ambiental» no es un monto válido.",
  );
  await expect(page.getByLabel("Descripción")).toHaveValue("Frente al mar, con alberca y club de niños.");

  await llegada.getByLabel("Monto").fill("69.00");
  await llegada.getByLabel("Se cobra").selectOption("habitacion_noche");
  // Dónde se puede reservar: una plataforma con su ID.
  const reservar = bloque(page, "Dónde se puede reservar");
  await reservar.getByRole("button", { name: "Agregar plataforma o trato directo" }).click();
  await reservar.getByLabel("Plataforma o trato directo").selectOption({ label: "RateHawk" });
  await reservar.getByLabel("ID del hotel en RateHawk").fill("6099001");
  await barra(page).getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Ficha guardada · las cotizaciones nuevas ya usan estos datos")).toBeVisible();
  await expect(barra(page)).toBeHidden();

  // Del enlace de Tripadvisor se guarda solo el ID; el cargo queda en centavos con su moneda.
  await page.reload();
  await expect(page.getByLabel("ID de Tripadvisor")).toHaveValue("7654321");
  await expect(page.getByLabel("Opiniones")).toHaveValue("1,234");
  await expect(page.getByLabel("Monto")).toHaveValue("69.00");

  await page.goto("/hoteles");
  await page.getByRole("row", { name: nombre }).click();
  const panel = page.getByRole("complementary", { name: nombre });
  await expect(panel.getByText("$69 por habitación por noche")).toBeVisible();
  await expect(panel.getByText("4.5")).toBeVisible();
  await expect(panel.getByText("1,234 opiniones")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Tripadvisor" })).toHaveAttribute(
    "href",
    "https://www.tripadvisor.com.mx/Hotel_Review-d7654321-Reviews",
  );
  await expect(page.getByRole("row", { name: nombre }).getByText("ID 6099001")).toBeVisible();
});

test("las habitaciones llevan su nombre para el cliente, sus fotos y los nombres de cada plataforma", async ({
  page,
}) => {
  const nombre = `Hotel Cuartos ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearHotel(page, nombre);
  const habs = bloque(page, "Habitaciones");
  await habs.getByRole("button", { name: "Agregar habitación" }).click();
  await habs.getByLabel("Nombre para el cliente").fill("Suite Deluxe vista al mar");
  await habs.getByRole("button", { name: "Agregar", exact: true }).click();
  const fila = habs.getByRole("row", { name: "Suite Deluxe vista al mar" });
  await expect(fila).toBeVisible();
  await expect(fila.getByText("Sin fotos")).toBeVisible();

  await fila.getByRole("button", { name: "+ Nombre" }).click();
  await fila.getByLabel("Proveedor", { exact: true }).selectOption({ label: "TBO Holidays" });
  await fila.getByLabel("Nombre en la tarifa del proveedor").fill("FAMILY DLX OV");
  await fila.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(fila.getByText("FAMILY DLX OV")).toBeVisible();

  await subir(page, "Subir fotos de Suite Deluxe vista al mar").setInputFiles(
    await fotoPrueba("hab.jpg", 1600, 1200),
  );
  await expect(fila.getByRole("button", { name: "Ver fotos de Suite Deluxe vista al mar" })).toBeVisible();
  const ficha = page.getByRole("list", { name: "Qué tiene la ficha" });
  await expect(ficha.getByRole("listitem").filter({ hasText: "Fotos por habitación" })).toContainText(
    "1 de 1",
  );
  // Las fotos de la habitación no se mezclan con la galería.
  await expect(bloque(page, "Portada y galería").getByText("· 0 fotos")).toBeVisible();

  // Vista previa como cliente: con el nombre para el cliente, no el del proveedor.
  await page.getByRole("button", { name: "Vista previa como cliente" }).click();
  const vista = page.getByRole("dialog", { name: "Vista previa como cliente" });
  await expect(vista.getByText("Suite Deluxe vista al mar")).toBeVisible();
  await expect(vista.getByText("FAMILY DLX OV")).toHaveCount(0);
});

test("la asesora archiva y reactiva; unir y eliminar son solo del dueño", async ({ page, browser }) => {
  const nombre = `Hotel Duplicado ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearHotel(page, nombre, "Cancún");
  await expect(page.getByRole("button", { name: "Unir con otro hotel" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eliminar hotel" })).toHaveCount(0);

  await page.getByRole("switch", { name: "Hotel activo" }).click();
  const conf = page.getByRole("dialog", { name: `¿Archivar ${nombre}?` });
  await expect(conf.getByText("Deja de aparecer al buscar hoteles en el armador.")).toBeVisible();
  await conf.getByRole("button", { name: "Archivar hotel" }).click();
  await expect(page.getByRole("switch", { name: "Hotel activo" })).toHaveAttribute("aria-checked", "false");
  await page.getByRole("switch", { name: "Hotel activo" }).click();
  await page
    .getByRole("dialog", { name: `¿Reactivar ${nombre}?` })
    .getByRole("button", { name: "Reactivar hotel" })
    .click();
  await expect(page.getByRole("switch", { name: "Hotel activo" })).toHaveAttribute("aria-checked", "true");

  // El dueño une el duplicado con Seadust: sus habitaciones pasan y deja de aparecer en la lista.
  const habs = bloque(page, "Habitaciones");
  await habs.getByRole("button", { name: "Agregar habitación" }).click();
  await habs.getByLabel("Nombre para el cliente").fill(`Cuarto del duplicado ${sufijo}`);
  await habs.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(habs.getByRole("row", { name: `Cuarto del duplicado ${sufijo}` })).toBeVisible();

  const ctx = await browser.newContext();
  const dueno = await ctx.newPage();
  await entrarComo(dueno, CORREOS.dueno);
  await dueno.goto("/hoteles");
  await dueno.getByRole("row", { name: "Seadust Cancún Family Resort" }).click();
  await dueno.getByRole("link", { name: "Abrir ficha" }).click();
  await dueno.getByRole("button", { name: "Unir con otro hotel" }).click();
  const unir = dueno.getByRole("dialog", { name: "Unir con otro hotel" });
  await unir.getByLabel("Hotel duplicado").selectOption({ label: `${nombre} · Cancún` });
  await expect(
    unir.getByText(`${nombre} queda archivado como unido y deja de aparecer en la lista.`),
  ).toBeVisible();
  await unir.getByRole("button", { name: "Unir con este hotel" }).click();
  await expect(
    dueno.getByText(`${nombre} se unió con este hotel · pasaron 0 fotos y 1 habitaciones`),
  ).toBeVisible();
  await expect(
    bloque(dueno, "Habitaciones").getByRole("row", { name: `Cuarto del duplicado ${sufijo}` }),
  ).toBeVisible();
  // Se deshace quitando la habitación que pasó, para no ensuciar la semilla.
  await bloque(dueno, "Habitaciones")
    .getByRole("row", { name: `Cuarto del duplicado ${sufijo}` })
    .getByRole("button", { name: "Quitar habitación" })
    .click();
  await bloque(dueno, "Habitaciones").getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(
    bloque(dueno, "Habitaciones").getByRole("row", { name: `Cuarto del duplicado ${sufijo}` }),
  ).toHaveCount(0);

  await dueno.goto("/hoteles");
  for (const tab of ["Activos", "Archivados"]) {
    await dueno.getByRole("tab", { name: new RegExp(tab) }).click();
    await expect(dueno.getByRole("row", { name: nombre })).toHaveCount(0);
  }

  // Un hotel que nunca se usó se puede eliminar.
  const borrar = `Hotel Para Borrar ${sufijo}`;
  await crearHotel(dueno, borrar, "Mérida");
  await dueno.getByRole("button", { name: "Eliminar hotel" }).click();
  await dueno
    .getByRole("dialog", { name: `¿Eliminar ${borrar}?` })
    .getByRole("button", { name: "Eliminar hotel" })
    .click();
  await expect(dueno).toHaveURL(/\/hoteles$/);
  await expect(dueno.getByRole("row", { name: borrar })).toHaveCount(0);
  await ctx.close();
});

test("el contador no ve los catálogos de hoteles", async ({ page }) => {
  await entrarComo(page, CORREOS.contador);
  await page.goto("/hoteles");
  await expect(page.getByRole("heading", { name: "Hoteles" })).toHaveCount(0);
});
