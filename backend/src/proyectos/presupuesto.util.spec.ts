import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  calcularPresupuestoAAdjudicar, esRutaComentarioPresupuesto, etiquetaCampoPresupuesto,
  motivoTopeExcedido, normalizarPresupuesto, parsearRutaPartida, presupuestoIncompletoParaEnvio,
  topePresupuestoSolicitado, validarPresupuesto,
} from './presupuesto.util';
import { Presupuesto } from './presupuesto.interface';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';

function presupuestoValido(): Presupuesto {
  return {
    montoTotal: 0,
    rubros: [
      {
        tipo: TipoRubro.ViaticosYSeguros,
        subtotal: 0,
        partidas: [
          {
            tipoPersona: TipoPersona.Docente,
            descripcion: 'Viáticos docentes',
            periodoInicio: '2027-08-01',
            periodoFin: '2027-09-01',
            monto: 1000,
          },
        ],
      },
      {
        tipo: TipoRubro.BienesDeConsumo,
        subtotal: 0,
        partidas: [
          { descripcion: 'Resmas de papel', cantidad: 10, precioUnitario: 500, monto: 5000 },
        ],
      },
      { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
    ],
  };
}

describe('validarPresupuesto', () => {
  it('acepta un presupuesto bien formado, incluso con montos en 0', () => {
    const p = presupuestoValido();
    (p.rubros[0].partidas[0] as { monto: number }).monto = 0;
    expect(() => validarPresupuesto(p)).not.toThrow();
  });

  it('rechaza un presupuesto que no es un objeto', () => {
    expect(() => validarPresupuesto(null)).toThrow(BadRequestException);
    expect(() => validarPresupuesto('foo')).toThrow(BadRequestException);
    expect(() => validarPresupuesto([])).toThrow(BadRequestException);
  });

  it('rechaza si falta un rubro', () => {
    const p = presupuestoValido();
    p.rubros = p.rubros.slice(0, 2);
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza rubros duplicados', () => {
    const p = presupuestoValido();
    p.rubros[2] = { ...p.rubros[0] };
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza un rubro desconocido', () => {
    const p = presupuestoValido();
    (p.rubros[2] as unknown as { tipo: string }).tipo = 'Sueldos';
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza un monto negativo', () => {
    const p = presupuestoValido();
    (p.rubros[0].partidas[0] as { monto: number }).monto = -100;
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza un monto NaN', () => {
    const p = presupuestoValido();
    (p.rubros[0].partidas[0] as { monto: number }).monto = Number.NaN;
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza cantidad 0 en un bien', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { cantidad: number }).cantidad = 0;
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza cantidad no entera en un bien', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { cantidad: number }).cantidad = 2.5;
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza una fecha con formato invalido', () => {
    const p = presupuestoValido();
    (p.rubros[0].partidas[0] as { periodoInicio: string }).periodoInicio = '01/08/2027';
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('rechaza un periodo invertido (inicio posterior al fin)', () => {
    const p = presupuestoValido();
    const viatico = p.rubros[0].partidas[0] as { periodoInicio: string; periodoFin: string };
    viatico.periodoInicio = '2027-09-01';
    viatico.periodoFin = '2027-08-01';
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('acepta un periodo vacio (borrador a medio cargar)', () => {
    const p = presupuestoValido();
    const viatico = p.rubros[0].partidas[0] as { periodoInicio: string; periodoFin: string };
    viatico.periodoInicio = '';
    viatico.periodoFin = '';
    expect(() => validarPresupuesto(p)).not.toThrow();
  });

  it('rechaza un tipo de persona invalido', () => {
    const p = presupuestoValido();
    (p.rubros[0].partidas[0] as { tipoPersona: string }).tipoPersona = 'Invitado';
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });

  it('acepta esInsumo ausente, true o false en un bien', () => {
    const p = presupuestoValido();
    expect(() => validarPresupuesto(p)).not.toThrow();
    (p.rubros[1].partidas[0] as { esInsumo?: boolean }).esInsumo = true;
    expect(() => validarPresupuesto(p)).not.toThrow();
    (p.rubros[1].partidas[0] as { esInsumo?: boolean }).esInsumo = false;
    expect(() => validarPresupuesto(p)).not.toThrow();
  });

  it('rechaza un esInsumo que no es booleano', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { esInsumo?: unknown }).esInsumo = 'true';
    expect(() => validarPresupuesto(p)).toThrow(BadRequestException);
  });
});

describe('normalizarPresupuesto', () => {
  it('deriva monto de bien como cantidad * precioUnitario', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { cantidad: number; precioUnitario: number; monto: number }).monto = 1;
    const normalizado = normalizarPresupuesto(p);
    expect(normalizado.rubros[1].partidas[0].monto).toBe(5000);
  });

  it('recalcula el subtotal como suma de las partidas del rubro', () => {
    const p = presupuestoValido();
    p.rubros[0].subtotal = 999999;
    const normalizado = normalizarPresupuesto(p);
    expect(normalizado.rubros[0].subtotal).toBe(1000);
  });

  it('recalcula el monto total como suma de los subtotales', () => {
    const p = presupuestoValido();
    p.montoTotal = 1;
    const normalizado = normalizarPresupuesto(p);
    expect(normalizado.montoTotal).toBe(6000);
  });

  it('el subtotal no queda inflado tras borrar una partida (bug de removePartida)', () => {
    const p = presupuestoValido();
    p.rubros[0].partidas = [];
    p.rubros[0].subtotal = 1000;
    const normalizado = normalizarPresupuesto(p);
    expect(normalizado.rubros[0].subtotal).toBe(0);
    expect(normalizado.montoTotal).toBe(5000);
  });

  it('recorta espacios de las descripciones', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { descripcion: string }).descripcion = '  Resmas de papel  ';
    const normalizado = normalizarPresupuesto(p);
    expect(normalizado.rubros[1].partidas[0].descripcion).toBe('Resmas de papel');
  });

  it('normaliza esInsumo ausente en un bien a false', () => {
    const p = presupuestoValido();
    const normalizado = normalizarPresupuesto(p);
    expect((normalizado.rubros[1].partidas[0] as { esInsumo: boolean }).esInsumo).toBe(false);
  });

  it('preserva esInsumo true en un bien', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { esInsumo?: boolean }).esInsumo = true;
    const normalizado = normalizarPresupuesto(p);
    expect((normalizado.rubros[1].partidas[0] as { esInsumo: boolean }).esInsumo).toBe(true);
  });
});

