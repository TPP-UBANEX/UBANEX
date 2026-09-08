import type { HistorialEvaluacion } from '@/data/types'

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export function HistorialEvaluacionCard({ historial }: { historial: HistorialEvaluacion[] }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-semibold border-b pb-1">Historial de cambios</h3>
      {historial.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin actividad registrada todavía.</p>
      ) : (
        <ol className="space-y-2">
          {historial.map((h, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-xs">
              <div className="flex-1">
                <p className="font-medium">{h.descripcion}</p>
                <p className="text-muted-foreground">por {h.usuarioNombre}</p>
              </div>
              <span className="text-muted-foreground whitespace-nowrap">{formatFecha(h.fecha)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
