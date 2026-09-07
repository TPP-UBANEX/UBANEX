import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { EstadoConvocatoria } from '@/data/types'
import type {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
} from '@/data/types'
import { TemplateInstitucionalBuilder, nuevaCategoriaInstitucional } from '@/components/TemplateInstitucionalBuilder'
import { TemplateCruzadaBuilder, nuevaCategoriaCruzada } from '@/components/TemplateCruzadaBuilder'
import { VistaPreviaEvaluacionInstitucional } from '@/components/VistaPreviaEvaluacionInstitucional'
import { VistaPreviaEvaluacionCruzada } from '@/components/VistaPreviaEvaluacionCruzada'
import { SeleccionarPlantillaDialog } from '@/components/SeleccionarPlantillaDialog'
import { Eye, FileText, Loader2, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  convocatoriaId: string
  estadoConvocatoria: EstadoConvocatoria
}

function clonarInstitucional(s: EstructuraTemplateInstitucional): EstructuraTemplateInstitucional {
  return {
    categorias: s.categorias.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      subcategorias: c.subcategorias.map(sub => ({ ...sub, id: crypto.randomUUID() })),
    })),
    checklist: s.checklist.map(i => ({ ...i, id: crypto.randomUUID() })),
  }
}

function clonarCruzada(s: EstructuraTemplateCruzada): EstructuraTemplateCruzada {
  return {
    categorias: s.categorias.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      items: c.items.map(i => ({ ...i, id: crypto.randomUUID() })),
    })),
  }
}

function tieneContenidoInst(estructura: EstructuraTemplateInstitucional | null): boolean {
  return !!estructura && (estructura.categorias.length > 0 || estructura.checklist.length > 0)
}

function tieneContenidoCruzada(estructura: EstructuraTemplateCruzada | null): boolean {
  return !!estructura && estructura.categorias.length > 0
}

/** Punto que marca una pestaña con cambios sin guardar, igual convención que las notificaciones no leídas. */
function PuntoSinGuardar() {
  return <span className="ml-1.5 h-2 w-2 rounded-full bg-blue-500" title="Cambios sin guardar" />
}

