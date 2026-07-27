import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { SugerenciaCambio } from '@/data/types'
import { estadoBadge, EstadoSugerencia } from '@/data/types'
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
}

export function SugerenciasTab({ edicionId, creadoPorId }: SugerenciasTabProps) {
  const { user } = useAuth()
  const [sugerencias, setSugerencias] = useState<SugerenciaCambio[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [respuestaTexto, setRespuestaTexto] = useState('')

  const esDirector = user?.id === creadoPorId
  const puedeResponder = esDirector

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
    if (campo.startsWith('datosFormulario.')) return `Formulario > ${campo.slice(16)}`
    return campo
  }

  const ValorDiff = ({ actual, sugerido }: { actual: string | null; sugerido: string | null }) => (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground line-through">{actual ?? '(sin valor)'}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-medium text-foreground">{sugerido ?? '(sin valor)'}</span>
    </div>
  )

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
            <ValorDiff actual={s.valorActual} sugerido={s.valorSugerido} />
            <div className="mt-2 text-sm bg-muted/30 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Comentario:</p>
              <p>{s.comentario}</p>
            </div>

            {expandedId === s.id && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {s.respuestaDirector && (
                  <div className="text-sm bg-muted/30 rounded-md p-3">
                    <p className="text-xs text-muted-foreground mb-1">Respuesta del director:</p>
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
                    onClick={() => handleResponder(s.id, EstadoSugerencia.Aceptada)}
                    disabled={respondiendo === s.id}
                  >
                    {respondiendo === s.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
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
                      onClick={() => handleResponder(s.id, EstadoSugerencia.MasInformacion)}
                    >
                      Enviar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResponder(s.id, EstadoSugerencia.Rechazada)}
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
    </div>
  )
}
