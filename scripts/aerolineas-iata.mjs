// Genera la migración con la lista IATA de referencia (tabla aerolineas_iata).
//
// Base: airlines.dat y countries.dat de OpenFlights (https://openflights.org/data,
// licencia ODbL). Se toman las activas con código IATA de dos caracteres.
// La base está desactualizada, así que CORRECCIONES pone al día las que Airoo
// usa o puede usar. Una aerolínea que no esté aquí se agrega a mano en el panel.
//
// Uso: node scripts/aerolineas-iata.mjs airlines.dat countries.dat > migracion.sql

import { readFileSync } from "node:fs";

const [, , rutaAerolineas, rutaPaises] = process.argv;

function csv(linea) {
  const campos = [];
  let actual = "";
  let comillas = false;
  for (const c of linea) {
    if (c === '"') comillas = !comillas;
    else if (c === "," && !comillas) {
      campos.push(actual);
      actual = "";
    } else actual += c;
  }
  campos.push(actual);
  return campos.map((x) => (x === "\\N" ? "" : x));
}

const filas = (ruta) => readFileSync(ruta, "utf8").split("\n").filter(Boolean).map(csv);

// País en inglés → código ISO → nombre en español.
const iso = new Map(filas(rutaPaises).map(([nombre, codigo]) => [nombre, codigo]));
const enEspanol = new Intl.DisplayNames(["es-MX"], { type: "region" });
const pais = (nombre) => {
  const c = iso.get(nombre);
  return c ? enEspanol.of(c) : null;
};

// [código, nombre, código ISO del país] o null para quitarla.
const CORRECCIONES = {
  VB: ["VivaAerobus", "MX"],
  AM: ["Aeroméxico", "MX"],
  "5D": ["Aeroméxico Connect", "MX"],
  XN: ["Mexicana de Aviación", "MX"],
  MX: ["Breeze Airways", "US"],
  "4O": null, // Interjet dejó de volar en 2020.
  VW: null, // Aeromar dejó de volar en 2023.
  LA: ["LATAM Airlines", "CL"],
  JJ: ["LATAM Airlines Brasil", "BR"],
  AV: ["Avianca", "CO"],
  AS: ["Alaska Airlines", "US"],
  AZ: ["ITA Airways", "IT"],
  TP: ["TAP Air Portugal", "PT"],
  G3: ["Gol Linhas Aéreas", "BR"],
  VY: ["Vueling", "ES"],
  LH: ["Lufthansa", "DE"],
  SQ: ["Singapore Airlines", "SG"],
  JL: ["Japan Airlines", "JP"],
  WA: ["KLM Cityhopper", "NL"],
  CO: null, // Continental se unió a United en 2012.
  DM: ["Arajet", "DO"],
  JA: ["JetSMART", "CL"],
  P5: ["Wingo", "CO"],
  F8: ["Flair Airlines", "CA"],
  XP: ["Avelo Airlines", "US"],
  IB: ["Iberia", "ES"],
};

const lista = new Map();
for (const r of filas(rutaAerolineas)) {
  const [, nombre, , iata, , , paisIngles, activa] = r;
  if (activa !== "Y" || !/^[A-Z0-9]{2}$/.test(iata) || lista.has(iata)) continue;
  lista.set(iata, [nombre.trim(), pais(paisIngles)]);
}
for (const [iata, c] of Object.entries(CORRECCIONES)) {
  if (c === null) lista.delete(iata);
  else lista.set(iata, [c[0], enEspanol.of(c[1])]);
}

const texto = (v) => (v == null ? "null" : `'${v.replaceAll("'", "''")}'`);
const valores = [...lista.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([iata, [nombre, p]]) => `(${texto(iata)}, ${texto(nombre)}, ${texto(p)})`);

console.log(`-- Lista IATA de referencia: ${valores.length} aerolíneas.
-- Fuente: OpenFlights (https://openflights.org/data, licencia ODbL), con
-- correcciones en scripts/aerolineas-iata.mjs. Solo sirve para buscar al
-- agregar una aerolínea al catálogo.
insert into "aerolineas_iata" ("iata", "nombre", "pais") values
${valores.join(",\n")}
on conflict ("iata") do update set "nombre" = excluded."nombre", "pais" = excluded."pais";`);
