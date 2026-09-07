import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableSkeleton } from '@/components/TableSkeleton'
import { api } from '@/lib/api'
import type { TemplateEvaluacionInstitucional, TemplateEvaluacionCruzada } from '@/data/types'
import { ArrowLeft, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Tipo = 'institucional' | 'cruzada'
type Plantilla = TemplateEvaluacionInstitucional | TemplateEvaluacionCruzada

export function PlantillasEvaluacion() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tipo: Tipo = searchParams.get('tipo') === 'cruzada' ? 'cruzada' : 'institucional'

  const [institucionales, setInstitucionales] = useState<TemplateEvaluacionInstitucional[]>([])
  const [cruzadas, setCruzadas] = useState<TemplateEvaluacionCruzada[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [esDefault, setEsDefault] = useState(false)
  const [creando, setCreando] = useState(false)
  const [aEliminar, setAEliminar] = useState<{ tipo: Tipo; plantilla: Plantilla } | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(async () => {
    const [institucionales, cruzadas] = await Promise.all([
      api.templatesEvaluacion.institucionales.list(),
      api.templatesEvaluacion.cruzadas.list(),
    ])
    setInstitucionales(institucionales)
    setCruzadas(cruzadas)
  }, [])

  useEffect(() => {
    cargar()
      .catch(err => toast.error(err instanceof Error ? err.message : 'Error al cargar las plantillas'))
      .finally(() => setLoading(false))
  }, [cargar])

  const cambiarTipo = (nuevo: string) => {
    setSearchParams(nuevo === 'cruzada' ? { tipo: 'cruzada' } : {})
  }

  const handleCrear = async () => {
    if (!nombre.trim()) {
      toast.error('La plantilla necesita un nombre')
      return
    }
    setCreando(true)
    try {
      if (tipo === 'institucional') {
        const creada = await api.templatesEvaluacion.institucionales.crear({ nombre: nombre.trim(), esDefault })
        toast.success('Plantilla creada correctamente')
        setNuevaOpen(false)
        setNombre('')
        setEsDefault(false)
        navigate(`/plantillas/evaluacion/institucional/${creada.id}`)
      } else {
        const creada = await api.templatesEvaluacion.cruzadas.crear({ nombre: nombre.trim(), esDefault })
        toast.success('Plantilla creada correctamente')
        setNuevaOpen(false)
        setNombre('')
        setEsDefault(false)
        navigate(`/plantillas/evaluacion/cruzada/${creada.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la plantilla')
    } finally {
      setCreando(false)
    }
  }

  const marcarDefaultInstitucional = async (plantilla: TemplateEvaluacionInstitucional) => {
    try {
      await api.templatesEvaluacion.institucionales.actualizar(plantilla.id, {
        nombre: plantilla.nombre,
        esDefault: true,
        estructura: plantilla.estructura,
      })
      toast.success(`"${plantilla.nombre}" es la nueva plantilla por defecto`)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar la plantilla')
    }
  }

  const marcarDefaultCruzada = async (plantilla: TemplateEvaluacionCruzada) => {
    try {
      await api.templatesEvaluacion.cruzadas.actualizar(plantilla.id, {
        nombre: plantilla.nombre,
        esDefault: true,
        estructura: plantilla.estructura,
      })
      toast.success(`"${plantilla.nombre}" es la nueva plantilla por defecto`)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar la plantilla')
    }
  }

  const ejecutarEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    try {
      if (aEliminar.tipo === 'institucional') {
        await api.templatesEvaluacion.institucionales.eliminar(aEliminar.plantilla.id)
      } else {
        await api.templatesEvaluacion.cruzadas.eliminar(aEliminar.plantilla.id)
      }
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
            Acá podés crear las plantillas de evaluación institucional y cruzada que después se
            configuran en cada convocatoria.
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
              <DialogTitle>Nueva plantilla {tipo === 'institucional' ? 'institucional' : 'de evaluación cruzada'}</DialogTitle>
              <DialogDescription>
                Después de crearla vas a poder cargarle la estructura.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nombre</p>
                <Input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder={tipo === 'institucional' ? 'Ej: Plantilla institucional estándar' : 'Ej: Plantilla cruzada estándar'}
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

      <Tabs value={tipo} onValueChange={cambiarTipo}>
        <TabsList>
          <TabsTrigger value="institucional">Institucional ({institucionales.length})</TabsTrigger>
          <TabsTrigger value="cruzada">Cruzada ({cruzadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="institucional" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton columns={4} />
              ) : institucionales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay plantillas institucionales cargadas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categorías</TableHead>
                      <TableHead>Checklist</TableHead>
                      <TableHead>Por defecto</TableHead>
                      <TableHead className="w-32 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institucionales.map(t => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/plantillas/evaluacion/institucional/${t.id}`)}
                      >
                        <TableCell className="font-medium">{t.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{t.estructura?.categorias.length ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground">{t.estructura?.checklist.length ?? 0}</TableCell>
                        <TableCell>
                          {t.esDefault && <Badge variant="secondary">Por defecto</Badge>}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          {!t.esDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Marcar como por defecto"
                              onClick={() => marcarDefaultInstitucional(t)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar plantilla"
                            onClick={() => setAEliminar({ tipo: 'institucional', plantilla: t })}
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
        </TabsContent>

        <TabsContent value="cruzada" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton columns={3} />
              ) : cruzadas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay plantillas de evaluación cruzada cargadas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categorías</TableHead>
                      <TableHead>Por defecto</TableHead>
                      <TableHead className="w-32 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cruzadas.map(t => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/plantillas/evaluacion/cruzada/${t.id}`)}
                      >
                        <TableCell className="font-medium">{t.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{t.estructura?.categorias.length ?? 0}</TableCell>
                        <TableCell>
                          {t.esDefault && <Badge variant="secondary">Por defecto</Badge>}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          {!t.esDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Marcar como por defecto"
                              onClick={() => marcarDefaultCruzada(t)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar plantilla"
                            onClick={() => setAEliminar({ tipo: 'cruzada', plantilla: t })}
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
        </TabsContent>
      </Tabs>

      <Dialog open={aEliminar !== null} onOpenChange={open => !open && setAEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar "{aEliminar?.plantilla.nombre}"? Esta acción no se puede deshacer.
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
