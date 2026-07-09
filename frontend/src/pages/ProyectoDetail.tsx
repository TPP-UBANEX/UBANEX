import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Proyecto, Edicion, Presupuesto, ViaticoPresupuesto, BienPresupuesto, Usuario } from '@/data/types'
import { estadoBadge, EstadoEdicion, TipoRubro, RolUsuario } from '@/data/types'
import { ArrowLeft, Loader2, Pencil, Send, Save } from 'lucide-react'
import { toast } from 'sonner'

const tipoRubroLabels: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
}

export function ProyectoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const [editando, setEditando] = useState(false)
  const [editNombre, setEditNombre] = useState('')
  const [editCodirectorId, setEditCodirectorId] = useState('')
  const [editPresupuesto, setEditPresupuesto] = useState<Presupuesto | null>(null)
  const [directores, setDirectores] = useState<Usuario[]>([])
  const [guardando, setGuardando] = useState(false)

  const esPropietario = edicion && (edicion.directorId === user?.id || edicion.codirectorId === user?.id)
  const esEditable = esPropietario && edicion?.estado === EstadoEdicion.Borrador

  const cargarDatos = async () => {
    if (!id) return
    setLoading(true)
    try {
      const p = await api.proyectos.get(id)
      setProyecto(p)
      const eds = p.ediciones || []
      const ed = eds.length > 0 ? eds[0] : null
      setEdicion(ed)

      if (ed && user?.unidadAcademicaId) {
        const resp = await api.usuarios.list({ rol: RolUsuario.DirectorDeProyecto, unidadAcademicaId: user.unidadAcademicaId, limit: 50 })
        setDirectores(resp.data.filter(u => u.id !== user.id))
      }
    } catch {
      toast.error('Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  const iniciarEdicion = () => {
    if (!proyecto || !edicion) return
    setEditNombre(proyecto.nombre)
    setEditCodirectorId(edicion.codirectorId || '')
    setEditPresupuesto(edicion.presupuesto ? JSON.parse(JSON.stringify(edicion.presupuesto)) : null)
    setEditando(true)
  }

  const cancelarEdicion = () => {
    setEditando(false)
  }

  const handleGuardar = async () => {
    if (!id || !edicion) return
    setGuardando(true)
    try {
      await api.proyectos.actualizarEdicion(id, edicion.id, {
        nombre: editNombre,
        codirectorId: editCodirectorId || undefined,
        presupuesto: editPresupuesto || undefined,
      })
      toast.success('Proyecto actualizado')
      setEditando(false)
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEnviar = async () => {
    if (!id || !edicion) return
    setEnviando(true)
    try {
      await api.proyectos.enviarEdicion(id, edicion.id)
      toast.success('Proyecto enviado para corrección')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <ProyectoDetailSkeleton />

  if (!proyecto) return <div className="p-6"><p className="text-muted-foreground">Proyecto no encontrado</p></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{proyecto.nombre}</h1>
            {edicion && <Badge variant={estadoBadge[edicion.estado]}>{edicion.estado}</Badge>}
          </div>
          {edicion && (
            <p className="text-sm text-muted-foreground">
              {edicion.director?.nombreCompleto || 'Sin director'} · {edicion.unidadAcademica?.nombre || 'Sin UA'}
              {edicion.convocatoria && ` · ${edicion.convocatoria.nombre}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {esEditable && !editando && (
            <>
              <Button variant="outline" size="sm" onClick={iniciarEdicion}>
                <Pencil className="h-4 w-4 mr-2" />Editar
              </Button>
              <Button size="sm" onClick={handleEnviar} disabled={enviando}>
                {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar para corrección
              </Button>
            </>
          )}
          {editando && (
            <>
              <Button variant="outline" size="sm" onClick={cancelarEdicion}>Cancelar</Button>
              <Button size="sm" onClick={handleGuardar} disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Director</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{edicion?.director?.nombreCompleto || '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Unidad Académica</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{edicion?.unidadAcademica?.nombre || '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Codirector</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{edicion?.codirector?.nombreCompleto || '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Presupuesto</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-bold">${(edicion?.presupuesto?.montoTotal ?? 0).toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
          <TabsTrigger value="rendiciones">Rendiciones</TabsTrigger>
          <TabsTrigger value="cierre">Cierre</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          {editando ? (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Editar proyecto</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Nombre del proyecto</p>
                  <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Codirector</p>
                  <Select value={editCodirectorId} onValueChange={setEditCodirectorId}>
                    <SelectTrigger><SelectValue placeholder="Sin codirector" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin codirector</SelectItem>
                      {directores.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.nombreCompleto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Detalle del proyecto</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Nombre:</span> {proyecto.nombre}</div>
                  <div><span className="text-muted-foreground">Director:</span> {edicion?.director?.nombreCompleto || '-'}</div>
                  <div><span className="text-muted-foreground">Codirector:</span> {edicion?.codirector?.nombreCompleto || '-'}</div>
                  <div><span className="text-muted-foreground">Unidad Académica:</span> {edicion?.unidadAcademica?.nombre || '-'}</div>
                  <div><span className="text-muted-foreground">Convocatoria:</span> {edicion?.convocatoria?.nombre || '-'}</div>
                  <div><span className="text-muted-foreground">Estado:</span> {edicion?.estado || '-'}</div>
                  <div><span className="text-muted-foreground">Consolidado:</span> {proyecto.esConsolidado ? 'Sí' : 'No'}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="presupuesto" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
              <span className="text-sm font-bold">Total: ${(editPresupuesto?.montoTotal ?? edicion?.presupuesto?.montoTotal ?? 0).toLocaleString()}</span>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPresupuesto(editPresupuesto || edicion?.presupuesto || null, editando)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluaciones" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Evaluaciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                {edicion?.estado === EstadoEdicion.Borrador || edicion?.estado === EstadoEdicion.Presentado
                  ? 'El proyecto aún no está en etapa de evaluación.'
                  : 'Módulo de evaluaciones próximamente.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rendiciones" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Rendiciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                {edicion?.estado !== EstadoEdicion.EnEjecucion && edicion?.estado !== EstadoEdicion.Cerrado
                  ? 'El proyecto aún no está en etapa de ejecución.'
                  : 'Módulo de rendiciones próximamente.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cierre" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Cierre</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                {edicion?.estado === EstadoEdicion.Cerrado
                  ? 'Proyecto cerrado.'
                  : 'El cierre estará disponible cuando corresponda.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function renderPresupuesto(presupuesto: Presupuesto | null, _editando: boolean) {
  if (!presupuesto || !presupuesto.rubros || presupuesto.rubros.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Sin presupuesto cargado</p>
  }

  return (
    <div className="space-y-4">
      {presupuesto.rubros.map((rubro) => (
        <div key={rubro.tipo} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{tipoRubroLabels[rubro.tipo as TipoRubro]}</h4>
            <span className="text-xs text-muted-foreground">Subtotal: ${rubro.subtotal.toLocaleString()}</span>
          </div>

          {rubro.partidas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin partidas</p>
          ) : rubro.tipo === TipoRubro.ViaticosYSeguros ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rubro.partidas as ViaticoPresupuesto[]).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{p.tipoPersona}</TableCell>
                    <TableCell className="text-sm">{p.descripcion}</TableCell>
                    <TableCell className="text-sm">{p.periodo}</TableCell>
                    <TableCell className="text-sm">${p.monto.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>P. Unit.</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rubro.partidas as BienPresupuesto[]).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{p.descripcion}</TableCell>
                    <TableCell className="text-sm">{p.cantidad}</TableCell>
                    <TableCell className="text-sm">${p.precioUnitario.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">${p.monto.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ))}
    </div>
  )
}

function ProyectoDetailSkeleton() {
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
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-md" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}
