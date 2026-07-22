import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Convocatoria, Presupuesto, ViaticoPresupuesto, BienPresupuesto } from '@/data/types'
import { EstadoConvocatoria, TipoRubro, TipoPersona } from '@/data/types'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const tipoRubroLabels: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
}

export function NuevoProyectoDialog({
  onCreated,
  trigger,
}: {
  onCreated: () => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [nombre, setNombre] = useState('')
  const [convocatoriaId, setConvocatoriaId] = useState('')
  const [anioEdicion, setAnioEdicion] = useState<number | null>(new Date().getFullYear())

  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])

  const [presupuesto, setPresupuesto] = useState<Presupuesto>({
    montoTotal: 0,
    rubros: [
      { tipo: TipoRubro.ViaticosYSeguros, subtotal: 0, partidas: [] },
      { tipo: TipoRubro.BienesDeConsumo, subtotal: 0, partidas: [] },
      { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
    ],
  })

  useEffect(() => {
    if (!open) return
    api.convocatorias.list().then(convs => {
      setConvocatorias(convs.filter(c => c.estado === EstadoConvocatoria.Presentacion))
    })
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre) {
      setError('Completá el nombre del proyecto')
      return
    }
    if (!convocatoriaId) {
      setError('Seleccioná una convocatoria')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await api.proyectos.crear({
        nombre,
        convocatoriaId,
        anioEdicion: anioEdicion ?? undefined,
        presupuesto: presupuesto.rubros.some(r => r.partidas.length > 0) ? presupuesto : undefined,
      })
      setOpen(false)
      resetForm()
      onCreated()
      toast.success('Proyecto creado correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNombre('')
    setConvocatoriaId('')
    setAnioEdicion(new Date().getFullYear())
    setPresupuesto({
      montoTotal: 0,
      rubros: [
        { tipo: TipoRubro.ViaticosYSeguros, subtotal: 0, partidas: [] },
        { tipo: TipoRubro.BienesDeConsumo, subtotal: 0, partidas: [] },
        { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
      ],
    })
  }

  const addPartida = (rubroIdx: number, tipo: TipoRubro) => {
    setPresupuesto(prev => {
      const rubros = [...prev.rubros]
      const rubro = { ...rubros[rubroIdx] }
      if (tipo === TipoRubro.ViaticosYSeguros) {
        const partidas = [...(rubro.partidas as ViaticoPresupuesto[])]
        partidas.push({ tipoPersona: TipoPersona.Docente, descripcion: '', periodoInicio: '', periodoFin: '', monto: 0 })
        rubro.partidas = partidas
      } else {
        const partidas = [...(rubro.partidas as BienPresupuesto[])]
        partidas.push({ descripcion: '', cantidad: 1, precioUnitario: 0, monto: 0 })
        rubro.partidas = partidas
      }
      rubros[rubroIdx] = rubro
      return recalcularMontoTotal({ ...prev, rubros })
    })
  }

  const removePartida = (rubroIdx: number, partidaIdx: number) => {
    setPresupuesto(prev => {
      const rubros = [...prev.rubros]
      const rubro = { ...rubros[rubroIdx] }
      const partidas = rubro.partidas
      if (rubro.tipo === TipoRubro.ViaticosYSeguros) {
        rubro.partidas = (partidas as ViaticoPresupuesto[]).filter((_, i) => i !== partidaIdx)
      } else {
        rubro.partidas = (partidas as BienPresupuesto[]).filter((_, i) => i !== partidaIdx)
      }
      rubros[rubroIdx] = rubro
      return recalcularMontoTotal({ ...prev, rubros })
    })
  }

  const updateViatico = (rubroIdx: number, partidaIdx: number, field: keyof ViaticoPresupuesto, value: string | number) => {
    setPresupuesto(prev => {
      const rubros = [...prev.rubros]
      const rubro = { ...rubros[rubroIdx] }
      const partidas = [...(rubro.partidas as ViaticoPresupuesto[])]
      partidas[partidaIdx] = { ...partidas[partidaIdx], [field]: value }
      if (field === 'monto') {
        rubro.subtotal = partidas.reduce((sum, p) => sum + p.monto, 0)
      }
      rubro.partidas = partidas
      rubros[rubroIdx] = rubro
      return recalcularMontoTotal({ ...prev, rubros })
    })
  }

  const updateBien = (rubroIdx: number, partidaIdx: number, field: keyof BienPresupuesto, value: string | number) => {
    setPresupuesto(prev => {
      const rubros = [...prev.rubros]
      const rubro = { ...rubros[rubroIdx] }
      const partidas = [...(rubro.partidas as BienPresupuesto[])]
      partidas[partidaIdx] = { ...partidas[partidaIdx], [field]: value }
      if (field === 'cantidad' || field === 'precioUnitario') {
        partidas[partidaIdx].monto = partidas[partidaIdx].cantidad * partidas[partidaIdx].precioUnitario
      }
      rubro.subtotal = partidas.reduce((sum, p) => sum + p.monto, 0)
      rubro.partidas = partidas
      rubros[rubroIdx] = rubro
      return recalcularMontoTotal({ ...prev, rubros })
    })
  }

  const recalcularMontoTotal = (prev: Presupuesto): Presupuesto => {
    return {
      ...prev,
      montoTotal: prev.rubros.reduce((sum, r) => sum + r.subtotal, 0),
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Nombre del proyecto</p>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ingresá el nombre del proyecto" required />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Convocatoria</p>
              <Select value={convocatoriaId} onValueChange={setConvocatoriaId}>
                <SelectTrigger><SelectValue placeholder="Seleccioná una convocatoria" /></SelectTrigger>
                <SelectContent>
                  {convocatorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Edición (año)</p>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={anioEdicion ?? ''}
                onChange={e => setAnioEdicion(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Presupuesto (opcional)</h3>
              <span className="text-sm text-muted-foreground">
                Total: ${presupuesto.montoTotal.toLocaleString()}
              </span>
            </div>

            {presupuesto.rubros.map((rubro, rubroIdx) => (
              <div key={rubro.tipo} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{tipoRubroLabels[rubro.tipo as TipoRubro]}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Subtotal: ${rubro.subtotal.toLocaleString()}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => addPartida(rubroIdx, rubro.tipo as TipoRubro)}>
                      <Plus className="h-3 w-3 mr-1" />Agregar
                    </Button>
                  </div>
                </div>

                {rubro.partidas.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin partidas. Hacé clic en "Agregar" para añadir una.</p>
                )}

                {rubro.tipo === TipoRubro.ViaticosYSeguros && (
                  <div className="space-y-2">
                    {(rubro.partidas as ViaticoPresupuesto[]).map((partida, pIdx) => (
                      <div key={pIdx} className="flex items-end gap-2 bg-muted/30 p-2 rounded-md">
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Tipo</span>
                          <Select value={partida.tipoPersona} onValueChange={v => updateViatico(rubroIdx, pIdx, 'tipoPersona', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TipoPersona.Docente}>Docente</SelectItem>
                              <SelectItem value={TipoPersona.Estudiante}>Estudiante</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-[2] space-y-1">
                          <span className="text-xs">Descripción</span>
                          <Input value={partida.descripcion} onChange={e => updateViatico(rubroIdx, pIdx, 'descripcion', e.target.value)} placeholder="Ej: Viaje a..." />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Inicio</span>
                          <Input type="date" value={partida.periodoInicio} onChange={e => updateViatico(rubroIdx, pIdx, 'periodoInicio', e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Fin</span>
                          <Input type="date" value={partida.periodoFin} onChange={e => updateViatico(rubroIdx, pIdx, 'periodoFin', e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Monto</span>
                          <Input type="number" min="0" step="0.01" value={partida.monto || ''} onChange={e => updateViatico(rubroIdx, pIdx, 'monto', Number(e.target.value))} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePartida(rubroIdx, pIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {(rubro.tipo === TipoRubro.BienesDeConsumo || rubro.tipo === TipoRubro.BienesDeUso) && (
                  <div className="space-y-2">
                    {(rubro.partidas as BienPresupuesto[]).map((partida, pIdx) => (
                      <div key={pIdx} className="flex items-end gap-2 bg-muted/30 p-2 rounded-md">
                        <div className="flex-[2] space-y-1">
                          <span className="text-xs">Descripción</span>
                          <Input value={partida.descripcion} onChange={e => updateBien(rubroIdx, pIdx, 'descripcion', e.target.value)} placeholder="Ej: Resmas de papel" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Cantidad</span>
                          <Input type="number" min="1" step="1" value={partida.cantidad || ''} onChange={e => updateBien(rubroIdx, pIdx, 'cantidad', Number(e.target.value))} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Precio unit.</span>
                          <Input type="number" min="0" step="0.01" value={partida.precioUnitario || ''} onChange={e => updateBien(rubroIdx, pIdx, 'precioUnitario', Number(e.target.value))} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs">Monto</span>
                          <Input type="number" value={partida.monto || ''} disabled className="bg-muted" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePartida(rubroIdx, pIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
