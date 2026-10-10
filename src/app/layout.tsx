import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Los archivos de fuente viven en el repo; no se cargan de servicios externos.
const plusJakarta = localFont({
  src: [
    { path: "./fuentes/plus-jakarta-sans/PlusJakartaSans-400.woff2", weight: "400" },
    { path: "./fuentes/plus-jakarta-sans/PlusJakartaSans-500.woff2", weight: "500" },
    { path: "./fuentes/plus-jakarta-sans/PlusJakartaSans-600.woff2", weight: "600" },
    { path: "./fuentes/plus-jakarta-sans/PlusJakartaSans-700.woff2", weight: "700" },
    { path: "./fuentes/plus-jakarta-sans/PlusJakartaSans-800.woff2", weight: "800" },
  ],
  variable: "--fuente-panel",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Airoo", template: "%s · Airoo" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
