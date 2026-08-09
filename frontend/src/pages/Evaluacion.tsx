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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  EdicionEvaluableInstitucional,
  EdicionEvaluableCruzada,
  EvaluacionCruzada,
  EvaluacionInstitucional,
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  MonitoreoEvaluacion,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
  Usuario,
} from '@/data/types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const tipoCruzadaLabel: Record<TipoEvaluacionCruzada, string> = {
  [TipoEvaluacionCruzada.Propia]: 'Propia',
  [TipoEvaluacionCruzada.Ajena]: 'Ajena',
  [TipoEvaluacionCruzada.TerceraUa]: 'Tercera UA',
}

const esSecretaria = (u: Usuario | null) =>
  u?.roles.some(r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria) ?? false
const esAutoridadSecretaria = (u: Usuario | null) =>
  u?.roles.includes(RolUsuario.AutoridadDeSecretaria) ?? false
const esRectorado = (u: Usuario | null) =>
  u?.roles.some(r => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado) ?? false

export function Evaluacion() {
  const { user } = useAuth()
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [convocatoriaId, setConvocatoriaId] = useState('')
  const [loadingConv, setLoadingConv] = useState(true)

  useEffect(() => {
    api.convocatorias.list()
      .then(cs => {
        const evaluables = cs.filter(c => c.estado === EstadoConvocatoria.Evaluacion)
        setConvocatorias(evaluables)
        if (evaluables.length > 0) setConvocatoriaId(evaluables[0].id)
      })
      .finally(() => setLoadingConv(false))
  }, [])

  const tabs: string[] = []
  if (esRectorado(user)) tabs.push('monitoreo')
  if (esSecretaria(user)) tabs.push('institucional')
  if (!esRectorado(user)) tabs.push('cruzada')
  const defaultTab = tabs[0] ?? 'monitoreo'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Evaluación</h1>
        <p className="text-sm text-muted-foreground">
          Evaluación institucional y cruzada de proyectos de la convocatoria.
        </p>
      </div>

      <div className="space-y-1 max-w-sm">
        <span className="text-xs text-muted-foreground">Convocatoria en evaluación</span>
        {loadingConv ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={convocatoriaId} onValueChange={setConvocatoriaId} disabled={!convocatoriaId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar convocatoria..." /></SelectTrigger>
            <SelectContent>
              {convocatorias.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {convocatoriaId ? (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {tabs.includes('monitoreo') && <TabsTrigger value="monitoreo">Monitoreo</TabsTrigger>}
            {tabs.includes('institucional') && <TabsTrigger value="institucional">Institucional</TabsTrigger>}
            {tabs.includes('cruzada') && <TabsTrigger value="cruzada">Evaluación cruzada</TabsTrigger>}
          </TabsList>
          {tabs.includes('monitoreo') && (
            <TabsContent value="monitoreo" className="mt-4">
              <MonitoreoView convocatoriaId={convocatoriaId} />
            </TabsContent>
          )}
          {tabs.includes('institucional') && (
            <TabsContent value="institucional" className="mt-4">
              <InstitucionalView convocatoriaId={convocatoriaId} user={user} />
            </TabsContent>
          )}
          {tabs.includes('cruzada') && (
            <TabsContent value="cruzada" className="mt-4">
              <CruzadaView convocatoriaId={convocatoriaId} />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay convocatorias en etapa de evaluación.
        </p>
      )}
    </div>
  )
}

// ───────────── Institucional ─────────────

type RespuestaCategoriasInst = Record<string, { valor: number | boolean | null; fundamentacion: string }>

function InstitucionalView({ convocatoriaId, user }: { convocatoriaId: string; user: Usuario | null }) {
  const [items, setItems] = useState<EdicionEvaluableInstitucional[]>([])
  const [loading, setLoading] = useState(true)
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [template, setTemplate] = useState<TemplateEvaluacionInstitucional | null>(null)
  const [evaluacion, setEvaluacion] = useState<EvaluacionInstitucional | null>(null)
  const [respuestas, setRespuestas] = useState<RespuestaCategoriasInst>({})
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const cargarLista = () => {
    api.evaluaciones.institucionales.listar(convocatoriaId)
      .then(setItems)
      .finally(() => setLoading(false))
  }

  useEffect(cargarLista, [convocatoriaId])

  const seleccionar = async (id: string) => {
    setEdicionId(id)
    setTemplate(null)
    setEvaluacion(null)
    const { evaluacion, template } = await api.evaluaciones.institucionales.obtener(convocatoriaId, id)
    setTemplate(template)
    setEvaluacion(evaluacion)
    initRespuestas(template?.estructura ?? null, evaluacion)
    setObservaciones(evaluacion?.observaciones ?? '')
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
      await api.evaluaciones.institucionales.confirmar(convocatoriaId, edicionId)
      toast.success('Evaluación institucional confirmada')
      await seleccionar(edicionId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirmando(false)
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Ediciones de mi Unidad Académica</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay ediciones en evaluación de tu Unidad Académica.</p>
          )}
          {items.map(({ edicion, evaluacion }) => (
            <button
              key={edicion.id}
              onClick={() => seleccionar(edicion.id)}
              className={`w-full text-left border rounded-lg p-3 space-y-1 ${edicionId === edicion.id ? 'border-primary bg-primary/5' : ''}`}
            >
              <p className="text-sm font-medium">{edicion.proyecto?.nombre || edicion.proyectoId}</p>
              <div className="flex items-center gap-2">
                <Badge variant={estadoBadge[edicion.estado]}>{estadoEdicionLabel[edicion.estado]}</Badge>
                {evaluacion && (
                  <Badge variant={evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                    {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!edicionId ? (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">Seleccioná una edición para evaluarla.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Evaluación institucional</CardTitle>
              {evaluacion && (
                <Badge variant={evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                  {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {template?.estructura ? (
                <>
                  {template.estructura.categorias.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <h3 className="text-sm font-semibold border-b pb-1">{cat.nombre}</h3>
                      {cat.subcategorias.map(sub => {
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
                                  onChange={e => setRespuestas(prev => ({
                                    ...prev,
                                    [sub.id]: { ...prev[sub.id], valor: e.target.value === '' ? null : Number(e.target.value) },
                                  }))}
                                  placeholder={`${sub.minimo}-${sub.maximo}`}
                                />
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={resp.valor === true ? 'default' : 'outline'}
                                    disabled={confirmada}
                                    onClick={() => setRespuestas(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], valor: true } }))}
                                  >
                                    Sí
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={resp.valor === false ? 'default' : 'outline'}
                                    disabled={confirmada}
                                    onClick={() => setRespuestas(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], valor: false } }))}
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
                              onChange={e => setRespuestas(prev => ({
                                ...prev,
                                [sub.id]: { ...prev[sub.id], fundamentacion: e.target.value },
                              }))}
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
                      {template.estructura.checklist.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                          <p className="text-sm flex-1">{item.texto}</p>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={checklist[item.id] ? 'default' : 'outline'}
                              disabled={confirmada}
                              onClick={() => setChecklist(prev => ({ ...prev, [item.id]: true }))}
                            >
                              Sí
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={!checklist[item.id] ? 'default' : 'outline'}
                              disabled={confirmada}
                              onClick={() => setChecklist(prev => ({ ...prev, [item.id]: false }))}
                            >
                              No
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold border-b pb-1">Observaciones</h3>
                    <Textarea
                      className="min-h-[80px]"
                      disabled={confirmada}
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
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
                  La convocatoria no tiene configurado el template de evaluación institucional.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ───────────── Cruzada ─────────────

function CruzadaView({ convocatoriaId }: { convocatoriaId: string }) {
  const [items, setItems] = useState<EdicionEvaluableCruzada[]>([])
  const [loading, setLoading] = useState(true)
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoEvaluacionCruzada | null>(null)
  const [template, setTemplate] = useState<TemplateEvaluacionCruzada | null>(null)
  const [evaluacion, setEvaluacion] = useState<EvaluacionCruzada | null>(null)
  const [puntajes, setPuntajes] = useState<Record<string, number | null>>({})
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const cargarDisponibles = () => {
    api.evaluaciones.cruzadas.disponibles(convocatoriaId)
      .then(setItems)
      .finally(() => setLoading(false))
  }

  useEffect(cargarDisponibles, [convocatoriaId])

  const seleccionar = async (id: string) => {
    setEdicionId(id)
    setTemplate(null)
    setEvaluacion(null)
    const { evaluacion, template } = await api.evaluaciones.cruzadas.obtener(convocatoriaId, id)
    setTemplate(template)
    setEvaluacion(evaluacion)
    setTipo(evaluacion?.tipo ?? null)
    initPuntajes(template?.estructura ?? null, evaluacion)
    setObservaciones(evaluacion?.observaciones ?? '')
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
    ? sumaItems((template.estructura?.categorias ?? []).flatMap(c => c.items.map(i => i.id)))
    : 0

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Evaluaciones disponibles</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay ediciones disponibles para evaluar.</p>
          )}
          {items.map(({ edicion, tipo, evaluacion }) => (
            <button
              key={edicion.id}
              onClick={() => seleccionar(edicion.id)}
              className={`w-full text-left border rounded-lg p-3 space-y-1 ${edicionId === edicion.id ? 'border-primary bg-primary/5' : ''}`}
            >
              <p className="text-sm font-medium">{edicion.proyecto?.nombre || edicion.proyectoId}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{tipoCruzadaLabel[tipo]}</Badge>
                <Badge variant={estadoBadge[edicion.estado]}>{estadoEdicionLabel[edicion.estado]}</Badge>
                {evaluacion && (
                  <Badge variant={evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                    {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!edicionId ? (
          <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">Seleccioná una edición para evaluarla.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Evaluación cruzada {tipo ? <Badge variant="secondary" className="ml-1">{tipoCruzadaLabel[tipo]}</Badge> : null}
              </CardTitle>
              {evaluacion && (
                <Badge variant={evaluacion.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                  {evaluacion.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {template?.estructura ? (
                <>
                  {template.estructura.categorias.map(cat => {
                    const ids = cat.items.map(i => i.id)
                    return (
                      <div key={cat.id} className="space-y-2">
                        <h3 className="text-sm font-semibold border-b pb-1">
                          {cat.nombre} <span className="text-muted-foreground font-normal">({sumaItems(ids)} / {cat.puntajeMaximo})</span>
                        </h3>
                        {cat.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between gap-4">
                            <p className="text-sm flex-1">{item.nombre}</p>
                            <Input
                              type="number"
                              className="w-24"
                              min={0}
                              max={item.puntajeMaximo}
                              disabled={confirmada}
                              value={puntajes[item.id] === null || puntajes[item.id] === undefined ? '' : String(puntajes[item.id])}
                              onChange={e => setPuntajes(prev => ({
                                ...prev,
                                [item.id]: e.target.value === '' ? null : Number(e.target.value),
                              }))}
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
                    <h3 className="text-sm font-semibold border-b pb-1">Observaciones</h3>
                    <Textarea
                      className="min-h-[80px]"
                      disabled={confirmada}
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
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
                  La convocatoria no tiene configurado el template de evaluación cruzada.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ───────────── Monitoreo (Rectorado) ─────────────

function MonitoreoView({ convocatoriaId }: { convocatoriaId: string }) {
  const [data, setData] = useState<MonitoreoEvaluacion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.evaluaciones.monitoreo(convocatoriaId)
      .then(setData)
      .finally(() => setLoading(false))
  }, [convocatoriaId])

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Estado de evaluación por edición</CardTitle></CardHeader>
      <CardContent>
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
                <TableCell className="font-medium text-sm">{edicion.proyecto?.nombre || edicion.proyectoId}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{edicion.unidadAcademica?.nombre || '-'}</TableCell>
                <TableCell><Badge variant={estadoBadge[edicion.estado]}>{estadoEdicionLabel[edicion.estado]}</Badge></TableCell>
                <TableCell>
                  {institucional ? (
                    <Badge variant={institucional.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                      {institucional.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
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
                      {cruzadas.map(c => (
                        <Badge key={c.id} variant={c.estado === EstadoEvaluacion.Confirmada ? 'default' : 'outline'}>
                          {tipoCruzadaLabel[c.tipo]} · {c.estado === EstadoEvaluacion.Confirmada ? 'Confirmada' : 'Borrador'}
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
          <p className="text-sm text-muted-foreground text-center py-6">Esta convocatoria no tiene ediciones.</p>
        )}
      </CardContent>
    </Card>
  )
}
