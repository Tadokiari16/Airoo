import localFont from "next/font/local";

// Gilroy: tipografía de la vista del cliente. Se aplica con `gilroy.variable` en el layout
// de esas páginas; el panel no la descarga.
export const gilroy = localFont({
  src: [
    { path: "./gilroy/Gilroy-400.woff2", weight: "400" },
    { path: "./gilroy/Gilroy-500.woff2", weight: "500" },
    { path: "./gilroy/Gilroy-600.woff2", weight: "600" },
    { path: "./gilroy/Gilroy-700.woff2", weight: "700" },
  ],
  variable: "--fuente-cliente",
  display: "swap",
});
