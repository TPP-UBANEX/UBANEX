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
  'esInsumo',
] as const;

export const LABELS_CAMPO_PARTIDA: Record<string, string> = {
  descripcion: 'Descripción',
  monto: 'Monto',
  cantidad: 'Cantidad',
  precioUnitario: 'Precio unitario',
  periodoInicio: 'Inicio del período',
  periodoFin: 'Fin del período',
  tipoPersona: 'Tipo de persona',
  esInsumo: 'Es insumo',
};

const FORMATO_RUTA_PARTIDA = /^rubros\[(\d+)\]\.partidas\[(\d+)\]\.([a-zA-Z]+)$/;
const FORMATO_RUTA_RUBRO = /^rubros\[(\d+)\]$/;

/**
 * Prefijo de las rutas de sugerencias sobre el presupuesto (ver sugerencias.service.ts), tal como
 * quedan persistidas en `sugerencia_cambio.campo`. Acompaña al nombre de la columna
 * `Edicion.presupuestoSolicitado`; las filas que quedaron con el prefijo viejo (`presupuesto.`) se
 * migraron en <epoch>-prefijo-ruta-presupuesto-solicitado.ts.
 */
export const PREFIJO_RUTA_PRESUPUESTO = 'presupuestoSolicitado.';

/**
 * Interpreta una ruta relativa a `presupuestoSolicitado.` (sin ese prefijo) como el campo de una
 * partida. Solo reconoce campos de la whitelist: `subtotal` y `montoTotal` quedan afuera porque son
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
 * Una ruta relativa a `presupuestoSolicitado.` (sin ese prefijo) que apunta a un rubro completo
 * (no a un campo de una partida) solo admite un comentario: sirve para pedir agregar o quitar
 * partidas.
 */
export function esRutaComentarioPresupuesto(presupuesto: Presupuesto | null, path: string): boolean {
  const match = FORMATO_RUTA_RUBRO.exec(path);
  if (!match) return false;
  const indice = Number(match[1]);
  return !!presupuesto?.rubros?.[indice];
}

/**
 * Etiqueta legible de una ruta relativa a `presupuestoSolicitado.` (sin ese prefijo), para mostrar
 * en la lista de sugerencias y en las notificaciones. Se degrada con gracia: si la partida
 * referenciada ya no tiene descripción cargada, omite las comillas; si la ruta no matchea ningún
 * patrón conocido, devuelve la ruta cruda como antes.
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
  if (b.esInsumo !== undefined && typeof b.esInsumo !== 'boolean') {
    throw new BadRequestException(`"${label}": la partida ${indice + 1} tiene un valor inválido en "es insumo"`);
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
      esInsumo: p.esInsumo === true,
    }));
    return { tipo, partidas, subtotal: redondear2(partidas.reduce((sum, p) => sum + p.monto, 0)) };
  });

  return { rubros, montoTotal: redondear2(rubros.reduce((sum, r) => sum + r.subtotal, 0)) };
}

/**
 * Describe, en texto legible, qué falta completar del presupuesto para poder enviar la edición:
 * los 3 rubros deben tener al menos una partida, cada partida debe tener descripción y monto > 0,
 * los viáticos deben tener período completo y dentro de la ejecución de la convocatoria (o, si
 * la convocatoria todavía no tiene esas fechas cargadas, no comenzar antes de hoy), y el total no
 * debe superar el tope de la convocatoria para proyectos consolidados/no consolidados (`esConsolidado`,
 * ver consolidacion.ts#esConsolidadoParaTope). Guardar el presupuesto (actualizarEdicion) ya
 * bloquea esto mismo antes; se repite acá porque una edición puede llegar excedida sin pasar por
 * ahí (se copia al crear una edición nueva, o baja el tope de una convocatoria ya en curso).
 */
export function presupuestoIncompletoParaEnvio(
  presupuesto: Presupuesto | null,
  convocatoria?: Pick<
    Convocatoria,
    'fechaInicioEjecucion' | 'fechaFinEjecucion' | 'topePresupuestoConsolidado' | 'topePresupuestoNoConsolidado'
  > | null,
  esConsolidado = false,
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

  const tope = topePresupuestoSolicitado(convocatoria, esConsolidado);
  const motivoTope = motivoTopeExcedido(presupuesto, tope, esConsolidado);
  if (motivoTope) motivos.push(motivoTope);

  return motivos;
}

/**
 * Tope por proyecto sobre el total del presupuesto solicitado (no el que se adjudica), según si
 * el proyecto es consolidado o no (ver consolidacion.ts#esConsolidadoParaTope). `null`/`0`/no
 * configurado = sin tope. Los campos `numeric` de Postgres llegan como string vía TypeORM.
 */
