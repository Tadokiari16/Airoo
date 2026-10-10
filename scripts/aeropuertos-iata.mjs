// Genera la migración con la lista de aeropuertos (tabla aeropuertos).
//
// Base: airports.json de mwgg/Airports (https://github.com/mwgg/Airports,
// licencia MIT, Copyright (c) 2014 mwgg). Se toman solo los que tienen clave
// IATA de tres letras; cada uno trae su zona horaria, que es lo que permite
// calcular la duración real de un vuelo.
// Los nombres de ciudad vienen en inglés; CIUDADES los pone en español para
// los destinos que Airoo usa más. La búsqueda acepta los dos.
//
// Uso: node scripts/aeropuertos-iata.mjs airports.json > migracion.sql

import { readFileSync } from "node:fs";

const [, , ruta] = process.argv;
const datos = JSON.parse(readFileSync(ruta, "utf8"));
const enEspanol = new Intl.DisplayNames(["es-MX"], { type: "region" });

const CIUDADES = {
  CUN: "Cancún",
  CZM: "Cozumel",
  TQO: "Tulum",
  CTM: "Chetumal",
  MID: "Mérida",
  CPE: "Campeche",
  MEX: "Ciudad de México",
  NLU: "Ciudad de México (Santa Lucía)",
  TLC: "Toluca",
  GDL: "Guadalajara",
  MTY: "Monterrey",
  QRO: "Querétaro",
  PVR: "Puerto Vallarta",
  SJD: "San José del Cabo",
  LAP: "La Paz",
  OAX: "Oaxaca",
  HUX: "Huatulco",
  BJX: "León",
  CJS: "Ciudad Juárez",
  TIJ: "Tijuana",
  VER: "Veracruz",
  VSA: "Villahermosa",
  ZIH: "Ixtapa-Zihuatanejo",
  ACA: "Acapulco",
  CUU: "Chihuahua",
  HMO: "Hermosillo",
  PBC: "Puebla",
  SLP: "San Luis Potosí",
  AGU: "Aguascalientes",
  MZT: "Mazatlán",
  TAP: "Tapachula",
  TGZ: "Tuxtla Gutiérrez",
  MLM: "Morelia",
  ZCL: "Zacatecas",
  CUL: "Culiacán",
  TRC: "Torreón",
  BOG: "Bogotá",
  MDE: "Medellín",
  CTG: "Cartagena",
  PTY: "Panamá",
  SJO: "San José, Costa Rica",
  GUA: "Ciudad de Guatemala",
  HAV: "La Habana",
  LIM: "Lima",
  SCL: "Santiago de Chile",
  EZE: "Buenos Aires",
  AEP: "Buenos Aires",
  GRU: "São Paulo",
  PUJ: "Punta Cana",
  SDQ: "Santo Domingo",
  JFK: "Nueva York",
  LGA: "Nueva York",
  EWR: "Newark",
  LAX: "Los Ángeles",
  ORD: "Chicago",
  DFW: "Dallas",
  IAH: "Houston",
  YYZ: "Toronto",
  YUL: "Montreal",
  CDG: "París",
  ORY: "París",
  LHR: "Londres",
  LGW: "Londres",
  FCO: "Roma",
  FRA: "Fráncfort",
  MUC: "Múnich",
  IST: "Estambul",
  NRT: "Tokio",
  HND: "Tokio",
  ATH: "Atenas",
  LIS: "Lisboa",
};

const normalizar = (t) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const filas = Object.values(datos)
  .filter((a) => /^[A-Z]{3}$/.test(a.iata ?? "") && a.tz)
  .sort((a, b) => a.iata.localeCompare(b.iata));

const texto = (v) => (v == null || v === "" ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const valores = filas.map((a) => {
  const ciudad = CIUDADES[a.iata] || a.city || a.name;
  const pais = (a.country && enEspanol.of(a.country)) || a.country || "";
  const busqueda = normalizar([a.iata, ciudad, a.city, a.name].filter(Boolean).join(" "));
  return `(${[a.iata, a.name, ciudad, pais, a.country, a.tz, busqueda].map(texto).join(", ")})`;
});

console.log(`-- Aeropuertos con clave IATA: ${valores.length}.
-- Fuente: mwgg/Airports (https://github.com/mwgg/Airports), licencia MIT,
-- Copyright (c) 2014 mwgg. Generada con scripts/aeropuertos-iata.mjs.
insert into "aeropuertos" ("iata", "nombre", "ciudad", "pais", "pais_codigo", "zona_horaria", "busqueda") values
${valores.join(",\n")}
on conflict ("iata") do update set "nombre" = excluded."nombre", "ciudad" = excluded."ciudad", "pais" = excluded."pais",
  "pais_codigo" = excluded."pais_codigo", "zona_horaria" = excluded."zona_horaria", "busqueda" = excluded."busqueda";`);
