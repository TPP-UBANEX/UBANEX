import { BadRequestException } from '@nestjs/common';
import {
  BienPresupuesto, Presupuesto, RubroPresupuesto, ViaticoPresupuesto,
} from './presupuesto.interface';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { esFechaValida } from '../formularios/campo-formulario.util';
import {
  MAX_LONGITUD_DESCRIPCION_PARTIDA, MAX_PARTIDAS_POR_RUBRO, MONTO_MAXIMO_PARTIDA,
} from '../common/constantes';

const ORDEN_RUBROS: TipoRubro[] = [
  TipoRubro.ViaticosYSeguros,
  TipoRubro.BienesDeConsumo,
  TipoRubro.BienesDeUso,
];

export const LABELS_RUBRO: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
};

/** Campos de una partida sobre los que se puede sugerir un cambio (ver sugerencias.service.ts). */
export const CAMPOS_PARTIDA_PERMITIDOS = [
  'descripcion', 'monto', 'cantidad', 'precioUnitario', 'periodoInicio', 'periodoFin', 'tipoPersona',
] as const;

export const LABELS_CAMPO_PARTIDA: Record<string, string> = {
  descripcion: 'Descripción',
  monto: 'Monto',
  cantidad: 'Cantidad',
  precioUnitario: 'Precio unitario',
  periodoInicio: 'Inicio del período',
  periodoFin: 'Fin del período',
  tipoPersona: 'Tipo de persona',
};

const FORMATO_RUTA_PARTIDA = /^rubros\[(\d+)\]\.partidas\[(\d+)\]\.([a-zA-Z]+)$/;
const FORMATO_RUTA_RUBRO = /^rubros\[(\d+)\]$/;

/**
 * Interpreta una ruta relativa a `presupuesto.` (sin ese prefijo) como el campo de una partida.
 * Solo reconoce campos de la whitelist: `subtotal` y `montoTotal` quedan afuera porque son
 * derivados y se recalculan al aplicar el cambio.
 */
export function parsearRutaPartida(
  path: string,
): { rubroIndice: number; partidaIndice: number; campo: string } | null {
  const match = FORMATO_RUTA_PARTIDA.exec(path);
  if (!match) return null;
  const [, rubroIndice, partidaIndice, campo] = match;
  if (!(CAMPOS_PARTIDA_PERMITIDOS as readonly string[]).includes(campo)) return null;
  return { rubroIndice: Number(rubroIndice), partidaIndice: Number(partidaIndice), campo };
}

/**
 * Una ruta relativa a `presupuesto.` (sin ese prefijo) que apunta a un rubro completo (no a un
 * campo de una partida) solo admite un comentario: sirve para pedir agregar o quitar partidas.
 */
export function esRutaComentarioPresupuesto(presupuesto: Presupuesto | null, path: string): boolean {
  if (path === '') return true;
  const match = FORMATO_RUTA_RUBRO.exec(path);
  if (!match) return false;
  const indice = Number(match[1]);
  return !!presupuesto?.rubros?.[indice];
}

/**
 * Etiqueta legible de una ruta relativa a `presupuesto.` (sin ese prefijo), para mostrar en la
 * lista de sugerencias y en las notificaciones. Se degrada con gracia: si la partida referenciada
 * ya no tiene descripción cargada, omite las comillas; si la ruta no matchea ningún patrón
 * conocido, devuelve la ruta cruda como antes.
 */
export function etiquetaCampoPresupuesto(presupuesto: Presupuesto | null, path: string): string {
  const rutaPartida = parsearRutaPartida(path);
  if (rutaPartida) {
    const rubro = presupuesto?.rubros?.[rutaPartida.rubroIndice];
    const partida = rubro?.partidas?.[rutaPartida.partidaIndice];
    const label = rubro ? LABELS_RUBRO[rubro.tipo] : `Rubro ${rutaPartida.rubroIndice + 1}`;
    const campoLabel = LABELS_CAMPO_PARTIDA[rutaPartida.campo] ?? rutaPartida.campo;
    const descripcion = partida?.descripcion?.trim();
    const partidaLabel = descripcion
      ? `partida ${rutaPartida.partidaIndice + 1} "${descripcion}"`
      : `partida ${rutaPartida.partidaIndice + 1}`;
    return `Presupuesto > ${label} > ${partidaLabel} · ${campoLabel}`;
  }

  const matchRubro = FORMATO_RUTA_RUBRO.exec(path);
  if (matchRubro) {
    const rubro = presupuesto?.rubros?.[Number(matchRubro[1])];
    const label = rubro ? LABELS_RUBRO[rubro.tipo] : `Rubro ${Number(matchRubro[1]) + 1}`;
    return `Presupuesto > ${label}`;
  }

  if (path === '') return 'Presupuesto';

  return `Presupuesto > ${path}`;
}

function esMontoValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= MONTO_MAXIMO_PARTIDA;
}

function validarDescripcion(label: string, indice: number, descripcion: unknown): void {
  if (typeof descripcion !== 'string') {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} tiene una descripción inválida`);
  }
  if (descripcion.length > MAX_LONGITUD_DESCRIPCION_PARTIDA) {
    throw new BadRequestException(
      `"${label}": la descripción de la partida ${indice + 1} no puede superar los ${MAX_LONGITUD_DESCRIPCION_PARTIDA} caracteres`,
    );
  }
}

function validarPeriodo(label: string, indice: number, inicio: unknown, fin: unknown): void {
  if (typeof inicio !== 'string' || typeof fin !== 'string') {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} tiene un período inválido`);
  }
  if (inicio !== '' && !esFechaValida(inicio)) {
    throw new BadRequestException(
      `"${label}": la partida ${indice + 1} tiene una fecha de inicio inválida (AAAA-MM-DD)`,
    );
  }
  if (fin !== '' && !esFechaValida(fin)) {
    throw new BadRequestException(
      `"${label}": la partida ${indice + 1} tiene una fecha de fin inválida (AAAA-MM-DD)`,
    );
  }
  if (inicio !== '' && fin !== '' && inicio > fin) {
    throw new BadRequestException(
      `"${label}": en la partida ${indice + 1} el inicio del período debe ser anterior o igual al fin`,
    );
  }
}