describe('presupuestoIncompletoParaEnvio', () => {
  const convocatoriaConEjecucion = {
    fechaInicioEjecucion: '2027-08-01',
    fechaFinEjecucion: '2028-02-28',
    topePresupuestoConsolidado: null as number | null,
    topePresupuestoNoConsolidado: null as number | null,
  };

  it('reporta presupuesto vacio cuando es null', () => {
    expect(presupuestoIncompletoParaEnvio(null, convocatoriaConEjecucion)).toEqual([
      'El presupuesto está vacío',
    ]);
  });

  it('reporta presupuesto vacio cuando ningun rubro tiene partidas', () => {
    const p: Presupuesto = {
      montoTotal: 0,
      rubros: [
        { tipo: TipoRubro.ViaticosYSeguros, subtotal: 0, partidas: [] },
        { tipo: TipoRubro.BienesDeConsumo, subtotal: 0, partidas: [] },
        { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
      ],
    };
    expect(presupuestoIncompletoParaEnvio(p, convocatoriaConEjecucion)).toEqual([
      'El presupuesto está vacío',
    ]);
  });

  it('exige que los 3 rubros tengan al menos una partida', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    const motivos = presupuestoIncompletoParaEnvio(p, convocatoriaConEjecucion);
    expect(motivos).toContain('"Bienes de Uso" no tiene ninguna partida');
  });

  it('exige descripcion en cada partida', () => {
    const p = presupuestoValido();
    (p.rubros[1].partidas[0] as { descripcion: string }).descripcion = '';
    const normalizado = normalizarPresupuesto(p);
    const motivos = presupuestoIncompletoParaEnvio(normalizado, convocatoriaConEjecucion);
    expect(motivos).toContain('"Bienes de Consumo": a la partida 1 le falta la descripción');
  });

  it('exige monto mayor a 0 en cada partida', () => {
    const p = presupuestoValido();
    (p.rubros[0].partidas[0] as { monto: number }).monto = 0;
    const motivos = presupuestoIncompletoParaEnvio(p, convocatoriaConEjecucion);
    expect(motivos).toContain('"Viáticos y Seguros": la partida 1 tiene un monto de $0');
  });

  it('exige periodo completo en los viaticos', () => {
    const p = presupuestoValido();
    const viatico = p.rubros[0].partidas[0] as { periodoInicio: string; periodoFin: string };
    viatico.periodoInicio = '';
    const motivos = presupuestoIncompletoParaEnvio(p, convocatoriaConEjecucion);
    expect(motivos).toContain('"Viáticos y Seguros": a la partida 1 le falta el período');
  });

  it('rechaza un periodo fuera de la ejecucion de la convocatoria', () => {
    const p = presupuestoValido();
    const viatico = p.rubros[0].partidas[0] as { periodoInicio: string; periodoFin: string };
    viatico.periodoInicio = '2026-01-01';
    viatico.periodoFin = '2026-02-01';
    const motivos = presupuestoIncompletoParaEnvio(p, convocatoriaConEjecucion);
    expect(motivos).toContain(
      '"Viáticos y Seguros": el período de la partida 1 está fuera del período de ejecución de la convocatoria',
    );
  });

  it('acepta un periodo dentro de la ejecucion de la convocatoria', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    p.rubros[2].partidas = [{ descripcion: 'Equipamiento', cantidad: 1, precioUnitario: 100, monto: 100 }];
    const motivos = presupuestoIncompletoParaEnvio(p, convocatoriaConEjecucion);
    expect(motivos).toEqual([]);
  });

  it('si la convocatoria no tiene fechas de ejecucion, exige que el periodo no sea anterior a hoy', () => {
    const p = presupuestoValido();
    const viatico = p.rubros[0].partidas[0] as { periodoInicio: string; periodoFin: string };
    viatico.periodoInicio = '2000-01-01';
    viatico.periodoFin = '2000-02-01';
    const motivos = presupuestoIncompletoParaEnvio(p, { fechaInicioEjecucion: null, fechaFinEjecucion: null, topePresupuestoConsolidado: null, topePresupuestoNoConsolidado: null });
    expect(motivos).toContain(
      '"Viáticos y Seguros": el período de la partida 1 no puede comenzar antes de hoy',
    );
  });

  it('reporta el total excedido cuando supera el tope de no consolidado', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    const motivos = presupuestoIncompletoParaEnvio(
      p,
      { ...convocatoriaConEjecucion, topePresupuestoNoConsolidado: 1000, topePresupuestoConsolidado: 100000 },
      false,
    );
    expect(motivos).toContain(
      `El total solicitado ($${p.montoTotal.toLocaleString('es-AR')}) supera el tope de $1.000 para `
      + 'proyectos no consolidados de esta convocatoria',
    );
  });

  it('no reporta el tope cuando el total esta dentro del tope de consolidado', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    p.rubros[2].partidas = [{ descripcion: 'Equipamiento', cantidad: 1, precioUnitario: 100, monto: 100 }];
    const motivos = presupuestoIncompletoParaEnvio(
      p,
      { ...convocatoriaConEjecucion, topePresupuestoNoConsolidado: 1000, topePresupuestoConsolidado: 100000 },
      true,
    );
    expect(motivos).toEqual([]);
  });
});

