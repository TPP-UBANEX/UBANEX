import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { validarCamposFormulario } from './validador-campos-formulario';
import { CampoFormularioDto } from './campo-formulario.dto';
import { TipoCampo } from '../enums/tipo-campo.enum';
import { RolUsuario } from '../enums/rol-usuario.enum';

function campo(overrides: Partial<CampoFormularioDto> = {}): CampoFormularioDto {
  return {
    tipo: TipoCampo.Texto,
    nombre: 'Campo',
    esObligatorio: false,
    ...overrides,
  } as CampoFormularioDto;
}

describe('validarCamposFormulario — tabla', () => {
  it('rechaza una tabla sin columnas', () => {
    expect(() => validarCamposFormulario([
      campo({ tipo: TipoCampo.Tabla, nombre: 'Cronograma', columnas: [] }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza una columna de tipo seccion', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Cronograma',
        columnas: [{ tipo: TipoCampo.Seccion, nombre: 'Col', esObligatorio: false }],
      }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza una columna de tipo tabla (sin anidamiento)', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Cronograma',
        columnas: [{ tipo: TipoCampo.Tabla, nombre: 'Col', esObligatorio: false }],
      }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza una columna de seleccion sin opciones', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Cronograma',
        columnas: [{ tipo: TipoCampo.Select, nombre: 'Modalidad', esObligatorio: false, opciones: [] }],
      }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza columnas con nombres duplicados', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Cronograma',
        columnas: [
          { tipo: TipoCampo.Texto, nombre: 'Actividad', esObligatorio: false },
          { tipo: TipoCampo.Numero, nombre: 'Actividad', esObligatorio: false },
        ],
      }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza filasMinimas mayor que filasMaximas', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Cronograma',
        columnas: [{ tipo: TipoCampo.Texto, nombre: 'Actividad', esObligatorio: false }],
        filasMinimas: 5,
        filasMaximas: 2,
      }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza configuracion de tabla en un campo que no es tabla', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Texto,
        nombre: 'Nombre',
        columnas: [{ tipo: TipoCampo.Texto, nombre: 'Actividad', esObligatorio: false }],
      }),
    ])).toThrow(BadRequestException);
  });

  it('acepta una tabla valida', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Cronograma',
        columnas: [
          { tipo: TipoCampo.Texto, nombre: 'Actividad', esObligatorio: true },
          { tipo: TipoCampo.Fecha, nombre: 'Fecha', esObligatorio: true },
          { tipo: TipoCampo.Numero, nombre: 'Duración', esObligatorio: false, minimo: 1, maximo: 12 },
        ],
        filasMinimas: 2,
        filasMaximas: 6,
      }),
    ])).not.toThrow();
  });
});

describe('validarCamposFormulario — usuario', () => {
  it('rechaza un campo usuario sin rolesUsuario', () => {
    expect(() => validarCamposFormulario([
      campo({ tipo: TipoCampo.Usuario, nombre: 'Director' }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza un campo usuario con rolesUsuario vacío', () => {
    expect(() => validarCamposFormulario([
      campo({ tipo: TipoCampo.Usuario, nombre: 'Director', rolesUsuario: [] }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza rolesUsuario en un campo de otro tipo', () => {
    expect(() => validarCamposFormulario([
      campo({ tipo: TipoCampo.Texto, nombre: 'Nombre', rolesUsuario: [RolUsuario.Docente] }),
    ])).toThrow(BadRequestException);
  });

  it('rechaza una columna de tabla usuario sin rolesUsuario', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Participantes',
        columnas: [{ tipo: TipoCampo.Usuario, nombre: 'Docente', esObligatorio: false }],
      }),
    ])).toThrow(BadRequestException);
  });

  it('acepta un campo usuario valido', () => {
    expect(() => validarCamposFormulario([
      campo({ tipo: TipoCampo.Usuario, nombre: 'Director', rolesUsuario: [RolUsuario.Docente] }),
    ])).not.toThrow();
  });

  it('acepta una tabla con columna usuario valida', () => {
    expect(() => validarCamposFormulario([
      campo({
        tipo: TipoCampo.Tabla,
        nombre: 'Participantes',
        columnas: [
          { tipo: TipoCampo.Usuario, nombre: 'Docente', esObligatorio: true, rolesUsuario: [RolUsuario.Docente] },
        ],
      }),
    ])).not.toThrow();
  });
});
