import { useCallback, useEffect, useState } from 'react'
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
import type { TemplateAutoevaluacionImpacto } from '@/data/types'
import { ArrowLeft, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function PlantillasAutoevaluacion() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateAutoevaluacionImpacto[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [esDefault, setEsDefault] = useState(false)
  const [creando, setCreando] = useState(false)
  const [aEliminar, setAEliminar] = useState<TemplateAutoevaluacionImpacto | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(() => {
    return api.templatesAutoevaluacion.list()
      .then(setTemplates)
      .catch(err => toast.error(err instanceof Error ? err.message : 'Error al cargar las plantillas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleCrear = async () => {
    if (!nombre.trim()) {
      toast.error('La plantilla necesita un nombre')
      return
    }
    setCreando(true)
    try {
      const creada = await api.templatesAutoevaluacion.crear({ nombre: nombre.trim(), esDefault })
      toast.success('Plantilla creada correctamente')
      setNuevaOpen(false)
      setNombre('')
      setEsDefault(false)
      navigate(`/plantillas/impacto/${creada.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la plantilla')
    } finally {
      setCreando(false)
    }
  }

  const marcarDefault = async (t: TemplateAutoevaluacionImpacto) => {
    try {
      await api.templatesAutoevaluacion.actualizar(t.id, {
        nombre: t.nombre,
        esDefault: true,
        estructura: t.estructura ?? undefined,
      })
      toast.success(`"${t.nombre}" es la nueva plantilla por defecto`)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar la plantilla')
    }
  }

  const ejecutarEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    try {
      await api.templatesAutoevaluacion.eliminar(aEliminar.id)
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plantillas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Acá podés crear las plantillas de autoevaluación de impacto que después se configuran
            en cada convocatoria.
          </p>
        </div>
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
                Después de crearla vas a poder cargarle las preguntas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nombre</p>
                <Input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Plantilla de autoevaluación estándar"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">¿Es la plantilla por defecto?</p>
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
                  Solo puede haber una por defecto: si marcás esta, se desmarca la anterior.
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
            <TableSkeleton columns={3} />
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay plantillas cargadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Preguntas</TableHead>
                  <TableHead>Por defecto</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/plantillas/impacto/${t.id}`)}
                  >
                    <TableCell className="font-medium">{t.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{t.estructura?.preguntas.length ?? 0}</TableCell>
                    <TableCell>
                      {t.esDefault && <Badge variant="secondary">Por defecto</Badge>}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      {!t.esDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar como por defecto"
                          onClick={() => marcarDefault(t)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar plantilla"
                        onClick={() => setAEliminar(t)}
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
