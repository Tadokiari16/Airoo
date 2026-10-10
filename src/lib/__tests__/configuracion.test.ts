import { describe, expect, it } from "vitest";
import {
  AJUSTES_INICIALES,
  ESQUEMAS,
  activaDesde,
  conDefectos,
  cuentasCobroAhora,
  ejemploTolerancia,
  textoBitacora,
  tipoCambioConColchon,
} from "../configuracion";

describe("ajustes", () => {
  it("los valores de fábrica siguen las reglas de CLAUDE.md", () => {
    expect(AJUSTES_INICIALES.tolerancia_precio.centavos).toBe(30000);
    expect(AJUSTES_INICIALES.colchon_tipo_cambio.porcentaje).toBe(1.5);
    expect(AJUSTES_INICIALES.plazo_datos_y_pago.horas).toBe(3);
    expect(AJUSTES_INICIALES.aviso_pago_proveedor.dias_antes).toBe(1);
    expect(AJUSTES_INICIALES.comision_airoo.porcentaje_de_utilidad).toBe(35);
    expect(AJUSTES_INICIALES.vigencia_cotizacion.dias).toBe(7);
    expect(AJUSTES_INICIALES.recordatorios_cliente.dias_antes).toEqual([3, 1]);
  });

  it("junta lo guardado con los valores de fábrica", () => {
    const a = conDefectos([
      { clave: "tolerancia_precio", valor: { centavos: 50000 } },
      { clave: "agencia", valor: { nombre_comercial: "Airoo", horario: "Lun–Vie" } },
    ]);
    expect(a.tolerancia_precio).toEqual({ centavos: 50000, moneda: "MXN", por: "servicio" });
    expect(a.agencia.horario).toBe("Lun–Vie");
    expect(a.agencia.durante_viaje).toBe("");
    expect(a.vigencia_cotizacion.dias).toBe(7);
  });

  it("valida cada ajuste antes de guardarlo", () => {
    expect(
      ESQUEMAS.tolerancia_precio.safeParse({ centavos: 30000, moneda: "MXN", por: "servicio" }).success,
    ).toBe(true);
    expect(
      ESQUEMAS.tolerancia_precio.safeParse({ centavos: 300.5, moneda: "MXN", por: "servicio" }).success,
    ).toBe(false);
    expect(
      ESQUEMAS.tolerancia_precio.safeParse({ centavos: -1, moneda: "MXN", por: "servicio" }).success,
    ).toBe(false);
    expect(ESQUEMAS.colchon_tipo_cambio.safeParse({ porcentaje: 1.5 }).success).toBe(true);
    expect(ESQUEMAS.colchon_tipo_cambio.safeParse({ porcentaje: 3 }).success).toBe(false);
    expect(ESQUEMAS.plazo_datos_y_pago.safeParse({ horas: 4 }).success).toBe(false);
    expect(ESQUEMAS.ganancia_defecto.safeParse({ hoteles: 10, actividades: 10, vuelos: 2.5 }).success).toBe(
      true,
    );
    expect(
      ESQUEMAS.ganancia_defecto.safeParse({ hoteles: 10.123, actividades: 10, vuelos: 2.5 }).success,
    ).toBe(false);
    expect(ESQUEMAS.recordatorios_cliente.safeParse({ dias_antes: [3, 1] }).success).toBe(true);
    expect(ESQUEMAS.recordatorios_cliente.safeParse({ dias_antes: [5] }).success).toBe(false);
    const agencia = { nombre_comercial: "Airoo", horario: "", durante_viaje: "" };
    expect(ESQUEMAS.agencia.safeParse({ ...agencia, whatsapp: "+52 998 100 0000" }).success).toBe(true);
    expect(ESQUEMAS.agencia.safeParse({ ...agencia, whatsapp: "998 12" }).success).toBe(false);
  });

  it("deja en la bitácora un texto legible", () => {
    expect(textoBitacora("tolerancia_precio", { centavos: 30000, moneda: "MXN", por: "servicio" })).toBe(
      "Tolerancia de precio: $300 por servicio",
    );
    expect(textoBitacora("colchon_tipo_cambio", { porcentaje: 1.5 })).toBe("Colchón de tipo de cambio: 1.5%");
    expect(textoBitacora("plazo_datos_y_pago", { horas: 1 })).toBe("Plazo de Datos y pago: 1 hora");
  });

  it("el ejemplo de la tolerancia cambia con el límite", () => {
    expect(ejemploTolerancia(30000)).toBe(
      "Ejemplo con el viaje de Nataly: el seguro subió $49.50 y se absorbió; el vuelo subió $448.95 y se le mandó la versión 2.",
    );
    expect(ejemploTolerancia(50000)).toContain("el vuelo subió $448.95 y se absorbió");
    expect(ejemploTolerancia(4000)).toContain("el seguro subió $49.50 y se le mandó la versión 2");
  });

  it("tipo de cambio con colchón, a dos decimales", () => {
    expect(tipoCambioConColchon(18.42, 1.5)).toBe("18.70");
    expect(tipoCambioConColchon(18.42, 0)).toBe("18.42");
    expect(tipoCambioConColchon(18.42, 2)).toBe("18.79");
  });
});

describe("cuenta para recibir pagos: la nueva se activa 24 h después", () => {
  const ahora = new Date("2026-10-10T16:00:00Z");
  const actual = {
    id: "a",
    estado: "verificada" as const,
    principal: true,
    activaDesde: new Date("2026-09-24T00:00:00Z"),
  };

  it("activaDesde suma 24 horas", () => {
    expect(activaDesde(ahora).toISOString()).toBe("2026-10-11T16:00:00.000Z");
  });

  it("antes de 24 h sigue la cuenta anterior y la nueva espera", () => {
    const nueva = {
      id: "n",
      estado: "por_activar" as const,
      principal: false,
      activaDesde: activaDesde(ahora),
    };
    const casi = new Date(ahora.getTime() + 23.9 * 3600_000);
    const r = cuentasCobroAhora([actual, nueva], casi);
    expect(r.vigente?.id).toBe("a");
    expect(r.pendiente?.id).toBe("n");
    expect(r.porActivar).toEqual([]);
  });

  it("al cumplir 24 h la nueva queda vigente", () => {
    const nueva = {
      id: "n",
      estado: "por_activar" as const,
      principal: false,
      activaDesde: activaDesde(ahora),
    };
    const r = cuentasCobroAhora([actual, nueva], new Date(ahora.getTime() + 24 * 3600_000));
    expect(r.vigente?.id).toBe("n");
    expect(r.pendiente).toBeNull();
    expect(r.porActivar.map((c) => c.id)).toEqual(["n"]);
  });

  it("una cuenta reemplazada nunca queda vigente", () => {
    const vieja = {
      id: "v",
      estado: "reemplazada" as const,
      principal: false,
      activaDesde: new Date("2026-01-01"),
    };
    expect(cuentasCobroAhora([vieja, actual], ahora).vigente?.id).toBe("a");
    expect(cuentasCobroAhora([vieja], ahora).vigente).toBeNull();
  });
});
