import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { camposIncompletosParaEnvio, validarValoresFormulario } from './campo-formulario.util';
import { CampoFormulario } from './campo-formulario.interface';
import { TipoCampo } from '../common/enums/tipo-campo.enum';

function campoTabla(overrides: Partial<CampoFormulario> = {}): CampoFormulario {
  return {
    id: 'cronograma',
    tipo: TipoCampo.Tabla,
    nombre: 'Cronograma',
    esObligatorio: false,
    orden: 0,
    columnas: [
      { id: 'actividad', tipo: TipoCampo.Texto, nombre: 'Actividad', esObligatorio: true },
      { id: 'fecha', tipo: TipoCampo.Fecha, nombre: 'Fecha', esObligatorio: true },
      { id: 'duracion', tipo: TipoCampo.Numero, nombre: 'Duración', esObligatorio: false, minimo: 1, maximo: 12 },
    ],
    ...overrides,
  };
}

describe('validarValoresFormulario — tabla', () => {
  it('rechaza un valor que no es array', () => {
    expect(() => validarValoresFormulario([campoTabla()], { cronograma: 'no es array' }))
      .toThrow(BadRequestException);
  });

  it('rechaza una fila que no es un objeto', () => {
    expect(() => validarValoresFormulario([campoTabla()], { cronograma: ['no es objeto'] }))
      .toThrow(BadRequestException);
  });

  it('rechaza una celda de fecha invalida', () => {
    expect(() => validarValoresFormulario([campoTabla()], {
      cronograma: [{ actividad: 'Taller', fecha: '31/12/2026' }],
    })).toThrow(BadRequestException);
  });

  it('rechaza una celda numerica fuera de rango', () => {
    expect(() => validarValoresFormulario([campoTabla()], {
      cronograma: [{ actividad: 'Taller', fecha: '2026-03-01', duracion: '24' }],
    })).toThrow(BadRequestException);
  });

  it('rechaza exceder filasMaximas', () => {
    const campo = campoTabla({ filasMaximas: 1 });
    expect(() => validarValoresFormulario([campo], {
      cronograma: [
        { actividad: 'Taller', fecha: '2026-03-01' },
        { actividad: 'Encuentro', fecha: '2026-04-01' },
      ],
    })).toThrow(BadRequestException);
  });

  it('acepta filas validas dentro de los limites', () => {
    const campo = campoTabla({ filasMaximas: 6 });
    expect(() => validarValoresFormulario([campo], {
      cronograma: [
        { actividad: 'Taller', fecha: '2026-03-01', duracion: '2' },
      ],
    })).not.toThrow();
  });
});

describe('camposIncompletosParaEnvio — tabla', () => {
  it('exige al menos una fila si la tabla es obligatoria', () => {
    const campo = campoTabla({ esObligatorio: true });
    const motivos = camposIncompletosParaEnvio([campo], { cronograma: [] });
    expect(motivos).toEqual(['"Cronograma" debe tener al menos una fila']);
  });

  it('exige el minimo de filas configurado cuando ya hay filas cargadas', () => {
    const campo = campoTabla({ filasMinimas: 2 });
    const motivos = camposIncompletosParaEnvio([campo], {
      cronograma: [{ actividad: 'Taller', fecha: '2026-03-01' }],
    });
    expect(motivos).toEqual(['"Cronograma" debe tener al menos 2 filas']);
  });

  it('no exige minimo de filas si la tabla no es obligatoria y no tiene filas cargadas', () => {
    const campo = campoTabla({ filasMinimas: 2 });
    const motivos = camposIncompletosParaEnvio([campo], { cronograma: [] });
    expect(motivos).toEqual([]);
  });

  it('reporta las columnas obligatorias incompletas de una fila parcialmente cargada', () => {
    const campo = campoTabla();
    const motivos = camposIncompletosParaEnvio([campo], {
      cronograma: [
        { actividad: 'Taller', fecha: '2026-03-01' },
        { actividad: 'Encuentro', fecha: '' },
      ],
    });
    expect(motivos).toEqual(['"Cronograma": a la fila 2 le falta "Fecha"']);
  });

  it('ignora filas totalmente vacias', () => {
    const campo = campoTabla({ esObligatorio: true });
    const motivos = camposIncompletosParaEnvio([campo], {
      cronograma: [
        { actividad: 'Taller', fecha: '2026-03-01' },
        {},
      ],
    });
    expect(motivos).toEqual([]);
  });
});
