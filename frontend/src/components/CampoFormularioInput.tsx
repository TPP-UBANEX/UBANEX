import { useLayoutEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAX_LONGITUD_POR_TIPO, TipoCampo } from '@/data/types'
import type { CampoFormulario, ColumnaTabla, ValorGeolocalizacion, ValorUsuario } from '@/data/types'
import { LocalidadAutocomplete } from '@/components/LocalidadAutocomplete'
import { UsuarioAutocomplete } from '@/components/UsuarioAutocomplete'
import { TablaCampoFormulario } from '@/components/TablaCampoFormulario'

export function EtiquetaCampoFormulario({ campo }: { campo: Pick<CampoFormulario, 'nombre' | 'esObligatorio'> }) {
  return (
    <>
      {campo.nombre}
      {campo.esObligatorio && <span className="text-destructive"> *</span>}
    </>
  )
}

function filaVacia(columnas: ColumnaTabla[], fila: Record<string, unknown>): boolean {
  return columnas.every(columna => campoFormularioVacio(columna, fila[columna.id]))
}

export function campoFormularioVacio(campo: CampoFormulario | ColumnaTabla, valor: unknown): boolean {
  if (valor == null) return true
  if (campo.tipo === TipoCampo.Checkbox) return !Array.isArray(valor) || valor.length === 0
  if (campo.tipo === TipoCampo.Geolocalizacion || campo.tipo === TipoCampo.Usuario) {
    const nombre = (valor as Partial<ValorGeolocalizacion | ValorUsuario>)?.nombre
    return typeof nombre !== 'string' || nombre.trim() === ''
  }
  if (campo.tipo === TipoCampo.Tabla) {
    const columnas = (campo as CampoFormulario).columnas ?? []
    return !Array.isArray(valor) || valor.length === 0
      || valor.every(fila => filaVacia(columnas, (fila ?? {}) as Record<string, unknown>))
  }
  if (typeof valor === 'string') return valor.trim() === ''
  return false
}

/** Pasa una fecha ISO (AAAA-MM-DD) a dd/mm/aaaa sin usar Date, que la interpretaria como UTC y correria el dia. */
export function formatearFechaISO(valor: string): string {
  const [anio, mes, dia] = valor.split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor
}

export function formatearValorCampoFormulario(campo: CampoFormulario | ColumnaTabla, valor: unknown): string {
  if (campoFormularioVacio(campo, valor)) return '-'
  if (campo.tipo === TipoCampo.Booleano) return valor === true ? 'Sí' : 'No'
  if (campo.tipo === TipoCampo.Checkbox) return (valor as string[]).join(', ')
  if (campo.tipo === TipoCampo.Fecha) return formatearFechaISO(String(valor))
  if (campo.tipo === TipoCampo.Geolocalizacion) return (valor as ValorGeolocalizacion).nombre
  if (campo.tipo === TipoCampo.Usuario) {
    const v = valor as ValorUsuario
    return v.email ? `${v.nombre} (${v.email})` : v.nombre
  }
  if (campo.tipo === TipoCampo.Tabla) {
    const columnas = (campo as CampoFormulario).columnas ?? []
    const filas = (valor as Record<string, unknown>[]).filter(fila => !filaVacia(columnas, fila ?? {}))
    return filas
      .map(fila => columnas.map(c => `${c.nombre}: ${formatearValorCampoFormulario(c, fila[c.id])}`).join(' · '))
      .join('\n')
  }
  return String(valor)
}

/** Un valor geo/usuario viaja serializado; si no es JSON válido se trata como texto libre. */
export function parsearValorObjetoSerializado(valor: string): ValorGeolocalizacion | ValorUsuario | null {
  if (!valor.trim()) return null
  try {
    const parsed = JSON.parse(valor)
    if (parsed && typeof parsed === 'object' && typeof parsed.nombre === 'string') return parsed
  } catch {
    // no era JSON: se interpreta como texto libre
  }
  return { nombre: valor }
}

