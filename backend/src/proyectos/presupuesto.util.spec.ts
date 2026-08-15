import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  normalizarPresupuesto, presupuestoIncompletoParaEnvio, validarPresupuesto,
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
});

describe('presupuestoIncompletoParaEnvio', () => {
  const convocatoriaConEjecucion = {
    fechaInicioEjecucion: '2027-08-01',
    fechaFinEjecucion: '2028-02-28',
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
    const motivos = presupuestoIncompletoParaEnvio(p, { fechaInicioEjecucion: null, fechaFinEjecucion: null });
    expect(motivos).toContain(
      '"Viáticos y Seguros": el período de la partida 1 no puede comenzar antes de hoy',
    );
  });
});
