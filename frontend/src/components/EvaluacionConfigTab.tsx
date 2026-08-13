import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { EstadoConvocatoria } from '@/data/types'
import type {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
} from '@/data/types'
import { TemplateInstitucionalBuilder } from '@/components/TemplateInstitucionalBuilder'
import { TemplateCruzadaBuilder } from '@/components/TemplateCruzadaBuilder'
import { Loader2, Copy } from 'lucide-react'
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

export function EvaluacionConfigTab({ convocatoriaId, estadoConvocatoria }: Props) {
  const editable = estadoConvocatoria === EstadoConvocatoria.Configuracion

  const [instEstructura, setInstEstructura] = useState<EstructuraTemplateInstitucional | null>(null)
  const [cruzadaEstructura, setCruzadaEstructura] = useState<EstructuraTemplateCruzada | null>(null)
  const [plantillasInst, setPlantillasInst] = useState<TemplateEvaluacionInstitucional[]>([])
  const [plantillasCruzada, setPlantillasCruzada] = useState<TemplateEvaluacionCruzada[]>([])
  const [loading, setLoading] = useState(true)
  const [guardandoInst, setGuardandoInst] = useState(false)
  const [guardandoCruzada, setGuardandoCruzada] = useState(false)

  const cargar = useCallback(async () => {
    const [inst, cruzada, plantillasInst, plantillasCruzada] = await Promise.all([
      api.convocatorias.templateInstitucional.get(convocatoriaId),
      api.convocatorias.templateCruzada.get(convocatoriaId),
      api.templatesEvaluacion.institucionales.list().catch(() => []),
      api.templatesEvaluacion.cruzadas.list().catch(() => []),
    ])
    setInstEstructura(inst.estructura)
    setCruzadaEstructura(cruzada.estructura)
    setPlantillasInst(plantillasInst)
    setPlantillasCruzada(plantillasCruzada)
  }, [convocatoriaId])

  useEffect(() => {
    cargar().finally(() => setLoading(false))
  }, [cargar])

  const importarInst = (templateId: string) => {
    const plantilla = plantillasInst.find(p => p.id === templateId)
    if (!plantilla?.estructura) return
    setInstEstructura(clonarInstitucional(plantilla.estructura))
    toast.success('Plantilla cargada. Guardá para aplicarla a la convocatoria.')
  }

  const importarCruzada = (templateId: string) => {
    const plantilla = plantillasCruzada.find(p => p.id === templateId)
    if (!plantilla?.estructura) return
    setCruzadaEstructura(clonarCruzada(plantilla.estructura))
    toast.success('Plantilla cargada. Guardá para aplicarla a la convocatoria.')
  }

  const guardarInst = async () => {
    setGuardandoInst(true)
    try {
      await api.convocatorias.templateInstitucional.guardar(convocatoriaId, instEstructura)
      toast.success('Formulario de evaluación institucional guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el formulario de evaluación')
    } finally {
      setGuardandoInst(false)
    }
  }

  const guardarCruzada = async () => {
    setGuardandoCruzada(true)
    try {
      await api.convocatorias.templateCruzada.guardar(convocatoriaId, cruzadaEstructura)
      toast.success('Formulario de evaluación cruzada guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el formulario de evaluación')
    } finally {
      setGuardandoCruzada(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!editable && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
          Los formularios de evaluación quedaron congelados al salir de la etapa de configuración. Solo pueden consultarse.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Formulario de evaluación institucional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plantillasInst.length > 0 && editable && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Cargar desde plantilla de biblioteca</span>
                <Select onValueChange={importarInst}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillasInst.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <TemplateInstitucionalBuilder
              estructura={instEstructura}
              onChange={setInstEstructura}
              editable={editable}
            />
            {editable && (
              <Button onClick={guardarInst} disabled={guardandoInst}>
                {guardandoInst && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar formulario de evaluación institucional
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Formulario de evaluación cruzada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plantillasCruzada.length > 0 && editable && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Cargar desde plantilla de biblioteca</span>
                <Select onValueChange={importarCruzada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillasCruzada.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <TemplateCruzadaBuilder
              estructura={cruzadaEstructura}
              onChange={setCruzadaEstructura}
              editable={editable}
            />
            {editable && (
              <Button onClick={guardarCruzada} disabled={guardandoCruzada}>
                {guardandoCruzada && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar formulario de evaluación cruzada
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Copy className="h-3 w-3" />
        Importar una plantilla copia su estructura con ids regenerados; los cambios se aplican recién al guardar.
      </p>
    </div>
  )
}
