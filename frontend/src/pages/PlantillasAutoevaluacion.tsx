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
import { api } from '@/lib/api'
import type {
  EstructuraTemplateAutoevaluacion,
  TemplateAutoevaluacionImpacto,
} from '@/data/types'
import { TemplateAutoevaluacionBuilder } from '@/components/TemplateAutoevaluacionBuilder'
import { ClipboardCheck, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DialogAutoState {
  open: boolean
  id?: string
  nombre: string
  esDefault: boolean
  estructura: EstructuraTemplateAutoevaluacion | null
}

const dialogAutoVacio: DialogAutoState = {
  open: false,
  nombre: '',
  esDefault: false,
  estructura: null,
}

export function PlantillasAutoevaluacion() {
  const [templates, setTemplates] = useState<TemplateAutoevaluacionImpacto[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [dialog, setDialog] = useState<DialogAutoState>(dialogAutoVacio)

  const cargar = useCallback(async () => {
    const list = await api.templatesAutoevaluacion.list()
    setTemplates(list)
  }, [])

  useEffect(() => {
    cargar().finally(() => setLoading(false))
  }, [cargar])

  const abrirNuevo = () => setDialog({ ...dialogAutoVacio, open: true })
  const abrirEditar = (t: TemplateAutoevaluacionImpacto) =>
    setDialog({
      open: true,
      id: t.id,
      nombre: t.nombre,
      esDefault: t.esDefault,
      estructura: t.estructura,
    })

  const guardar = async () => {
    if (!dialog.nombre.trim()) {
      toast.error('La plantilla debe tener un nombre')
      return
    }
    setGuardando(true)
    try {
      const dto = {
        nombre: dialog.nombre.trim(),
        esDefault: dialog.esDefault,
        estructura: dialog.estructura ?? undefined,
      }
      if (dialog.id) {
        await api.templatesAutoevaluacion.actualizar(dialog.id, dto)
        toast.success('Plantilla actualizada')
      } else {
        await api.templatesAutoevaluacion.crear(dto)
        toast.success('Plantilla creada')
      }
      setDialog(dialogAutoVacio)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la plantilla')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la plantilla "${nombre}"?`)) return
    try {
      await api.templatesAutoevaluacion.eliminar(id)
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Plantillas de autoevaluación de impacto</CardTitle>
            <Button size="sm" onClick={abrirNuevo}>
              <Plus className="h-4 w-4 mr-2" />Nueva plantilla
            </Button>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todavía no hay plantillas de autoevaluación de impacto.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">{t.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.estructura?.preguntas.length ?? 0} preguntas
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.esDefault && <Badge variant="default">Por defecto</Badge>}
                      <Button variant="outline" size="icon" onClick={() => abrirEditar(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => eliminar(t.id, t.nombre)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog.open} onOpenChange={v => setDialog(d => ({ ...d, open: v }))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <ClipboardCheck className="h-4 w-4 mr-2 inline" />
              {dialog.id ? 'Editar plantilla de autoevaluación' : 'Nueva plantilla de autoevaluación'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Nombre</span>
              <Input
                value={dialog.nombre}
                onChange={e => setDialog(d => ({ ...d, nombre: e.target.value }))}
                placeholder="Ej: Plantilla de autoevaluación estándar"
              />
            </div>
            <TemplateAutoevaluacionBuilder
              estructura={dialog.estructura}
              onChange={estructura => setDialog(d => ({ ...d, estructura }))}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm">Establecer como plantilla por defecto</span>
              <Button
                type="button"
                variant={dialog.esDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDialog(d => ({ ...d, esDefault: !d.esDefault }))}
              >
                {dialog.esDefault ? 'Sí' : 'No'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(dialogAutoVacio)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}