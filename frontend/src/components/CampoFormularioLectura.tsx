import type { ReactNode } from 'react'
import { TipoCampo } from '@/data/types'
import type { CampoFormulario } from '@/data/types'
import {
  EtiquetaCampoFormulario,
  TextoLargoColapsable,
  formatearValorCampoFormulario,
} from '@/components/CampoFormularioInput'
import { TablaCampoFormulario } from '@/components/TablaCampoFormulario'

interface Props {
  campo: CampoFormulario
  valor: unknown
  /** Envoltura opcional del valor formateado, p. ej. para el modo sugerencia del detalle de proyecto. */
  envolverValor?: (
    contenido: ReactNode,
    ctx: { campo: CampoFormulario; valorFormateado: string; anchoCompleto: boolean },
  ) => ReactNode
}

/**
 * Un campo de formulario de presentación en modo lectura: mismo render (tabla como tabla,
 * texto largo colapsable) en cualquier lugar de la UI donde se muestren datos ya presentados.
 */
export function CampoFormularioLectura({ campo, valor, envolverValor }: Props) {
  if (campo.tipo === TipoCampo.Seccion || campo.tipo === TipoCampo.Archivo) return null

  const valorFormateado = formatearValorCampoFormulario(campo, valor)
  const esTextoLargo = campo.tipo === TipoCampo.TextoLargo
  const esTabla = campo.tipo === TipoCampo.Tabla
  const anchoCompleto = esTextoLargo || esTabla

  const contenido = esTabla
    ? <TablaCampoFormulario campo={campo} valor={valor} />
    : esTextoLargo
      ? <TextoLargoColapsable texto={valorFormateado} />
      : valorFormateado

  const valorEnvuelto = envolverValor
    ? envolverValor(contenido, { campo, valorFormateado, anchoCompleto })
    : contenido

  return (
    <div className={anchoCompleto ? 'col-span-full space-y-1' : undefined}>
      {anchoCompleto ? (
        <p className="text-muted-foreground">
          <EtiquetaCampoFormulario campo={campo} />:
        </p>
      ) : (
        <>
          <span className="text-muted-foreground">
            <EtiquetaCampoFormulario campo={campo} />:
          </span>{' '}
        </>
      )}
      {valorEnvuelto}
    </div>
  )
}