/** Des-serializa un valor tal como viaja en una sugerencia (columna text) y lo formatea legible. */
export function formatearValorSerializado(campo: CampoFormulario, valor: string): string {
  if (campo.tipo === TipoCampo.Booleano) {
    return formatearValorCampoFormulario(campo, valor === 'true')
  }
  if (campo.tipo === TipoCampo.Checkbox || campo.tipo === TipoCampo.Tabla) {
    try {
      return formatearValorCampoFormulario(campo, JSON.parse(valor))
    } catch {
      return valor
    }
  }
  if (campo.tipo === TipoCampo.Geolocalizacion || campo.tipo === TipoCampo.Usuario) {
    return formatearValorCampoFormulario(campo, parsearValorObjetoSerializado(valor))
  }
  return formatearValorCampoFormulario(campo, valor)
}

/** El subconjunto de un campo/columna necesario para resolver qué control de entrada mostrar. */
type CampoControlable = Pick<CampoFormulario, 'tipo' | 'opciones' | 'minimo' | 'maximo' | 'admiteDecimales' | 'rolesUsuario'>

interface ControlProps {
  campo: CampoControlable
  valor: unknown
  onChange: (valor: unknown) => void
  /** Uso dentro de una celda de tabla: controles más chicos, sin contador ni leyenda de rango. */
  compacto?: boolean
}

