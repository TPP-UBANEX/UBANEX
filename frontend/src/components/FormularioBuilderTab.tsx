import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { EstadoConvocatoria } from '@/data/types'
import type { CampoFormulario } from '@/data/types'
import { CamposFormularioEditor, campoVacio, validarCampos } from '@/components/CamposFormularioEditor'
import { SeleccionarPlantillaDialog } from '@/components/SeleccionarPlantillaDialog'
import { FileText, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  convocatoriaId: string
  estadoConvocatoria: EstadoConvocatoria
}

export function FormularioBuilderTab({ convocatoriaId, estadoConvocatoria }: Props) {
  const [campos, setCampos] = useState<CampoFormulario[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [plantillaDialogOpen, setPlantillaDialogOpen] = useState(false)

  const editable = estadoConvocatoria === EstadoConvocatoria.Configuracion

  const cargarDatos = useCallback(async () => {
    const formulario = await api.convocatorias.formulario.get(convocatoriaId)
    setCampos(formulario.campos ?? [])
  }, [convocatoriaId])

  useEffect(() => {
    cargarDatos().finally(() => setLoading(false))
  }, [cargarDatos])

  const importarPlantilla = (camposPlantilla: CampoFormulario[]) => {
    setCampos(camposPlantilla)
    toast.success('Plantilla cargada. Revisá los campos y guardá para confirmar.')
  }

  const handleGuardar = async () => {
    if (!validarCampos(campos)) return
    setGuardando(true)
    try {
      await api.convocatorias.formulario.guardar(convocatoriaId, campos)
      toast.success('Formulario guardado correctamente')
      await cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el formulario')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const slotVacio = editable ? (
    <div className="text-center py-8 space-y-4">
      <p className="text-sm text-muted-foreground">
        Todavía no hay campos definidos. ¿Cómo querés empezar?
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => setPlantillaDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />Empezar desde una plantilla
        </Button>
        <Button type="button" variant="outline" onClick={() => setCampos([campoVacio()])}>
          <Plus className="h-4 w-4 mr-2" />Empezar de cero
        </Button>
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground text-center py-4">
      Este formulario no tiene campos definidos.
    </p>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Formulario de presentación</CardTitle>
        {editable && campos.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setPlantillaDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />Reemplazar por plantilla
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!editable && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            El formulario quedó congelado al salir de la etapa de configuración. Solo puede consultarse.
          </p>
        )}

        <CamposFormularioEditor
          campos={campos}
          onChange={setCampos}
          editable={editable}
          slotVacio={slotVacio}
          slotAcciones={
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {guardando ? 'Guardando...' : 'Guardar formulario'}
            </Button>
          }
        />
      </CardContent>

      <SeleccionarPlantillaDialog
        open={plantillaDialogOpen}
        onOpenChange={setPlantillaDialogOpen}
        onSeleccionar={importarPlantilla}
        advertencia={campos.length > 0
          ? 'Los campos que tenés cargados se reemplazan por los de la plantilla. El cambio no se aplica hasta que guardes.'
          : undefined}
      />
    </Card>
  )
}
