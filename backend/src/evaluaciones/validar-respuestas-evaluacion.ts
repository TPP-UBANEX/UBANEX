import { BadRequestException } from '@nestjs/common';
import {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  SubcategoriaInstitucional,
} from '../templates-evaluacion/estructura-template';

export interface RespuestaSubcategoria {
  valor: number | boolean;
  fundamentacion?: string | null;
}

export function validarRespuestasInstitucionales(
  template: EstructuraTemplateInstitucional | null | undefined,
  categorias?: Record<string, unknown> | null,
  checklist?: Record<string, unknown> | null,
): void {
  const subcategorias: SubcategoriaInstitucional[] = [];
  for (const categoria of template?.categorias ?? []) {
    subcategorias.push(...categoria.subcategorias);
  }
  const subPorId = new Map(subcategorias.map(sub => [sub.id, sub]));

  if (categorias) {
    for (const [id, resp] of Object.entries(categorias)) {
      const sub = subPorId.get(id);
      if (!sub) {
        throw new BadRequestException(`La subcategoría ${id} no pertenece al template de evaluación`);
      }
      const r = resp as { valor?: unknown; fundamentacion?: unknown };
      if (sub.tipoValor === 'numerico') {
        const valor = r.valor;
        if (typeof valor !== 'number' || !Number.isFinite(valor)) {
          throw new BadRequestException(`"${sub.texto}" debe tener un valor numérico`);
        }
        if (sub.minimo !== null && sub.maximo !== null && (valor < sub.minimo || valor > sub.maximo)) {
          throw new BadRequestException(
            `"${sub.texto}" debe estar entre ${sub.minimo} y ${sub.maximo}`,
          );
        }
      } else {
        if (typeof r.valor !== 'boolean') {
          throw new BadRequestException(`"${sub.texto}" debe responderse con Sí o No`);
        }
      }
      if (
        r.fundamentacion !== undefined &&
        r.fundamentacion !== null &&
        typeof r.fundamentacion !== 'string'
      ) {
        throw new BadRequestException(`La fundamentación de "${sub.texto}" debe ser texto`);
      }
    }
  }

  if (checklist) {
    const idsChecklist = new Set((template?.checklist ?? []).map(item => item.id));
    for (const [id, valor] of Object.entries(checklist)) {
      if (!idsChecklist.has(id)) {
        throw new BadRequestException(`El ítem de checklist ${id} no pertenece al template`);
      }
      if (typeof valor !== 'boolean') {
        throw new BadRequestException('Los ítems del checklist se responden con Sí o No');
      }
    }
  }
}

export function validarRespuestasCruzadas(
  template: EstructuraTemplateCruzada | null | undefined,
  items?: Record<string, unknown> | null,
): void {
  const maxPorItem = new Map<string, number>();
  const nombrePorItem = new Map<string, string>();
  for (const categoria of template?.categorias ?? []) {
    for (const item of categoria.items) {
      maxPorItem.set(item.id, item.puntajeMaximo);
      nombrePorItem.set(item.id, item.nombre);
    }
  }

  if (items) {
    for (const [id, valor] of Object.entries(items)) {
      const maximo = maxPorItem.get(id);
      if (maximo === undefined) {
        throw new BadRequestException(`El ítem ${id} no pertenece al template de evaluación`);
      }
      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        throw new BadRequestException(`"${nombrePorItem.get(id)}" debe tener un puntaje numérico`);
      }
      if (valor < 0 || valor > maximo) {
        throw new BadRequestException(
          `"${nombrePorItem.get(id)}" debe estar entre 0 y ${maximo}`,
        );
      }
    }
  }
}