/** El control de entrada correspondiente a un tipo de campo, sin etiqueta ni texto de ayuda. */
export function ControlCampoFormulario({ campo, valor, onChange, compacto = false }: ControlProps) {
  return (
    <>
      {campo.tipo === TipoCampo.Texto && (
        <Input
          value={typeof valor === 'string' ? valor : ''}
          maxLength={MAX_LONGITUD_POR_TIPO[TipoCampo.Texto]}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {campo.tipo === TipoCampo.TextoLargo && (
        <>
          <Textarea
            rows={compacto ? 2 : 10}
            value={typeof valor === 'string' ? valor : ''}
            maxLength={MAX_LONGITUD_POR_TIPO[TipoCampo.TextoLargo]}
            onChange={e => onChange(e.target.value)}
          />
          {!compacto && (
            <p className="text-xs text-muted-foreground text-right">
              {(typeof valor === 'string' ? valor.length : 0).toLocaleString('es-AR')} / {MAX_LONGITUD_POR_TIPO[TipoCampo.TextoLargo]!.toLocaleString('es-AR')}
            </p>
          )}
        </>
      )}

      {campo.tipo === TipoCampo.Numero && (
        <>
          <Input
            type="number"
            value={typeof valor === 'string' ? valor : ''}
            min={campo.minimo}
            max={campo.maximo}
            step={campo.admiteDecimales ? 'any' : '1'}
            onChange={e => onChange(e.target.value)}
          />
          {!compacto && (campo.minimo !== undefined || campo.maximo !== undefined) && (
            <p className="text-xs text-muted-foreground">
              {campo.minimo !== undefined && campo.maximo !== undefined
                ? `Entre ${campo.minimo} y ${campo.maximo}`
                : campo.minimo !== undefined
                  ? `Mayor o igual a ${campo.minimo}`
                  : `Menor o igual a ${campo.maximo}`}
            </p>
          )}
        </>
      )}

      {campo.tipo === TipoCampo.Fecha && (
        <Input
          type="date"
          value={typeof valor === 'string' ? valor : ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {campo.tipo === TipoCampo.Geolocalizacion && (
        <LocalidadAutocomplete
          value={valor as ValorGeolocalizacion | null}
          onChange={onChange}
        />
      )}

      {campo.tipo === TipoCampo.Usuario && (
        <UsuarioAutocomplete
          value={valor as ValorUsuario | null}
          roles={campo.rolesUsuario}
          onChange={onChange}
        />
      )}

      {campo.tipo === TipoCampo.Booleano && (
        <div className="flex gap-2">
          <Button type="button" variant={valor === true ? 'default' : 'outline'} size="sm" onClick={() => onChange(true)}>Sí</Button>
          <Button type="button" variant={valor === false ? 'default' : 'outline'} size="sm" onClick={() => onChange(false)}>No</Button>
        </div>
      )}

      {campo.tipo === TipoCampo.Select && (
        <Select value={typeof valor === 'string' ? valor : ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            {(campo.opciones ?? []).map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {campo.tipo === TipoCampo.Checkbox && (
        <div className="space-y-1">
          {(campo.opciones ?? []).map(o => {
            const seleccionadas = Array.isArray(valor) ? valor as string[] : []
            const checked = seleccionadas.includes(o)
            return (
              <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={checked}
                  onChange={e => {
                    onChange(
                      e.target.checked
                        ? [...seleccionadas, o]
                        : seleccionadas.filter(v => v !== o),
                    )
                  }}
                />
                {o}
              </label>
            )
          })}
        </div>
      )}
    </>
  )
}

interface Props {
  campo: CampoFormulario
  valor: unknown
  onChange: (valor: unknown) => void
}

export function CampoFormularioInput({ campo, valor, onChange }: Props) {
  if (campo.tipo === TipoCampo.Archivo || campo.tipo === TipoCampo.Seccion) return null

  const faltaCompletar = campo.esObligatorio && campoFormularioVacio(campo, valor)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        <EtiquetaCampoFormulario campo={campo} />
      </p>
      {campo.textoAyuda && (
        <p className="text-xs text-muted-foreground">{campo.textoAyuda}</p>
      )}

      {campo.tipo === TipoCampo.Tabla ? (
        <TablaCampoFormulario campo={campo} valor={valor} onChange={onChange} />
      ) : (
        <ControlCampoFormulario campo={campo} valor={valor} onChange={onChange} />
      )}

      {faltaCompletar && (
        <p className="text-xs text-muted-foreground">Falta completar</p>
      )}
    </div>
  )
}

/**
 * Espejo de backend/src/formularios/campo-formulario.util.ts#camposIncompletosParaEnvio.
 * Describe, en texto legible, qué falta completar del formulario para poder enviar la edición.
 */
export function camposIncompletosParaEnvio(
  campos: CampoFormulario[],
  datos: Record<string, unknown>,
): string[] {
  const motivos: string[] = []

  for (const campo of campos) {
    if (campo.tipo === TipoCampo.Seccion) continue
    const valor = datos[campo.id]

    if (campo.tipo === TipoCampo.Tabla) {
      const columnas = campo.columnas ?? []
      const filas = (Array.isArray(valor) ? valor : [])
        .map(fila => (fila ?? {}) as Record<string, unknown>)
        .filter(fila => !filaVacia(columnas, fila))

      if (campo.esObligatorio && filas.length === 0) {
        motivos.push(
          campo.filasMinimas && campo.filasMinimas > 1
            ? `"${campo.nombre}" debe tener al menos ${campo.filasMinimas} filas`
            : `"${campo.nombre}" debe tener al menos una fila`,
        )
        continue
      }
      if (
        campo.filasMinimas !== undefined
        && (campo.esObligatorio || filas.length > 0)
        && filas.length < campo.filasMinimas
      ) {
        motivos.push(`"${campo.nombre}" debe tener al menos ${campo.filasMinimas} filas`)
      }
      filas.forEach((fila, index) => {
        columnas
          .filter(columna => columna.esObligatorio && campoFormularioVacio(columna, fila[columna.id]))
          .forEach(columna => {
            motivos.push(`"${campo.nombre}": a la fila ${index + 1} le falta "${columna.nombre}"`)
          })
      })
      continue
    }

    if (campo.esObligatorio && campoFormularioVacio(campo, valor)) {
      motivos.push(campo.nombre)
    }
  }

  return motivos
}

/** Muestra un texto largo respetando saltos de línea, truncado a 5 líneas con "Ver más". */
export function TextoLargoColapsable({ texto }: { texto: string }) {
  const [expandido, setExpandido] = useState(false)
  const [desborda, setDesborda] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setDesborda(el.scrollHeight > el.clientHeight + 1)
  }, [texto, expandido])

  return (
    <div className="w-full min-w-0">
      <p
        ref={ref}
        className={`whitespace-pre-wrap break-words ${expandido ? '' : 'line-clamp-5'}`}
      >
        {texto}
      </p>
      {(desborda || expandido) && (
        <button
          type="button"
          className="text-xs text-primary hover:underline mt-1"
          onClick={() => setExpandido(prev => !prev)}
        >
          {expandido ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}