describe('topePresupuestoSolicitado', () => {
  it('devuelve el tope de consolidado o no consolidado según corresponda', () => {
    const convocatoria = { topePresupuestoConsolidado: 5000, topePresupuestoNoConsolidado: 1000 };
    expect(topePresupuestoSolicitado(convocatoria, true)).toBe(5000);
    expect(topePresupuestoSolicitado(convocatoria, false)).toBe(1000);
  });

  it('devuelve null cuando el tope no está configurado, es 0 o negativo', () => {
    expect(topePresupuestoSolicitado(null, false)).toBeNull();
    expect(topePresupuestoSolicitado({ topePresupuestoConsolidado: 0, topePresupuestoNoConsolidado: null }, true)).toBeNull();
    expect(topePresupuestoSolicitado({ topePresupuestoConsolidado: null, topePresupuestoNoConsolidado: 0 }, false)).toBeNull();
  });

  it('interpreta el valor numeric que llega como string desde pg', () => {
    const convocatoria = { topePresupuestoConsolidado: '5000.50' as unknown as number, topePresupuestoNoConsolidado: null };
    expect(topePresupuestoSolicitado(convocatoria, true)).toBe(5000.5);
  });
});

describe('motivoTopeExcedido', () => {
  it('devuelve null si no hay tope configurado', () => {
    expect(motivoTopeExcedido({ montoTotal: 999999, rubros: [] }, null, false)).toBeNull();
  });

  it('devuelve null si el total es igual al tope (no bloquea el límite exacto)', () => {
    expect(motivoTopeExcedido({ montoTotal: 1000, rubros: [] }, 1000, false)).toBeNull();
  });

  it('devuelve el mensaje cuando el total supera el tope', () => {
    const motivo = motivoTopeExcedido({ montoTotal: 1500, rubros: [] }, 1000, true);
    expect(motivo).toBe(
      'El total solicitado ($1.500) supera el tope de $1.000 para proyectos consolidados de esta convocatoria',
    );
  });
});

