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

/** Valida que las respuestas de texto no excedan el máximo permitido por su tipo. */
export function validarValoresFormulario(
  campos: CampoFormulario[],
  datos: Record<string, unknown>,
): void {
  for (const campo of campos) {
    const maximo = maxLongitudCampo(campo.tipo);
    const valor = datos[campo.id];
    if (maximo === undefined || typeof valor !== 'string') continue;

    if (valor.length > maximo) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" no puede superar los ${maximo} caracteres`,
      );
    }
  }
}
