// Tipos que describen la estructura configurable de los templates de evaluación.
// `TemplateEvaluacionInstitucional.estructura` y `TemplateEvaluacionCruzada.estructura`
// persisten esta forma en una columna JSON.

export type TipoValorSubcategoria = 'numerico' | 'booleano';

export interface SubcategoriaInstitucional {
  id: string;
  texto: string;
  tipoValor: TipoValorSubcategoria;
  minimo: number | null;
  maximo: number | null;
  fundamentacion: string | null;
}

export interface CategoriaInstitucional {
  id: string;
  nombre: string;
  subcategorias: SubcategoriaInstitucional[];
}

export interface ItemChecklist {
  id: string;
  texto: string;
}

export interface EstructuraTemplateInstitucional {
  categorias: CategoriaInstitucional[];
  checklist: ItemChecklist[];
}

export interface ItemCruzada {
  id: string;
  nombre: string;
  puntajeMaximo: number;
}

export interface CategoriaCruzada {
  id: string;
  nombre: string;
  puntajeMaximo: number;
  items: ItemCruzada[];
}

export interface EstructuraTemplateCruzada {
  categorias: CategoriaCruzada[];
}
