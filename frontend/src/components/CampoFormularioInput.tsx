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
import type { CampoFormulario } from '@/data/types'

export function EtiquetaCampoFormulario({ campo }: { campo: Pick<CampoFormulario, 'nombre' | 'esObligatorio'> }) {
  return (
    <>
      {campo.nombre}
      {campo.esObligatorio && <span className="text-destructive"> *</span>}
    </>
  )
}

export function campoFormularioVacio(campo: CampoFormulario, valor: unknown): boolean {
  if (valor == null) return true
  if (campo.tipo === TipoCampo.Checkbox) return !Array.isArray(valor) || valor.length === 0
  if (typeof valor === 'string') return valor.trim() === ''
  return false
}

export function formatearValorCampoFormulario(campo: CampoFormulario, valor: unknown): string {
  if (campoFormularioVacio(campo, valor)) return '-'
  if (campo.tipo === TipoCampo.Booleano) return valor === true ? 'Sí' : 'No'
  if (campo.tipo === TipoCampo.Checkbox) return (valor as string[]).join(', ')
  return String(valor)
}

interface Props {
  campo: CampoFormulario
  valor: unknown
  onChange: (valor: unknown) => void
}

export function CampoFormularioInput({ campo, valor, onChange }: Props) {
  if (campo.tipo === TipoCampo.Archivo) return null

  const faltaCompletar = campo.esObligatorio && campoFormularioVacio(campo, valor)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        <EtiquetaCampoFormulario campo={campo} />
      </p>
      {campo.textoAyuda && (
        <p className="text-xs text-muted-foreground">{campo.textoAyuda}</p>
      )}

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
            rows={10}
            value={typeof valor === 'string' ? valor : ''}
            maxLength={MAX_LONGITUD_POR_TIPO[TipoCampo.TextoLargo]}
            onChange={e => onChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">
            {(typeof valor === 'string' ? valor.length : 0).toLocaleString('es-AR')} / {MAX_LONGITUD_POR_TIPO[TipoCampo.TextoLargo]!.toLocaleString('es-AR')}
          </p>
        </>
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

      {faltaCompletar && (
        <p className="text-xs text-muted-foreground">Falta completar</p>
      )}
    </div>
  )
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
