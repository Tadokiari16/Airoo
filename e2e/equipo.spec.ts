import { expect, test } from "@playwright/test";
import { CONTRASENA, CORREOS, entrarComo, navegacion } from "./ayuda";

test("invitar, aceptar con contraseña, cambiar rol y quitar acceso", async ({ page, browser, context }) => {
  const sufijo = Date.now().toString(36);
  const correo = `karla.${sufijo}@airoo.local`;
  const nombre = `Karla ${sufijo}`;
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await entrarComo(page, CORREOS.dueno);
  await page.goto("/configuracion/equipo");
  await page.getByRole("button", { name: "Invitar" }).click();

  const d = page.getByRole("dialog", { name: "Invitar al equipo" });
  await d.getByLabel("Nombre").fill(nombre);
  await d.getByLabel("Correo").fill(correo);
  await d.getByLabel("WhatsApp · opcional").fill("998 123 4567");
  await d.getByRole("button", { name: "Crear invitación" }).click();
  await expect(d.getByText("La invitación está lista.")).toBeVisible();
  await expect(d.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/9981234567\?text=/,
  );
  const liga = (await d.locator(".font-mono").textContent())!;
  expect(liga).toContain("/auth/confirmar?token_hash=");
  await d.getByRole("button", { name: "Listo" }).click();
  await expect(page.getByText("Invitaciones pendientes")).toBeVisible();

  // La persona invitada abre la liga en otro navegador
  const otro = await browser.newContext();
  const invitada = await otro.newPage();
  await invitada.goto(liga);
  await expect(invitada).toHaveURL(/\/bienvenida$/);
  await expect(invitada.getByRole("heading", { name: `Hola, ${nombre}` })).toBeVisible();
  await invitada.getByLabel("Contraseña", { exact: true }).fill("corta");
  await invitada.getByLabel("Escríbela otra vez").fill("corta");
  await invitada.getByRole("button", { name: "Entrar al panel" }).click();
  await expect(invitada.locator("form [role=alert]")).toHaveText(
    "La contraseña lleva al menos 10 caracteres.",
  );
  await invitada.getByLabel("Contraseña", { exact: true }).fill("viajes-a-cancun-26");
  await invitada.getByLabel("Escríbela otra vez").fill("viajes-a-cancun-26");
  await invitada.getByRole("button", { name: "Entrar al panel" }).click();
  await expect(invitada).toHaveURL(/\/viajes$/);
  await expect(navegacion(invitada).getByText("Asesora", { exact: true })).toBeVisible();

  // La liga ya no sirve dos veces
  const tercero = await (await browser.newContext()).newPage();
  await tercero.goto(liga);
  await expect(tercero).toHaveURL(/motivo=liga-vencida/);

  // El dueño la ve en el equipo y le cambia el rol
  await page.reload();
  const fila = page.getByRole("listitem").filter({ hasText: nombre });
  await expect(fila).toContainText("Asesora · entró hoy");
  await fila.getByRole("radio", { name: "Contador" }).click();
  await expect(fila).toContainText("Contador · entró hoy");

  // Al cambiar de rol, su panel cambia
  await invitada.reload();
  await expect(navegacion(invitada).getByRole("link", { name: "Finanzas" })).toBeVisible();

  // Quitar acceso con confirmación
  await fila.getByRole("button", { name: "Quitar acceso" }).click();
  await page
    .getByRole("dialog", { name: `¿Quitar el acceso de ${nombre}?` })
    .getByRole("button", { name: "Quitar acceso" })
    .click();
  await expect(fila.getByText("Sin acceso")).toBeVisible();
  await invitada.goto("/viajes");
  await expect(invitada).toHaveURL(/\/entrar/);

  // Y queda en la bitácora
  await page.goto("/configuracion/bitacora");
  await expect(page.getByText(`${nombre} se unió al equipo`)).toBeVisible();
  await expect(page.getByText(`${nombre} ahora es Contador`)).toBeVisible();
  await expect(page.getByText(`${nombre} ya no tiene acceso al panel`)).toBeVisible();
  await otro.close();
});

test("cambiar contraseña con la liga del correo", async ({ page }) => {
  // La liga de recuperación se genera con la API de administración, igual a la del correo.
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await admin.auth.admin.generateLink({ type: "recovery", email: CORREOS.contador });
  await page.goto(
    `/auth/confirmar?token_hash=${data.properties!.hashed_token}&type=recovery&next=/nueva-contrasena`,
  );
  await expect(page.getByRole("heading", { name: "Contraseña nueva" })).toBeVisible();

  // Igual a la anterior: se explica por qué no se puede
  await page.getByLabel("Contraseña nueva").fill(CONTRASENA);
  await page.getByLabel("Escríbela otra vez").fill(CONTRASENA);
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText(
    "La contraseña nueva es igual a la anterior. Elige otra.",
  );

  await page.getByLabel("Contraseña nueva").fill("otra-contrasena-26");
  await page.getByLabel("Escríbela otra vez").fill("otra-contrasena-26");
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  await expect(page).toHaveURL(/\/viajes$/);

  // Entra con la nueva y se deja como estaba para las demás pruebas
  await page.getByRole("button", { name: "Salir" }).click();
  await entrarComo(page, CORREOS.contador, "otra-contrasena-26");
  await admin.auth.admin.updateUserById(data.user!.id, { password: CONTRASENA });
});

test("pedir cambio de contraseña no revela si el correo existe", async ({ page }) => {
  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill("nadie@airoo.local");
  await page.getByRole("button", { name: "Mandar liga" }).click();
  await expect(page.getByRole("status")).toContainText("Si el correo tiene cuenta en Airoo");
});
