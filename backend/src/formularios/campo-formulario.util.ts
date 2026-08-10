import { BadRequestException } from '@nestjs/common';
import { CampoFormulario } from './campo-formulario.interface';
import { MAX_LONGITUD_POR_TIPO, TipoCampo } from '../common/enums/tipo-campo.enum';

export function campoFormularioVacio(campo: CampoFormulario, valor: unknown): boolean {
  if (valor == null) return true;
  if (campo.tipo === TipoCampo.Checkbox) return !Array.isArray(valor) || valor.length === 0;
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

/** Valida el formato de las respuestas segun el tipo de cada campo. */
export function validarValoresFormulario(
  campos: CampoFormulario[],
  datos: Record<string, unknown>,
): void {
  for (const campo of campos) {
    const valor = datos[campo.id];
    if (typeof valor !== 'string') continue;

    if (campo.tipo === TipoCampo.Fecha) {
      if (valor !== '' && !esFechaValida(valor)) {
        throw new BadRequestException(
          `El campo "${campo.nombre}" debe tener una fecha válida (AAAA-MM-DD)`,
        );
      }
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
