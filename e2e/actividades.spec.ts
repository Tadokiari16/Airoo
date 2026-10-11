import { expect, test, type Page } from "@playwright/test";
import { CORREOS, entrarComo } from "./ayuda";

const sufijo = Date.now().toString(36);

// La primera ficha que se abre en modo desarrollo tarda en compilarse.
test.describe.configure({ timeout: 60_000 });

const bloque = (page: Page, titulo: string) => page.getByRole("region", { name: titulo, exact: true });
const barra = (page: Page) => page.getByRole("region", { name: "Cambios sin guardar" });
const interruptor = (page: Page, titulo: string) => page.getByRole("switch", { name: titulo, exact: true });
const pide = (page: Page) => page.getByRole("list", { name: "En el armador se va a pedir" });

async function crearActividad(page: Page, nombre: string, tipo = "Tour", ciudad = "Holbox") {
  await page.goto("/actividades");
  await page.getByRole("button", { name: "Nueva actividad" }).click();
  const d = page.getByRole("dialog", { name: "Nueva actividad" });
  await d.getByLabel("Nombre").fill(nombre);
  await d.getByLabel("Ciudad").fill(ciudad);
  await d
    .getByRole("option", { name: new RegExp(`^${ciudad}`) })
    .first()
    .click();
  await d.getByRole("group", { name: "Tipo" }).getByRole("button", { name: tipo, exact: true }).click();
  await d.getByRole("button", { name: "Crear y abrir ficha" }).click();
  const deTodos = d.getByRole("button", { name: "Crear de todos modos" });
  await expect(async () => {
    if (await deTodos.isVisible()) await deTodos.click();
    await expect(page).toHaveURL(/\/actividades\/[0-9a-f-]{36}/, { timeout: 500 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
}

async function guardar(page: Page) {
  await barra(page).getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Ficha guardada · las cotizaciones nuevas ya usan estos datos")).toBeVisible();
  await expect(barra(page)).toBeHidden();
}

test("una actividad nueva abre con los bloques sugeridos y queda por completar", async ({ page }) => {
  const nombre = `Paseo Prueba ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearActividad(page, nombre, "Tour");

  // Tour: cobro, horarios, llegada, incluye y confirmación.
  const bloques = bloque(page, "Bloques de esta actividad");
  await expect(bloques.getByText("5 de 8 encendidos")).toBeVisible();
  for (const t of ["Cómo se cobra", "Horarios", "Cómo llega el cliente", "Cómo se confirma"])
    await expect(interruptor(page, t)).toHaveAttribute("aria-checked", "true");
  await expect(interruptor(page, "Planes")).toHaveAttribute("aria-checked", "false");
  await expect(pide(page)).toContainText("De qué proveedor sale la tarifa");
  await expect(pide(page)).toContainText("Cuántas personas");

  // En la lista aparece en «Por completar», como ficha mínima y sin proveedor.
  await page.goto("/actividades");
  await page.getByRole("tab", { name: /Por completar/ }).click();
  const fila = page.getByRole("row", { name: nombre });
  await expect(fila.getByText("Holbox, México · ficha mínima")).toBeVisible();
  await expect(fila.getByText("Sin proveedor")).toBeVisible();

  // Un nombre parecido avisa antes de crear otra.
  await page.getByRole("button", { name: "Nueva actividad" }).click();
  const d = page.getByRole("dialog", { name: "Nueva actividad" });
  await d.getByLabel("Nombre").fill(nombre);
  await d.getByLabel("Ciudad").fill("Holbox");
  await d.getByRole("option", { name: /^Holbox/ }).click();
  await d.getByRole("button", { name: "Crear y abrir ficha" }).click();
  await expect(d.getByRole("alert")).toContainText(/Ya hay (una actividad|actividades) con nombre parecido/);
  await expect(d.getByRole("button", { name: "Crear de todos modos" })).toBeVisible();
});

test("cambiar el tipo sugiere bloques, pero no apaga ninguno", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await crearActividad(page, `Tipos Prueba ${sufijo}`, "Tour");
  const bloques = bloque(page, "Bloques de esta actividad");
  const tipo = page.getByRole("group", { name: "Tipo" });

  // Se enciende Planes a mano y se cambia a «Otro», que solo sugiere el cobro.
  await interruptor(page, "Planes").click();
  await expect(bloques.getByText("6 de 8 encendidos")).toBeVisible();
  await tipo.getByRole("button", { name: "Otro" }).click();
  await expect(page.getByText("Tipo: Otro · los que ya tenían datos siguen igual")).toBeVisible();
  await expect(bloques.getByText("6 de 8 encendidos")).toBeVisible();
  await expect(interruptor(page, "Planes")).toHaveAttribute("aria-checked", "true");

  // Un bloque apagado que el tipo sugiere lo dice.
  await interruptor(page, "Incluye, no incluye y qué llevar").click();
  await expect(
    bloques.getByRole("listitem", { name: "Incluye, no incluye y qué llevar" }).getByText("Sugerido para"),
  ).toHaveCount(0);

  // «Parque o entrada» enciende boletos, requisitos e incluye.
  await tipo.getByRole("button", { name: "Parque o entrada" }).click();
  await expect(
    page.getByText(
      "Tipo: Parque o entrada · se encendieron los bloques sugeridos; los que ya tenían datos siguen igual",
    ),
  ).toBeVisible();
  await expect(bloques.getByText("8 de 8 encendidos")).toBeVisible();
  await guardar(page);
  await page.reload();
  await expect(page.getByText(/· Parque o entrada ·/)).toBeVisible();
  await expect(bloque(page, "Bloques de esta actividad").getByText("8 de 8 encendidos")).toBeVisible();
});

test("los bloques guardan planes, boletos y salidas; apagado no se pide, pero conserva sus datos", async ({
  page,
}) => {
  await entrarComo(page, CORREOS.asesora);
  await crearActividad(page, `Bloques Prueba ${sufijo}`, "Excursión", "Cancún");
  const bloques = bloque(page, "Bloques de esta actividad");

  // Descripción y duración.
  await page.getByLabel("Duración").fill("6 horas");
  await page.getByLabel("Descripción").fill("Recorrido de prueba por la laguna.");

  // Planes.
  const planes = bloques.getByRole("listitem", { name: "Planes" });
  await planes.getByRole("button", { name: "Agregar plan" }).click();
  await planes.getByLabel("Nombre del plan").fill("Clásico");
  await planes.getByLabel("Qué incluye el plan").fill("Lancha y guía");

  // Cobro por edad con boletos.
  await interruptor(page, "Boletos por edad").click();
  await bloques
    .getByRole("group", { name: "Cómo se cobra" })
    .getByRole("button", { name: "Por edad" })
    .click();
  const boletos = bloques.getByRole("listitem", { name: "Boletos por edad" });
  await boletos.getByRole("button", { name: "Agregar boleto" }).click();
  await boletos.getByLabel("Nombre del boleto").fill("Adulto");
  await boletos.getByLabel("Edad desde, Adulto").fill("12");
  await boletos.getByRole("button", { name: "Agregar boleto" }).click();
  await boletos.getByLabel("Nombre del boleto").nth(1).fill("Infante");
  await boletos.getByLabel("Edad desde, Infante").fill("0");
  await boletos.getByLabel("Edad hasta, Infante").fill("4");
  await boletos.getByRole("checkbox", { name: "Gratis" }).nth(1).check();

  // Salidas fijas y recogida en hotel.
  await bloques
    .getByRole("group", { name: "Horarios" })
    .getByRole("button", { name: "Salidas fijas" })
    .click();
  await bloques.getByRole("button", { name: "Agregar salida" }).click();
  await bloques.getByLabel("Salida 1", { exact: true }).fill("08:00");
  await bloques.getByRole("button", { name: "Agregar salida" }).click();
  await bloques.getByLabel("Salida 2", { exact: true }).fill("13:30");
  await bloques
    .getByRole("group", { name: "Cómo llega el cliente" })
    .getByRole("button", { name: "Recogida en hotel" })
    .click();
  await expect(bloques.getByText("En el armador se pide el hotel de recogida y la hora.")).toBeVisible();

  await expect(pide(page)).toContainText("Qué plan");
  await expect(pide(page)).toContainText("Cuántos boletos de cada edad");
  await expect(pide(page)).toContainText("Qué salida");
  await expect(pide(page)).toContainText("Hotel y hora de recogida");
  await guardar(page);

  await page.reload();
  const b2 = bloque(page, "Bloques de esta actividad");
  await expect(b2.getByLabel("Nombre del plan")).toHaveValue("Clásico");
  await expect(b2.getByLabel("Edad hasta, Infante")).toHaveValue("4");
  await expect(b2.getByRole("checkbox", { name: "Gratis" }).nth(1)).toBeChecked();
  await expect(b2.getByLabel("Salida 2", { exact: true })).toHaveValue("13:30");

  // Apagar Planes: el armador ya no pide plan, pero el plan sigue ahí.
  await interruptor(page, "Planes").click();
  await expect(pide(page)).not.toContainText("Qué plan");
  await guardar(page);
  await page.reload();
  await expect(pide(page)).not.toContainText("Qué plan");
  await interruptor(page, "Planes").click();
  await expect(bloque(page, "Bloques de esta actividad").getByLabel("Nombre del plan")).toHaveValue(
    "Clásico",
  );

  // Por grupo pide hasta cuántas personas.
  await bloque(page, "Bloques de esta actividad")
    .getByRole("group", { name: "Cómo se cobra" })
    .getByRole("button", { name: "Por grupo" })
    .click();
  await barra(page).getByRole("button", { name: "Guardar" }).click();
  await expect(barra(page).getByRole("alert")).toHaveText(
    "Falta hasta cuántas personas cubre el precio por grupo.",
  );
  await page.getByLabel("Hasta cuántas personas").fill("8");
  await guardar(page);

  // En la lista, la columna «Cómo se cobra» lo resume.
  await page.goto("/actividades");
  await expect(
    page.getByRole("row", { name: `Bloques Prueba ${sufijo}` }).getByText("Hasta 8 personas"),
  ).toBeVisible();
});

test("ligar, crear y quitar proveedores; o marcar que lo paga el cliente en el lugar", async ({ page }) => {
  await entrarComo(page, CORREOS.asesora);
  await crearActividad(page, `Proveedores Prueba ${sufijo}`, "Tour", "Cancún");
  const reservar = bloque(page, "Dónde se puede reservar");

  await reservar.getByRole("button", { name: "Ligar proveedor" }).click();
  await reservar.getByLabel("Proveedor para ligar").selectOption({ label: "Civitatis" });
  await expect(page.getByText("Civitatis ligado · sus datos se consultan en Proveedores")).toBeVisible();
  const civ = reservar.getByRole("listitem", { name: "Civitatis" });
  await expect(civ.getByText("Soporte de agencias · Reservas")).toBeVisible();
  await civ.getByLabel("ID en Civitatis").fill("99881");
  await civ.getByLabel("ID en Civitatis").blur();
  await expect(page.getByText("ID guardado")).toBeVisible();
  // Ligar no cuenta como cambio sin guardar de la ficha.
  await expect(barra(page)).toBeHidden();
  await expect(civ.getByRole("link", { name: "Ver proveedor" })).toHaveAttribute("href", /\/proveedores\?p=/);

  // Alta corta de proveedor: queda ligado a la actividad.
  const operador = `Operador Prueba ${sufijo}`;
  await reservar.getByRole("button", { name: "Crear proveedor nuevo" }).click();
  const d = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await d.getByLabel("Nombre", { exact: true }).first().fill(operador);
  await d.getByRole("button", { name: "Tours y parques" }).click();
  await d.getByRole("radio", { name: /Directo con ellos/ }).click();
  await d.locator("#contacto_nombre").fill("Contacto 9");
  await d.getByLabel("WhatsApp").fill("+52 998 100 0199");
  await d.getByRole("button", { name: "Crear proveedor" }).click();
  // Corridas anteriores dejan proveedores de prueba con nombre parecido.
  const deTodos = d.getByRole("button", { name: "Crear de todos modos" });
  await expect(async () => {
    if (await deTodos.isVisible()) await deTodos.click();
    await expect(d).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await expect(page.getByText("Proveedor creado y ligado a esta actividad")).toBeVisible();
  const op = reservar.getByRole("listitem", { name: operador });
  await expect(op.getByRole("link", { name: "+52 998 100 0199" })).toHaveAttribute(
    "href",
    "https://wa.me/529981000199",
  );
  await expect(barra(page)).toBeHidden();

  // Quitar uno.
  await op.getByRole("button", { name: `Quitar ${operador}` }).click();
  await expect(page.getByText(`${operador} ya no aparece como opción para esta actividad`)).toBeVisible();
  await expect(reservar.getByRole("listitem", { name: operador })).toHaveCount(0);

  // Lo paga el cliente en el lugar: pide confirmación y quita los ligados.
  await reservar.getByRole("button", { name: "Lo paga el cliente en el lugar" }).click();
  const c = page.getByRole("dialog", { name: "¿Lo paga el cliente en el lugar?" });
  await expect(c.getByText("Se quita Civitatis de esta actividad.")).toBeVisible();
  await c.getByRole("button", { name: "Lo paga el cliente en el lugar" }).click();
  await expect(
    reservar.getByText(
      "Lo paga el cliente en el lugar: no se liga a ningún proveedor y no genera pagos de Airoo.",
    ),
  ).toBeVisible();
  await expect(pide(page)).not.toContainText("De qué proveedor sale la tarifa");

  await page.goto("/actividades");
  await page.getByRole("tab", { name: /Las paga el cliente en el lugar/ }).click();
  await expect(page.getByRole("row", { name: `Proveedores Prueba ${sufijo}` })).toBeVisible();
});

test("la asesora archiva y reactiva; eliminar es solo del dueño", async ({ page, browser }) => {
  const nombre = `Archivo Prueba ${sufijo}`;
  await entrarComo(page, CORREOS.asesora);
  await crearActividad(page, nombre, "Experiencia", "Tulum");
  await expect(page.getByRole("button", { name: "Eliminar actividad" })).toHaveCount(0);

  await interruptor(page, "Actividad activa").click();
  const conf = page.getByRole("dialog", { name: `¿Archivar ${nombre}?` });
  await expect(conf.getByText("Deja de aparecer al buscar actividades en el armador.")).toBeVisible();
  await conf.getByRole("button", { name: "Archivar actividad" }).click();
  await expect(interruptor(page, "Actividad activa")).toHaveAttribute("aria-checked", "false");

  await page.goto("/actividades");
  await page.getByRole("tab", { name: /Archivadas/ }).click();
  await page.getByRole("row", { name: nombre }).click();
  const panel = page.getByRole("complementary", { name: nombre });
  await panel.getByRole("button", { name: "Reactivar" }).click();
  await page
    .getByRole("dialog", { name: `¿Reactivar ${nombre}?` })
    .getByRole("button", { name: "Reactivar actividad" })
    .click();
  await expect(page.getByText(`${nombre} vuelve a aparecer al cotizar`)).toBeVisible();

  // El dueño la elimina: nunca se usó en un viaje.
  const ctx = await browser.newContext();
  const dueno = await ctx.newPage();
  await entrarComo(dueno, CORREOS.dueno);
  await dueno.goto("/actividades");
  await dueno.getByRole("row", { name: nombre }).click();
  await dueno.getByRole("link", { name: "Abrir ficha" }).click();
  await dueno.getByRole("button", { name: "Eliminar actividad" }).click();
  await dueno
    .getByRole("dialog", { name: `¿Eliminar ${nombre}?` })
    .getByRole("button", { name: "Eliminar actividad" })
    .click();
  await expect(dueno).toHaveURL(/\/actividades$/);
  await expect(dueno.getByRole("row", { name: nombre })).toHaveCount(0);
  await ctx.close();
});

test("el contador no ve actividades", async ({ page }) => {
  await entrarComo(page, CORREOS.contador);
  await page.goto("/actividades");
  await expect(page.getByRole("heading", { name: "Actividades" })).toHaveCount(0);
});
