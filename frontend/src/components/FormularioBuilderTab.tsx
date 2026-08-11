import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { EstadoConvocatoria, TipoCampo, tipoCampoLabels } from '@/data/types'
import type { CampoFormulario } from '@/data/types'
import { SeleccionarPlantillaDialog } from '@/components/SeleccionarPlantillaDialog'
import { ArrowDown, ArrowUp, FileText, Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  convocatoriaId: string
  estadoConvocatoria: EstadoConvocatoria
}

const TIPOS_CON_OPCIONES = [TipoCampo.Select, TipoCampo.Checkbox]
const TIPOS_CON_RANGO = [TipoCampo.Numero]

function campoVacio(): CampoFormulario {
  return {
    id: crypto.randomUUID(),
    tipo: TipoCampo.Texto,
    nombre: '',
    textoAyuda: '',
    esObligatorio: false,
    orden: 0,
  }
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

  const actualizarCampo = (id: string, cambios: Partial<CampoFormulario>) => {
    setCampos(prev => prev.map(c => {
      if (c.id !== id) return c
      const actualizado = { ...c, ...cambios }
      if (cambios.tipo && !TIPOS_CON_OPCIONES.includes(cambios.tipo)) {
        actualizado.opciones = undefined
      }
      if (cambios.tipo && !TIPOS_CON_RANGO.includes(cambios.tipo)) {
        actualizado.minimo = undefined
        actualizado.maximo = undefined
        actualizado.admiteDecimales = undefined
      }
      return actualizado
    }))
  }

  const agregarCampo = () => {
    setCampos(prev => [...prev, campoVacio()])
  }

  const importarPlantilla = (camposPlantilla: CampoFormulario[]) => {
    setCampos(camposPlantilla)
    toast.success('Plantilla cargada. Revisá los campos y guardá para confirmar.')
  }

  const eliminarCampo = (id: string) => {
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  const moverCampo = (index: number, direccion: -1 | 1) => {
    setCampos(prev => {
      const destino = index + direccion
      if (destino < 0 || destino >= prev.length) return prev
      const copia = [...prev]
      const [campo] = copia.splice(index, 1)
      copia.splice(destino, 0, campo)
      return copia
    })
  }

  const agregarOpcion = (id: string) => {
    setCampos(prev => prev.map(c =>
      c.id === id ? { ...c, opciones: [...(c.opciones ?? []), ''] } : c,
    ))
  }

  const actualizarOpcion = (id: string, opcionIdx: number, valor: string) => {
    setCampos(prev => prev.map(c => {
      if (c.id !== id) return c
      const opciones = [...(c.opciones ?? [])]
      opciones[opcionIdx] = valor
      return { ...c, opciones }
    }))
  }

  const eliminarOpcion = (id: string, opcionIdx: number) => {
    setCampos(prev => prev.map(c => {
      if (c.id !== id) return c
      return { ...c, opciones: (c.opciones ?? []).filter((_, i) => i !== opcionIdx) }
    }))
  }

  const validar = (): boolean => {
    for (const campo of campos) {
      if (!campo.nombre.trim()) {
        toast.error('Todos los campos deben tener una etiqueta')
        return false
      }
      if (TIPOS_CON_OPCIONES.includes(campo.tipo)) {
        const opciones = (campo.opciones ?? []).map(o => o.trim()).filter(Boolean)
        if (opciones.length === 0) {
          toast.error(`El campo "${campo.nombre}" debe tener al menos una opción`)
          return false
        }
      }
      if (campo.tipo === TipoCampo.Numero) {
        if (!campo.admiteDecimales) {
          if (campo.minimo !== undefined && !Number.isInteger(campo.minimo)) {
            toast.error(`El campo "${campo.nombre}" debe tener un mínimo entero`)
            return false
          }
          if (campo.maximo !== undefined && !Number.isInteger(campo.maximo)) {
            toast.error(`El campo "${campo.nombre}" debe tener un máximo entero`)
            return false
          }
        }
        if (campo.minimo !== undefined && campo.maximo !== undefined && campo.minimo > campo.maximo) {
          toast.error(`El campo "${campo.nombre}" tiene un mínimo mayor que el máximo`)
          return false
        }
      }
    }
    return true
  }

  const handleGuardar = async () => {
    if (!validar()) return
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

        {campos.length === 0 ? (
          editable ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Todavía no hay campos definidos. ¿Cómo querés empezar?
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button type="button" variant="outline" onClick={() => setPlantillaDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />Empezar desde una plantilla
                </Button>
                <Button type="button" variant="outline" onClick={agregarCampo}>
                  <Plus className="h-4 w-4 mr-2" />Empezar de cero
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este formulario no tiene campos definidos.
            </p>
          )
        ) : (
          <div className="space-y-3">
            {campos.map((campo, index) => (
              <div key={campo.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-start gap-2">
                  <div className="flex-[2] space-y-1">
                    <span className="text-xs text-muted-foreground">Etiqueta</span>
                    <Input
                      value={campo.nombre}
                      disabled={!editable}
                      onChange={e => actualizarCampo(campo.id, { nombre: e.target.value })}
                      placeholder="Ej: Resumen del proyecto"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Tipo</span>
                    <Select
                      value={campo.tipo}
                      disabled={!editable}
                      onValueChange={v => actualizarCampo(campo.id, { tipo: v as TipoCampo })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.values(TipoCampo).filter(t => t !== TipoCampo.Archivo).map(t => (
                          <SelectItem key={t} value={t}>{tipoCampoLabels[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editable && (
                    <div className="flex items-center gap-1 pt-5">
                      <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moverCampo(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" disabled={index === campos.length - 1} onClick={() => moverCampo(index, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => eliminarCampo(campo.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-[2] space-y-1">
                    <span className="text-xs text-muted-foreground">Texto de ayuda (opcional)</span>
                    <Input
                      value={campo.textoAyuda ?? ''}
                      disabled={!editable}
                      onChange={e => actualizarCampo(campo.id, { textoAyuda: e.target.value })}
                      placeholder="Aclaración que ve quien completa el formulario"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">¿Obligatorio?</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={campo.esObligatorio ? 'default' : 'outline'}
                        size="sm"
                        disabled={!editable}
                        onClick={() => actualizarCampo(campo.id, { esObligatorio: true })}
                      >
                        Sí
                      </Button>
                      <Button
                        type="button"
                        variant={!campo.esObligatorio ? 'default' : 'outline'}
                        size="sm"
                        disabled={!editable}
                        onClick={() => actualizarCampo(campo.id, { esObligatorio: false })}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                </div>

                {TIPOS_CON_OPCIONES.includes(campo.tipo) && (
                  <div className="space-y-2 pl-2 border-l-2">
                    <span className="text-xs text-muted-foreground">Opciones</span>
                    {(campo.opciones ?? []).map((opcion, opcionIdx) => (
                      <div key={opcionIdx} className="flex items-center gap-2">
                        <Input
                          value={opcion}
                          disabled={!editable}
                          onChange={e => actualizarOpcion(campo.id, opcionIdx, e.target.value)}
                          placeholder={`Opción ${opcionIdx + 1}`}
                        />
                        {editable && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => eliminarOpcion(campo.id, opcionIdx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <Button type="button" variant="outline" size="sm" onClick={() => agregarOpcion(campo.id)}>
                        <Plus className="h-3 w-3 mr-1" />Agregar opción
                      </Button>
                    )}
                  </div>
                )}

                {TIPOS_CON_RANGO.includes(campo.tipo) && (
                  <div className="space-y-2 pl-2 border-l-2">
                    <span className="text-xs text-muted-foreground">Rango (opcional)</span>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <span className="text-xs text-muted-foreground">Mínimo</span>
                        <Input
                          type="number"
                          value={campo.minimo ?? ''}
                          disabled={!editable}
                          onChange={e => actualizarCampo(campo.id, { minimo: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs text-muted-foreground">Máximo</span>
                        <Input
                          type="number"
                          value={campo.maximo ?? ''}
                          disabled={!editable}
                          onChange={e => actualizarCampo(campo.id, { maximo: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">¿Admite decimales?</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={campo.admiteDecimales ? 'default' : 'outline'}
                            size="sm"
                            disabled={!editable}
                            onClick={() => actualizarCampo(campo.id, { admiteDecimales: true })}
                          >
                            Sí
                          </Button>
                          <Button
                            type="button"
                            variant={!campo.admiteDecimales ? 'default' : 'outline'}
                            size="sm"
                            disabled={!editable}
                            onClick={() => actualizarCampo(campo.id, { admiteDecimales: false })}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {editable && (
          <div className="flex items-center justify-between pt-2">
            {campos.length > 0 ? (
              <Button type="button" variant="outline" onClick={agregarCampo}>
                <Plus className="h-4 w-4 mr-2" />Agregar campo
              </Button>
            ) : <span />}
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {guardando ? 'Guardando...' : 'Guardar formulario'}
            </Button>
          </div>
        )}
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
