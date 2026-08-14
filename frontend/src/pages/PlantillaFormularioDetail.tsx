import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { CamposFormularioEditor, campoVacio, validarCampos } from '@/components/CamposFormularioEditor'
import { api } from '@/lib/api'
import type { CampoFormulario, Formulario } from '@/data/types'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function PlantillaFormularioDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [plantilla, setPlantilla] = useState<Formulario | null>(null)
  const [nombre, setNombre] = useState('')
  const [esDefault, setEsDefault] = useState(false)
  const [campos, setCampos] = useState<CampoFormulario[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const cargarDatos = useCallback(async () => {
    if (!id) return
    const datos = await api.formularios.get(id)
    setPlantilla(datos)
    setNombre(datos.nombre)
    setEsDefault(datos.esDefault)
    setCampos(datos.campos ?? [])
  }, [id])

  useEffect(() => {
    cargarDatos()
      .catch(() => setPlantilla(null))
      .finally(() => setLoading(false))
  }, [cargarDatos])

  const handleGuardar = async () => {
    if (!id) return
    if (!nombre.trim()) {
      toast.error('La plantilla necesita un nombre')
      return
    }
    if (!validarCampos(campos)) return

    setGuardando(true)
    try {
      await api.formularios.actualizar(id, { nombre: nombre.trim(), esDefault, campos })
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
      await api.formularios.eliminar(id)
      toast.success('Plantilla eliminada correctamente')
      navigate('/plantillas-formulario')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la plantilla')
      setEliminando(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (!plantilla) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/plantillas-formulario')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver
        </Button>
        <p className="text-muted-foreground">Plantilla no encontrada</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plantillas-formulario')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{plantilla.nombre}</h2>
            <p className="text-sm text-muted-foreground">
              {campos.length} {campos.length === 1 ? 'campo' : 'campos'}
            </p>
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
            <span className="text-xs text-muted-foreground">¿Es la plantilla default?</span>
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
              Solo puede haber una default: si marcás esta, se desmarca la anterior.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Campos</CardTitle>
        </CardHeader>
        <CardContent>
          <CamposFormularioEditor
            campos={campos}
            onChange={setCampos}
            editable
            slotVacio={
              <div className="text-center py-8 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Esta plantilla todavía no tiene campos.
                </p>
                <Button type="button" variant="outline" onClick={() => setCampos([campoVacio()])}>
                  <Plus className="h-4 w-4 mr-2" />Agregar el primer campo
                </Button>
              </div>
            }
            slotAcciones={
              <Button onClick={handleGuardar} disabled={guardando}>
                {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {guardando ? 'Guardando...' : 'Guardar plantilla'}
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar "{plantilla.nombre}"? Esta acción no se puede deshacer.
              Las convocatorias que ya la importaron no se ven afectadas.
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
