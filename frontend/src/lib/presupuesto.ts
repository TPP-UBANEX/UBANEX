import {
  BienPresupuesto, Presupuesto, RubroPresupuesto, TipoRubro, ViaticoPresupuesto,
} from '@/data/types'

/**
 * Espejo de backend/src/proyectos/presupuesto.util.ts. Mantiene el orden de los 3 rubros fijos
 * y recalcula subtotales y monto total desde las partidas, para que el cliente nunca pueda
 * mostrar (ni enviar) un total que no coincide con la suma real de las partidas.
 */
const ORDEN_RUBROS: TipoRubro[] = [
  TipoRubro.ViaticosYSeguros,
  TipoRubro.BienesDeConsumo,
  TipoRubro.BienesDeUso,
]

export const LABELS_RUBRO: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
}

export const MAX_LONGITUD_DESCRIPCION_PARTIDA = 500

/** Campos de una partida sobre los que se puede sugerir un cambio (espejo del backend). */
export const CAMPOS_PARTIDA_PERMITIDOS = [
  'descripcion', 'monto', 'cantidad', 'precioUnitario', 'periodoInicio', 'periodoFin', 'tipoPersona',
] as const

export const LABELS_CAMPO_PARTIDA: Record<string, string> = {
  descripcion: 'Descripción',
  monto: 'Monto',
  cantidad: 'Cantidad',
  precioUnitario: 'Precio unitario',
  periodoInicio: 'Inicio del período',
  periodoFin: 'Fin del período',
  tipoPersona: 'Tipo de persona',
}

const FORMATO_RUTA_PARTIDA = /^rubros\[(\d+)\]\.partidas\[(\d+)\]\.([a-zA-Z]+)$/
const FORMATO_RUTA_RUBRO = /^rubros\[(\d+)\]$/

/**
 * Espejo de backend/src/proyectos/presupuesto.util.ts#parsearRutaPartida. Interpreta una ruta
 * relativa a `presupuesto.` (sin ese prefijo) como el campo de una partida.
 */
export function parsearRutaPartida(
  path: string,
): { rubroIndice: number; partidaIndice: number; campo: string } | null {
  const match = FORMATO_RUTA_PARTIDA.exec(path)
  if (!match) return null
  const [, rubroIndice, partidaIndice, campo] = match
  if (!(CAMPOS_PARTIDA_PERMITIDOS as readonly string[]).includes(campo)) return null
  return { rubroIndice: Number(rubroIndice), partidaIndice: Number(partidaIndice), campo }
}

/**
 * Espejo de backend/src/proyectos/presupuesto.util.ts#etiquetaCampoPresupuesto. Etiqueta legible
 * de una ruta relativa a `presupuesto.` (sin ese prefijo), para mostrar en la lista de sugerencias
 * y en el modal de "Sugerir cambio".
 */
export function etiquetaCampoPresupuesto(presupuesto: Presupuesto | null | undefined, path: string): string {
  const rutaPartida = parsearRutaPartida(path)
  if (rutaPartida) {
    const rubro = presupuesto?.rubros?.[rutaPartida.rubroIndice]
    const partida = rubro?.partidas?.[rutaPartida.partidaIndice]
    const label = rubro ? LABELS_RUBRO[rubro.tipo] : `Rubro ${rutaPartida.rubroIndice + 1}`
    const campoLabel = LABELS_CAMPO_PARTIDA[rutaPartida.campo] ?? rutaPartida.campo
    const descripcion = partida?.descripcion?.trim()
    const partidaLabel = descripcion
      ? `partida ${rutaPartida.partidaIndice + 1} "${descripcion}"`
      : `partida ${rutaPartida.partidaIndice + 1}`
    return `Presupuesto > ${label} > ${partidaLabel} · ${campoLabel}`
  }

  const matchRubro = FORMATO_RUTA_RUBRO.exec(path)
  if (matchRubro) {
    const rubro = presupuesto?.rubros?.[Number(matchRubro[1])]
    const label = rubro ? LABELS_RUBRO[rubro.tipo] : `Rubro ${Number(matchRubro[1]) + 1}`
    return `Presupuesto > ${label}`
  }

  return `Presupuesto > ${path}`
}

