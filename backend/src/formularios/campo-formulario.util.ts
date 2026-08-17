import { BadRequestException } from '@nestjs/common';
import { CampoFormulario, ColumnaTabla } from './campo-formulario.interface';
import { MAX_LONGITUD_POR_TIPO, TipoCampo } from '../common/enums/tipo-campo.enum';

const MAX_LONGITUD_NOMBRE_LOCALIDAD = 255;
const MAX_LONGITUD_NOMBRE_USUARIO = 255;
const MAX_LONGITUD_EMAIL_USUARIO = 255;
const MAX_LONGITUD_ID_USUARIO = 64;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function filaVacia(columnas: ColumnaTabla[], fila: Record<string, unknown>): boolean {
  return columnas.every((columna) => campoFormularioVacio(columna, fila[columna.id]));
}

export function campoFormularioVacio(campo: CampoFormulario | ColumnaTabla, valor: unknown): boolean {
  if (valor == null) return true;
  if (campo.tipo === TipoCampo.Checkbox) return !Array.isArray(valor) || valor.length === 0;
  if (campo.tipo === TipoCampo.Geolocalizacion || campo.tipo === TipoCampo.Usuario) {
    return typeof valor !== 'object' || Array.isArray(valor) || !(valor as { nombre?: unknown }).nombre
      || String((valor as { nombre: unknown }).nombre).trim() === '';
  }
  if (campo.tipo === TipoCampo.Tabla) {
    const columnas = (campo as CampoFormulario).columnas ?? [];
    return !Array.isArray(valor) || valor.length === 0
      || valor.every((fila) => filaVacia(columnas, (fila ?? {}) as Record<string, unknown>));
  }
  if (typeof valor === 'string') return valor.trim() === '';
  return false;
}

export function maxLongitudCampo(tipo: TipoCampo): number | undefined {
  return MAX_LONGITUD_POR_TIPO[tipo];
}

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Acepta solo fechas ISO (AAAA-MM-DD) reales: el parser nativo rechaza dias fuera de rango. */
export function esFechaValida(valor: string): boolean {
  return FORMATO_FECHA.test(valor) && !Number.isNaN(new Date(valor).getTime());
}

/** Valida el objeto { nombre, id?, provincia?, lat?, lon? } que guarda un campo de geolocalizacion. */
function validarValorGeolocalizacion(campo: CampoFormulario | ColumnaTabla, valor: unknown): void {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene un valor inválido`);
  }
  const v = valor as { nombre?: unknown; lat?: unknown; lon?: unknown };

  if (typeof v.nombre !== 'string' || v.nombre.trim() === '' || v.nombre.length > MAX_LONGITUD_NOMBRE_LOCALIDAD) {
    throw new BadRequestException(
      `El campo "${campo.nombre}" debe tener un nombre de hasta ${MAX_LONGITUD_NOMBRE_LOCALIDAD} caracteres`,
    );
  }
  if (v.lat !== undefined && (typeof v.lat !== 'number' || !Number.isFinite(v.lat))) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene coordenadas inválidas`);
  }
  if (v.lon !== undefined && (typeof v.lon !== 'number' || !Number.isFinite(v.lon))) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene coordenadas inválidas`);
  }
}

/** Valida el objeto { nombre, id?, email? } que guarda un campo de usuario. */
function validarValorUsuario(campo: CampoFormulario | ColumnaTabla, valor: unknown): void {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene un valor inválido`);
  }
  const v = valor as { nombre?: unknown; id?: unknown; email?: unknown };

  if (typeof v.nombre !== 'string' || v.nombre.trim() === '' || v.nombre.length > MAX_LONGITUD_NOMBRE_USUARIO) {
    throw new BadRequestException(
      `El campo "${campo.nombre}" debe tener un nombre de hasta ${MAX_LONGITUD_NOMBRE_USUARIO} caracteres`,
    );
  }
  if (
    v.id !== undefined
    && (typeof v.id !== 'string' || v.id.trim() === '' || v.id.length > MAX_LONGITUD_ID_USUARIO)
  ) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene un usuario inválido`);
  }
  if (
    v.email !== undefined
    && (typeof v.email !== 'string' || v.email.length > MAX_LONGITUD_EMAIL_USUARIO || !FORMATO_EMAIL.test(v.email))
  ) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene un email inválido`);
  }
}

function validarValorNumerico(campo: CampoFormulario | ColumnaTabla, valor: string): void {
  const num = Number(valor);
  if (!Number.isFinite(num)) {
    throw new BadRequestException(`El campo "${campo.nombre}" debe ser un número válido`);
  }
  if (!campo.admiteDecimales && !Number.isInteger(num)) {
    throw new BadRequestException(`El campo "${campo.nombre}" debe ser un número entero`);
  }
  if (campo.minimo !== undefined && num < campo.minimo) {
    if (campo.maximo !== undefined) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" debe estar entre ${campo.minimo} y ${campo.maximo}`,
      );
    }
    throw new BadRequestException(
      `El campo "${campo.nombre}" debe ser mayor o igual a ${campo.minimo}`,
    );
  }
  if (campo.maximo !== undefined && num > campo.maximo) {
    if (campo.minimo !== undefined) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" debe estar entre ${campo.minimo} y ${campo.maximo}`,
      );
    }
    throw new BadRequestException(
      `El campo "${campo.nombre}" debe ser menor o igual a ${campo.maximo}`,
    );
  }
}

