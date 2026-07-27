import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Convocatoria, Edicion, Formulario } from '@/data/types'
import { estadoBadge, EstadoEdicion, RolUsuario } from '@/data/types'
import { NuevoProyectoDialog } from '@/components/NuevoProyectoDialog'
import { EmparejamientoTab } from '@/components/EmparejamientoTab'
import { AsignacionEvaluadores } from '@/components/AsignacionEvaluadores'
import { ArrowLeft, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

function erroresFechas(f: {
  fechaInicioPresentacion: string; fechaFinPresentacion: string;
  fechaInicioEvaluacion: string; fechaFinEvaluacion: string;
  fechaInicioEjecucion: string; fechaFinEjecucion: string;
}): Record<string, string> {
  const e: Record<string, string> = {}
  const p = (s: string) => s ? new Date(s) : null
  const ip = p(f.fechaInicioPresentacion), fp = p(f.fechaFinPresentacion)
  const ie = p(f.fechaInicioEvaluacion), fe = p(f.fechaFinEvaluacion)
  const iej = p(f.fechaInicioEjecucion), fej = p(f.fechaFinEjecucion)

  if (fp && ip && fp < ip) e.fechaFinPresentacion = 'Debe ser igual o posterior al inicio'
  if (ie && fp && ie < fp) e.fechaInicioEvaluacion = 'Debe ser posterior o igual a Fin Presentación'
  if (fe && ie && fe < ie) e.fechaFinEvaluacion = 'Debe ser igual o posterior al inicio'
  if (iej && fe && iej < fe) e.fechaInicioEjecucion = 'Debe ser posterior o igual a Fin Evaluación'
  if (fej && iej && fej < iej) e.fechaFinEjecucion = 'Debe ser igual o posterior al inicio'
  return e
}

function validarFechas(f: Parameters<typeof erroresFechas>[0]): string | null {
  const errs = erroresFechas(f)
  return errs[Object.keys(errs)[0]] ?? null
}

export function ConvocatoriaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conv, setConv] = useState<Convocatoria | null>(null)
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', anio: new Date().getFullYear(), estado: '', formularioId: '', fechaInicioPresentacion: '', fechaFinPresentacion: '', fechaInicioEvaluacion: '', fechaFinEvaluacion: '', fechaInicioEjecucion: '', fechaFinEjecucion: '' })
  const [guardando, setGuardando] = useState(false)
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const esUsuarioEjecucion = user?.roles.some(
    r => r === RolUsuario.Estudiante || r === RolUsuario.Docente,
  )
  const errores = erroresFechas(editForm)

  const cargarDatos = () => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.convocatorias.get(id),
      api.proyectos.list({ convocatoriaId: id }),
      api.formularios.list(),
    ]).then(([c, e, f]) => {
      setConv(c)
      setEdiciones(e)
      setFormularios(f)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  const abrirEdicion = () => {
    if (!conv) return
    setEditForm({
      nombre: conv.nombre,
      descripcion: conv.descripcion || '',
      anio: conv.anio,
      estado: conv.estado,
      formularioId: conv.formularioId || '',
      fechaInicioPresentacion: conv.fechaInicioPresentacion || '',
      fechaFinPresentacion: conv.fechaFinPresentacion || '',
      fechaInicioEvaluacion: conv.fechaInicioEvaluacion || '',
      fechaFinEvaluacion: conv.fechaFinEvaluacion || '',
      fechaInicioEjecucion: conv.fechaInicioEjecucion || '',
      fechaFinEjecucion: conv.fechaFinEjecucion || '',
    })
    setEditOpen(true)
  }

  const handleGuardar = () => {
    if (!id || !conv) return

    const errorFechas = validarFechas(editForm)
    if (errorFechas) {
      toast.error(errorFechas)
      return
    }

    setConfirmEditOpen(true)
  }

  const ejecutarGuardar = async () => {
    setConfirmEditOpen(false)
    setGuardando(true)
    try {
      const actualizada = await api.convocatorias.actualizar(id!, editForm)
      setConv(actualizada)
      toast.success('Convocatoria actualizada correctamente')
      setEditOpen(false)
    } catch {
      toast.error('Error al actualizar la convocatoria')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = () => {
    if (!id || !conv) return
    setConfirmDeleteOpen(true)
  }

  const ejecutarEliminar = async () => {
    setConfirmDeleteOpen(false)
    try {
      await api.convocatorias.eliminar(id!)
      toast.success('Convocatoria eliminada correctamente')
      navigate('/convocatorias')
    } catch {
      toast.error('Error al eliminar la convocatoria')
    }
  }

  if (loading) return <DetailSkeleton />

  if (!conv) return <div className="p-6"><p className="text-muted-foreground">Convocatoria no encontrada</p></div>

  const conteo: Record<string, number> = {}
  Object.values(EstadoEdicion).forEach(estado => {
    conteo[estado] = ediciones.filter(e => e.estado === estado).length
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/convocatorias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{conv.nombre}</h1>
            <Badge variant={estadoBadge[conv.estado]}>{conv.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{conv.descripcion}</p>
        </div>
        {user?.roles.includes(RolUsuario.AutoridadDeRectorado) && (
          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={abrirEdicion}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Convocatoria</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4 min-w-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nombre</p>
                    <Input value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Descripción</p>
                    <Input value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Año</p>
                    <Input type="number" value={editForm.anio} onChange={e => setEditForm(f => ({ ...f, anio: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Estado</p>
                    <Select value={editForm.estado} onValueChange={v => setEditForm(f => ({ ...f, estado: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="configuracion">Configuración</SelectItem>
                        <SelectItem value="presentacion">Presentación</SelectItem>
                        <SelectItem value="evaluacion">Evaluación</SelectItem>
                        <SelectItem value="ejecucion">Ejecución</SelectItem>
                        <SelectItem value="cierre">Cierre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Presentación</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                        <Input type="date" className="mt-1" value={editForm.fechaInicioPresentacion} onChange={e => setEditForm(f => ({ ...f, fechaInicioPresentacion: e.target.value }))} />
                        {errores.fechaInicioPresentacion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioPresentacion}</p>}
                      </div>
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Fin</p>
                        <Input type="date" className="mt-1" value={editForm.fechaFinPresentacion} onChange={e => setEditForm(f => ({ ...f, fechaFinPresentacion: e.target.value }))} />
                        {errores.fechaFinPresentacion && <p className="text-xs text-destructive mt-2">{errores.fechaFinPresentacion}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Evaluación</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                        <Input type="date" className="mt-1" value={editForm.fechaInicioEvaluacion} onChange={e => setEditForm(f => ({ ...f, fechaInicioEvaluacion: e.target.value }))} />
                        {errores.fechaInicioEvaluacion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioEvaluacion}</p>}
                      </div>
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Fin</p>
                        <Input type="date" className="mt-1" value={editForm.fechaFinEvaluacion} onChange={e => setEditForm(f => ({ ...f, fechaFinEvaluacion: e.target.value }))} />
                        {errores.fechaFinEvaluacion && <p className="text-xs text-destructive mt-2">{errores.fechaFinEvaluacion}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Ejecución</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                        <Input type="date" className="mt-1" value={editForm.fechaInicioEjecucion} onChange={e => setEditForm(f => ({ ...f, fechaInicioEjecucion: e.target.value }))} />
                        {errores.fechaInicioEjecucion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioEjecucion}</p>}
                      </div>
                      <div className="relative min-h-[4.5rem]">
                        <p className="text-xs text-muted-foreground mt-1">Fin</p>
                        <Input type="date" className="mt-1" value={editForm.fechaFinEjecucion} onChange={e => setEditForm(f => ({ ...f, fechaFinEjecucion: e.target.value }))} />
                        {errores.fechaFinEjecucion && <p className="text-xs text-destructive mt-2">{errores.fechaFinEjecucion}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-semibold">Formulario</p>
                    {formularios.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay formularios disponibles</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {formularios.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                              editForm.formularioId === f.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setEditForm(ef => ({ ...ef, formularioId: f.id }))}
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{f.nombre}</span>
                            {f.esDefault && <span className="text-xs opacity-70 ml-auto">Default</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" size="sm" onClick={handleEliminar}><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>

            <Dialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar cambios</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que querés guardar los cambios en esta convocatoria?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmEditOpen(false)}>Cancelar</Button>
                  <Button onClick={ejecutarGuardar}>Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Eliminar convocatoria</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de eliminar esta convocatoria? Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={ejecutarEliminar}>Eliminar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(conteo).map(([etapa, count]) => (
          <Card key={etapa}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium capitalize">{etapa}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="proyectos">
        <TabsList>
          <TabsTrigger value="proyectos">Proyectos ({ediciones.length})</TabsTrigger>
          <TabsTrigger value="evaluadores">Usuarios evaluadores</TabsTrigger>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="emparejamiento">Emparejamiento</TabsTrigger>
        </TabsList>
        <TabsContent value="proyectos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Proyectos Presentados</CardTitle>
              {esUsuarioEjecucion && (
                <NuevoProyectoDialog
                  onCreated={cargarDatos}
                  convocatoriaId={conv?.id}
                  convocatoriaNombre={conv?.nombre}
                  trigger={
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
                  }
                />
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ediciones.map(e => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${e.proyectoId}`)}>
                      <TableCell className="font-medium">{e.proyecto?.nombre || 'Sin nombre'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.creadoPor?.nombreCompleto || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.unidadAcademica?.nombre || '-'}</TableCell>
                      <TableCell><Badge variant={estadoBadge[e.estado]}>{e.estado}</Badge></TableCell>
                      <TableCell className="text-sm">${(e.presupuesto?.montoTotal ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={e2 => { e2.stopPropagation(); navigate(`/proyectos/${e.proyectoId}`) }}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emparejamiento" className="mt-4">
          {id && <EmparejamientoTab convocatoriaId={id} />}
        </TabsContent>
        <TabsContent value="evaluadores" className="mt-4">
          <Card>
            <CardHeader>            <CardTitle className="text-sm font-medium">Asignación de Usuarios evaluadores</CardTitle></CardHeader>
            <CardContent>
              {id && <AsignacionEvaluadores convocatoriaId={id} />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="detalle" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Información</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Año:</span> {conv.anio}</div>
                <div><span className="text-muted-foreground">Estado:</span> {conv.estado}</div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Presentación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Inicio:</span> {conv.fechaInicioPresentacion || '-'}</div>
                  <div><span className="text-muted-foreground">Fin:</span> {conv.fechaFinPresentacion || '-'}</div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Evaluación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Inicio:</span> {conv.fechaInicioEvaluacion || '-'}</div>
                  <div><span className="text-muted-foreground">Fin:</span> {conv.fechaFinEvaluacion || '-'}</div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Ejecución</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Inicio:</span> {conv.fechaInicioEjecucion || '-'}</div>
                  <div><span className="text-muted-foreground">Fin:</span> {conv.fechaFinEjecucion || '-'}</div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Formulario</p>
                <p>{conv.formulario?.nombre || 'Sin formulario asignado'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