function redondear2(n: number): number {
  return Math.round(n * 100) / 100
}

export function normalizarPresupuesto(presupuesto: Presupuesto): Presupuesto {
  const porTipo = new Map(presupuesto.rubros.map(r => [r.tipo, r]))

  const rubros: RubroPresupuesto[] = ORDEN_RUBROS.map((tipo) => {
    const rubro = porTipo.get(tipo)
    if (!rubro) return { tipo, subtotal: 0, partidas: [] }

    if (tipo === TipoRubro.ViaticosYSeguros) {
      const partidas = (rubro.partidas as ViaticoPresupuesto[]).map(p => ({
        ...p,
        monto: redondear2(Number(p.monto) || 0),
      }))
      return { tipo, partidas, subtotal: redondear2(partidas.reduce((sum, p) => sum + p.monto, 0)) }
    }

    const partidas = (rubro.partidas as BienPresupuesto[]).map((p) => {
      const cantidad = Number(p.cantidad) || 0
      const precioUnitario = Number(p.precioUnitario) || 0
      return { ...p, cantidad, precioUnitario, monto: redondear2(cantidad * precioUnitario) }
    })
    return { tipo, partidas, subtotal: redondear2(partidas.reduce((sum, p) => sum + p.monto, 0)) }
  })

  return { rubros, montoTotal: redondear2(rubros.reduce((sum, r) => sum + r.subtotal, 0)) }
}

/**
 * Espejo de backend/src/proyectos/presupuesto.util.ts#presupuestoIncompletoParaEnvio.
 * Describe qué falta completar del presupuesto para poder enviar la edición.
 */
export function presupuestoIncompletoParaEnvio(
  presupuesto: Presupuesto | null | undefined,
  convocatoria?: { fechaInicioEjecucion: string | null; fechaFinEjecucion: string | null } | null,
): string[] {
  if (!presupuesto || !presupuesto.rubros?.some(r => r.partidas?.length > 0)) {
    return ['El presupuesto está vacío']
  }

  const motivos: string[] = []
  const fechaInicioEjecucion = convocatoria?.fechaInicioEjecucion ?? null
  const fechaFinEjecucion = convocatoria?.fechaFinEjecucion ?? null
  const hoy = new Date().toISOString().slice(0, 10)

  for (const rubro of presupuesto.rubros) {
    const label = LABELS_RUBRO[rubro.tipo]
    if (!rubro.partidas || rubro.partidas.length === 0) {
      motivos.push(`"${label}" no tiene ninguna partida`)
      continue
    }

    rubro.partidas.forEach((partida, indice) => {
      if (!partida.descripcion || partida.descripcion.trim() === '') {
        motivos.push(`"${label}": a la partida ${indice + 1} le falta la descripción`)
      }
      if (!(partida.monto > 0)) {
        motivos.push(`"${label}": la partida ${indice + 1} tiene un monto de $0`)
      }
      if (rubro.tipo === TipoRubro.ViaticosYSeguros) {
        const v = partida as ViaticoPresupuesto
        if (!v.periodoInicio || !v.periodoFin) {
          motivos.push(`"${label}": a la partida ${indice + 1} le falta el período`)
        } else if (fechaInicioEjecucion && fechaFinEjecucion) {
          if (v.periodoInicio < fechaInicioEjecucion || v.periodoFin > fechaFinEjecucion) {
            motivos.push(
              `"${label}": el período de la partida ${indice + 1} está fuera del período de `
              + 'ejecución de la convocatoria',
            )
          }
        } else if (v.periodoInicio < hoy) {
          motivos.push(`"${label}": el período de la partida ${indice + 1} no puede comenzar antes de hoy`)
        }
      }
    })
  }

  return motivos
}

/** Convierte un input numérico crudo a un número finito y no negativo, o 0 si es inválido. */
export function numeroNoNegativo(valor: string): number {
  const num = Number(valor)
  if (!Number.isFinite(num) || num < 0) return 0
  return num
}

export function formatearMoneda(valor: number | null | undefined): string {
  const num = Number(valor)
  if (!Number.isFinite(num)) return '$0'
  return `$${num.toLocaleString('es-AR')}`
}