/** Valida un valor (de un campo de primer nivel o de una celda de tabla) segun su tipo. */
function validarValorSegunTipo(campo: CampoFormulario | ColumnaTabla, valor: unknown): void {
  if (campo.tipo === TipoCampo.Geolocalizacion) {
    validarValorGeolocalizacion(campo, valor);
    return;
  }

  if (campo.tipo === TipoCampo.Usuario) {
    validarValorUsuario(campo, valor);
    return;
  }

  if (typeof valor !== 'string') return;

  if (campo.tipo === TipoCampo.Fecha) {
    if (valor !== '' && !esFechaValida(valor)) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" debe tener una fecha válida (AAAA-MM-DD)`,
      );
    }
    return;
  }

  if (campo.tipo === TipoCampo.Numero) {
    if (valor !== '') validarValorNumerico(campo, valor);
    return;
  }

  const maximo = maxLongitudCampo(campo.tipo);
  if (maximo !== undefined && valor.length > maximo) {
    throw new BadRequestException(
      `El campo "${campo.nombre}" no puede superar los ${maximo} caracteres`,
    );
  }
}

function validarValorTabla(campo: CampoFormulario, valor: unknown): void {
  if (!Array.isArray(valor)) {
    throw new BadRequestException(`El campo "${campo.nombre}" tiene un valor inválido`);
  }
  if (campo.filasMaximas !== undefined && valor.length > campo.filasMaximas) {
    throw new BadRequestException(
      `El campo "${campo.nombre}" admite como máximo ${campo.filasMaximas} filas`,
    );
  }

  const columnas = campo.columnas ?? [];
  for (const fila of valor) {
    if (typeof fila !== 'object' || fila === null || Array.isArray(fila)) {
      throw new BadRequestException(`El campo "${campo.nombre}" tiene una fila con un valor inválido`);
    }
    for (const columna of columnas) {
      const celda = (fila as Record<string, unknown>)[columna.id];
      if (celda == null) continue;
      validarValorSegunTipo(columna, celda);
    }
  }
}

/** Valida el formato de las respuestas segun el tipo de cada campo. */
export function validarValoresFormulario(
  campos: CampoFormulario[],
  datos: Record<string, unknown>,
): void {
  for (const campo of campos) {
    if (campo.tipo === TipoCampo.Seccion) continue;

    const valor = datos[campo.id];
    if (valor == null) continue;

    if (campo.tipo === TipoCampo.Tabla) {
      validarValorTabla(campo, valor);
      continue;
    }

    validarValorSegunTipo(campo, valor);
  }
}

/**
 * Describe, en texto legible, qué falta completar del formulario para poder enviar la edición.
 * Los campos obligatorios exigen valor; las tablas obligatorias exigen al menos una fila, respetan
 * el mínimo de filas configurado y, en cada fila cargada, sus columnas obligatorias.
 */
export function camposIncompletosParaEnvio(
  campos: CampoFormulario[],
  datos: Record<string, unknown>,
): string[] {
  const motivos: string[] = [];

  for (const campo of campos) {
    if (campo.tipo === TipoCampo.Seccion) continue;
    const valor = datos[campo.id];

    if (campo.tipo === TipoCampo.Tabla) {
      const columnas = campo.columnas ?? [];
      const filas = (Array.isArray(valor) ? valor : [])
        .map((fila) => (fila ?? {}) as Record<string, unknown>)
        .filter((fila) => !filaVacia(columnas, fila));

      if (campo.esObligatorio && filas.length === 0) {
        motivos.push(
          campo.filasMinimas && campo.filasMinimas > 1
            ? `"${campo.nombre}" debe tener al menos ${campo.filasMinimas} filas`
            : `"${campo.nombre}" debe tener al menos una fila`,
        );
        continue;
      }
      if (
        campo.filasMinimas !== undefined
        && (campo.esObligatorio || filas.length > 0)
        && filas.length < campo.filasMinimas
      ) {
        motivos.push(`"${campo.nombre}" debe tener al menos ${campo.filasMinimas} filas`);
      }
      filas.forEach((fila, index) => {
        columnas
          .filter((columna) => columna.esObligatorio && campoFormularioVacio(columna, fila[columna.id]))
          .forEach((columna) => {
            motivos.push(`"${campo.nombre}": a la fila ${index + 1} le falta "${columna.nombre}"`);
          });
      });
      continue;
    }

    if (campo.esObligatorio && campoFormularioVacio(campo, valor)) {
      motivos.push(campo.nombre);
    }
  }

  return motivos;
}
