import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { CampoFormulario, EventoHistorialEdicion, Presupuesto } from '@/data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { nombreCampoSugerencia } from '@/lib/nombre-campo'

interface Props {
  proyectoId?: string
  edicionId?: string
  camposFormulario?: CampoFormulario[]
  presupuesto?: Presupuesto | null
}

const etiquetaTipo: Record<EventoHistorialEdicion['tipo'], string> = {
  estado: 'Estado',
  sugerencia: 'Observación',
  evaluacion: 'Evaluación',
}

const varianteTipo: Record<
  EventoHistorialEdicion['tipo'],
  'default' | 'secondary' | 'outline'
> = {
  estado: 'default',
  sugerencia: 'secondary',
  evaluacion: 'outline',
}

function formatearFechaHora(fecha: string): string {
  const d = new Date(fecha)
  return Number.isNaN(d.getTime()) ? fecha : d.toLocaleString('es-AR')
}

/**
 * Línea de tiempo de trazabilidad de la edición: cambios de estado, observaciones y actividad de
 * las evaluaciones, con fecha y responsable. Alimentada por GET /proyectos/:id/ediciones/:id/historial.
 */
export function HistorialTab({ proyectoId, edicionId, camposFormulario = [], presupuesto = null }: Props) {
  const [eventos, setEventos] = useState<EventoHistorialEdicion[]>([])
  const [loading, setLoading] = useState(true)

  // Para las observaciones, antepone el campo observado con una etiqueta legible.
  const textoEvento = (evento: EventoHistorialEdicion): string => {
    if (evento.campo) {
      return `Observación sobre "${nombreCampoSugerencia(evento.campo, camposFormulario, presupuesto)}": ${evento.descripcion}`
    }
    return evento.descripcion
  }

  useEffect(() => {
    if (!proyectoId || !edicionId) return
    setLoading(true)
    api.proyectos
      .historial(proyectoId, edicionId)
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setLoading(false))
  }, [proyectoId, edicionId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Historial de trazabilidad</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Cargando historial…
          </div>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Todavía no hay actividad registrada para este proyecto.
          </p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {eventos.map((evento, i) => (
              <li key={i} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={varianteTipo[evento.tipo]}>{etiquetaTipo[evento.tipo]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatearFechaHora(evento.fecha)}
                  </span>
                </div>
                <p className="text-sm mt-1">{textoEvento(evento)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {evento.responsableNombre ? `Por ${evento.responsableNombre}` : 'Responsable no registrado'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
