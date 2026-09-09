import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { conProtocolo } from '@/lib/utils'
import type { Edicion } from '@/data/types'

interface AvalesTabProps {
  proyectoId: string
  edicion: Edicion
  /** Si puede editar el aval (Secretaría de la misma UA, en los estados permitidos). */
  puedeEditar: boolean
  /** Se llama luego de guardar para refrescar la edición en el detalle. */
  onGuardado: () => void
}

/** Pestaña de Avales: muestra y (si corresponde) permite editar el aval de la UA. */
export function AvalesTab({ proyectoId, edicion, puedeEditar, onGuardado }: AvalesTabProps) {
  const [modo, setModo] = useState<'si' | 'no'>(edicion.avalUrl ? 'si' : 'no')
  const [input, setInput] = useState(edicion.avalUrl ?? '')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setInput(edicion.avalUrl ?? '')
    setModo(edicion.avalUrl ? 'si' : 'no')
  }, [edicion.id, edicion.avalUrl])

  const guardar = async () => {
    setGuardando(true)
    try {
      const nuevoValor = modo === 'si' && input.trim() ? conProtocolo(input) : null
      await api.proyectos.actualizarAval(proyectoId, edicion.id, { avalUrl: nuevoValor })
      toast.success('Aval actualizado')
      onGuardado()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el aval')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Aval de la Unidad Académica</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Link al PDF del aval firmado por el decano. Es requisito para adjudicar el proyecto y
          lo carga la Secretaría de Extensión de la unidad académica del proyecto.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Estado</p>
          {edicion.avalUrl ? (
            <a
              href={conProtocolo(edicion.avalUrl)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-primary underline"
            >
              Ver aval
            </a>
          ) : (
            <p className="text-sm font-bold">Sin aval</p>
          )}
        </div>

        {puedeEditar && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">¿Tiene aval?</p>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant={modo === 'si' ? 'default' : 'outline'} onClick={() => setModo('si')}>Sí</Button>
              <Button type="button" size="sm" variant={modo === 'no' ? 'default' : 'outline'} onClick={() => setModo('no')}>No</Button>
            </div>
            {modo === 'si' && (
              <Input
                placeholder="https://..."
                maxLength={2048}
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            )}
            <div>
              <Button onClick={guardar} disabled={guardando || (modo === 'si' && !input.trim())}>
                {guardando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
