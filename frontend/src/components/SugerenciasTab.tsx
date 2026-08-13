import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { SugerenciaCambio, CampoFormulario } from '@/data/types'
import { estadoBadge, EstadoSugerencia, TipoCampo } from '@/data/types'
import { formatearFechaISO } from '@/components/CampoFormularioInput'
import { Loader2, Check, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const estadoLabel: Record<string, string> = {
  [EstadoSugerencia.Pendiente]: 'Pendiente',
  [EstadoSugerencia.Aceptada]: 'Aceptada',
  [EstadoSugerencia.Rechazada]: 'Rechazada',
  [EstadoSugerencia.MasInformacion]: 'Más información',
}

interface SugerenciasTabProps {
  edicionId: string
  creadoPorId: string
  directorIds?: string[]
  camposFormulario?: CampoFormulario[]
  onRespondida?: () => void
}

export function SugerenciasTab({ edicionId, creadoPorId, directorIds = [], camposFormulario = [], onRespondida }: SugerenciasTabProps) {
  const { user } = useAuth()
  const [sugerencias, setSugerencias] = useState<SugerenciaCambio[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [respuestaTexto, setRespuestaTexto] = useState('')
  const [confirmacion, setConfirmacion] = useState<{ id: string; estado: EstadoSugerencia; campo: string } | null>(null)

  const puedeResponder = user?.id === creadoPorId || directorIds.includes(user?.id ?? '')

  const cargar = useCallback(async () => {
    try {
      const data = await api.sugerencias.listar(edicionId)
      setSugerencias(data)
    } catch {
      toast.error('Error al cargar sugerencias')
    } finally {
      setLoading(false)
    }
  }, [edicionId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleResponder = async (id: string, estado: EstadoSugerencia) => {
    try {
      await api.sugerencias.responder(id, {
        estado,
        respuestaDirector: respuestaTexto.trim() || undefined,
      })
      toast.success(
        estado === EstadoSugerencia.Aceptada ? 'Sugerencia aceptada' :
        estado === EstadoSugerencia.Rechazada ? 'Sugerencia rechazada' :
        'Solicitud de más información enviada',
      )
      setRespondiendo(null)
      setRespuestaTexto('')
      cargar()
      onRespondida?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al responder')
    }
  }

  const nombreCampo = (campo: string) => {
    const mapa: Record<string, string> = {
      nombre: 'Nombre',
      anioEdicion: 'Año de edición',
      esConsolidado: 'Es consolidado',
      esInterfacultad: 'Es interfacultad',
    }
    if (mapa[campo]) return mapa[campo]
    if (campo.startsWith('presupuesto.')) return `Presupuesto > ${campo.slice(12)}`
    if (campo.startsWith('datosFormulario.')) {
      const campoId = campo.slice(16)
      const campoFormulario = camposFormulario.find(c => c.id === campoId)
      return `Formulario > ${campoFormulario?.nombre ?? campoId}`
    }
    return campo
  }

  const campoFormularioDe = (campo: string): CampoFormulario | null => {
    if (!campo.startsWith('datosFormulario.')) return null
    return camposFormulario.find(c => c.id === campo.slice(16)) ?? null
  }

  const tipoCampoFormulario = (campo: string): TipoCampo | null => campoFormularioDe(campo)?.tipo ?? null

  // Un valor sugerido de geolocalización viaja serializado; si no es JSON válido se muestra tal cual (texto libre).
  const nombreValorGeo = (valor: string): string => {
    try {
      const parsed = JSON.parse(valor)
      if (parsed && typeof parsed === 'object' && typeof parsed.nombre === 'string') return parsed.nombre
    } catch {
      // no era JSON
    }
    return valor
  }

  // El valor actual de una tabla viaja como el JSON del array de filas.
  const nombreValorTabla = (valor: string, campoFormulario: CampoFormulario | null): string => {
    const columnas = campoFormulario?.columnas ?? []
    try {
      const filas = JSON.parse(valor)
      if (!Array.isArray(filas)) return valor
      if (filas.length === 0) return '(sin filas)'
      return filas
        .map((fila: Record<string, unknown>) =>
          columnas.map(c => `${c.nombre}: ${fila?.[c.id] ?? '-'}`).join(' · '))
        .join('\n')
    } catch {
      return valor
    }
  }

  const ValorDiff = ({ campo, actual, sugerido }: { campo: string; actual: string | null; sugerido: string | null }) => {
    const campoFormulario = campoFormularioDe(campo)
    const tipo = campoFormulario?.tipo ?? null
    // Las fechas se guardan en ISO, la geolocalización y las tablas serializadas; se muestran legibles.
    const mostrar = (valor: string | null) => {
      if (valor == null) return '(sin valor)'
      if (tipo === TipoCampo.Fecha) return formatearFechaISO(valor)
      if (tipo === TipoCampo.Geolocalizacion) return nombreValorGeo(valor)
      if (tipo === TipoCampo.Tabla) return nombreValorTabla(valor, campoFormulario)
      return valor
    }

    if (sugerido == null) {
      return (
        <div className="flex items-start gap-2 text-sm mb-2">
          <span className="text-foreground whitespace-pre-wrap break-words line-clamp-3 min-w-0">
            {mostrar(actual)}
          </span>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-2 text-sm mb-2">
        <span className="text-muted-foreground line-through whitespace-pre-wrap break-words line-clamp-3 min-w-0">
          {mostrar(actual)}
        </span>
        <span className="text-muted-foreground shrink-0">→</span>
        <span className="font-medium text-foreground whitespace-pre-wrap break-words line-clamp-3 min-w-0">
          {mostrar(sugerido)}
        </span>
      </div>
    )
  }

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (sugerencias.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-8">No hay sugerencias de cambio para este proyecto.</p>
  )

  return (
    <div className="space-y-3">
      {sugerencias.map(s => (
        <Card key={s.id} className={cn(s.estado === EstadoSugerencia.Pendiente && 'border-blue-200 dark:border-blue-800')}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">{nombreCampo(s.campo)}</CardTitle>
                  <Badge variant={estadoBadge[s.estado]}>{estadoLabel[s.estado]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sugerido por {s.sugeridoPor?.nombreCompleto || '?'} · {new Date(s.creadoEn).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                {expandedId === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            {s.valorSugerido != null && (
              <ValorDiff campo={s.campo} actual={s.valorActual} sugerido={s.valorSugerido} />
            )}
            <div className="text-sm bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Comentario:</p>
              <p>{s.comentario}</p>
            </div>

            {expandedId === s.id && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {s.respuestaDirector && (
                  <div className="text-sm bg-muted/50 rounded-md p-3">
                    <p className="text-xs text-muted-foreground mb-1">Respuesta del usuario de dirección:</p>
                    <p>{s.respuestaDirector}</p>
                  </div>
                )}
                {s.respondidoEn && (
                  <p className="text-xs text-muted-foreground">
                    Respondida el {new Date(s.respondidoEn).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {puedeResponder && s.estado === EstadoSugerencia.Pendiente && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {respondiendo === s.id && (
                  <Textarea
                    placeholder="Comentario opcional..."
                    value={respuestaTexto}
                    onChange={e => setRespuestaTexto(e.target.value)}
                    rows={2}
                    className="mb-2"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setConfirmacion({ id: s.id, estado: EstadoSugerencia.Aceptada, campo: s.campo })}
                    disabled={respondiendo === s.id}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRespondiendo(respondiendo === s.id ? null : s.id)
                      setRespuestaTexto('')
                    }}
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Pedir más info
                  </Button>
                  {respondiendo === s.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmacion({ id: s.id, estado: EstadoSugerencia.MasInformacion, campo: s.campo })}
                    >
                      Enviar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmacion({ id: s.id, estado: EstadoSugerencia.Rechazada, campo: s.campo })}
                    disabled={respondiendo === s.id}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Rechazar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={confirmacion !== null}
        onOpenChange={open => {
          if (!open) setConfirmacion(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmacion?.estado === EstadoSugerencia.Aceptada && '¿Aceptar sugerencia?'}
              {confirmacion?.estado === EstadoSugerencia.Rechazada && '¿Rechazar sugerencia?'}
              {confirmacion?.estado === EstadoSugerencia.MasInformacion && '¿Pedir más información?'}
            </DialogTitle>
            <DialogDescription>
              {confirmacion?.estado === EstadoSugerencia.Aceptada &&
                `¿Estás seguro de que querés aceptar la sugerencia en "${nombreCampo(confirmacion.campo)}"?`}
              {confirmacion?.estado === EstadoSugerencia.Rechazada &&
                `¿Estás seguro de que querés rechazar la sugerencia en "${nombreCampo(confirmacion.campo)}"?`}
              {confirmacion?.estado === EstadoSugerencia.MasInformacion &&
                `¿Estás seguro de que querés pedir más información sobre la sugerencia en "${nombreCampo(confirmacion.campo)}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacion(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (confirmacion) handleResponder(confirmacion.id, confirmacion.estado)
                setConfirmacion(null)
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
