import { TipoCampo } from '@/data/types'
import type { CampoFormulario } from '@/data/types'

export interface SeccionFormulario {
  id: string
  nombre: string
  descripcion?: string
  campos: CampoFormulario[]
}

/**
 * Agrupa los campos (ya ordenados por `orden`) en secciones según los campos tipo `seccion`
 * que contenga el formulario. El primer elemento es siempre la sección implícita "Resumen"
 * con los campos previos a la primera sección declarada.
 */
export function agruparCamposEnSecciones(campos: CampoFormulario[]): SeccionFormulario[] {
  const secciones: SeccionFormulario[] = [{ id: 'resumen', nombre: 'Resumen', campos: [] }]

  for (const campo of campos) {
    if (campo.tipo === TipoCampo.Seccion) {
      secciones.push({ id: campo.id, nombre: campo.nombre, descripcion: campo.textoAyuda, campos: [] })
      continue
    }
    secciones[secciones.length - 1].campos.push(campo)
  }

  return secciones
}
