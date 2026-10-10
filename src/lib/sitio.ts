// Dirección pública del panel, para las ligas de invitación, recuperación y
// del cliente. En Vercel, si no se puso NEXT_PUBLIC_SITE_URL, se usa la que
// Vercel da sola: la de la rama en una vista previa y la de producción en
// producción.
export function urlSitio(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL)
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
