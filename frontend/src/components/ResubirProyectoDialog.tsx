import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { Loader2, Search, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ProyectoDisponible {
  proyectoId: string
  proyectoNombre: string
  esConsolidado: boolean
}

export function ResubirProyectoDialog({
  onResubido,
  trigger,
  convocatoriaId,
  convocatoriaNombre,
}: {
  onResubido: () => void
  trigger: React.ReactNode
  convocatoriaId: string
  convocatoriaNombre?: string
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [proyectos, setProyectos] = useState<ProyectoDisponible[]>([])
  const [loadingProyectos, setLoadingProyectos] = useState(false)
  const [seleccionado, setSeleccionado] = useState<ProyectoDisponible | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setProyectos([])
      setSeleccionado(null)
      setError('')
      return
    }
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) return
    setLoadingProyectos(true)
    api.proyectos.disponiblesParaResubir(convocatoriaId, debouncedSearch || undefined)
      .then(setProyectos)
      .catch(() => setError('Error al buscar proyectos'))
      .finally(() => setLoadingProyectos(false))
  }, [open, debouncedSearch, convocatoriaId])

  const handleResubir = async () => {
    if (!seleccionado) return
    setError('')
    setSubmitting(true)
    try {
      await api.proyectos.resubir(seleccionado.proyectoId, { convocatoriaId })
      setOpen(false)
      onResubido()
      toast.success(`"${seleccionado.proyectoNombre}" fue resubido correctamente`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resubir el proyecto')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resubir Proyecto Existente</DialogTitle>
          {convocatoriaNombre && (
            <p className="text-sm text-muted-foreground">Convocatoria: {convocatoriaNombre}</p>
          )}
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar proyecto por nombre..."
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {loadingProyectos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : proyectos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                {debouncedSearch
                  ? 'No se encontraron proyectos con ese nombre'
                  : 'No hay proyectos disponibles para resubir'}
              </div>
            ) : (
              <div className="divide-y">
                {proyectos.map(p => (
                  <button
                    key={p.proyectoId}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-muted transition-colors ${
                      seleccionado?.proyectoId === p.proyectoId ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSeleccionado(p)}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{p.proyectoNombre}</span>
                      {p.esConsolidado && (
                        <span className="text-xs text-muted-foreground">Consolidado</span>
                      )}
                    </div>
                    {seleccionado?.proyectoId === p.proyectoId && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleResubir}
            disabled={!seleccionado || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Resubiendo...' : 'Resubir Proyecto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
