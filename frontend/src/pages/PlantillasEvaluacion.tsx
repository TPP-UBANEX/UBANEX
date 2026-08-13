import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type {
  EstructuraTemplateInstitucional,
  EstructuraTemplateCruzada,
  TemplateEvaluacionInstitucional,
  TemplateEvaluacionCruzada,
} from '@/data/types'
import { TemplateInstitucionalBuilder } from '@/components/TemplateInstitucionalBuilder'
import { TemplateCruzadaBuilder } from '@/components/TemplateCruzadaBuilder'
import { ClipboardCheck, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DialogInstState {
  open: boolean
  id?: string
  nombre: string
  esDefault: boolean
  estructura: EstructuraTemplateInstitucional | null
}

interface DialogCruzadaState {
  open: boolean
  id?: string
  nombre: string
  esDefault: boolean
  estructura: EstructuraTemplateCruzada | null
}

const dialogInstVacio: DialogInstState = { open: false, nombre: '', esDefault: false, estructura: null }
const dialogCruzadaVacio: DialogCruzadaState = { open: false, nombre: '', esDefault: false, estructura: null }

export function PlantillasEvaluacion() {
  const [institucionales, setInstitucionales] = useState<TemplateEvaluacionInstitucional[]>([])
  const [cruzadas, setCruzadas] = useState<TemplateEvaluacionCruzada[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [dialogInst, setDialogInst] = useState<DialogInstState>(dialogInstVacio)
  const [dialogCruzada, setDialogCruzada] = useState<DialogCruzadaState>(dialogCruzadaVacio)

  const cargar = useCallback(async () => {
    const [institucionales, cruzadas] = await Promise.all([
      api.templatesEvaluacion.institucionales.list(),
      api.templatesEvaluacion.cruzadas.list(),
    ])
    setInstitucionales(institucionales)
    setCruzadas(cruzadas)
  }, [])

  useEffect(() => {
    cargar().finally(() => setLoading(false))
  }, [cargar])

  const abrirNuevaInst = () => setDialogInst({ ...dialogInstVacio, open: true })
  const abrirEditarInst = (t: TemplateEvaluacionInstitucional) =>
    setDialogInst({ open: true, id: t.id, nombre: t.nombre, esDefault: t.esDefault, estructura: t.estructura })

  const abrirNuevaCruzada = () => setDialogCruzada({ ...dialogCruzadaVacio, open: true })
  const abrirEditarCruzada = (t: TemplateEvaluacionCruzada) =>
    setDialogCruzada({ open: true, id: t.id, nombre: t.nombre, esDefault: t.esDefault, estructura: t.estructura })

  const guardarInstitucional = async () => {
    if (!dialogInst.nombre.trim()) {
      toast.error('La plantilla debe tener un nombre')
      return
    }
    setGuardando(true)
    try {
      const dto = {
        nombre: dialogInst.nombre.trim(),
        esDefault: dialogInst.esDefault,
        estructura: dialogInst.estructura,
      }
      if (dialogInst.id) {
        await api.templatesEvaluacion.institucionales.actualizar(dialogInst.id, dto)
        toast.success('Plantilla institucional actualizada')
      } else {
        await api.templatesEvaluacion.institucionales.crear(dto)
        toast.success('Plantilla institucional creada')
      }
      setDialogInst(dialogInstVacio)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la plantilla')
    } finally {
      setGuardando(false)
    }
  }

  const guardarCruzada = async () => {
    if (!dialogCruzada.nombre.trim()) {
      toast.error('La plantilla debe tener un nombre')
      return
    }
    setGuardando(true)
    try {
      const dto = {
        nombre: dialogCruzada.nombre.trim(),
        esDefault: dialogCruzada.esDefault,
        estructura: dialogCruzada.estructura,
      }
      if (dialogCruzada.id) {
        await api.templatesEvaluacion.cruzadas.actualizar(dialogCruzada.id, dto)
        toast.success('Plantilla cruzada actualizada')
      } else {
        await api.templatesEvaluacion.cruzadas.crear(dto)
        toast.success('Plantilla cruzada creada')
      }
      setDialogCruzada(dialogCruzadaVacio)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la plantilla')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarInstitucional = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la plantilla "${nombre}"?`)) return
    try {
      await api.templatesEvaluacion.institucionales.eliminar(id)
      toast.success('Plantilla eliminada')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la plantilla')
    }
  }

  const eliminarCruzada = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la plantilla "${nombre}"?`)) return
    try {
      await api.templatesEvaluacion.cruzadas.eliminar(id)
      toast.success('Plantilla eliminada')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la plantilla')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="institucional">
          <TabsList>
            <TabsTrigger value="institucional">Institucional ({institucionales.length})</TabsTrigger>
            <TabsTrigger value="cruzada">Cruzada ({cruzadas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="institucional" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Plantillas de evaluación institucional</CardTitle>
                <Button size="sm" onClick={abrirNuevaInst}>
                  <Plus className="h-4 w-4 mr-2" />Nueva plantilla
                </Button>
              </CardHeader>
              <CardContent>
                {institucionales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todavía no hay plantillas institucionales.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {institucionales.map(t => (
                      <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium">{t.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.estructura?.categorias.length ?? 0} categorías · {t.estructura?.checklist.length ?? 0} ítems de checklist
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.esDefault && <Badge variant="default">Por defecto</Badge>}
                          <Button variant="outline" size="icon" onClick={() => abrirEditarInst(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => eliminarInstitucional(t.id, t.nombre)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cruzada" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Plantillas de evaluación cruzada</CardTitle>
                <Button size="sm" onClick={abrirNuevaCruzada}>
                  <Plus className="h-4 w-4 mr-2" />Nueva plantilla
                </Button>
              </CardHeader>
              <CardContent>
                {cruzadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todavía no hay plantillas de evaluación cruzada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cruzadas.map(t => (
                      <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium">{t.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.estructura?.categorias.length ?? 0} categorías
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.esDefault && <Badge variant="default">Por defecto</Badge>}
                          <Button variant="outline" size="icon" onClick={() => abrirEditarCruzada(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => eliminarCruzada(t.id, t.nombre)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogInst.open} onOpenChange={v => setDialogInst(d => ({ ...d, open: v }))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <ClipboardCheck className="h-4 w-4 mr-2 inline" />
              {dialogInst.id ? 'Editar plantilla institucional' : 'Nueva plantilla institucional'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Nombre</span>
              <Input
                value={dialogInst.nombre}
                onChange={e => setDialogInst(d => ({ ...d, nombre: e.target.value }))}
                placeholder="Ej: Plantilla institucional estándar"
              />
            </div>
            <TemplateInstitucionalBuilder
              estructura={dialogInst.estructura}
              onChange={estructura => setDialogInst(d => ({ ...d, estructura }))}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm">Establecer como plantilla por defecto</span>
              <Button
                type="button"
                variant={dialogInst.esDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDialogInst(d => ({ ...d, esDefault: !d.esDefault }))}
              >
                {dialogInst.esDefault ? 'Sí' : 'No'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogInst(dialogInstVacio)}>Cancelar</Button>
            <Button onClick={guardarInstitucional} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCruzada.open} onOpenChange={v => setDialogCruzada(d => ({ ...d, open: v }))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <ClipboardCheck className="h-4 w-4 mr-2 inline" />
              {dialogCruzada.id ? 'Editar plantilla de evaluación cruzada' : 'Nueva plantilla de evaluación cruzada'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Nombre</span>
              <Input
                value={dialogCruzada.nombre}
                onChange={e => setDialogCruzada(d => ({ ...d, nombre: e.target.value }))}
                placeholder="Ej: Plantilla cruzada estándar"
              />
            </div>
            <TemplateCruzadaBuilder
              estructura={dialogCruzada.estructura}
              onChange={estructura => setDialogCruzada(d => ({ ...d, estructura }))}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm">Establecer como plantilla por defecto</span>
              <Button
                type="button"
                variant={dialogCruzada.esDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDialogCruzada(d => ({ ...d, esDefault: !d.esDefault }))}
              >
                {dialogCruzada.esDefault ? 'Sí' : 'No'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCruzada(dialogCruzadaVacio)}>Cancelar</Button>
            <Button onClick={guardarCruzada} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
