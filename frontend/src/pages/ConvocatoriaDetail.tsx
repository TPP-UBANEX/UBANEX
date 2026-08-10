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
import type { Convocatoria, Edicion, ParticipacionConvocatoria, PaginatedResponse } from '@/data/types'
import { estadoBadge, estadoConvocatoriaLabel, estadoEdicionLabel, EstadoEdicion, RolUsuario, RolEjecucion, EstadoPropuestaEvaluador } from '@/data/types'
import { NuevoProyectoDialog } from '@/components/NuevoProyectoDialog'
import { EmparejamientoTab } from '@/components/EmparejamientoTab'
import { AsignacionEvaluadores } from '@/components/AsignacionEvaluadores'
import { FormularioBuilderTab } from '@/components/FormularioBuilderTab'
import { EvaluacionConfigTab } from '@/components/EvaluacionConfigTab'
import { ArrowLeft, Pencil, Plus, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [todasEdiciones, setTodasEdiciones] = useState<Edicion[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Edicion>['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('todas')
  const [filtroAnio, setFiltroAnio] = useState('todas')
  const [invitacionEvaluador, setInvitacionEvaluador] = useState<ParticipacionConvocatoria | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTabla, setLoadingTabla] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', anio: new Date().getFullYear(), estado: '', fechaInicioPresentacion: '', fechaFinPresentacion: '', fechaInicioEvaluacion: '', fechaFinEvaluacion: '', fechaInicioEjecucion: '', fechaFinEjecucion: '' })
  const [guardando, setGuardando] = useState(false)
  const [confirmEditOpen, setConfirmEditOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const esUsuarioEjecucion = user?.roles.some(
    r => r === RolUsuario.Estudiante || r === RolUsuario.Docente,
  )
  const esRectorado = user?.roles.some(
    r => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
  )
  const errores = erroresFechas(editForm)

  const tieneInvPendiente = invitacionEvaluador?.estado === EstadoPropuestaEvaluador.Propuesto
  const esEvaluadorActivo =
    invitacionEvaluador?.estado === EstadoPropuestaEvaluador.Aceptada ||
    invitacionEvaluador?.estado === EstadoPropuestaEvaluador.Aprobado

  const cargarDatos = () => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.convocatorias.get(id),
      api.proyectos.todas({ convocatoriaId: id }),
      api.participaciones.listarMias().catch(() => []),
    ]).then(([c, e, p]) => {
      setConv(c)
      setTodasEdiciones(e)
      const evaluador = (p as ParticipacionConvocatoria[]).find(pc =>
        pc.convocatoriaId === id && pc.rol === RolEjecucion.Evaluador,
      ) ?? null
      setInvitacionEvaluador(evaluador)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoadingTabla(true)
    api.proyectos.list({
      convocatoriaId: id,
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      estado: filtroEtapa !== 'todas' ? filtroEtapa : undefined,
      anio: filtroAnio !== 'todas' ? Number(filtroAnio) : undefined,
    })
      .then(res => {
        setEdiciones(res.data)
        setMeta(res.meta)
      })
      .catch(() => {})
      .finally(() => setLoadingTabla(false))
  }, [id, page, debouncedSearch, filtroEtapa, filtroAnio])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const cambiarEtapa = (v: string) => { setFiltroEtapa(v); setPage(1) }
  const cambiarAnio = (v: string) => { setFiltroAnio(v); setPage(1) }

  const responderInvitacion = async (aceptada: boolean) => {
    if (!invitacionEvaluador) return
    try {
      await (aceptada
        ? api.participaciones.aceptar(invitacionEvaluador.id)
        : api.participaciones.declinar(invitacionEvaluador.id))
      toast.success(aceptada ? 'Aceptaste la propuesta como evaluador' : 'Declinaste la propuesta')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al responder la propuesta')
    }
  }

  const abrirEdicion = () => {
    if (!conv) return
    setEditForm({
      nombre: conv.nombre,
      descripcion: conv.descripcion || '',
      anio: conv.anio,
      estado: conv.estado,
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
    conteo[estado] = todasEdiciones.filter(e => e.estado === estado).length
  })

  const anios = [...new Set(todasEdiciones.map(e => e.anioEdicion).filter((a): a is number => a != null))].sort((a, b) => b - a)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/convocatorias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant={estadoBadge[conv.estado]}>{estadoConvocatoriaLabel[conv.estado] || conv.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{conv.descripcion}</p>
        </div>
        {user?.roles.includes(RolUsuario.AutoridadDeRectorado) && (
          <div className="flex gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={abrirEdicion}><Pencil className="h-4 w-4 mr-1" />Editar Convocatoria</Button>
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
                  <Button className="w-full" onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={handleEliminar}><Trash2 className="h-4 w-4 mr-1" />Eliminar Convocatoria</Button>

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
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">{estadoEdicionLabel[etapa] || etapa}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="proyectos">
        <TabsList>
          <TabsTrigger value="proyectos">Proyectos ({todasEdiciones.length})</TabsTrigger>
          {!esUsuarioEjecucion && (
            <TabsTrigger value="evaluadores">Evaluadores</TabsTrigger>
          )}
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="emparejamiento">Emparejamiento</TabsTrigger>
          {esRectorado && <TabsTrigger value="formulario">Formulario</TabsTrigger>}
          {esRectorado && <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>}
        </TabsList>
        <TabsContent value="proyectos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Proyectos Presentados</CardTitle>
              {esUsuarioEjecucion && !tieneInvPendiente && !esEvaluadorActivo && (
                <NuevoProyectoDialog
                  onCreated={cargarDatos}
                  convocatoriaId={conv?.id}
                  convocatoriaNombre={conv?.nombre}
                  trigger={
                    <Button><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
                  }
                />
              )}
            </CardHeader>
            {esUsuarioEjecucion && tieneInvPendiente && (
              <div className="px-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted rounded-md px-3 py-3">
                  <p className="text-sm text-muted-foreground">
                    Fuiste propuesto como evaluador de esta convocatoria. Mientras no respondas, no podés presentar proyectos.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => responderInvitacion(true)}>Aceptar</Button>
                    <Button size="sm" variant="outline" onClick={() => responderInvitacion(false)}>Declinar</Button>
                  </div>
                </div>
              </div>
            )}
            {esUsuarioEjecucion && esEvaluadorActivo && (
              <div className="px-6 pb-4">
                <p className="text-sm bg-muted text-muted-foreground rounded-md px-3 py-2">
                  Sos evaluador de esta convocatoria. No podés presentar proyectos.
                </p>
              </div>
            )}
            <div className="px-6 pb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filtroEtapa} onValueChange={cambiarEtapa}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las etapas</SelectItem>
                  {Object.values(EstadoEdicion).map(s => (
                    <SelectItem key={s} value={s}>{estadoEdicionLabel[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroAnio} onValueChange={cambiarAnio}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Edición" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las ediciones</SelectItem>
                  {anios.map(a => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CardContent>
              {loadingTabla ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : ediciones.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No hay proyectos que coincidan con la búsqueda</div>
              ) : (
                <>
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
                          <TableCell><Badge variant={estadoBadge[e.estado]}>{estadoEdicionLabel[e.estado] || e.estado}</Badge></TableCell>
                          <TableCell className="text-sm">${(e.presupuesto?.montoTotal ?? 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={e2 => { e2.stopPropagation(); navigate(`/proyectos/${e.proyectoId}`) }}>Ver</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 2)
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center gap-1">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="text-muted-foreground px-1">...</span>
                            )}
                            <Button
                              variant={p === page ? 'default' : 'outline'}
                              size="sm"
                              className="min-w-[2rem]"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          </span>
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emparejamiento" className="mt-4">
          {id && <EmparejamientoTab convocatoriaId={id} />}
        </TabsContent>
        {esRectorado && (
          <TabsContent value="formulario" className="mt-4">
            {id && conv && <FormularioBuilderTab convocatoriaId={id} estadoConvocatoria={conv.estado} />}
          </TabsContent>
        )}
        {esRectorado && (
          <TabsContent value="evaluacion" className="mt-4">
            {id && conv && <EvaluacionConfigTab convocatoriaId={id} estadoConvocatoria={conv.estado} />}
          </TabsContent>
        )}
        <TabsContent value="evaluadores" className="mt-4">
          <Card>
            <CardContent className="pt-6">
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
                <div><span className="text-muted-foreground">Estado:</span> {estadoConvocatoriaLabel[conv.estado] || conv.estado}</div>
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
                <p>
                  {conv.formulario?.campos?.length
                    ? `${conv.formulario.campos.length} campos definidos`
                    : 'Sin campos definidos'}
                </p>
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
