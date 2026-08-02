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
import { api } from '@/lib/api'
import type { CampoFormulario, Formulario } from '@/data/types'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSeleccionar: (campos: CampoFormulario[]) => void
  advertencia?: string
}

export function SeleccionarPlantillaDialog({ open, onOpenChange, onSeleccionar, advertencia }: Props) {
  const [plantillas, setPlantillas] = useState<Formulario[]>([])
  const [seleccionadaId, setSeleccionadaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)

  useEffect(() => {
    if (!open) return
    setSeleccionadaId('')
    setLoading(true)
    api.formularios.list()
      .then(setPlantillas)
      .catch(() => toast.error('Error al cargar las plantillas'))
      .finally(() => setLoading(false))
  }, [open])

  const handleConfirmar = async () => {
    if (!seleccionadaId) return
    setImportando(true)
    try {
      const plantilla = await api.formularios.get(seleccionadaId)
      const campos = (plantilla.campos ?? []).map((campo, index) => ({
        ...campo,
        id: crypto.randomUUID(),
        orden: index,
      }))
      onSeleccionar(campos)
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
          <DialogDescription>
            Los campos de la plantilla se cargan como punto de partida y después podés editarlos libremente.
          </DialogDescription>
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
                    {p.campos?.length ?? 0} campos
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
