import { BadRequestException } from '@nestjs/common';
import { TipoCampo } from '../enums/tipo-campo.enum';

const TIPOS_CON_OPCIONES = [TipoCampo.Checkbox, TipoCampo.Select];

export function validarCamposFormulario(campos: {
  tipo: TipoCampo;
  nombre: string;
  opciones?: string[];
  minimo?: number;
  maximo?: number;
  admiteDecimales?: boolean;
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

    const esNumero = campo.tipo === TipoCampo.Numero;
    if (!esNumero && (campo.minimo !== undefined || campo.maximo !== undefined || campo.admiteDecimales !== undefined)) {
      throw new BadRequestException(
        `El campo "${campo.nombre}" no puede tener configuración numérica para su tipo`,
      );
    }
    if (esNumero) {
      if (campo.minimo !== undefined && !Number.isFinite(campo.minimo)) {
        throw new BadRequestException(`El campo "${campo.nombre}" tiene un mínimo inválido`);
      }
      if (campo.maximo !== undefined && !Number.isFinite(campo.maximo)) {
        throw new BadRequestException(`El campo "${campo.nombre}" tiene un máximo inválido`);
      }
      if (!campo.admiteDecimales) {
        if (campo.minimo !== undefined && !Number.isInteger(campo.minimo)) {
          throw new BadRequestException(`El campo "${campo.nombre}" debe tener un mínimo entero`);
        }
        if (campo.maximo !== undefined && !Number.isInteger(campo.maximo)) {
          throw new BadRequestException(`El campo "${campo.nombre}" debe tener un máximo entero`);
        }
      }
      if (campo.minimo !== undefined && campo.maximo !== undefined && campo.minimo > campo.maximo) {
        throw new BadRequestException(
          `El campo "${campo.nombre}" tiene un mínimo mayor que el máximo`,
        );
      }
    }
  }
}
