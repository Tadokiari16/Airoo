// Dirección pública del panel, para las ligas de invitación, recuperación y
// del cliente. En Vercel, si no se puso NEXT_PUBLIC_SITE_URL, se usa la
// dirección de producción que Vercel da sola.
export function urlSitio(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
