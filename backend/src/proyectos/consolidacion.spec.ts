import { describe, it, expect } from '@jest/globals';
import {
  calcularConsolidacion, esConsolidadoEfectivo, esConsolidadoParaTope, ordenarConvocatorias,
  salteaEvaluacionEfectivo, ConvocatoriaOrden, EdicionHistorial,
} from './consolidacion';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';

/** 6 convocatorias consecutivas c0..c5, ya en orden cronológico. */
function convocatorias(): ConvocatoriaOrden[] {
  return Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, anio: 2020 + i }));
}

function historial(estados: Record<string, EstadoEdicion>): EdicionHistorial[] {
  return Object.entries(estados).map(([convocatoriaId, estado]) => ({ convocatoriaId, estado }));
}

describe('ordenarConvocatorias', () => {
  it('ordena por año y usa el id como desempate estable', () => {
    const resultado = ordenarConvocatorias([
      { id: 'b', anio: 2024 },
      { id: 'a', anio: 2024 },
      { id: 'z', anio: 2023 },
    ]);
    expect(resultado.map(c => c.id)).toEqual(['z', 'a', 'b']);
  });
});

describe('calcularConsolidacion', () => {
  const convs = convocatorias();

  it('sin historial: racha 0, no consolidado, nunca consolidado', () => {
    const datos = calcularConsolidacion(convs, [], 'c0');
    expect(datos).toEqual({
      rachaAdjudicaciones: 0,
      esConsolidadoDerivado: false,
      salteaEvaluacion: false,
      fueConsolidadoAlgunaVez: false,
    });
  });

  it('3 adjudicaciones consecutivas consolidan la 4ta participación', () => {
    const h = historial({ c0: EstadoEdicion.Adjudicado, c1: EstadoEdicion.Adjudicado, c2: EstadoEdicion.Adjudicado });
    const datos = calcularConsolidacion(convs, h, 'c3');
    expect(datos.rachaAdjudicaciones).toBe(3);
    expect(datos.esConsolidadoDerivado).toBe(true);
    expect(datos.salteaEvaluacion).toBe(false); // recién consolidado: la 4ta se evalúa igual
    expect(datos.fueConsolidadoAlgunaVez).toBe(false); // c3 aún no tiene edición propia en el historial
  });

  it('un hueco reinicia la racha vigente', () => {
    const h = historial({
      c0: EstadoEdicion.Adjudicado,
      c1: EstadoEdicion.Adjudicado,
      c2: EstadoEdicion.Adjudicado,
      // c3: no participó (hueco)
    });
    const datos = calcularConsolidacion(convs, h, 'c4');
    expect(datos.rachaAdjudicaciones).toBe(0);
    expect(datos.esConsolidadoDerivado).toBe(false);
  });

  it('desde la 5ta participación consecutiva alterna: A par saltea evaluación', () => {
    const h = historial({
      c0: EstadoEdicion.Adjudicado,
      c1: EstadoEdicion.Adjudicado,
      c2: EstadoEdicion.Adjudicado,
      c3: EstadoEdicion.Adjudicado, // 4ta, ya consolidado
    });
    const datos = calcularConsolidacion(convs, h, 'c4'); // 5ta: A=4 (par) -> saltea
    expect(datos.rachaAdjudicaciones).toBe(4);
    expect(datos.salteaEvaluacion).toBe(true);
  });

  it('fueConsolidadoAlgunaVez queda true aunque un hueco reinicie la racha vigente', () => {
    const h = historial({
      c0: EstadoEdicion.Adjudicado,
      c1: EstadoEdicion.Adjudicado,
      c2: EstadoEdicion.Adjudicado,
      c3: EstadoEdicion.Adjudicado, // consolidado en c3
      // c4: hueco
    });
    const datos = calcularConsolidacion(convs, h, 'c5');
    expect(datos.esConsolidadoDerivado).toBe(false); // la racha vigente se reinició
    expect(datos.fueConsolidadoAlgunaVez).toBe(true); // pero fue consolidado alguna vez
  });

  it('una racha de 3 sin volver a participar nunca llega a consolidarse', () => {
    // Adjudicado en c0..c2, pero el proyecto no tiene ninguna edición en c3 (nunca hubo una
    // 4ta participación en la que "quedara" consolidado).
    const h = historial({ c0: EstadoEdicion.Adjudicado, c1: EstadoEdicion.Adjudicado, c2: EstadoEdicion.Adjudicado });
    const datos = calcularConsolidacion(convs, h, 'c3');
    // La convocatoria actual (c3) no tiene edición propia en el historial: fueConsolidadoAlgunaVez
    // se evalúa hasta la convocatoria actual inclusive, y acá no hay participación que consolide.
    expect(datos.fueConsolidadoAlgunaVez).toBe(false);
  });

  it('consolida en la 4ta participación aunque esa edición no sea adjudicada', () => {
    // Racha de 3 adjudicaciones, y una 4ta participación que queda en evaluación (no adjudicada):
    // igual cuenta como "consolidado alguna vez", fiel a "consolidado pero igual se evalúa".
    const h = historial({
      c0: EstadoEdicion.Adjudicado,
      c1: EstadoEdicion.Adjudicado,
      c2: EstadoEdicion.Adjudicado,
      c3: EstadoEdicion.EnEvaluacion,
    });
    const datos = calcularConsolidacion(convs, h, 'c3');
    expect(datos.fueConsolidadoAlgunaVez).toBe(true);
  });
});

describe('esConsolidadoEfectivo / salteaEvaluacionEfectivo', () => {
  it('el override manual gana sobre lo derivado', () => {
    const datos = { rachaAdjudicaciones: 0, esConsolidadoDerivado: false, salteaEvaluacion: false, fueConsolidadoAlgunaVez: false };
    expect(esConsolidadoEfectivo(datos, true)).toBe(true);
    expect(esConsolidadoEfectivo(datos, false)).toBe(false);
    expect(esConsolidadoEfectivo(datos, null)).toBe(false);
  });

  it('override false bloquea saltear evaluación aunque la racha lo habilite', () => {
    const datos = { rachaAdjudicaciones: 4, esConsolidadoDerivado: true, salteaEvaluacion: true, fueConsolidadoAlgunaVez: true };
    expect(salteaEvaluacionEfectivo(datos, false)).toBe(false);
    expect(salteaEvaluacionEfectivo(datos, null)).toBe(true);
    expect(salteaEvaluacionEfectivo(datos, true)).toBe(true);
  });
});

describe('esConsolidadoParaTope', () => {
  it('es irreversible: override false no baja a un proyecto históricamente consolidado', () => {
    const datos = { rachaAdjudicaciones: 0, esConsolidadoDerivado: false, salteaEvaluacion: false, fueConsolidadoAlgunaVez: true };
    expect(esConsolidadoParaTope(datos, false)).toBe(true);
    expect(esConsolidadoParaTope(datos, null)).toBe(true);
  });

  it('override true sube a un proyecto que nunca se consolidó', () => {
    const datos = { rachaAdjudicaciones: 0, esConsolidadoDerivado: false, salteaEvaluacion: false, fueConsolidadoAlgunaVez: false };
    expect(esConsolidadoParaTope(datos, true)).toBe(true);
    expect(esConsolidadoParaTope(datos, null)).toBe(false);
    expect(esConsolidadoParaTope(datos, false)).toBe(false);
  });
});
