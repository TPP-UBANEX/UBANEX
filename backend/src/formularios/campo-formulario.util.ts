import { BadRequestException } from '@nestjs/common';
import { CampoFormulario } from './campo-formulario.interface';
import { MAX_LONGITUD_POR_TIPO, TipoCampo } from '../common/enums/tipo-campo.enum';

const MAX_LONGITUD_NOMBRE_LOCALIDAD = 255;

export function campoFormularioVacio(campo: CampoFormulario, valor: unknown): boolean {
  if (valor == null) return true;
  if (campo.tipo === TipoCampo.Checkbox) return !Array.isArray(valor) || valor.length === 0;
  if (campo.tipo === TipoCampo.Geolocalizacion) {
    return typeof valor !== 'object' || Array.isArray(valor) || !(valor as { nombre?: unknown }).nombre
      || String((valor as { nombre: unknown }).nombre).trim() === '';
  }
  if (typeof valor === 'string') return valor.trim() === '';
  return false;
}

export function maxLongitudCampo(tipo: TipoCampo): number | undefined {
  return MAX_LONGITUD_POR_TIPO[tipo];
}

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Acepta solo fechas ISO (AAAA-MM-DD) reales: el parser nativo rechaza dias fuera de rango. */
function esFechaValida(valor: string): boolean {
  return FORMATO_FECHA.test(valor) && !Number.isNaN(new Date(valor).getTime());
}

/** Valida el objeto { nombre, id?, provincia?, lat?, lon? } que guarda un campo de geolocalizacion. */
function validarValorGeolocalizacion(campo: CampoFormulario, valor: unknown): void {
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

function validarValorNumerico(campo: CampoFormulario, valor: string): void {
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

/** Valida el formato de las respuestas segun el tipo de cada campo. */
export function validarValoresFormulario(
  campos: CampoFormulario[],
  datos: Record<string, unknown>,
): void {
  for (const campo of campos) {
    const valor = datos[campo.id];
    if (valor == null) continue;

    if (campo.tipo === TipoCampo.Geolocalizacion) {
      validarValorGeolocalizacion(campo, valor);
      continue;
    }

    if (typeof valor !== 'string') continue;

    if (campo.tipo === TipoCampo.Fecha) {
      if (valor !== '' && !esFechaValida(valor)) {
        throw new BadRequestException(
          `El campo "${campo.nombre}" debe tener una fecha válida (AAAA-MM-DD)`,
        );
      }
      continue;
    }

    if (campo.tipo === TipoCampo.Numero) {
      if (valor !== '') validarValorNumerico(campo, valor);
      continue;
    }

    const maximo = maxLongitudCampo(campo.tipo);
    if (maximo !== undefined && valor.length > maximo) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" no puede superar los ${maximo} caracteres`,
      );
    }
  }
}
