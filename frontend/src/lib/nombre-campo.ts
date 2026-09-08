import type { CampoFormulario, Presupuesto } from '@/data/types'
import { etiquetaCampoPresupuesto, PREFIJO_RUTA_PRESUPUESTO } from '@/lib/presupuesto'

const MAPA_CAMPOS: Record<string, string> = {
  nombre: 'Nombre',
  anioEdicion: 'Año de edición',
  esConsolidado: 'Es consolidado',
  esInterfacultad: 'Es interfacultad',
}

/**
 * Traduce la clave de un campo de sugerencia/observación a una etiqueta legible: campos
 * estructurales del proyecto, rutas de presupuesto (`presupuesto...`) y campos del formulario
 * dinámico (`datosFormulario.<id>` → "Formulario > <nombre>"). Reutilizado por la pestaña de
 * Sugerencias y por el Historial de trazabilidad.
 */
export function nombreCampoSugerencia(
  campo: string,
  camposFormulario: CampoFormulario[] = [],
  presupuesto: Presupuesto | null = null,
): string {
  if (MAPA_CAMPOS[campo]) return MAPA_CAMPOS[campo]
  if (campo.startsWith(PREFIJO_RUTA_PRESUPUESTO)) {
    return etiquetaCampoPresupuesto(presupuesto, campo.slice(PREFIJO_RUTA_PRESUPUESTO.length))
  }
  if (campo.startsWith('datosFormulario.')) {
    const campoId = campo.slice(16)
    const campoFormulario = camposFormulario.find(c => c.id === campoId)
    return `Formulario > ${campoFormulario?.nombre ?? campoId}`
  }
  return campo
}
