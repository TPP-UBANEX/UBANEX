import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import {
  EstadoConvocatoria,
  EstadoEvaluacion,
  RolUsuario,
  TipoEvaluacionCruzada,
  estadoBadge,
  estadoEdicionLabel,
} from '@/data/types'
import type {
  Convocatoria,
  Edicion,
  EdicionEvaluableInstitucional,
  EdicionEvaluableCruzada,
  EvaluacionCruzada,
  EvaluacionInstitucional,
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  HistorialEvaluacion,
  MonitoreoEvaluacion,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
  Usuario,
  UnidadAcademica,
  PaginationMeta,
} from '@/data/types'
import { Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { ProyectoEvaluablePanel } from '@/components/ProyectoEvaluablePanel'
import type { CampoFormulario } from '@/data/types'

const tipoCruzadaLabel: Record<TipoEvaluacionCruzada, string> = {
  [TipoEvaluacionCruzada.Propia]: 'Propia',
  [TipoEvaluacionCruzada.Ajena]: 'Ajena',
  [TipoEvaluacionCruzada.TerceraUa]: 'Tercera UA',
}

const esSecretaria = (u: Usuario | null) =>
  u?.roles.some(
    (r) => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  ) ?? false
const esAutoridadSecretaria = (u: Usuario | null) =>
  u?.roles.includes(RolUsuario.AutoridadDeSecretaria) ?? false
const esRectorado = (u: Usuario | null) =>
  u?.roles.some(
    (r) => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
  ) ?? false

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

function HistorialCard({ historial }: { historial: HistorialEvaluacion[] }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-semibold border-b pb-1">Historial de cambios</h3>
      {historial.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin actividad registrada todavía.</p>
      ) : (
        <ol className="space-y-2">
          {historial.map((h, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-xs">
              <div className="flex-1">
                <p className="font-medium">{h.descripcion}</p>
                <p className="text-muted-foreground">por {h.usuarioNombre}</p>
              </div>
              <span className="text-muted-foreground whitespace-nowrap">{formatFecha(h.fecha)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function Evaluacion() {
  const { user } = useAuth()
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [convocatoriaId, setConvocatoriaId] = useState('')
  const [loadingConv, setLoadingConv] = useState(true)

  useEffect(() => {
    api.convocatorias
      .todas()
      .then((cs) => {
        const evaluables = cs.filter((c) => c.estado === EstadoConvocatoria.Evaluacion)
        setConvocatorias(evaluables)
        if (evaluables.length > 0) setConvocatoriaId(evaluables[0].id)
      })
      .finally(() => setLoadingConv(false))
  }, [])

  const vista: 'monitoreo' | 'institucional' | 'cruzada' = esRectorado(user)
    ? 'monitoreo'
    : esSecretaria(user)
      ? 'institucional'
      : 'cruzada'

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1 max-w-sm">
        <span className="text-xs text-muted-foreground">Convocatoria en evaluación</span>
        {loadingConv ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={convocatoriaId}
            onValueChange={setConvocatoriaId}
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
        vista === 'monitoreo' ? (
          <MonitoreoView key={convocatoriaId} convocatoriaId={convocatoriaId} />
        ) : vista === 'institucional' ? (
          <InstitucionalView
            key={convocatoriaId}
            convocatoriaId={convocatoriaId}
            convocatoria={convocatorias.find((c) => c.id === convocatoriaId) ?? null}
            user={user}
          />
        ) : (
          <CruzadaView key={convocatoriaId} convocatoriaId={convocatoriaId} />
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay convocatorias en etapa de evaluación.
        </p>
      )}
    </div>
  )
}

// ───────────── Institucional ─────────────

type RespuestaCategoriasInst = Record<
  string,
  { valor: number | boolean | null; fundamentacion: string }
>

function InstitucionalView({
  convocatoriaId,
  convocatoria,
  user,
}: {
  convocatoriaId: string
  convocatoria: Convocatoria | null
  user: Usuario | null
}) {
  const [items, setItems] = useState<EdicionEvaluableInstitucional[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [edicionSeleccionada, setEdicionSeleccionada] = useState<Edicion | null>(null)
  const [template, setTemplate] = useState<TemplateEvaluacionInstitucional | null>(null)
  const [evaluacion, setEvaluacion] = useState<EvaluacionInstitucional | null>(null)
  const [historial, setHistorial] = useState<HistorialEvaluacion[]>([])
  const [respuestas, setRespuestas] = useState<RespuestaCategoriasInst>({})
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [observaciones, setObservaciones] = useState('')
  const [esPse, setEsPse] = useState<boolean | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [camposFormulario, setCamposFormulario] = useState<CampoFormulario[]>([])

  const cargarLista = () => {
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
  }

  useEffect(() => { cargarLista() }, [convocatoriaId, page, debouncedSearch, filtroEstado])

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

  useEffect(() => {
    api.convocatorias.formulario
      .get(convocatoriaId)
      .then((f) => setCamposFormulario(f.campos ?? []))
      .catch(() => setCamposFormulario([]))
  }, [convocatoriaId])

  const seleccionar = async (id: string) => {
    setEdicionId(id)
    setTemplate(null)
    setEvaluacion(null)
    setHistorial([])
    setEdicionSeleccionada(items.find((i) => i.edicion.id === id)?.edicion ?? null)
    const { evaluacion, template } = await api.evaluaciones.institucionales.obtener(
      convocatoriaId,
      id,
    )
    setTemplate(template)
    setEvaluacion(evaluacion)
    initRespuestas(template?.estructura ?? null, evaluacion)
    setObservaciones(evaluacion?.observaciones ?? '')
    setEsPse(evaluacion?.esPse ?? null)
    api.evaluaciones.institucionales
      .historial(convocatoriaId, id)
      .then(setHistorial)
      .catch(() => setHistorial([]))
  }

  const initRespuestas = (
    estructura: EstructuraTemplateInstitucional | null,
    ev: EvaluacionInstitucional | null,
  ) => {
    const base: RespuestaCategoriasInst = {}
    for (const cat of estructura?.categorias ?? []) {
      for (const sub of cat.subcategorias) {
        base[sub.id] = { valor: null, fundamentacion: '' }
      }
    }
    const previas = (ev?.categorias ?? {}) as RespuestaCategoriasInst
    for (const [id, resp] of Object.entries(previas)) {
      if (base[id]) {
        base[id] = {
          valor: resp.valor,
          fundamentacion: typeof resp.fundamentacion === 'string' ? resp.fundamentacion : '',
        }
      }
    }
    setRespuestas(base)
    const check: Record<string, boolean> = {}
    for (const item of estructura?.checklist ?? []) {
      check[item.id] = (ev?.checklist?.[item.id] as boolean) ?? false
    }
    setChecklist(check)
  }

  const confirmada = evaluacion?.estado === EstadoEvaluacion.Confirmada

  const guardar = async () => {
    if (!edicionId) return
    setGuardando(true)
    try {
      const categorias = Object.fromEntries(
        Object.entries(respuestas)
          .filter(([, r]) => r.valor !== null)
          .map(([id, r]) => [id, { valor: r.valor!, fundamentacion: r.fundamentacion }]),
      )
      await api.evaluaciones.institucionales.guardar(convocatoriaId, edicionId, {
        categorias,
        checklist,
        observaciones,
        ...(esPse !== null ? { esPse } : {}),
      })
      toast.success('Borrador de evaluación institucional guardado')
      await seleccionar(edicionId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const confirmar = async () => {
    if (!edicionId) return
    setConfirmando(true)
    try {
      const categorias = Object.fromEntries(
        Object.entries(respuestas)
          .filter(([, r]) => r.valor !== null)
          .map(([id, r]) => [id, { valor: r.valor!, fundamentacion: r.fundamentacion }]),
      )
      await api.evaluaciones.institucionales.guardar(convocatoriaId, edicionId, {
        categorias,
        checklist,
        observaciones,
        ...(esPse !== null ? { esPse } : {}),
      })
      await api.evaluaciones.institucionales.confirmar(convocatoriaId, edicionId)
      toast.success('Evaluación institucional confirmada')
      await seleccionar(edicionId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirmando(false)
    }
  }

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
                  onClick={() => seleccionar(edicion.id)}
                  className={`text-left border rounded-lg p-3 space-y-1 ${edicionId === edicion.id ? 'border-primary bg-primary/5' : ''}`}
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

      {!edicionId ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">
            Seleccioná una edición para evaluarla.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ProyectoEvaluablePanel
            edicion={edicionSeleccionada}
            campos={camposFormulario}
            convocatoria={convocatoria}
            esPse={esPse ?? evaluacion?.esPse ?? false}
          />
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Evaluación institucional</CardTitle>
                {evaluacion && (
                  <Badge
                    variant={
                      evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'
                    }
                  >
                    {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {evaluacion && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Iniciada por {evaluacion.realizadoPor?.nombreCompleto ?? '-'}</p>
                    <p>Última edición por {evaluacion.actualizadoPor?.nombreCompleto ?? '-'}</p>
                  </div>
                )}
                <HistorialCard historial={historial} />
                {template?.estructura ? (
                  <>
                    {template.estructura.categorias.map((cat) => (
                      <div key={cat.id} className="space-y-3">
                        <h3 className="text-sm font-semibold border-b pb-1">{cat.nombre}</h3>
                        {cat.subcategorias.map((sub) => {
                          const resp = respuestas[sub.id] ?? { valor: null, fundamentacion: '' }
                          return (
                            <div key={sub.id} className="space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-sm flex-1">{sub.texto}</p>
                                {sub.tipoValor === 'numerico' ? (
                                  <Input
                                    type="number"
                                    className="w-24"
                                    disabled={confirmada}
                                    value={resp.valor === null ? '' : String(resp.valor)}
                                    onChange={(e) =>
                                      setRespuestas((prev) => ({
                                        ...prev,
                                        [sub.id]: {
                                          ...prev[sub.id],
                                          valor:
                                            e.target.value === '' ? null : Number(e.target.value),
                                        },
                                      }))
                                    }
                                    placeholder={`${sub.minimo}-${sub.maximo}`}
                                  />
                                ) : (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={resp.valor === true ? 'default' : 'outline'}
                                      disabled={confirmada}
                                      onClick={() =>
                                        setRespuestas((prev) => ({
                                          ...prev,
                                          [sub.id]: { ...prev[sub.id], valor: true },
                                        }))
                                      }
                                    >
                                      Sí
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={resp.valor === false ? 'default' : 'outline'}
                                      disabled={confirmada}
                                      onClick={() =>
                                        setRespuestas((prev) => ({
                                          ...prev,
                                          [sub.id]: { ...prev[sub.id], valor: false },
                                        }))
                                      }
                                    >
                                      No
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <Textarea
                                className="min-h-[60px] text-sm"
                                disabled={confirmada}
                                value={resp.fundamentacion}
                                onChange={(e) =>
                                  setRespuestas((prev) => ({
                                    ...prev,
                                    [sub.id]: { ...prev[sub.id], fundamentacion: e.target.value },
                                  }))
                                }
                                placeholder={`Fundamentación de "${sub.texto}"`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ))}

                    {template.estructura.checklist.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold border-b pb-1">
                          Checklist institucional
                        </h3>
                        {template.estructura.checklist.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-4">
                            <p className="text-sm flex-1">{item.texto}</p>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={checklist[item.id] ? 'default' : 'outline'}
                                disabled={confirmada}
                                onClick={() =>
                                  setChecklist((prev) => ({ ...prev, [item.id]: true }))
                                }
                              >
                                Sí
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={!checklist[item.id] ? 'default' : 'outline'}
                                disabled={confirmada}
                                onClick={() =>
                                  setChecklist((prev) => ({ ...prev, [item.id]: false }))
                                }
                              >
                                No
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 rounded-md border border-dashed p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">¿Es una Práctica Social Educativa?</p>
                          <p className="text-xs text-muted-foreground">
                            Determina un extra sobre el presupuesto a adjudicar, no suma puntaje.
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={esPse === true ? 'default' : 'outline'}
                            disabled={confirmada}
                            onClick={() => setEsPse(true)}
                          >
                            Sí
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={esPse === false ? 'default' : 'outline'}
                            disabled={confirmada}
                            onClick={() => setEsPse(false)}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold border-b pb-1">Observaciones</h3>
                        <span className="text-xs text-muted-foreground">{observaciones.length}/500</span>
                      </div>
                      <Textarea
                        className="min-h-[80px]"
                        disabled={confirmada}
                        value={observaciones}
                        maxLength={500}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones generales de la evaluación..."
                      />
                    </div>

                    {!confirmada && (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={guardar} disabled={guardando}>
                          {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Guardar borrador
                        </Button>
                        {esAutoridadSecretaria(user) && (
                          <Button onClick={confirmar} disabled={confirmando}>
                            {confirmando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirmar evaluación
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    La convocatoria no tiene configurado el formulario de evaluación institucional.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ───────────── Cruzada ─────────────

function CruzadaView({ convocatoriaId }: { convocatoriaId: string }) {
  const [items, setItems] = useState<EdicionEvaluableCruzada[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [edicionSeleccionada, setEdicionSeleccionada] = useState<Edicion | null>(null)
  const [tipo, setTipo] = useState<TipoEvaluacionCruzada | null>(null)
  const [template, setTemplate] = useState<TemplateEvaluacionCruzada | null>(null)
  const [evaluacion, setEvaluacion] = useState<EvaluacionCruzada | null>(null)
  const [historial, setHistorial] = useState<HistorialEvaluacion[]>([])
  const [puntajes, setPuntajes] = useState<Record<string, number | null>>({})
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [camposFormulario, setCamposFormulario] = useState<CampoFormulario[]>([])

  const cargarDisponibles = () => {
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
  }

  useEffect(() => { cargarDisponibles() }, [convocatoriaId, page, debouncedSearch, filtroEstado])

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

  useEffect(() => {
    api.convocatorias.formulario
      .get(convocatoriaId)
      .then((f) => setCamposFormulario(f.campos ?? []))
      .catch(() => setCamposFormulario([]))
  }, [convocatoriaId])

  const seleccionar = async (id: string) => {
    setEdicionId(id)
    setTemplate(null)
    setEvaluacion(null)
    setHistorial([])
    setEdicionSeleccionada(items.find((i) => i.edicion.id === id)?.edicion ?? null)
    const { evaluacion, template } = await api.evaluaciones.cruzadas.obtener(convocatoriaId, id)
    setTemplate(template)
    setEvaluacion(evaluacion)
    setTipo(evaluacion?.tipo ?? null)
    initPuntajes(template?.estructura ?? null, evaluacion)
    setObservaciones(evaluacion?.observaciones ?? '')
    api.evaluaciones.cruzadas
      .historial(convocatoriaId, id)
      .then(setHistorial)
      .catch(() => setHistorial([]))
  }

  const initPuntajes = (
    estructura: EstructuraTemplateCruzada | null,
    ev: EvaluacionCruzada | null,
  ) => {
    const base: Record<string, number | null> = {}
    for (const cat of estructura?.categorias ?? []) {
      for (const item of cat.items) {
        base[item.id] = null
      }
    }
    for (const [id, valor] of Object.entries(ev?.items ?? {})) {
      if (base[id] !== undefined) base[id] = valor
    }
    setPuntajes(base)
  }

  const confirmada = evaluacion?.estado === EstadoEvaluacion.Confirmada

  const guardar = async () => {
    if (!edicionId) return
    setGuardando(true)
    try {
      const items = Object.fromEntries(
        Object.entries(puntajes)
          .filter(([, v]) => v !== null)
          .map(([id, v]) => [id, v!]),
      )
      await api.evaluaciones.cruzadas.guardar(convocatoriaId, edicionId, { items, observaciones })
      toast.success('Borrador de evaluación cruzada guardado')
      await seleccionar(edicionId)
      cargarDisponibles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const confirmar = async () => {
    if (!edicionId) return
    setConfirmando(true)
    try {
      const items = Object.fromEntries(
        Object.entries(puntajes)
          .filter(([, v]) => v !== null)
          .map(([id, v]) => [id, v!]),
      )
      await api.evaluaciones.cruzadas.guardar(convocatoriaId, edicionId, { items, observaciones })
      await api.evaluaciones.cruzadas.confirmar(convocatoriaId, edicionId)
      toast.success('Evaluación cruzada confirmada')
      await seleccionar(edicionId)
      cargarDisponibles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirmando(false)
    }
  }

  const sumaItems = (ids: string[]) => ids.reduce((acc, id) => acc + (puntajes[id] ?? 0), 0)
  const total = template
    ? sumaItems((template.estructura?.categorias ?? []).flatMap((c) => c.items.map((i) => i.id)))
    : 0

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
                  onClick={() => seleccionar(edicion.id)}
                  className={`text-left border rounded-lg p-3 space-y-1 ${edicionId === edicion.id ? 'border-primary bg-primary/5' : ''}`}
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

      {!edicionId ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">
            Seleccioná una edición para evaluarla.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ProyectoEvaluablePanel
            edicion={edicionSeleccionada}
            campos={camposFormulario}
          />
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Evaluación cruzada{' '}
                  {tipo ? (
                    <Badge variant="secondary" className="ml-1">
                      {tipoCruzadaLabel[tipo]}
                    </Badge>
                  ) : null}
                </CardTitle>
                {evaluacion && (
                  <Badge
                    variant={
                      evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'
                    }
                  >
                    {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {evaluacion && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Iniciada por {evaluacion.evaluador?.nombreCompleto ?? '-'}</p>
                    <p>Última edición por {evaluacion.actualizadoPor?.nombreCompleto ?? '-'}</p>
                  </div>
                )}
                <HistorialCard historial={historial} />
                {template?.estructura ? (
                  <>
                    {template.estructura.categorias.map((cat) => {
                      const ids = cat.items.map((i) => i.id)
                      return (
                        <div key={cat.id} className="space-y-2">
                          <h3 className="text-sm font-semibold border-b pb-1">
                            {cat.nombre}{' '}
                            <span className="text-muted-foreground font-normal">
                              ({sumaItems(ids)} / {cat.puntajeMaximo})
                            </span>
                          </h3>
                          {cat.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4">
                              <p className="text-sm flex-1">{item.nombre}</p>
                              <Input
                                type="number"
                                className="w-24"
                                min={0}
                                max={item.puntajeMaximo}
                                disabled={confirmada}
                                value={
                                  puntajes[item.id] === null || puntajes[item.id] === undefined
                                    ? ''
                                    : String(puntajes[item.id])
                                }
                                onChange={(e) =>
                                  setPuntajes((prev) => ({
                                    ...prev,
                                    [item.id]:
                                      e.target.value === '' ? null : Number(e.target.value),
                                  }))
                                }
                                placeholder={`0-${item.puntajeMaximo}`}
                              />
                            </div>
                          ))}
                        </div>
                      )
                    })}

                    <div className="bg-muted/50 rounded-md p-3 flex items-center justify-between">
                      <span className="text-sm font-medium">Puntaje total</span>
                      <span className="text-lg font-bold">{total} pts</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold border-b pb-1">Observaciones</h3>
                        <span className="text-xs text-muted-foreground">{observaciones.length}/500</span>
                      </div>
                      <Textarea
                        className="min-h-[80px]"
                        disabled={confirmada}
                        value={observaciones}
                        maxLength={500}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones de la evaluación..."
                      />
                    </div>

                    {!confirmada && (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={guardar} disabled={guardando}>
                          {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Guardar borrador
                        </Button>
                        <Button onClick={confirmar} disabled={confirmando}>
                          {confirmando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Confirmar evaluación
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    La convocatoria no tiene configurado el formulario de evaluación cruzada.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
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
  }, [convocatoriaId, page, debouncedSearch, unidadAcademicaId])

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
          <CardTitle className="text-sm font-medium">Estado de evaluación por edición</CardTitle>
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
              <TableHead>Institucional</TableHead>
              <TableHead>Evaluaciones cruzadas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.ediciones ?? []).map(({ edicion, institucional, cruzadas }) => (
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
    </div>
  )
}

function Paginador({ meta, page, onPage }: {
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
