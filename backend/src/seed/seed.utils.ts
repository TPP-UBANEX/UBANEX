import * as crypto from 'crypto';
import {
  EstructuraTemplateCruzada,
  EstructuraTemplateInstitucional,
} from '../templates-evaluacion/estructura-template';
import { CampoFormulario, ColumnaTabla } from '../formularios/campo-formulario.interface';
import { Presupuesto } from '../proyectos/presupuesto.interface';
import { normalizarPresupuesto } from '../proyectos/presupuesto.util';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';
import { FUNDAMENTACIONES, OBSERVACIONES_CRUZADA, OBSERVACIONES_INST } from './seed.data';

/**
 * Copia los campos de una plantilla a una convocatoria regenerando los ids de
 * cada campo y columna (igual que hace la UI al elegir una plantilla): así las
 * respuestas de una convocatoria nunca se confunden con las de otra que partió
 * de la misma plantilla.
 */
export function clonarCamposConIdsNuevos(campos: CampoFormulario[]): CampoFormulario[] {
  const clonarColumna = (columna: ColumnaTabla): ColumnaTabla => ({ ...columna, id: crypto.randomUUID() });
  return campos.map((campo) => ({
    ...campo,
    id: crypto.randomUUID(),
    columnas: campo.columnas?.map(clonarColumna),
  }));
}

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

/**
 * Genera solo las partidas (con períodos AAAA-MM-DD dentro de la ejecución de la convocatoria,
 * que arranca el 1 de agosto de anioInicio) y deja que normalizarPresupuesto derive montos de
 * bienes, subtotales y monto total: un presupuesto de seed nunca puede quedar con sumas que no
 * cierran, porque pasa por el mismo cálculo que usa la API.
 */
export function generarPresupuesto(rng: Rng, anioInicio: number): Presupuesto {
  const escala = 1 + 0.1 * (anioInicio - 2023);
  const precioUnitarioConsumo = Math.round((2000 * escala) / 100) * 100;
  const precioUnitarioUso = Math.round((rng.entero(15_000, 60_000) * escala) / 100) * 100;

  const crudo: Presupuesto = {
    montoTotal: 0,
    rubros: [
      {
        tipo: TipoRubro.ViaticosYSeguros,
        subtotal: 0,
        partidas: [
          {
            tipoPersona: TipoPersona.Docente,
            descripcion: 'Viáticos para docentes',
            periodoInicio: `${anioInicio}-08-01`,
            periodoFin: `${anioInicio + 1}-02-28`,
            monto: Math.round((rng.entero(20_000, 60_000) * escala) / 1000) * 1000,
          },
          {
            tipoPersona: TipoPersona.Estudiante,
            descripcion: 'Viáticos para estudiantes',
            periodoInicio: `${anioInicio}-08-01`,
            periodoFin: `${anioInicio + 1}-02-28`,
            monto: Math.round((rng.entero(15_000, 45_000) * escala) / 1000) * 1000,
          },
        ],
      },
      {
        tipo: TipoRubro.BienesDeConsumo,
        subtotal: 0,
        partidas: [
          {
            descripcion: 'Materiales e insumos',
            cantidad: rng.entero(20, 120),
            precioUnitario: precioUnitarioConsumo,
            monto: 0,
          },
        ],
      },
      {
        tipo: TipoRubro.BienesDeUso,
        subtotal: 0,
        partidas: [
          {
            descripcion: 'Equipamiento',
            cantidad: rng.entero(1, 5),
            precioUnitario: precioUnitarioUso,
            monto: 0,
          },
        ],
      },
    ],
  };

  return normalizarPresupuesto(crudo);
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
