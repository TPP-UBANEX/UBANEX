import { BadRequestException } from '@nestjs/common';
import {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  SubcategoriaInstitucional,
  ItemCruzada,
} from '../../templates-evaluacion/estructura-template';

function campoRequerido(valor: unknown, contexto: string): void {
  if (valor === undefined || valor === null) {
    throw new BadRequestException(`Falta un campo requerido en ${contexto}`);
  }
}

function textoNoVacio(texto: string | undefined, contexto: string): void {
  if (!texto || !texto.trim()) {
    throw new BadRequestException(`Todos los elementos de ${contexto} deben tener un nombre o texto`);
  }
}

function validarSubcategoria(sub: SubcategoriaInstitucional): void {
  textoNoVacio(sub.texto, 'las subcategorías');
  if (sub.tipoValor === 'numerico') {
    const minimo = Number(sub.minimo);
    const maximo = Number(sub.maximo);
    if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
      throw new BadRequestException(
        `La subcategoría "${sub.texto}" de tipo numérico debe tener mínimo y máximo`,
      );
    }
    if (minimo > maximo) {
      throw new BadRequestException(
        `La subcategoría "${sub.texto}" tiene un mínimo mayor que su máximo`,
      );
    }
  }
}

export function validarEstructuraInstitucional(
  estructura: EstructuraTemplateInstitucional | undefined,
): void {
  if (estructura === undefined || estructura === null) return;
  campoRequerido(estructura.categorias, 'la estructura del template institucional');

  for (const categoria of estructura.categorias) {
    textoNoVacio(categoria.nombre, 'las categorías');
    if (!Array.isArray(categoria.subcategorias)) {
      throw new BadRequestException(
        `La categoría "${categoria.nombre}" debe tener subcategorías`,
      );
    }
    for (const sub of categoria.subcategorias) {
      validarSubcategoria(sub);
    }
  }

  for (const item of estructura.checklist ?? []) {
    textoNoVacio(item.texto, 'el checklist');
  }
}

function validarItemCruzada(item: ItemCruzada): void {
  textoNoVacio(item.nombre, 'los ítems');
  if (!Number.isFinite(Number(item.puntajeMaximo)) || Number(item.puntajeMaximo) <= 0) {
    throw new BadRequestException(
      `El ítem "${item.nombre}" debe tener un puntaje máximo mayor a cero`,
    );
  }
}

export function validarEstructuraCruzada(
  estructura: EstructuraTemplateCruzada | undefined,
): void {
  if (estructura === undefined || estructura === null) return;
  campoRequerido(estructura.categorias, 'la estructura del template cruzado');

  for (const categoria of estructura.categorias) {
    textoNoVacio(categoria.nombre, 'las categorías');
    if (!Number.isFinite(Number(categoria.puntajeMaximo)) || Number(categoria.puntajeMaximo) <= 0) {
      throw new BadRequestException(
        `La categoría "${categoria.nombre}" debe tener un puntaje máximo mayor a cero`,
      );
    }
    if (!Array.isArray(categoria.items)) {
      throw new BadRequestException(`La categoría "${categoria.nombre}" debe tener ítems`);
    }
    const sumaItems = categoria.items.reduce((acc, item) => acc + Number(item.puntajeMaximo), 0);
    if (sumaItems > Number(categoria.puntajeMaximo)) {
      throw new BadRequestException(
        `Los ítems de la categoría "${categoria.nombre}" superan el puntaje máximo de la categoría`,
      );
    }
    for (const item of categoria.items) {
      validarItemCruzada(item);
    }
  }
}
