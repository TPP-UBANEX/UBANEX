import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Convocatoria } from '@/data/types'
import { EstadoConvocatoria } from '@/data/types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function NuevoProyectoDialog({
  onCreated,
  trigger,
  convocatoriaId: convocatoriaFija,
  convocatoriaNombre,
}: {
  onCreated: () => void
  trigger: React.ReactNode
  convocatoriaId?: string
  convocatoriaNombre?: string
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [nombre, setNombre] = useState('')
  const [convocatoriaId, setConvocatoriaId] = useState('')
  const [anioEdicion, setAnioEdicion] = useState<number | null>(new Date().getFullYear())
  const [esConsolidado, setEsConsolidado] = useState(false)
  const [esInterfacultad, setEsInterfacultad] = useState(false)

  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])

  useEffect(() => {
    if (!open) return
    if (convocatoriaFija) {
      setConvocatoriaId(convocatoriaFija)
      setConvocatorias([])
      return
    }
    api.convocatorias.todas().then(convs => {
      setConvocatorias(convs.filter(c => c.estado === EstadoConvocatoria.Presentacion))
    })
  }, [open, convocatoriaFija])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre) {
      setError('Completá el nombre del proyecto')
      return
    }
    if (!convocatoriaId) {
      setError('Seleccioná una convocatoria')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await api.proyectos.crear({
        nombre,
        convocatoriaId,
        anioEdicion: anioEdicion ?? undefined,
        esConsolidado,
        esInterfacultad,
      })
      setOpen(false)
      resetForm()
      onCreated()
      toast.success('Proyecto creado correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNombre('')
    if (!convocatoriaFija) setConvocatoriaId('')
    setAnioEdicion(new Date().getFullYear())
    setEsConsolidado(false)
    setEsInterfacultad(false)
  }

  const RadioGroup = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(true)}
        >
          Sí
        </Button>
        <Button
          type="button"
          variant={!value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Nombre del proyecto</p>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ingresá el nombre del proyecto" required />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Convocatoria</p>
              {convocatoriaFija ? (
                <Input value={convocatoriaNombre ?? ''} disabled className="bg-muted" />
              ) : (
                <Select value={convocatoriaId} onValueChange={setConvocatoriaId}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná una convocatoria" /></SelectTrigger>
                  <SelectContent>
                    {convocatorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Edición (año)</p>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={anioEdicion ?? ''}
                onChange={e => setAnioEdicion(e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            <RadioGroup value={esConsolidado} onChange={setEsConsolidado} label="¿Es consolidado?" />
            <RadioGroup value={esInterfacultad} onChange={setEsInterfacultad} label="¿Es interfacultad?" />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}