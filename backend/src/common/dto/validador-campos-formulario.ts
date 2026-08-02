import { BadRequestException } from '@nestjs/common';
import { TipoCampo } from '../enums/tipo-campo.enum';

const TIPOS_CON_OPCIONES = [TipoCampo.Checkbox, TipoCampo.Select];

export function validarCamposFormulario(campos: {
  tipo: TipoCampo;
  nombre: string;
  opciones?: string[];
}[]): void {
  for (const campo of campos) {
    if (!campo.nombre.trim()) {
      throw new BadRequestException('Todos los campos deben tener una etiqueta');
    }

    const requiereOpciones = TIPOS_CON_OPCIONES.includes(campo.tipo);
    const opciones = (campo.opciones ?? []).map((o) => o.trim()).filter(Boolean);

    if (requiereOpciones && opciones.length === 0) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" debe tener al menos una opción`,
      );
    }
    if (!requiereOpciones && (campo.opciones?.length ?? 0) > 0) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" no puede tener opciones para su tipo`,
      );
    }
    if (requiereOpciones && new Set(opciones).size !== opciones.length) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" tiene opciones duplicadas`,
      );
    }
  }
}