function validarViatico(label: string, partida: unknown, indice: number): void {
  if (typeof partida !== 'object' || partida === null || Array.isArray(partida)) {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} es inválida`);
  }
  const v = partida as Partial<ViaticoPresupuesto>;
  if (!Object.values(TipoPersona).includes(v.tipoPersona as TipoPersona)) {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} tiene un tipo de persona inválido`);
  }
  validarDescripcion(label, indice, v.descripcion);
  if (!esMontoValido(v.monto)) {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} tiene un monto inválido`);
  }
  validarPeriodo(label, indice, v.periodoInicio, v.periodoFin);
}

function validarBien(label: string, partida: unknown, indice: number): void {
  if (typeof partida !== 'object' || partida === null || Array.isArray(partida)) {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} es inválida`);
  }
  const b = partida as Partial<BienPresupuesto>;
  validarDescripcion(label, indice, b.descripcion);
  if (typeof b.cantidad !== 'number' || !Number.isInteger(b.cantidad) || b.cantidad < 1) {
    throw new BadRequestException(
      `"${label}": la partida ${indice + 1} debe tener una cantidad entera mayor o igual a 1`,
    );
  }
  if (!esMontoValido(b.precioUnitario)) {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} tiene un precio unitario inválido`);
  }
}

/**
 * Valida la forma del presupuesto: los 3 rubros fijos sin duplicados, partidas del tipo que
 * corresponde a cada rubro, montos finitos y no negativos, y períodos con inicio <= fin.
 * No exige montos > 0 ni períodos completos: eso se exige recién al enviar la edición
 * (ver presupuestoIncompletoParaEnvio), para permitir guardar un borrador a medio cargar.
 */
export function validarPresupuesto(presupuesto: unknown): asserts presupuesto is Presupuesto {
  if (typeof presupuesto !== 'object' || presupuesto === null || Array.isArray(presupuesto)) {
    throw new BadRequestException('El presupuesto tiene un formato inválido');
  }
  const p = presupuesto as Partial<Presupuesto>;
  if (!Array.isArray(p.rubros)) {
    throw new BadRequestException('El presupuesto debe tener una lista de rubros');
  }

  const tipos = p.rubros.map((r) => (r as Partial<RubroPresupuesto>)?.tipo);
  const tiposUnicos = new Set(tipos);
  const tieneLosTresRubros = p.rubros.length === ORDEN_RUBROS.length
    && tiposUnicos.size === ORDEN_RUBROS.length
    && ORDEN_RUBROS.every((tipo) => tiposUnicos.has(tipo));
  if (!tieneLosTresRubros) {
    throw new BadRequestException(
      'El presupuesto debe tener exactamente los rubros Viáticos y Seguros, Bienes de Consumo y '
      + 'Bienes de Uso, sin duplicados',
    );
  }

  for (const rubro of p.rubros) {
    const r = rubro as Partial<RubroPresupuesto>;
    const label = LABELS_RUBRO[r.tipo as TipoRubro];
    if (!Array.isArray(r.partidas)) {
      throw new BadRequestException(`"${label}" debe tener una lista de partidas`);
    }
    if (r.partidas.length > MAX_PARTIDAS_POR_RUBRO) {
      throw new BadRequestException(`"${label}" admite como máximo ${MAX_PARTIDAS_POR_RUBRO} partidas`);
    }
    r.partidas.forEach((partida, indice) => {
      if (r.tipo === TipoRubro.ViaticosYSeguros) {
        validarViatico(label, partida, indice);
      } else {
        validarBien(label, partida, indice);
      }
    });
  }
}

function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Recalcula montos, subtotales y monto total desde las partidas: el cliente nunca vuelve
 * a poder mentir un total. Asume un presupuesto ya validado por validarPresupuesto.
 */
export function normalizarPresupuesto(presupuesto: Presupuesto): Presupuesto {
  const porTipo = new Map(presupuesto.rubros.map((r) => [r.tipo, r]));

  const rubros: RubroPresupuesto[] = ORDEN_RUBROS.map((tipo) => {
    const rubro = porTipo.get(tipo)!;
    if (tipo === TipoRubro.ViaticosYSeguros) {
      const partidas = (rubro.partidas as ViaticoPresupuesto[]).map((p) => ({
        ...p,
        descripcion: p.descripcion.trim(),
        monto: redondear2(p.monto),
      }));
      return { tipo, partidas, subtotal: redondear2(partidas.reduce((sum, p) => sum + p.monto, 0)) };
    }
    const partidas = (rubro.partidas as BienPresupuesto[]).map((p) => ({
      ...p,
      descripcion: p.descripcion.trim(),
      monto: redondear2(p.cantidad * p.precioUnitario),
    }));
    return { tipo, partidas, subtotal: redondear2(partidas.reduce((sum, p) => sum + p.monto, 0)) };
  });

  return { rubros, montoTotal: redondear2(rubros.reduce((sum, r) => sum + r.subtotal, 0)) };
}

/**
 * Describe, en texto legible, qué falta completar del presupuesto para poder enviar la edición:
 * los 3 rubros deben tener al menos una partida, cada partida debe tener descripción y monto > 0,
 * y los viáticos deben tener período completo y dentro de la ejecución de la convocatoria (o, si
 * la convocatoria todavía no tiene esas fechas cargadas, no comenzar antes de hoy).
 */
export function presupuestoIncompletoParaEnvio(
  presupuesto: Presupuesto | null,
  convocatoria?: Pick<Convocatoria, 'fechaInicioEjecucion' | 'fechaFinEjecucion'> | null,
): string[] {
  if (!presupuesto || !presupuesto.rubros?.some((r) => r.partidas?.length > 0)) {
    return ['El presupuesto está vacío'];
  }

  const motivos: string[] = [];
  const fechaInicioEjecucion = convocatoria?.fechaInicioEjecucion ?? null;
  const fechaFinEjecucion = convocatoria?.fechaFinEjecucion ?? null;
  const hoy = new Date().toISOString().slice(0, 10);

  for (const rubro of presupuesto.rubros) {
    const label = LABELS_RUBRO[rubro.tipo];
    if (!rubro.partidas || rubro.partidas.length === 0) {
      motivos.push(`"${label}" no tiene ninguna partida`);
      continue;
    }

    rubro.partidas.forEach((partida, indice) => {
      if (!partida.descripcion || partida.descripcion.trim() === '') {
        motivos.push(`"${label}": a la partida ${indice + 1} le falta la descripción`);
      }
      if (!(partida.monto > 0)) {
        motivos.push(`"${label}": la partida ${indice + 1} tiene un monto de $0`);
      }
      if (rubro.tipo === TipoRubro.ViaticosYSeguros) {
        const v = partida as ViaticoPresupuesto;
        if (!v.periodoInicio || !v.periodoFin) {
          motivos.push(`"${label}": a la partida ${indice + 1} le falta el período`);
        } else if (fechaInicioEjecucion && fechaFinEjecucion) {
          if (v.periodoInicio < fechaInicioEjecucion || v.periodoFin > fechaFinEjecucion) {
            motivos.push(
              `"${label}": el período de la partida ${indice + 1} está fuera del período de `
              + 'ejecución de la convocatoria',
            );
          }
        } else if (v.periodoInicio < hoy) {
          motivos.push(`"${label}": el período de la partida ${indice + 1} no puede comenzar antes de hoy`);
        }
      }
    });
  }

  return motivos;
}
