import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface PlantillaSeleccionable {
  id: string
  nombre: string
  esDefault: boolean
}

interface Props<T extends PlantillaSeleccionable> {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se invoca al abrir el diálogo; mantiene la carga perezosa de la lista de plantillas. */
  cargarPlantillas: () => Promise<T[]>
  /** Texto al final de cada fila, ej. "12 campos" o "4 categorías". */
  detalle: (plantilla: T) => string
  /** Puede ser async: el diálogo muestra el spinner y cierra al terminar. */
  onSeleccionar: (plantilla: T) => void | Promise<void>
  descripcion?: string
  advertencia?: string
}

/** Diálogo genérico para elegir una plantilla de biblioteca (formularios de presentación o de evaluación). */
export function SeleccionarPlantillaDialog<T extends PlantillaSeleccionable>({
  open,
  onOpenChange,
  cargarPlantillas,
  detalle,
  onSeleccionar,
  descripcion = 'Los campos de la plantilla se cargan como punto de partida y después podés editarlos libremente.',
  advertencia,
}: Props<T>) {
  const [plantillas, setPlantillas] = useState<T[]>([])
  const [seleccionadaId, setSeleccionadaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)

  useEffect(() => {
    if (!open) return
    setSeleccionadaId('')
    setLoading(true)
    cargarPlantillas()
      .then(setPlantillas)
      .catch(() => toast.error('Error al cargar las plantillas'))
      .finally(() => setLoading(false))
  }, [open])

  const handleConfirmar = async () => {
    const plantilla = plantillas.find(p => p.id === seleccionadaId)
    if (!plantilla) return
    setImportando(true)
    try {
      await onSeleccionar(plantilla)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar la plantilla')
    } finally {
      setImportando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir plantilla</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        {advertencia && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{advertencia}</p>
        )}

        <div className="py-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : plantillas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay plantillas disponibles.
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {plantillas.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    seleccionadaId === p.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSeleccionadaId(p.id)}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{p.nombre}</span>
                  <span className="text-xs opacity-70 ml-auto shrink-0">
                    {detalle(p)}
                    {p.esDefault && ' · Default'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={!seleccionadaId || importando}>
            {importando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Usar plantilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
