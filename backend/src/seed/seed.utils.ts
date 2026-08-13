import {
  EstructuraTemplateCruzada,
  EstructuraTemplateInstitucional,
} from '../templates-evaluacion/estructura-template';
import { FUNDAMENTACIONES, OBSERVACIONES_CRUZADA, OBSERVACIONES_INST } from './seed.data';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private readonly siguienteFloat: () => number;

  constructor(semilla: number) {
    this.siguienteFloat = mulberry32(semilla);
  }

  float(): number {
    return this.siguienteFloat();
  }

  entero(min: number, max: number): number {
    return min + Math.floor(this.siguienteFloat() * (max - min + 1));
  }

  pick<T>(opciones: readonly T[]): T {
    if (opciones.length === 0) {
      throw new Error('pick sobre un array vacío');
    }
    return opciones[Math.min(opciones.length - 1, Math.floor(this.siguienteFloat() * opciones.length))];
  }

  bool(probabilidad = 0.5): boolean {
    return this.siguienteFloat() < probabilidad;
  }

  proyectosPorUa(): number {
    return 20 + Math.floor(Math.pow(this.siguienteFloat(), 0.5) * 80);
  }
}

export function generarPresupuesto(rng: Rng, anioInicio: number): object {
  const montoTotal =
    Math.round((rng.entero(80_000, 950_000) * (1 + 0.1 * (anioInicio - 2023))) / 10_000) * 10_000;
  const montoViaticos = Math.round(((montoTotal * rng.entero(35, 45)) / 100) / 1000) * 1000;
  const montoConsumo = Math.round(((montoTotal * rng.entero(25, 35)) / 100) / 1000) * 1000;
  const montoUso = montoTotal - montoViaticos - montoConsumo;
  return {
    montoTotal,
    rubros: [
      {
        tipo: 'ViaticosYSeguros',
        subtotal: montoViaticos,
        partidas: [
          {
            tipoPersona: 'Docente',
            descripcion: 'Viáticos para docentes',
            periodoInicio: `${anioInicio}-08`,
            periodoFin: `${anioInicio + 1}-02`,
            monto: Math.round(montoViaticos * 0.55),
          },
          {
            tipoPersona: 'Estudiante',
            descripcion: 'Viáticos para estudiantes',
            periodoInicio: `${anioInicio}-08`,
            periodoFin: `${anioInicio + 1}-02`,
            monto: Math.round(montoViaticos * 0.45),
          },
        ],
      },
      {
        tipo: 'BienesDeConsumo',
        subtotal: montoConsumo,
        partidas: [
          { descripcion: 'Materiales e insumos', cantidad: rng.entero(20, 120), precioUnitario: 2500, monto: montoConsumo },
        ],
      },
      {
        tipo: 'BienesDeUso',
        subtotal: montoUso,
        partidas: [
          { descripcion: 'Equipamiento', cantidad: rng.entero(1, 5), precioUnitario: Math.round(montoUso / 3), monto: montoUso },
        ],
      },
    ],
  };
}

export function generarEvaluacionInstitucional(
  estructura: EstructuraTemplateInstitucional,
  rng: Rng,
  completo: boolean,
): { categorias: Record<string, unknown>; checklist: Record<string, unknown>; observaciones: string } {
  const categorias: Record<string, unknown> = {};
  for (const categoria of estructura.categorias ?? []) {
    for (const subcategoria of categoria.subcategorias ?? []) {
      if (subcategoria.tipoValor === 'numerico') {
        const minimo = Math.max(subcategoria.minimo ?? 0, 4);
        const maximo = subcategoria.maximo ?? 10;
        categorias[subcategoria.id] = {
          valor: rng.entero(Math.min(minimo, maximo), maximo),
          fundamentacion: rng.pick(FUNDAMENTACIONES),
        };
      } else {
        categorias[subcategoria.id] = { valor: rng.bool(0.85), fundamentacion: '' };
      }
    }
  }
  const checklist: Record<string, unknown> = {};
  for (const item of estructura.checklist ?? []) {
    checklist[item.id] = completo ? true : rng.bool(0.6);
  }
  return { categorias, checklist, observaciones: rng.pick(OBSERVACIONES_INST) };
}

export function generarEvaluacionCruzada(
  estructura: EstructuraTemplateCruzada,
  rng: Rng,
): { items: Record<string, number>; observaciones: string } {
  const items: Record<string, number> = {};
  for (const categoria of estructura.categorias ?? []) {
    for (const item of categoria.items ?? []) {
      const minimo = Math.max(0, item.puntajeMaximo - 4);
      items[item.id] = rng.entero(minimo, item.puntajeMaximo);
    }
  }
  return { items, observaciones: rng.pick(OBSERVACIONES_CRUZADA) };
}

export function slugUa(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
