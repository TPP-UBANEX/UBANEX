import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Convocatoria, ParticipacionConvocatoria, PaginatedResponse } from '@/data/types'
import { RolUsuario, RolEjecucion, EstadoPropuestaEvaluador } from '@/data/types'
import { estadoBadge, estadoConvocatoriaLabel } from '@/data/types'
import { toast } from 'sonner'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'

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

  const hoy = new Date(new Date().toISOString().split('T')[0])

  if (ip && ip < hoy) e.fechaInicioPresentacion = 'La fecha de inicio no puede ser anterior a hoy'
  if (fp && fp < hoy) e.fechaFinPresentacion = 'La fecha de fin no puede ser anterior a hoy'
  if (ie && ie < hoy) e.fechaInicioEvaluacion = 'La fecha de inicio no puede ser anterior a hoy'
  if (fe && fe < hoy) e.fechaFinEvaluacion = 'La fecha de fin no puede ser anterior a hoy'
  if (iej && iej < hoy) e.fechaInicioEjecucion = 'La fecha de inicio no puede ser anterior a hoy'
  if (fej && fej < hoy) e.fechaFinEjecucion = 'La fecha de fin no puede ser anterior a hoy'

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

export function Convocatorias() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const esGestion = user?.roles.some(r =>
    [RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado,
     RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria].includes(r),
  )
  const [data, setData] = useState<Convocatoria[]>([])
  const [todas, setTodas] = useState<Convocatoria[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<Convocatoria>['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [tab, setTab] = useState('todas')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [convocatoriasEvaluador, setConvocatoriasEvaluador] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    nombre: '', descripcion: '', anio: new Date().getFullYear(),
    fechaInicioPresentacion: '', fechaFinPresentacion: '',
    fechaInicioEvaluacion: '', fechaFinEvaluacion: '',
    fechaInicioEjecucion: '', fechaFinEjecucion: '',
  })

  const errores = erroresFechas(form)

  const cargar = useCallback(() => {
    setLoading(true)
    const params = tab === 'todas'
      ? {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          estado: filtroEstado !== 'todas' ? filtroEstado : undefined,
        }
      : { page, limit: 10, fase: tab }
    Promise.all([
      api.convocatorias.list(params),
      api.convocatorias.todas(),
    ])
      .then(([res, todas]) => {
        setData(res.data)
        setMeta(res.meta)
        setTodas(todas)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, filtroEstado, tab])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (esGestion) return
    const estadosActivos = [
      EstadoPropuestaEvaluador.Propuesto,
      EstadoPropuestaEvaluador.Aceptada,
      EstadoPropuestaEvaluador.Aprobado,
    ]
    api.participaciones.listarMias()
      .then((part: ParticipacionConvocatoria[]) => {
        setConvocatoriasEvaluador(new Set(
          part
            .filter(p => p.rol === RolEjecucion.Evaluador && p.estado && estadosActivos.includes(p.estado))
            .map(p => p.convocatoriaId),
        ))
      })
      .catch(() => {})
  }, [esGestion])

  const handleCrear = async () => {
    if (!form.nombre || !form.anio) {
      toast.error('Completá los campos obligatorios')
      return
    }

    const errorFechas = validarFechas(form)
    if (errorFechas) {
      toast.error(errorFechas)
      return
    }

    setCreando(true)
    try {
      await api.convocatorias.crear(form)
      toast.success('Convocatoria creada correctamente')
      setOpen(false)
      setForm({
        nombre: '', descripcion: '', anio: new Date().getFullYear(),
        fechaInicioPresentacion: '', fechaFinPresentacion: '',
        fechaInicioEvaluacion: '', fechaFinEvaluacion: '',
        fechaInicioEjecucion: '', fechaFinEjecucion: '',
      })
      cargar()
    } catch (err) {
      const detalle = err instanceof Error ? err.message : ''
      toast.error(detalle ? `Error al crear la convocatoria: ${detalle}` : 'Error al crear la convocatoria')
    } finally {
      setCreando(false)
    }
  }

  const convocatoriasVisibles = todas

  const activas = convocatoriasVisibles.filter(c => c.estado === 'presentacion' || c.estado === 'evaluacion')
  const pasadas = convocatoriasVisibles.filter(c => c.estado === 'ejecucion' || c.estado === 'cierre')

  const cambiarEstado = (v: string) => { setFiltroEstado(v); setPage(1) }
  const cambiarTab = (v: string) => { setTab(v); setPage(1) }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Gestión de convocatorias UBANEX</p>
        </div>
        {user?.roles.includes(RolUsuario.AutoridadDeRectorado) && (
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva Convocatoria</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Convocatoria</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4 min-w-0">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nombre</p>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre de la convocatoria" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Descripción</p>
                <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Año</p>
                <Input type="number" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Presentación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                    <Input type="date" className="mt-1" value={form.fechaInicioPresentacion} onChange={e => setForm(f => ({ ...f, fechaInicioPresentacion: e.target.value }))} />
                    {errores.fechaInicioPresentacion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioPresentacion}</p>}
                  </div>
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Fin</p>
                    <Input type="date" className="mt-1" value={form.fechaFinPresentacion} onChange={e => setForm(f => ({ ...f, fechaFinPresentacion: e.target.value }))} />
                    {errores.fechaFinPresentacion && <p className="text-xs text-destructive mt-2">{errores.fechaFinPresentacion}</p>}
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Evaluación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                    <Input type="date" className="mt-1" value={form.fechaInicioEvaluacion} onChange={e => setForm(f => ({ ...f, fechaInicioEvaluacion: e.target.value }))} />
                    {errores.fechaInicioEvaluacion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioEvaluacion}</p>}
                  </div>
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Fin</p>
                    <Input type="date" className="mt-1" value={form.fechaFinEvaluacion} onChange={e => setForm(f => ({ ...f, fechaFinEvaluacion: e.target.value }))} />
                    {errores.fechaFinEvaluacion && <p className="text-xs text-destructive mt-2">{errores.fechaFinEvaluacion}</p>}
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Ejecución</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                    <Input type="date" className="mt-1" value={form.fechaInicioEjecucion} onChange={e => setForm(f => ({ ...f, fechaInicioEjecucion: e.target.value }))} />
                    {errores.fechaInicioEjecucion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioEjecucion}</p>}
                  </div>
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Fin</p>
                    <Input type="date" className="mt-1" value={form.fechaFinEjecucion} onChange={e => setForm(f => ({ ...f, fechaFinEjecucion: e.target.value }))} />
                    {errores.fechaFinEjecucion && <p className="text-xs text-destructive mt-2">{errores.fechaFinEjecucion}</p>}
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={handleCrear} disabled={creando}>
                {creando ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filtroEstado} onValueChange={cambiarEstado}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="configuracion">Configuración</SelectItem>
            <SelectItem value="presentacion">Presentación</SelectItem>
            <SelectItem value="evaluacion">Evaluación</SelectItem>
            <SelectItem value="ejecucion">Ejecución</SelectItem>
            <SelectItem value="cierre">Cierre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={cambiarTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas ({convocatoriasVisibles.length})</TabsTrigger>
          <TabsTrigger value="activas">Activas ({activas.length})</TabsTrigger>
          <TabsTrigger value="pasadas">Pasadas ({pasadas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="todas" className="mt-4">
          {loading ? <TableSkeleton /> : <TablaConvocatorias data={data} convocatoriasEvaluador={convocatoriasEvaluador} meta={meta} page={page} onPage={setPage} onClick={id => navigate(`/convocatorias/${id}`)} />}
        </TabsContent>
        <TabsContent value="activas" className="mt-4">
          {loading ? <TableSkeleton /> : <TablaConvocatorias data={data} convocatoriasEvaluador={convocatoriasEvaluador} meta={meta} page={page} onPage={setPage} onClick={id => navigate(`/convocatorias/${id}`)} />}
        </TabsContent>
        <TabsContent value="pasadas" className="mt-4">
          {loading ? <TableSkeleton /> : <TablaConvocatorias data={data} convocatoriasEvaluador={convocatoriasEvaluador} meta={meta} page={page} onPage={setPage} onClick={id => navigate(`/convocatorias/${id}`)} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TablaConvocatorias({ data, convocatoriasEvaluador, meta, page, onPage, onClick }: {
  data: Convocatoria[]
  convocatoriasEvaluador: Set<string>
  meta: PaginatedResponse<Convocatoria>['meta'] | null
  page: number
  onPage: (p: number | ((prev: number) => number)) => void
  onClick: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Listado</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No hay convocatorias que coincidan con la búsqueda</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Formulario</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(c => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => onClick(c.id)}>
                    <TableCell className="font-medium">
                      {c.nombre}
                      {convocatoriasEvaluador.has(c.id) && (
                        <Badge variant="secondary" className="ml-2">Sos evaluador</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.anio}</TableCell>
                    <TableCell><Badge variant={estadoBadge[c.estado]}>{estadoConvocatoriaLabel[c.estado] || c.estado}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.fechaInicioPresentacion && c.fechaFinPresentacion
                        ? `${c.fechaInicioPresentacion} — ${c.fechaFinPresentacion}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.formulario?.campos?.length
                        ? `${c.formulario.campos.length} campos`
                        : 'Sin configurar'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onClick(c.id) }}>Ver</Button>
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
                  onClick={() => onPage(p => Math.max(1, p - 1))}
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
                        onClick={() => onPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => onPage(p => Math.min(meta.totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