describe('parsearRutaPartida', () => {
  it('interpreta una ruta valida de un campo permitido', () => {
    expect(parsearRutaPartida('rubros[0].partidas[1].monto')).toEqual({
      rubroIndice: 0,
      partidaIndice: 1,
      campo: 'monto',
    });
  });

  it('rechaza un campo fuera de la whitelist (subtotal y montoTotal son derivados)', () => {
    expect(parsearRutaPartida('rubros[0].partidas[1].subtotal')).toBeNull();
    expect(parsearRutaPartida('rubros[0].montoTotal')).toBeNull();
  });

  it('rechaza un formato de ruta invalido', () => {
    expect(parsearRutaPartida('rubros[0]')).toBeNull();
    expect(parsearRutaPartida('rubros[0].partidas[1]')).toBeNull();
    expect(parsearRutaPartida('')).toBeNull();
  });
});

describe('esRutaComentarioPresupuesto', () => {
  const p = normalizarPresupuesto(presupuestoValido());

  it('rechaza la ruta vacia (no hay comentario sobre todo el presupuesto)', () => {
    expect(esRutaComentarioPresupuesto(p, '')).toBe(false);
  });

  it('acepta un rubro existente', () => {
    expect(esRutaComentarioPresupuesto(p, 'rubros[0]')).toBe(true);
  });

  it('rechaza un indice de rubro fuera de rango', () => {
    expect(esRutaComentarioPresupuesto(p, 'rubros[5]')).toBe(false);
  });

  it('rechaza una ruta que en realidad apunta a un campo de partida', () => {
    expect(esRutaComentarioPresupuesto(p, 'rubros[0].partidas[0].monto')).toBe(false);
  });
});

describe('etiquetaCampoPresupuesto', () => {
  const p = normalizarPresupuesto(presupuestoValido());

  it('arma una etiqueta legible para un campo de partida con descripcion', () => {
    expect(etiquetaCampoPresupuesto(p, 'rubros[0].partidas[0].monto')).toBe(
      'Presupuesto > Viáticos y Seguros > partida 1 "Viáticos docentes" · Monto',
    );
  });

  it('omite las comillas si la partida no tiene descripcion', () => {
    const sinDescripcion: Presupuesto = JSON.parse(JSON.stringify(p));
    (sinDescripcion.rubros[0].partidas[0] as { descripcion: string }).descripcion = '';
    expect(etiquetaCampoPresupuesto(sinDescripcion, 'rubros[0].partidas[0].monto')).toBe(
      'Presupuesto > Viáticos y Seguros > partida 1 · Monto',
    );
  });

  it('arma una etiqueta para un comentario a nivel rubro', () => {
    expect(etiquetaCampoPresupuesto(p, 'rubros[1]')).toBe('Presupuesto > Bienes de Consumo');
  });

  it('devuelve la ruta cruda si no matchea ningun patron conocido', () => {
    expect(etiquetaCampoPresupuesto(p, 'algoInesperado')).toBe('Presupuesto > algoInesperado');
  });
});

