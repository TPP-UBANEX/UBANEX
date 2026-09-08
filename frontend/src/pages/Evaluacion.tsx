import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { esRectorado, esSecretaria } from '@/lib/evaluacion-roles'
import {
  EstadoConvocatoria,
  EstadoEvaluacion,
  TipoEvaluacionCruzada,
  estadoBadge,
  estadoEdicionLabel,
  tipoCruzadaLabel,
} from '@/data/types'
import type {
  Convocatoria,
  Edicion,
  EdicionEvaluableInstitucional,
  EdicionEvaluableCruzada,
  MonitoreoEvaluacion,
  UnidadAcademica,
  PaginationMeta,
  CandidatoTerceraUa,
} from '@/data/types'
import { Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'

export function Evaluacion() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [loadingConv, setLoadingConv] = useState(true)

  const convocatoriaId = searchParams.get('convocatoria') ?? ''

  useEffect(() => {
    api.convocatorias
      .todas()
      .then((cs) => {
        const evaluables = cs.filter((c) => c.estado === EstadoConvocatoria.Evaluacion)
        setConvocatorias(evaluables)
        const actual = searchParams.get('convocatoria')
        if ((!actual || !evaluables.some((c) => c.id === actual)) && evaluables.length > 0) {
          setSearchParams({ convocatoria: evaluables[0].id }, { replace: true })
        }
      })
      .finally(() => setLoadingConv(false))
  }, [])

  const cambiarConvocatoria = (id: string) => {
    setSearchParams({ convocatoria: id })
  }

  const vista: 'monitoreo' | 'institucional' | 'cruzada' = esRectorado(user)
    ? 'monitoreo'
    : esSecretaria(user)
      ? 'institucional'
      : 'cruzada'

  return (
    <div className="p-6 flex-1 min-h-0 flex flex-col gap-6">
      <div className="space-y-1 max-w-sm shrink-0">
        <span className="text-xs text-muted-foreground">Convocatoria en evaluación</span>
        {loadingConv ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={convocatoriaId}
            onValueChange={cambiarConvocatoria}
            disabled={!convocatoriaId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar convocatoria..." />
            </SelectTrigger>
            <SelectContent>
              {convocatorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {convocatoriaId ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {vista === 'monitoreo' ? (
            <MonitoreoView key={convocatoriaId} convocatoriaId={convocatoriaId} />
          ) : vista === 'institucional' ? (
            <InstitucionalView
              key={convocatoriaId}
              convocatoriaId={convocatoriaId}
              onSeleccionar={(id) =>
                navigate(`/evaluacion/${id}?convocatoria=${convocatoriaId}`)
              }
            />
          ) : (
            <CruzadaView
              key={convocatoriaId}
              convocatoriaId={convocatoriaId}
              onSeleccionar={(id) =>
                navigate(`/evaluacion/${id}?convocatoria=${convocatoriaId}`)
              }
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay convocatorias en etapa de evaluación.
        </p>
      )}
    </div>
  )
}

// ───────────── Institucional (índice) ─────────────

function InstitucionalView({
  convocatoriaId,
  onSeleccionar,
}: {
  convocatoriaId: string
  onSeleccionar: (edicionId: string) => void
}) {
  const [items, setItems] = useState<EdicionEvaluableInstitucional[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')

  useEffect(() => {
    setLoading(true)
    api.evaluaciones.institucionales
      .listar(convocatoriaId, {
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        estado: filtroEstado !== 'todas' ? filtroEstado : undefined,
      })
      .then((res) => {
        setItems(res.data)
        setMeta(res.meta)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [convocatoriaId, page, debouncedSearch, filtroEstado])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const cambiarEstado = (v: string) => {
    setFiltroEstado(v)
    setPage(1)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filtroEstado} onValueChange={cambiarEstado}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los estados</SelectItem>
            <SelectItem value="sin_evaluar">Sin evaluar</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Proyectos de mi Unidad Académica</CardTitle>
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.total} proyecto{meta.total !== 1 ? 's' : ''} &middot; p&aacute;gina {meta.page} de {meta.totalPages || 1}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay ediciones en evaluación de tu Unidad Académica.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(({ edicion, evaluacion }) => (
                <button
                  key={edicion.id}
                  onClick={() => onSeleccionar(edicion.id)}
                  className="text-left border rounded-lg p-3 space-y-1"
                >
                  <p className="text-sm font-medium">
                    {edicion.proyecto?.nombre || edicion.proyectoId}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={estadoBadge[edicion.estado]}>
                      {estadoEdicionLabel[edicion.estado]}
                    </Badge>
                    {evaluacion && (
                      <Badge
                        variant={
                          evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'
                        }
                      >
                        {evaluacion.estado === EstadoEvaluacion.Confirmada
                          ? 'Confirmada'
                          : 'Borrador'}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <Paginador meta={meta} page={page} onPage={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────── Cruzada (índice) ─────────────

function CruzadaView({
  convocatoriaId,
  onSeleccionar,
}: {
  convocatoriaId: string
  onSeleccionar: (edicionId: string) => void
}) {
  const [items, setItems] = useState<EdicionEvaluableCruzada[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')

  useEffect(() => {
    setLoading(true)
    api.evaluaciones.cruzadas
      .disponibles(convocatoriaId, {
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        estado: filtroEstado !== 'todas' ? filtroEstado : undefined,
      })
      .then((res) => {
        setItems(res.data)
        setMeta(res.meta)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [convocatoriaId, page, debouncedSearch, filtroEstado])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const cambiarEstado = (v: string) => {
    setFiltroEstado(v)
    setPage(1)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filtroEstado} onValueChange={cambiarEstado}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los estados</SelectItem>
            <SelectItem value="sin_evaluar">Sin evaluar</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Evaluaciones disponibles</CardTitle>
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.total} proyecto{meta.total !== 1 ? 's' : ''} &middot; p&aacute;gina {meta.page} de {meta.totalPages || 1}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay ediciones disponibles para evaluar.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(({ edicion, tipo, evaluacion }) => (
                <button
                  key={edicion.id}
                  onClick={() => onSeleccionar(edicion.id)}
                  className="text-left border rounded-lg p-3 space-y-1"
                >
                  <p className="text-sm font-medium">
                    {edicion.proyecto?.nombre || edicion.proyectoId}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{tipoCruzadaLabel[tipo]}</Badge>
                    <Badge variant={estadoBadge[edicion.estado]}>
                      {estadoEdicionLabel[edicion.estado]}
                    </Badge>
                    {evaluacion && (
                      <Badge
                        variant={
                          evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'
                        }
                      >
                        {evaluacion.estado === EstadoEvaluacion.Confirmada
                          ? 'Confirmada'
                          : 'Borrador'}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <Paginador meta={meta} page={page} onPage={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────── Monitoreo (Rectorado) ─────────────

function MonitoreoView({ convocatoriaId }: { convocatoriaId: string }) {
  const [data, setData] = useState<MonitoreoEvaluacion | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [unidadAcademicaId, setUnidadAcademicaId] = useState('')
  const [uas, setUas] = useState<UnidadAcademica[]>([])
  const [edicionTercera, setEdicionTercera] = useState<{
    edicion: Edicion
    diferencia: number
    umbral: number
  } | null>(null)
  const [candidatos, setCandidatos] = useState<CandidatoTerceraUa[]>([])
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false)
  const [designando, setDesignando] = useState(false)
  const [filtroUaCandidatos, setFiltroUaCandidatos] = useState('')
  const [filtroTextoCandidatos, setFiltroTextoCandidatos] = useState('')
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    api.unidadesAcademicas.list().then(setUas).catch(() => setUas([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    api.evaluaciones
      .monitoreo(convocatoriaId, {
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        unidadAcademicaId: unidadAcademicaId || undefined,
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [convocatoriaId, page, debouncedSearch, unidadAcademicaId, refetchKey])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const cambiarUa = (v: string) => {
    setUnidadAcademicaId(v)
    setPage(1)
  }

  const abrirDialogoTercera = (edicion: Edicion, diferencia: number, umbral: number) => {
    setEdicionTercera({ edicion, diferencia, umbral })
    setCandidatos([])
    setFiltroUaCandidatos('')
    setFiltroTextoCandidatos('')
    setCargandoCandidatos(true)
    api.evaluaciones.cruzadas
      .candidatosTercera(convocatoriaId, edicion.id)
      .then(setCandidatos)
      .catch(() => {
        toast.error('No se pudieron cargar los candidatos para la tercera UA')
      })
      .finally(() => setCargandoCandidatos(false))
  }

  const designar = (evaluadorId: string) => {
    if (!edicionTercera) return
    setDesignando(true)
    api.evaluaciones.cruzadas
      .designarTercera(convocatoriaId, edicionTercera.edicion.id, evaluadorId)
      .then(() => {
        toast.success('Tercera Unidad Académica designada')
        setEdicionTercera(null)
        setRefetchKey((k) => k + 1)
      })
      .catch(() => {
        toast.error('No se pudo designar la tercera Unidad Académica')
      })
      .finally(() => setDesignando(false))
  }

  const yaTieneTercera = (cruzadas: MonitoreoEvaluacion['ediciones'][number]['cruzadas']) =>
    cruzadas.some((c) => c.tipo === TipoEvaluacionCruzada.TerceraUa)

  const candidatosFiltrados = candidatos.filter((c) => {
    if (filtroUaCandidatos && c.unidadAcademica?.id !== filtroUaCandidatos) return false
    if (filtroTextoCandidatos) {
      const t = filtroTextoCandidatos.toLowerCase()
      const nombre = c.nombreCompleto.toLowerCase()
      const email = c.email.toLowerCase()
      if (!nombre.includes(t) && !email.includes(t)) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={unidadAcademicaId} onValueChange={cambiarUa}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todas las UAs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las UAs</SelectItem>
            {uas.map((ua) => (
              <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Estado de evaluación por edición de proyecto</CardTitle>
          {data?.meta && (
            <span className="text-xs text-muted-foreground">
              {data.meta.total} edicion{data.meta.total !== 1 ? 'es' : ''} &middot; p&aacute;gina {data.meta.page} de {data.meta.totalPages || 1}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
          <>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Unidad Académica</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Evaluación institucional</TableHead>
              <TableHead>Evaluaciones cruzadas</TableHead>
              <TableHead>Tercera UA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.ediciones ?? []).map(({ edicion, institucional, cruzadas, inconsistencia }) => (
              <TableRow key={edicion.id}>
                <TableCell className="font-medium text-sm">
                  {edicion.proyecto?.nombre || edicion.proyectoId}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {edicion.unidadAcademica?.nombre || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={estadoBadge[edicion.estado]}>
                    {estadoEdicionLabel[edicion.estado]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {institucional ? (
                    <Badge
                      variant={
                        institucional.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'
                      }
                    >
                      {institucional.estado === EstadoEvaluacion.Confirmada
                        ? 'Confirmada'
                        : 'Borrador'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin evaluar</span>
                  )}
                </TableCell>
                <TableCell>
                  {cruzadas.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sin evaluar</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {cruzadas.map((c) => (
                        <Badge
                          key={c.id}
                          variant={c.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}
                        >
                          {tipoCruzadaLabel[c.tipo]} ·{' '}
                          {c.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {yaTieneTercera(cruzadas) ? (
                    <div className="flex flex-col gap-1.5">
                      {inconsistencia?.terceraConfirmada && (
                        <Badge variant="secondary" className="w-fit">
                          Resuelta por 3ra UA
                        </Badge>
                      )}
                      <Badge variant="outline" className="w-fit">
                        {cruzadas.find((c) => c.tipo === TipoEvaluacionCruzada.TerceraUa)?.evaluador
                          ?.nombreCompleto ?? 'Designada'}
                      </Badge>
                    </div>
                  ) : inconsistencia?.inconsistente ? (
                    <div className="flex flex-col gap-1.5">
                      <Badge variant="destructive" className="w-fit">
                        Inconsistente · {inconsistencia.diferencia} pts (umbral{' '}
                        {inconsistencia.umbral})
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-fit"
                        onClick={() =>
                          abrirDialogoTercera(
                            edicion,
                            inconsistencia.diferencia,
                            inconsistencia.umbral,
                          )
                        }
                      >
                        Designar 3ra UA
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
          {(data?.ediciones.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No se encontraron ediciones
            </p>
          )}
          <Paginador meta={data?.meta ?? null} page={page} onPage={setPage} />
          </>
          )}
      </CardContent>
      </Card>

      <Dialog
        open={edicionTercera !== null}
        onOpenChange={(open) => {
          if (!open && !designando) setEdicionTercera(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Designar tercera Unidad Académica</DialogTitle>
            <DialogDescription>
              {edicionTercera
                ? `${edicionTercera.edicion.proyecto?.nombre ?? 'Edición'} · ${
                    edicionTercera.edicion.unidadAcademica?.nombre ?? ''
                  } — diferencia de ${edicionTercera.diferencia} pts (umbral ${edicionTercera.umbral})`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por nombre o mail..."
                  className="pl-8"
                  value={filtroTextoCandidatos}
                  onChange={(e) => setFiltroTextoCandidatos(e.target.value)}
                />
              </div>
              <Select value={filtroUaCandidatos} onValueChange={setFiltroUaCandidatos}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Todas las UAs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las UAs</SelectItem>
                  {uas.map((ua) => (
                    <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          {cargandoCandidatos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : candidatosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {candidatos.length === 0
                  ? 'No hay evaluadores de otras Unidades Académicas disponibles para esta edición'
                  : 'No hay candidatos que coincidan con el filtro'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[42vh] overflow-y-auto">
              {candidatosFiltrados.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 border rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.nombreCompleto}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.unidadAcademica?.nombre ?? 'Sin UA'} · {c.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={designando}
                    onClick={() => designar(c.id)}
                  >
                    {designando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Designar'
                    )}
                  </Button>
                </div>
              ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Paginador({ meta, page, onPage }: {
  meta: PaginationMeta | null
  page: number
  onPage: (p: number) => void
}) {
  if (!meta || meta.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
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
        onClick={() => onPage(Math.min(meta.totalPages, page + 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
