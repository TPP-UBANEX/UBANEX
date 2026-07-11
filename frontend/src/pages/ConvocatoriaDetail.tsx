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
import type { Convocatoria, Formulario, Proyecto } from '@/data/types'
import { RolUsuario } from '@/data/types'
import { estadoBadge } from '@/data/types'
import { toast } from 'sonner'
import { EmparejamientoTab } from '@/components/EmparejamientoTab'
import { ArrowLeft, FileText, Pencil, Plus, Trash2 } from 'lucide-react'

export function ConvocatoriaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conv, setConv] = useState<Convocatoria | null>(null)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', anio: new Date().getFullYear(), estado: '', formularioId: '', fechaInicioPresentacion: '', fechaFinPresentacion: '', fechaInicioEvaluacion: '', fechaFinEvaluacion: '', fechaInicioEjecucion: '', fechaFinEjecucion: '' })
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    if (!id) return
    Promise.all([
      api.convocatorias.get(id),
      api.proyectos.list({ convocatoriaId: id }),
      api.formularios.list(),
    ]).then(([c, p, f]) => {
      setConv(c)
      setProyectos(p)
      setFormularios(f)
    }).finally(() => setLoading(false))
  }

  useEffect(cargar, [id])

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

  const handleGuardar = async () => {
    if (!id || !conv) return
    setGuardando(true)
    try {
      const actualizada = await api.convocatorias.actualizar(id, editForm)
      setConv(actualizada)
      toast.success('Convocatoria actualizada correctamente')
      setEditOpen(false)
    } catch {
      toast.error('Error al actualizar la convocatoria')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!id || !conv) return
    if (!confirm('¿Estás seguro de eliminar esta convocatoria?')) return
    try {
      await api.convocatorias.eliminar(id)
      toast.success('Convocatoria eliminada correctamente')
      navigate('/convocatorias')
    } catch {
      toast.error('Error al eliminar la convocatoria')
    }
  }

  if (loading) return <DetailSkeleton />

  if (!conv) return <div className="p-6"><p className="text-muted-foreground">Convocatoria no encontrada</p></div>

  const conteo = {
    presentado: proyectos.filter(p => p.estado === 'presentado').length,
    revision: proyectos.filter(p => p.estado === 'revision').length,
    evaluacion: proyectos.filter(p => p.estado === 'evaluacion').length,
    adjudicado: proyectos.filter(p => p.estado === 'adjudicado').length,
    ejecucion: proyectos.filter(p => p.estado === 'ejecucion').length,
    rendicion: proyectos.filter(p => p.estado === 'rendicion').length,
    cerrado: proyectos.filter(p => p.estado === 'cerrado').length,
  }

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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Editar Convocatoria</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
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
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Inicio</p>
                        <Input type="date" value={editForm.fechaInicioPresentacion} onChange={e => setEditForm(f => ({ ...f, fechaInicioPresentacion: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Fin</p>
                        <Input type="date" value={editForm.fechaFinPresentacion} onChange={e => setEditForm(f => ({ ...f, fechaFinPresentacion: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Evaluación</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Inicio</p>
                        <Input type="date" value={editForm.fechaInicioEvaluacion} onChange={e => setEditForm(f => ({ ...f, fechaInicioEvaluacion: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Fin</p>
                        <Input type="date" value={editForm.fechaFinEvaluacion} onChange={e => setEditForm(f => ({ ...f, fechaFinEvaluacion: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-semibold">Ejecución</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Inicio</p>
                        <Input type="date" value={editForm.fechaInicioEjecucion} onChange={e => setEditForm(f => ({ ...f, fechaInicioEjecucion: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Fin</p>
                        <Input type="date" value={editForm.fechaFinEjecucion} onChange={e => setEditForm(f => ({ ...f, fechaFinEjecucion: e.target.value }))} />
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
          <TabsTrigger value="proyectos">Proyectos ({proyectos.length})</TabsTrigger>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="emparejamiento">Emparejamiento</TabsTrigger>
        </TabsList>
        <TabsContent value="proyectos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Proyectos Presentados</CardTitle>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyectos.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${p.id}`)}>
                      <TableCell className="font-medium">{p.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.director}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.facultad}</TableCell>
                      <TableCell><Badge variant={estadoBadge[p.estado]}>{p.estado}</Badge></TableCell>
                      <TableCell className="text-sm">{p.puntaje ?? '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(`/proyectos/${p.id}`) }}>Ver</Button>
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