describe('calcularPresupuestoAAdjudicar', () => {
  const PARAMETROS = { porcentajeExtraInsumos: 35, umbralInsumos: 40, porcentajeExtraPse: 15 };

  // Total 10000: viáticos 1000 + consumo (insumo, `montoInsumo`) + uso 9000 - montoInsumo.
  function presupuestoConInsumo(montoInsumo: number): Presupuesto {
    return normalizarPresupuesto({
      montoTotal: 0,
      rubros: [
        {
          tipo: TipoRubro.ViaticosYSeguros,
          subtotal: 0,
          partidas: [{
            tipoPersona: TipoPersona.Docente,
            descripcion: 'Viáticos',
            periodoInicio: '2027-08-01',
            periodoFin: '2027-09-01',
            monto: 1000,
          }],
        },
        {
          tipo: TipoRubro.BienesDeConsumo,
          subtotal: 0,
          partidas: [
            { descripcion: 'Insumos', cantidad: 1, precioUnitario: montoInsumo, monto: 0, esInsumo: true },
          ],
        },
        {
          tipo: TipoRubro.BienesDeUso,
          subtotal: 0,
          partidas: [
            { descripcion: 'Equipamiento', cantidad: 1, precioUnitario: 9000 - montoInsumo, monto: 0 },
          ],
        },
      ],
    });
  }

  it('sin presupuesto solicitado, todo queda en 0', () => {
    expect(calcularPresupuestoAAdjudicar(null, PARAMETROS)).toEqual({
      solicitado: 0,
      montoInsumos: 0,
      porcentajeInsumos: 0,
      aplicaExtraInsumos: false,
      extraInsumos: 0,
      esPse: false,
      extraPse: 0,
      total: 0,
    });
  });

  it('sin partidas marcadas como insumo, no aplica el extra', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS);
    expect(r.solicitado).toBe(p.montoTotal);
    expect(r.montoInsumos).toBe(0);
    expect(r.aplicaExtraInsumos).toBe(false);
    expect(r.extraInsumos).toBe(0);
    expect(r.total).toBe(p.montoTotal);
  });

  it('justo por debajo del umbral, no aplica el extra por insumos', () => {
    const p = presupuestoConInsumo(3999); // 39.99% de 10000
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS);
    expect(r.porcentajeInsumos).toBeCloseTo(39.99, 5);
    expect(r.aplicaExtraInsumos).toBe(false);
    expect(r.extraInsumos).toBe(0);
    expect(r.total).toBe(r.solicitado);
  });

  it('exactamente en el umbral (borde), aplica el extra por insumos', () => {
    const p = presupuestoConInsumo(4000); // exactamente 40% de 10000
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS);
    expect(r.porcentajeInsumos).toBeCloseTo(40, 5);
    expect(r.aplicaExtraInsumos).toBe(true);
    expect(r.extraInsumos).toBe(3500); // 35% de 10000
    expect(r.total).toBe(13500);
  });

  it('por encima del umbral, aplica el extra por insumos', () => {
    const p = presupuestoConInsumo(6000); // 60% de 10000
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS);
    expect(r.aplicaExtraInsumos).toBe(true);
    expect(r.extraInsumos).toBe(3500);
  });

  it('PSE solo, sin insumos', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS, true);
    expect(r.esPse).toBe(true);
    expect(r.extraPse).toBe(redondear2(p.montoTotal * 0.15));
    expect(r.extraInsumos).toBe(0);
    expect(r.total).toBe(redondear2(p.montoTotal + p.montoTotal * 0.15));
  });

  it('ambos extras a la vez se suman', () => {
    const p = presupuestoConInsumo(6000);
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS, true);
    expect(r.extraInsumos).toBe(3500);
    expect(r.extraPse).toBe(1500);
    expect(r.total).toBe(15000);
  });

  it('porcentajeExtraInsumos en 0 desactiva el extra aunque se supere el umbral', () => {
    const p = presupuestoConInsumo(6000);
    const r = calcularPresupuestoAAdjudicar(p, { ...PARAMETROS, porcentajeExtraInsumos: 0 });
    expect(r.aplicaExtraInsumos).toBe(true);
    expect(r.extraInsumos).toBe(0);
  });

  it('sin parametros, usa los defaults 35/40/15', () => {
    const p = presupuestoConInsumo(6000);
    const r = calcularPresupuestoAAdjudicar(p);
    expect(r.extraInsumos).toBe(3500);
  });

  it('una partida de insumo en Viáticos y Seguros se ignora (nunca cuenta)', () => {
    const p = normalizarPresupuesto(presupuestoValido());
    (p.rubros[0].partidas[0] as { esInsumo?: boolean }).esInsumo = true;
    const r = calcularPresupuestoAAdjudicar(p, PARAMETROS);
    expect(r.montoInsumos).toBe(0);
    expect(r.aplicaExtraInsumos).toBe(false);
  });
});

function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}
