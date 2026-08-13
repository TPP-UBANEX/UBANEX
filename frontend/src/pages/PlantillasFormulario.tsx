import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableSkeleton } from '@/components/TableSkeleton'
import { api } from '@/lib/api'
import type { Formulario } from '@/data/types'
import { Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function PlantillasFormulario() {
  const navigate = useNavigate()
  const [plantillas, setPlantillas] = useState<Formulario[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [esDefault, setEsDefault] = useState(false)
  const [creando, setCreando] = useState(false)
  const [aEliminar, setAEliminar] = useState<Formulario | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = () => {
    return api.formularios.list()
      .then(setPlantillas)
      .catch(err => toast.error(err instanceof Error ? err.message : 'Error al cargar las plantillas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const handleCrear = async () => {
    if (!nombre.trim()) {
      toast.error('La plantilla necesita un nombre')
      return
    }
    setCreando(true)
    try {
      const creada = await api.formularios.crear({ nombre: nombre.trim(), esDefault })
      toast.success('Plantilla creada correctamente')
      setNuevaOpen(false)
      setNombre('')
      setEsDefault(false)
      navigate(`/plantillas-formulario/${creada.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la plantilla')
    } finally {
      setCreando(false)
    }
  }

  const marcarDefault = async (plantilla: Formulario) => {
    try {
      await api.formularios.actualizar(plantilla.id, { esDefault: true })
      toast.success(`"${plantilla.nombre}" es la nueva plantilla default`)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar la plantilla')
    }
  }

  const ejecutarEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    try {
      await api.formularios.eliminar(aEliminar.id)
      toast.success('Plantilla eliminada correctamente')
      setAEliminar(null)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la plantilla')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Acá podés crear formularios de presentación que luego te sirven como plantillas para el momento de configurar una convocatoria.
        </p>
        <Dialog open={nuevaOpen} onOpenChange={setNuevaOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />Nueva plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva plantilla</DialogTitle>
              <DialogDescription>
                Después de crearla vas a poder cargarle los campos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nombre</p>
                <Input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Formulario proyectos de extensión"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">¿Es la plantilla default?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={esDefault ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEsDefault(true)}
                  >
                    Sí
                  </Button>
                  <Button
                    type="button"
                    variant={!esDefault ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEsDefault(false)}
                  >
                    No
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo puede haber una default: si marcás esta, se desmarca la anterior.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNuevaOpen(false)}>Cancelar</Button>
              <Button onClick={handleCrear} disabled={creando}>
                {creando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {creando ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton columns={4} />
          ) : plantillas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay plantillas cargadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Campos</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantillas.map(p => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/plantillas-formulario/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{p.campos?.length ?? 0}</TableCell>
                    <TableCell>
                      {p.esDefault && <Badge variant="secondary">Default</Badge>}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      {!p.esDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar como default"
                          onClick={() => marcarDefault(p)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar plantilla"
                        onClick={() => setAEliminar(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={aEliminar !== null} onOpenChange={open => !open && setAEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar "{aEliminar?.nombre}"? Esta acción no se puede deshacer.
              Las convocatorias que ya la importaron no se ven afectadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={ejecutarEliminar} disabled={eliminando}>
              {eliminando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
