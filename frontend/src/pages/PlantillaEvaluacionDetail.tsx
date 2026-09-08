import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DetailSkeleton } from '@/components/TableSkeleton'
import { TemplateInstitucionalBuilder, nuevaCategoriaInstitucional } from '@/components/TemplateInstitucionalBuilder'
import { TemplateCruzadaBuilder, nuevaCategoriaCruzada } from '@/components/TemplateCruzadaBuilder'
import { VistaPreviaEvaluacionInstitucional } from '@/components/VistaPreviaEvaluacionInstitucional'
import { VistaPreviaEvaluacionCruzada } from '@/components/VistaPreviaEvaluacionCruzada'
import { api } from '@/lib/api'
import type {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
} from '@/data/types'
import { ArrowLeft, Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Tipo = 'institucional' | 'cruzada'

export function PlantillaEvaluacionDetail() {
  const { tipo, id } = useParams<{ tipo: Tipo; id: string }>()
  const navigate = useNavigate()
  const esInstitucional = tipo === 'institucional'

  const [plantilla, setPlantilla] = useState<
    TemplateEvaluacionInstitucional | TemplateEvaluacionCruzada | null
  >(null)
  const [nombre, setNombre] = useState('')
  const [esDefault, setEsDefault] = useState(false)
  const [estructura, setEstructura] = useState<
    EstructuraTemplateInstitucional | EstructuraTemplateCruzada | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [preview, setPreview] = useState(false)

  const cargarDatos = useCallback(async () => {
    if (!id) return
    const datos = esInstitucional
      ? await api.templatesEvaluacion.institucionales.get(id)
      : await api.templatesEvaluacion.cruzadas.get(id)
    setPlantilla(datos)
    setNombre(datos.nombre)
    setEsDefault(datos.esDefault)
    setEstructura(datos.estructura)
  }, [id, esInstitucional])

  useEffect(() => {
    cargarDatos()
      .catch(() => setPlantilla(null))
      .finally(() => setLoading(false))
  }, [cargarDatos])

  const volver = () => navigate(`/plantillas/evaluacion?tipo=${tipo}`)

  const handleGuardar = async () => {
    if (!id) return
    if (!nombre.trim()) {
      toast.error('La plantilla debe tener un nombre')
      return
    }
    setGuardando(true)
    try {
      if (esInstitucional) {
        await api.templatesEvaluacion.institucionales.actualizar(id, {
          nombre: nombre.trim(),
          esDefault,
          estructura: estructura as EstructuraTemplateInstitucional | null,
        })
      } else {
        await api.templatesEvaluacion.cruzadas.actualizar(id, {
          nombre: nombre.trim(),
          esDefault,
          estructura: estructura as EstructuraTemplateCruzada | null,
        })
      }
      toast.success('Plantilla guardada correctamente')
      await cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la plantilla')
    } finally {
      setGuardando(false)
    }
  }

  const ejecutarEliminar = async () => {
    if (!id) return
    setEliminando(true)
    try {
      if (esInstitucional) {
        await api.templatesEvaluacion.institucionales.eliminar(id)
      } else {
        await api.templatesEvaluacion.cruzadas.eliminar(id)
      }
      toast.success('Plantilla eliminada correctamente')
      volver()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la plantilla')
      setEliminando(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (!plantilla) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={volver}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver
        </Button>
        <p className="text-muted-foreground">Plantilla no encontrada</p>
      </div>
    )
  }

  const estructuraInst = esInstitucional ? (estructura as EstructuraTemplateInstitucional | null) : null
  const estructuraCruzada = !esInstitucional ? (estructura as EstructuraTemplateCruzada | null) : null

  const subtitulo = esInstitucional
    ? `${estructuraInst?.categorias.length ?? 0} categorías · ${estructuraInst?.checklist.length ?? 0} ítems de checklist`
    : `${estructuraCruzada?.categorias.length ?? 0} categorías`

  const hayContenidoPreview = esInstitucional
    ? (estructuraInst?.categorias.length ?? 0) > 0 || (estructuraInst?.checklist.length ?? 0) > 0
    : (estructuraCruzada?.categorias.length ?? 0) > 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={volver}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{plantilla.nombre}</h2>
            <p className="text-sm text-muted-foreground">{subtitulo}</p>
          </div>
        </div>
        <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />Eliminar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Datos de la plantilla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Nombre</span>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">¿Es la plantilla por defecto?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={esDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEsDefault(true)}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={!esDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEsDefault(false)}
              >
                No
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Solo puede haber una por defecto: si marcás esta, se desmarca la anterior.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-medium">Formulario de evaluación</CardTitle>
            <Badge variant="outline">{esInstitucional ? 'Institucional' : 'Cruzada'}</Badge>
          </div>
          {hayContenidoPreview && (
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
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            esInstitucional
              ? <VistaPreviaEvaluacionInstitucional estructura={estructuraInst} />
              : <VistaPreviaEvaluacionCruzada estructura={estructuraCruzada} />
          ) : !hayContenidoPreview ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta plantilla todavía no tiene categorías.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => esInstitucional
                  ? setEstructura({ categorias: [nuevaCategoriaInstitucional()], checklist: [] })
                  : setEstructura({ categorias: [nuevaCategoriaCruzada()] })}
              >
                <Plus className="h-4 w-4 mr-2" />Agregar la primera categoría
              </Button>
            </div>
          ) : esInstitucional ? (
            <TemplateInstitucionalBuilder
              estructura={estructuraInst}
              onChange={setEstructura}
            />
          ) : (
            <TemplateCruzadaBuilder
              estructura={estructuraCruzada}
              onChange={setEstructura}
            />
          )}
          {!preview && (
            <div className="flex justify-end">
              <Button onClick={handleGuardar} disabled={guardando}>
                {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {guardando ? 'Guardando...' : 'Guardar plantilla'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar "{plantilla.nombre}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={ejecutarEliminar} disabled={eliminando}>
              {eliminando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
