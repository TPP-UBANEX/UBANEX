import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { esAutoridadSecretaria, esRectorado, esSecretaria } from '@/lib/evaluacion-roles'
import { DetailSkeleton } from '@/components/TableSkeleton'
import { EstadoEvaluacion, estadoBadge, estadoEdicionLabel, tipoCruzadaLabel } from '@/data/types'
import type {
  Convocatoria,
  Edicion,
  EvaluacionCruzada,
  EvaluacionInstitucional,
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  HistorialEvaluacion,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
  TipoEvaluacionCruzada as TipoEvaluacionCruzadaType,
  CampoFormulario,
  Usuario,
} from '@/data/types'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ProyectoEvaluablePanel } from '@/components/ProyectoEvaluablePanel'
import { EvaluacionSplit } from '@/components/EvaluacionSplit'
import { IndiceCategoriasEvaluacion } from '@/components/IndiceCategoriasEvaluacion'
import type { ItemIndiceCategoria } from '@/components/IndiceCategoriasEvaluacion'
import { HistorialEvaluacionCard } from '@/components/HistorialEvaluacionCard'

export function EvaluacionDetail() {
  const { user } = useAuth()
  const { edicionId } = useParams<{ edicionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const convocatoriaId = searchParams.get('convocatoria') ?? ''

  useEffect(() => {
    if (!edicionId || !convocatoriaId) {
      navigate('/evaluacion', { replace: true })
    }
  }, [edicionId, convocatoriaId, navigate])

  if (!edicionId || !convocatoriaId) return null
  if (esRectorado(user)) return null

  return esSecretaria(user) ? (
    <DetalleInstitucional convocatoriaId={convocatoriaId} edicionId={edicionId} user={user} />
  ) : (
    <DetalleCruzada convocatoriaId={convocatoriaId} edicionId={edicionId} />
  )
}

function VolverAlListado({
  convocatoriaId,
  conEtiqueta = false,
}: {
  convocatoriaId: string
  conEtiqueta?: boolean
}) {
  const navigate = useNavigate()
  const volver = () => navigate(`/evaluacion?convocatoria=${convocatoriaId}`)
  return conEtiqueta ? (
    <Button variant="ghost" size="sm" onClick={volver}>
      <ArrowLeft className="h-4 w-4 mr-2" />Volver al listado
    </Button>
  ) : (
    <Button variant="ghost" size="icon" onClick={volver} aria-label="Volver al listado">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  )
}

function EncabezadoEvaluacion({
  convocatoriaId,
  edicion,
  convocatoria,
}: {
  convocatoriaId: string
  edicion: Edicion
  convocatoria: Convocatoria | null
}) {
  const nombre = edicion.proyecto?.nombre || edicion.proyectoId
  return (
    <div className="flex items-center gap-4 shrink-0">
      <VolverAlListado convocatoriaId={convocatoriaId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground truncate" title={nombre}>
            {nombre}
          </h2>
          <Badge variant={estadoBadge[edicion.estado]} className="shrink-0">
            {estadoEdicionLabel[edicion.estado] || edicion.estado}
          </Badge>
        </div>
        {convocatoria && (
          <p className="text-sm text-muted-foreground truncate">{convocatoria.nombre}</p>
        )}
      </div>
    </div>
  )
}

// ───────────── Institucional ─────────────

type RespuestaCategoriasInst = Record<
  string,
  { valor: number | boolean | null; fundamentacion: string }
>

function DetalleInstitucional({
  convocatoriaId,
  edicionId,
  user,
}: {
  convocatoriaId: string
  edicionId: string
  user: Usuario | null
}) {
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
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

  const cargar = async () => {
    try {
      const { evaluacion, template, edicion } = await api.evaluaciones.institucionales.obtener(
        convocatoriaId,
        edicionId,
      )
      setEdicion(edicion)
      setTemplate(template)
      setEvaluacion(evaluacion)
      initRespuestas(template?.estructura ?? null, evaluacion)
      setObservaciones(evaluacion?.observaciones ?? '')
      setEsPse(evaluacion?.esPse ?? null)
      api.evaluaciones.institucionales
        .historial(convocatoriaId, edicionId)
        .then(setHistorial)
        .catch(() => setHistorial([]))
    } catch {
      setNotFound(true)
    }
  }

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    Promise.all([
      cargar(),
      api.convocatorias
        .get(convocatoriaId)
        .then(setConvocatoria)
        .catch(() => setConvocatoria(null)),
      api.convocatorias.formulario
        .get(convocatoriaId)
        .then((f) => setCamposFormulario(f.campos ?? []))
        .catch(() => setCamposFormulario([])),
    ]).finally(() => setLoading(false))
  }, [convocatoriaId, edicionId])

  const confirmada = evaluacion?.estado === EstadoEvaluacion.Confirmada

  const guardar = async () => {
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
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const confirmar = async () => {
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
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirmando(false)
    }
  }

  const indiceCategorias: ItemIndiceCategoria[] = useMemo(
    () =>
      (template?.estructura?.categorias ?? []).map((cat) => ({
        id: cat.id,
        nombre: cat.nombre,
        total: cat.subcategorias.length,
        completados: cat.subcategorias.filter((sub) => respuestas[sub.id]?.valor != null).length,
      })),
    [template, respuestas],
  )

  const irACategoria = (id: string) =>
    document.getElementById(`cat-inst-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (loading) return <DetailSkeleton />
  if (notFound || !edicion) {
    return (
      <div className="p-6 space-y-4">
        <VolverAlListado convocatoriaId={convocatoriaId} conEtiqueta />
        <p className="text-sm text-muted-foreground">No se pudo cargar la evaluación.</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex-1 min-h-0 flex flex-col gap-4">
      <EncabezadoEvaluacion
        convocatoriaId={convocatoriaId}
        edicion={edicion}
        convocatoria={convocatoria}
      />
      <EvaluacionSplit
        presentacion={
          <ProyectoEvaluablePanel
            edicion={edicion}
            campos={camposFormulario}
            convocatoria={convocatoria}
            esPse={esPse ?? evaluacion?.esPse ?? false}
          />
        }
      >
        <Card className="lg:h-full lg:flex lg:flex-col">
          <CardHeader className="flex flex-row items-center justify-between lg:shrink-0">
            <CardTitle className="text-sm font-medium">Evaluación institucional</CardTitle>
            {evaluacion && (
              <Badge variant={evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
            {template?.estructura && (
              <div className="lg:shrink-0">
                <IndiceCategoriasEvaluacion items={indiceCategorias} onSelect={irACategoria} />
              </div>
            )}
            <div className="space-y-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {evaluacion && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Iniciada por {evaluacion.realizadoPor?.nombreCompleto ?? '-'}</p>
                <p>Última edición por {evaluacion.actualizadoPor?.nombreCompleto ?? '-'}</p>
              </div>
            )}
            <HistorialEvaluacionCard historial={historial} />
            {template?.estructura ? (
              <>
                {template.estructura.categorias.map((cat) => (
                  <div key={cat.id} id={`cat-inst-${cat.id}`} className="space-y-3 scroll-mt-4">
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
                                      valor: e.target.value === '' ? null : Number(e.target.value),
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
                    <h3 className="text-sm font-semibold border-b pb-1">Checklist institucional</h3>
                    {template.estructura.checklist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4">
                        <p className="text-sm flex-1">{item.texto}</p>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={checklist[item.id] ? 'default' : 'outline'}
                            disabled={confirmada}
                            onClick={() => setChecklist((prev) => ({ ...prev, [item.id]: true }))}
                          >
                            Sí
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={!checklist[item.id] ? 'default' : 'outline'}
                            disabled={confirmada}
                            onClick={() => setChecklist((prev) => ({ ...prev, [item.id]: false }))}
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                La convocatoria no tiene configurado el formulario de evaluación institucional.
              </p>
            )}
            </div>

            {template?.estructura && !confirmada && (
              <div className="flex justify-end gap-2 lg:shrink-0 lg:pt-3 lg:border-t">
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
          </CardContent>
        </Card>
      </EvaluacionSplit>
    </div>
  )
}

// ───────────── Cruzada ─────────────

function DetalleCruzada({
  convocatoriaId,
  edicionId,
}: {
  convocatoriaId: string
  edicionId: string
}) {
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [tipo, setTipo] = useState<TipoEvaluacionCruzadaType | null>(null)
  const [template, setTemplate] = useState<TemplateEvaluacionCruzada | null>(null)
  const [evaluacion, setEvaluacion] = useState<EvaluacionCruzada | null>(null)
  const [historial, setHistorial] = useState<HistorialEvaluacion[]>([])
  const [puntajes, setPuntajes] = useState<Record<string, number | null>>({})
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [camposFormulario, setCamposFormulario] = useState<CampoFormulario[]>([])

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

  const cargar = async () => {
    try {
      const { evaluacion, template, edicion, tipo } = await api.evaluaciones.cruzadas.obtener(
        convocatoriaId,
        edicionId,
      )
      setEdicion(edicion)
      setTipo(tipo)
      setTemplate(template)
      setEvaluacion(evaluacion)
      initPuntajes(template?.estructura ?? null, evaluacion)
      setObservaciones(evaluacion?.observaciones ?? '')
      api.evaluaciones.cruzadas
        .historial(convocatoriaId, edicionId)
        .then(setHistorial)
        .catch(() => setHistorial([]))
    } catch {
      setNotFound(true)
    }
  }

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    Promise.all([
      cargar(),
      api.convocatorias
        .get(convocatoriaId)
        .then(setConvocatoria)
        .catch(() => setConvocatoria(null)),
      api.convocatorias.formulario
        .get(convocatoriaId)
        .then((f) => setCamposFormulario(f.campos ?? []))
        .catch(() => setCamposFormulario([])),
    ]).finally(() => setLoading(false))
  }, [convocatoriaId, edicionId])

  const confirmada = evaluacion?.estado === EstadoEvaluacion.Confirmada

  const guardar = async () => {
    setGuardando(true)
    try {
      const items = Object.fromEntries(
        Object.entries(puntajes)
          .filter(([, v]) => v !== null)
          .map(([id, v]) => [id, v!]),
      )
      await api.evaluaciones.cruzadas.guardar(convocatoriaId, edicionId, { items, observaciones })
      toast.success('Borrador de evaluación cruzada guardado')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const confirmar = async () => {
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
      await cargar()
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

  const indiceCategorias: ItemIndiceCategoria[] = useMemo(
    () =>
      (template?.estructura?.categorias ?? []).map((cat) => {
        const ids = cat.items.map((i) => i.id)
        return {
          id: cat.id,
          nombre: cat.nombre,
          total: ids.length,
          completados: ids.filter((id) => puntajes[id] != null).length,
          resumen: `${sumaItems(ids)}/${cat.puntajeMaximo}`,
        }
      }),
    [template, puntajes],
  )

  const irACategoria = (id: string) =>
    document.getElementById(`cat-cruz-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (loading) return <DetailSkeleton />
  if (notFound || !edicion) {
    return (
      <div className="p-6 space-y-4">
        <VolverAlListado convocatoriaId={convocatoriaId} conEtiqueta />
        <p className="text-sm text-muted-foreground">No se pudo cargar la evaluación.</p>
      </div>
    )
  }

  return (
    <div className="p-6 flex-1 min-h-0 flex flex-col gap-4">
      <EncabezadoEvaluacion
        convocatoriaId={convocatoriaId}
        edicion={edicion}
        convocatoria={convocatoria}
      />
      <EvaluacionSplit
        presentacion={<ProyectoEvaluablePanel edicion={edicion} campos={camposFormulario} />}
      >
        <Card className="lg:h-full lg:flex lg:flex-col">
          <CardHeader className="flex flex-row items-center justify-between lg:shrink-0">
            <CardTitle className="text-sm font-medium">
              Evaluación cruzada{' '}
              {tipo ? (
                <Badge variant="secondary" className="ml-1">
                  {tipoCruzadaLabel[tipo]}
                </Badge>
              ) : null}
            </CardTitle>
            {evaluacion && (
              <Badge variant={evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
            {template?.estructura && (
              <div className="lg:shrink-0">
                <IndiceCategoriasEvaluacion items={indiceCategorias} onSelect={irACategoria} />
              </div>
            )}
            <div className="space-y-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {evaluacion && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Iniciada por {evaluacion.evaluador?.nombreCompleto ?? '-'}</p>
                <p>Última edición por {evaluacion.actualizadoPor?.nombreCompleto ?? '-'}</p>
              </div>
            )}
            <HistorialEvaluacionCard historial={historial} />
            {template?.estructura ? (
              <>
                {template.estructura.categorias.map((cat) => {
                  const ids = cat.items.map((i) => i.id)
                  return (
                    <div key={cat.id} id={`cat-cruz-${cat.id}`} className="space-y-2 scroll-mt-4">
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
                                [item.id]: e.target.value === '' ? null : Number(e.target.value),
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                La convocatoria no tiene configurado el formulario de evaluación cruzada.
              </p>
            )}
            </div>

            {template?.estructura && !confirmada && (
              <div className="flex justify-end gap-2 lg:shrink-0 lg:pt-3 lg:border-t">
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
          </CardContent>
        </Card>
      </EvaluacionSplit>
    </div>
  )
}
