import { Fragment, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Edicion, Convocatoria, PaginatedResponse, Hito } from '@/data/types'
import { estadoBadge, estadoEdicionLabel, EstadoEdicion, RolUsuario, categoriaHitoLabel } from '@/data/types'
import { formatearMoneda } from '@/lib/presupuesto'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'

const pipelineColumns = [
  { key: EstadoEdicion.Borrador, label: 'Borrador' },
  { key: EstadoEdicion.Presentado, label: 'Presentados' },
  { key: EstadoEdicion.PendienteDeCambios, label: 'Revisión' },
  { key: EstadoEdicion.EnEvaluacion, label: 'Evaluación' },
  { key: EstadoEdicion.Adjudicado, label: 'Adjudicados' },
  { key: EstadoEdicion.EnEjecucion, label: 'Ejecución' },
  { key: EstadoEdicion.Cerrado, label: 'Cerrados' },
]

export function Proyectos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const esRevision = searchParams.get('revision') === 'true'
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [kanbanEdiciones, setKanbanEdiciones] = useState<Edicion[]>([])
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState(esRevision ? EstadoEdicion.Presentado : 'todas')
  const [filtroConv, setFiltroConv] = useState('todas')
  const [filtroAnio, setFiltroAnio] = useState('todas')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<PaginatedResponse<Edicion>['meta'] | null>(null)
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [loading, setLoading] = useState(true)
  const [expandidaId, setExpandidaId] = useState<string | null>(null)
  const [hitosExpansion, setHitosExpansion] = useState<Record<string, Hito[]>>({})
  const [loadingHitosId, setLoadingHitosId] = useState<string | null>(null)

  const esAdmin = user?.roles.some(r =>
    r === RolUsuario.AutoridadDeSecretaria ||
    r === RolUsuario.AsistenteDeSecretaria ||
    r === RolUsuario.AutoridadDeRectorado ||
    r === RolUsuario.AsistenteDeRectorado,
  )

  const toggleExpandir = async (edicionId: string) => {
    if (expandidaId === edicionId) {
      setExpandidaId(null)
      return
    }
    setExpandidaId(edicionId)
    if (!hitosExpansion[edicionId]) {
      setLoadingHitosId(edicionId)
      try {
        const hitos = await api.ejecucion.hitos.listar(edicionId)
        setHitosExpansion(prev => ({ ...prev, [edicionId]: hitos }))
      } catch {
        setHitosExpansion(prev => ({ ...prev, [edicionId]: [] }))
      } finally {
        setLoadingHitosId(null)
      }
    }
  }

  useEffect(() => {
    api.convocatorias.todas().then(setConvocatorias).catch(() => {})
  }, [])

  useEffect(() => {
    setFiltroEtapa(esRevision ? EstadoEdicion.Presentado : 'todas')
    setPage(1)
  }, [esRevision])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (vista !== 'tabla') return
    setLoading(true)
    api.proyectos.list({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      estado: filtroEtapa !== 'todas' ? filtroEtapa : undefined,
      convocatoriaId: filtroConv !== 'todas' ? filtroConv : undefined,
      anio: filtroAnio !== 'todas' ? Number(filtroAnio) : undefined,
    })
      .then(res => {
        setEdiciones(res.data)
        setMeta(res.meta)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, filtroEtapa, filtroConv, filtroAnio, vista])

  useEffect(() => {
    if (vista !== 'kanban') return
    setLoading(true)
    api.proyectos.todas().then(setKanbanEdiciones).catch(() => {}).finally(() => setLoading(false))
  }, [vista])

  const anios = [...new Set(convocatorias.map(c => c.anio))].sort((a, b) => b - a)

  const cambiarEtapa = (v: string) => { setFiltroEtapa(v); setPage(1) }
  const cambiarConv = (v: string) => { setFiltroConv(v); setPage(1) }
  const cambiarAnio = (v: string) => { setFiltroAnio(v); setPage(1) }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {esRevision
              ? 'Proyectos presentados pendientes de revisión'
              : 'Pipeline de proyectos de extensión'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={vista === 'tabla' ? 'default' : 'outline'} onClick={() => setVista('tabla')}>Tabla</Button>
          <Button variant={vista === 'kanban' ? 'default' : 'outline'} onClick={() => setVista('kanban')}>Kanban</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filtroEtapa} onValueChange={cambiarEtapa}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las etapas</SelectItem>
            {pipelineColumns.map(c => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroConv} onValueChange={cambiarConv}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas las convocatorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las convocatorias</SelectItem>
            {convocatorias.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroAnio} onValueChange={cambiarAnio}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Edición" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las ediciones</SelectItem>
            {anios.map(a => (
              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {vista === 'tabla' ? (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Listado de Proyectos</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
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
                      {esAdmin && <TableHead className="w-10"></TableHead>}
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead>Facultad</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Presupuesto</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ediciones.map(e => (
                      <Fragment key={e.id}>
                        <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${e.proyectoId}`)}>
                          {esAdmin && (
                            <TableCell onClick={ev => ev.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpandir(e.id)}
                                disabled={loadingHitosId === e.id}
                                aria-label="Ver hitos de ejecución"
                              >
                                {loadingHitosId === e.id ? (
                                  <Skeleton className="h-3 w-3 rounded-full" />
                                ) : expandidaId === e.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{e.proyecto?.nombre || 'Sin nombre'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{e.creadoPor?.nombreCompleto || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {e.proyecto?.esInterfacultad && e.proyecto.unidadAcademicaAdicionalId !== e.unidadAcademicaId && e.proyecto.unidadAcademicaAdicional
                              ? `${e.unidadAcademica?.nombre} y ${e.proyecto.unidadAcademicaAdicional.nombre}`
                              : e.unidadAcademica?.nombre || '-'}
                          </TableCell>
                          <TableCell><Badge variant={estadoBadge[e.estado]}>{estadoEdicionLabel[e.estado] || e.estado}</Badge></TableCell>
                          <TableCell className="text-sm">{formatearMoneda(e.presupuesto?.montoTotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={e2 => { e2.stopPropagation(); navigate(`/proyectos/${e.proyectoId}`) }}>Ver</Button>
                          </TableCell>
                        </TableRow>
                        {expandidaId === e.id && (
                          <TableRow key={`${e.id}-detalle`}>
                            <TableCell colSpan={esAdmin ? 7 : 6}>
                              <div className="py-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                  Hitos de ejecución
                                </p>
                                <ExpandirHitosDetalle
                                  edicionId={e.id}
                                  hitos={hitosExpansion[e.id]}
                                  loading={loadingHitosId === e.id}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
      ) : (
        loading ? (
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-20" />
                {[...Array(2)].map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3 overflow-x-auto">
            {pipelineColumns.map(col => (
              <div key={col.key} className="min-w-[160px]">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{col.label}</div>
                <div className="space-y-2">
                  {kanbanEdiciones.filter(e => e.estado === col.key).map(e => (
                    <Card key={e.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/proyectos/${e.proyectoId}`)}>
                      <CardContent className="p-3 space-y-1">
                        <p className="text-sm font-medium leading-tight">{e.proyecto?.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground">{e.creadoPor?.nombreCompleto || '-'}</p>
                        {e.presupuesto && <Badge variant="outline" className="text-xs">{formatearMoneda(e.presupuesto.montoTotal)}</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function ExpandirHitosDetalle({
  hitos,
  loading,
}: {
  edicionId: string
  hitos?: Hito[]
  loading: boolean
}) {
  if (loading) {
    return <Skeleton className="h-16 w-full" />
  }
  if (!hitos || hitos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta edición no tiene hitos de ejecución registrados.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {hitos.map(h => (
        <div key={h.id} className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{h.titulo}</p>
            <Badge variant="outline">{categoriaHitoLabel[h.categoria] || h.categoria}</Badge>
          </div>
          {(h.fechaInicio || h.fechaFin) && (
            <p className="text-xs text-muted-foreground mt-1">
              {h.fechaInicio || '—'}{h.fechaFin ? ` → ${h.fechaFin}` : ''}
            </p>
          )}
          {h.descripcion && (
            <p className="text-sm mt-1">{h.descripcion}</p>
          )}
        </div>
      ))}
    </div>
  )
}