export function topePresupuestoSolicitado(
  convocatoria: Pick<Convocatoria, 'topePresupuestoConsolidado' | 'topePresupuestoNoConsolidado'> | null | undefined,
  esConsolidado: boolean,
): number | null {
  const bruto = esConsolidado
    ? convocatoria?.topePresupuestoConsolidado
    : convocatoria?.topePresupuestoNoConsolidado;
  const tope = Number(bruto ?? 0);
  return Number.isFinite(tope) && tope > 0 ? tope : null;
}

/** Mensaje si el total solicitado supera `tope`, o `null` si está dentro (o no hay tope). */
export function motivoTopeExcedido(
  presupuesto: Presupuesto | null,
  tope: number | null,
  esConsolidado: boolean,
): string | null {
  if (tope === null) return null;
  const total = Number(presupuesto?.montoTotal ?? 0);
  if (total <= tope) return null;
  const etiquetaTipo = esConsolidado ? 'consolidados' : 'no consolidados';
  return (
    `El total solicitado (${formatearMoneda(total)}) supera el tope de ${formatearMoneda(tope)} `
    + `para proyectos ${etiquetaTipo} de esta convocatoria`
  );
}

function formatearMoneda(valor: number): string {
  return `$${valor.toLocaleString('es-AR')}`;
}

/**
 * Presupuesto a adjudicar: el monto sobre el que se calcula la adjudicación propuesta (orden de
 * mérito, tope de la convocatoria, guarda manual del Rectorado), a diferencia del presupuesto
 * solicitado, que es lo que pide el docente.
 *
 *   presupuesto a adjudicar = presupuesto solicitado + extra por insumos + extra por PSE
 *
 * El extra por insumos es `porcentajeExtraInsumos`% del solicitado, y solo se aplica si al menos
 * `umbralInsumos`% del monto total solicitado corresponde a partidas de bienes marcadas como
 * insumo (`BienPresupuesto.esInsumo`; Viáticos y Seguros nunca cuenta). El extra por PSE es
 * `porcentajeExtraPse`% del solicitado, y solo se aplica si la evaluación institucional de la
 * edición marcó el proyecto como Práctica Social Educativa (`EvaluacionInstitucional.esPse`) —
 * deliberadamente por fuera de `categorias`, para que no sume puntaje además del extra de plata
 * (ver evaluaciones.service.ts#calcularPuntaje).
 */
export interface PresupuestoAAdjudicar {
  solicitado: number;
  montoInsumos: number;
  porcentajeInsumos: number;
  aplicaExtraInsumos: boolean;
  extraInsumos: number;
  esPse: boolean;
  extraPse: number;
  total: number;
}

/** Porcentajes/umbral por default si la convocatoria no trae `parametros` (o llega `null`/`undefined`). */
const PORCENTAJE_EXTRA_INSUMOS_DEFAULT = 35;
const UMBRAL_INSUMOS_DEFAULT = 40;
const PORCENTAJE_EXTRA_PSE_DEFAULT = 15;

export function calcularPresupuestoAAdjudicar(
  presupuestoSolicitado: Presupuesto | null | undefined,
  parametros?: Pick<
    Convocatoria,
    'porcentajeExtraInsumos' | 'umbralInsumos' | 'porcentajeExtraPse'
  > | null,
  esPse = false,
): PresupuestoAAdjudicar {
  const solicitado = Number(presupuestoSolicitado?.montoTotal ?? 0);
  // Los `numeric` de Postgres llegan como string vía TypeORM.
  const porcentajeExtraInsumos = Number(parametros?.porcentajeExtraInsumos ?? PORCENTAJE_EXTRA_INSUMOS_DEFAULT);
  const umbralInsumos = Number(parametros?.umbralInsumos ?? UMBRAL_INSUMOS_DEFAULT);
  const porcentajeExtraPse = Number(parametros?.porcentajeExtraPse ?? PORCENTAJE_EXTRA_PSE_DEFAULT);

  const montoInsumos = redondear2(
    (presupuestoSolicitado?.rubros ?? [])
      .filter((r) => r.tipo !== TipoRubro.ViaticosYSeguros)
      .flatMap((r) => r.partidas as BienPresupuesto[])
      .filter((p) => p.esInsumo === true)
      .reduce((sum, p) => sum + Number(p.monto ?? 0), 0),
  );
  const porcentajeInsumos = solicitado > 0 ? (montoInsumos / solicitado) * 100 : 0;
  // Tolerancia chica contra errores de punto flotante en el borde exacto del umbral.
  const aplicaExtraInsumos = solicitado > 0 && porcentajeInsumos >= umbralInsumos - 1e-9;
  const extraInsumos = aplicaExtraInsumos ? redondear2((solicitado * porcentajeExtraInsumos) / 100) : 0;
  const extraPse = esPse ? redondear2((solicitado * porcentajeExtraPse) / 100) : 0;

  return {
    solicitado,
    montoInsumos,
    porcentajeInsumos,
    aplicaExtraInsumos,
    extraInsumos,
    esPse,
    extraPse,
    total: redondear2(solicitado + extraInsumos + extraPse),
  };
}
