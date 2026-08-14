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

function campoGeo(overrides: Partial<CampoFormulario> = {}): CampoFormulario {
  return {
    id: 'ubicacion',
    tipo: TipoCampo.Geolocalizacion,
    nombre: 'Ubicación',
    esObligatorio: false,
    orden: 0,
    ...overrides,
  };
}

describe('validarValoresFormulario — geolocalizacion', () => {
  it('rechaza un valor que no es objeto', () => {
    expect(() => validarValoresFormulario([campoGeo()], { ubicacion: 'CABA' }))
      .toThrow(BadRequestException);
  });

  it('rechaza un objeto sin nombre', () => {
    expect(() => validarValoresFormulario([campoGeo()], { ubicacion: { lat: 1, lon: 2 } }))
      .toThrow(BadRequestException);
  });

  it('rechaza coordenadas invalidas', () => {
    expect(() => validarValoresFormulario([campoGeo()], { ubicacion: { nombre: 'CABA', lat: 'no-numero' } }))
      .toThrow(BadRequestException);
  });

  it('acepta texto libre sin coordenadas', () => {
    expect(() => validarValoresFormulario([campoGeo()], { ubicacion: { nombre: 'Un lugar cualquiera' } }))
      .not.toThrow();
  });

  it('acepta el objeto completo devuelto por Georef', () => {
    expect(() => validarValoresFormulario([campoGeo()], {
      ubicacion: { id: '06427010', nombre: 'La Plata, Buenos Aires', provincia: 'Buenos Aires', lat: -34.9, lon: -57.9 },
    })).not.toThrow();
  });
});

describe('camposIncompletosParaEnvio — geolocalizacion', () => {
  it('reporta un campo obligatorio sin nombre cargado', () => {
    const campo = campoGeo({ esObligatorio: true });
    const motivos = camposIncompletosParaEnvio([campo], { ubicacion: { nombre: '  ' } });
    expect(motivos).toEqual(['Ubicación']);
  });

  it('no reporta cuando el campo obligatorio tiene un nombre cargado', () => {
    const campo = campoGeo({ esObligatorio: true });
    const motivos = camposIncompletosParaEnvio([campo], { ubicacion: { nombre: 'CABA' } });
    expect(motivos).toEqual([]);
  });
});

function campoUsuario(overrides: Partial<CampoFormulario> = {}): CampoFormulario {
  return {
    id: 'director',
    tipo: TipoCampo.Usuario,
    nombre: 'Director',
    esObligatorio: false,
    orden: 0,
    ...overrides,
  };
}

describe('validarValoresFormulario — usuario', () => {
  it('rechaza un valor string', () => {
    expect(() => validarValoresFormulario([campoUsuario()], { director: 'Juan Perez' }))
      .toThrow(BadRequestException);
  });

  it('rechaza un array', () => {
    expect(() => validarValoresFormulario([campoUsuario()], { director: [] }))
      .toThrow(BadRequestException);
  });

  it('rechaza un objeto sin nombre', () => {
    expect(() => validarValoresFormulario([campoUsuario()], { director: {} }))
      .toThrow(BadRequestException);
  });

  it('rechaza un nombre vacío', () => {
    expect(() => validarValoresFormulario([campoUsuario()], { director: { nombre: '   ' } }))
      .toThrow(BadRequestException);
  });

  it('rechaza un nombre de más de 255 caracteres', () => {
    expect(() => validarValoresFormulario([campoUsuario()], { director: { nombre: 'a'.repeat(256) } }))
      .toThrow(BadRequestException);
  });

  it('rechaza un email invalido', () => {
    expect(() => validarValoresFormulario([campoUsuario()], {
      director: { nombre: 'Juan Perez', email: 'no-es-mail' },
    })).toThrow(BadRequestException);
  });

  it('rechaza un id que no es string', () => {
    expect(() => validarValoresFormulario([campoUsuario()], {
      director: { nombre: 'Juan Perez', id: 123 },
    })).toThrow(BadRequestException);
  });

  it('acepta texto libre sin id ni email', () => {
    expect(() => validarValoresFormulario([campoUsuario()], { director: { nombre: 'Juan Perez' } }))
      .not.toThrow();
  });

  it('acepta un usuario encontrado por búsqueda', () => {
    expect(() => validarValoresFormulario([campoUsuario()], {
      director: { id: 'u1', nombre: 'Juan Perez', email: 'juan@uba.ar' },
    })).not.toThrow();
  });

  it('valida una celda usuario dentro de una tabla', () => {
    const campo = campoTabla({
      columnas: [
        { id: 'docente', tipo: TipoCampo.Usuario, nombre: 'Docente', esObligatorio: false, rolesUsuario: [] },
      ],
    });
    expect(() => validarValoresFormulario([campo], {
      cronograma: [{ docente: { nombre: '' } }],
    })).toThrow(BadRequestException);

    expect(() => validarValoresFormulario([campo], {
      cronograma: [{ docente: { nombre: 'Juan Perez' } }],
    })).not.toThrow();
  });
});

describe('camposIncompletosParaEnvio — usuario', () => {
  it('reporta un campo obligatorio sin nombre cargado', () => {
    const campo = campoUsuario({ esObligatorio: true });
    const motivos = camposIncompletosParaEnvio([campo], { director: { nombre: ' ' } });
    expect(motivos).toEqual(['Director']);
  });

  it('no reporta cuando el campo obligatorio tiene un nombre cargado', () => {
    const campo = campoUsuario({ esObligatorio: true });
    const motivos = camposIncompletosParaEnvio([campo], { director: { nombre: 'Juan Perez' } });
    expect(motivos).toEqual([]);
  });
});