export function EvaluacionConfigTab({ convocatoriaId, estadoConvocatoria }: Props) {
  const editable = estadoConvocatoria === EstadoConvocatoria.Configuracion

  const [formulario, setFormulario] = useState<'institucional' | 'cruzada'>('institucional')

  const [instEstructura, setInstEstructura] = useState<EstructuraTemplateInstitucional | null>(null)
  const [cruzadaEstructura, setCruzadaEstructura] = useState<EstructuraTemplateCruzada | null>(null)
  const [instOriginal, setInstOriginal] = useState('')
  const [cruzadaOriginal, setCruzadaOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardandoInst, setGuardandoInst] = useState(false)
  const [guardandoCruzada, setGuardandoCruzada] = useState(false)
  const [previewInst, setPreviewInst] = useState(false)
  const [previewCruzada, setPreviewCruzada] = useState(false)
  const [plantillaDialogOpen, setPlantillaDialogOpen] = useState(false)

  const cargar = useCallback(async () => {
    const [inst, cruzada] = await Promise.all([
      api.convocatorias.templateInstitucional.get(convocatoriaId),
      api.convocatorias.templateCruzada.get(convocatoriaId),
    ])
    setInstEstructura(inst.estructura)
    setCruzadaEstructura(cruzada.estructura)
    setInstOriginal(JSON.stringify(inst.estructura))
    setCruzadaOriginal(JSON.stringify(cruzada.estructura))
  }, [convocatoriaId])

  useEffect(() => {
    cargar().finally(() => setLoading(false))
  }, [cargar])

  const instSucio = JSON.stringify(instEstructura) !== instOriginal
  const cruzadaSucio = JSON.stringify(cruzadaEstructura) !== cruzadaOriginal

  const importarInst = (plantilla: TemplateEvaluacionInstitucional) => {
    if (!plantilla.estructura) return
    setInstEstructura(clonarInstitucional(plantilla.estructura))
    toast.success('Plantilla cargada. Guardá para aplicarla a la convocatoria.')
  }

  const importarCruzada = (plantilla: TemplateEvaluacionCruzada) => {
    if (!plantilla.estructura) return
    setCruzadaEstructura(clonarCruzada(plantilla.estructura))
    toast.success('Plantilla cargada. Guardá para aplicarla a la convocatoria.')
  }

  const guardarInst = async () => {
    const snapshot = JSON.stringify(instEstructura)
    setGuardandoInst(true)
    try {
      await api.convocatorias.templateInstitucional.guardar(convocatoriaId, instEstructura)
      setInstOriginal(snapshot)
      toast.success('Formulario de evaluación institucional guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el formulario de evaluación')
    } finally {
      setGuardandoInst(false)
    }
  }

  const guardarCruzada = async () => {
    const snapshot = JSON.stringify(cruzadaEstructura)
    setGuardandoCruzada(true)
    try {
      await api.convocatorias.templateCruzada.guardar(convocatoriaId, cruzadaEstructura)
      setCruzadaOriginal(snapshot)
      toast.success('Formulario de evaluación cruzada guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el formulario de evaluación')
    } finally {
      setGuardandoCruzada(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const preview = formulario === 'institucional' ? previewInst : previewCruzada
  const setPreview = formulario === 'institucional' ? setPreviewInst : setPreviewCruzada
  const hayContenido = formulario === 'institucional'
    ? tieneContenidoInst(instEstructura)
    : tieneContenidoCruzada(cruzadaEstructura)

  const slotVacio = (nombreFormulario: string, onEmpezarDeCero: () => void) => editable ? (
    <div className="text-center py-8 space-y-4">
      <p className="text-sm text-muted-foreground">
        Todavía no hay categorías definidas. ¿Cómo querés empezar?
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => setPlantillaDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />Empezar desde una plantilla
        </Button>
        <Button type="button" variant="outline" onClick={onEmpezarDeCero}>
          <Plus className="h-4 w-4 mr-2" />Empezar de cero
        </Button>
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground text-center py-4">
      Este formulario de evaluación {nombreFormulario} no tiene categorías definidas.
    </p>
  )

  return (
    <div className="space-y-6">
      {!editable && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
          Los formularios de evaluación quedaron congelados al salir de la etapa de configuración. Solo pueden consultarse.
        </p>
      )}

      <Tabs value={formulario} onValueChange={v => setFormulario(v as 'institucional' | 'cruzada')}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-medium">Formulario de evaluación</CardTitle>
              <TabsList>
                <TabsTrigger value="institucional">
                  Institucional
                  {instSucio && <PuntoSinGuardar />}
                </TabsTrigger>
                <TabsTrigger value="cruzada">
                  Cruzada
                  {cruzadaSucio && <PuntoSinGuardar />}
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              {editable && !preview && hayContenido && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPlantillaDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />Reemplazar por plantilla
                </Button>
              )}
              {hayContenido && (
                <Button
                  type="button"
                  variant={preview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreview(v => !v)}
                >
                  {preview
                    ? <><Pencil className="h-4 w-4 mr-2" />Volver al editor</>
                    : <><Eye className="h-4 w-4 mr-2" />Vista previa</>}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="institucional" className="mt-0 space-y-4">
              {previewInst ? (
                <VistaPreviaEvaluacionInstitucional estructura={instEstructura} />
              ) : !tieneContenidoInst(instEstructura) ? (
                slotVacio('institucional', () =>
                  setInstEstructura({
                    categorias: [nuevaCategoriaInstitucional()],
                    checklist: instEstructura?.checklist ?? [],
                  }),
                )
              ) : (
                <TemplateInstitucionalBuilder
                  estructura={instEstructura}
                  onChange={setInstEstructura}
                  editable={editable}
                />
              )}
              {editable && !previewInst && (
                <div className="flex justify-end">
                  <Button onClick={guardarInst} disabled={guardandoInst}>
                    {guardandoInst && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar formulario
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cruzada" className="mt-0 space-y-4">
              {previewCruzada ? (
                <VistaPreviaEvaluacionCruzada estructura={cruzadaEstructura} />
              ) : !tieneContenidoCruzada(cruzadaEstructura) ? (
                slotVacio('cruzada', () =>
                  setCruzadaEstructura({ categorias: [nuevaCategoriaCruzada()] }),
                )
              ) : (
                <TemplateCruzadaBuilder
                  estructura={cruzadaEstructura}
                  onChange={setCruzadaEstructura}
                  editable={editable}
                />
              )}
              {editable && !previewCruzada && (
                <div className="flex justify-end">
                  <Button onClick={guardarCruzada} disabled={guardandoCruzada}>
                    {guardandoCruzada && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar formulario
                  </Button>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {formulario === 'institucional' ? (
        <SeleccionarPlantillaDialog
          open={plantillaDialogOpen}
          onOpenChange={setPlantillaDialogOpen}
          cargarPlantillas={api.templatesEvaluacion.institucionales.list}
          detalle={p => `${p.estructura?.categorias.length ?? 0} categorías`}
          onSeleccionar={importarInst}
          advertencia={tieneContenidoInst(instEstructura)
            ? 'Las categorías que tenés cargadas se reemplazan por las de la plantilla. El cambio no se aplica hasta que guardes.'
            : undefined}
        />
      ) : (
        <SeleccionarPlantillaDialog
          open={plantillaDialogOpen}
          onOpenChange={setPlantillaDialogOpen}
          cargarPlantillas={api.templatesEvaluacion.cruzadas.list}
          detalle={p => `${p.estructura?.categorias.length ?? 0} categorías`}
          onSeleccionar={importarCruzada}
          advertencia={tieneContenidoCruzada(cruzadaEstructura)
            ? 'Las categorías que tenés cargadas se reemplazan por las de la plantilla. El cambio no se aplica hasta que guardes.'
            : undefined}
        />
      )}
    </div>
  )
}
