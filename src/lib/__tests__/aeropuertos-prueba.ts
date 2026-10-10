// Aeropuertos para las pruebas, con su zona horaria real.
import type { Aeropuerto } from "../vuelos";

export const AEROPUERTOS: Record<string, Aeropuerto> = Object.fromEntries(
  (
    [
      ["GDL", "Guadalajara", "MX", "America/Mexico_City"],
      ["MEX", "Ciudad de México", "MX", "America/Mexico_City"],
      ["CUN", "Cancún", "MX", "America/Cancun"],
      ["CZM", "Cozumel", "MX", "America/Cancun"],
      ["TIJ", "Tijuana", "MX", "America/Tijuana"],
      ["MAD", "Madrid", "ES", "Europe/Madrid"],
      ["CDG", "París", "FR", "Europe/Paris"],
    ] as const
  ).map(([iata, ciudad, paisCodigo, zonaHoraria]) => [
    iata,
    { iata, nombre: `Aeropuerto de ${ciudad}`, ciudad, pais: paisCodigo, paisCodigo, zonaHoraria },
  ]),
);

