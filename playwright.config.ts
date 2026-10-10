import { defineConfig } from "@playwright/test";

// Requiere Supabase local (`supabase start`), la semilla (`npm run semilla`)
// y el panel corriendo en el puerto 3000 (`npm run dev`), o se levanta solo.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
    timezoneId: "America/Cancun",
    viewport: { width: 1440, height: 900 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : undefined,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/entrar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
