import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Rendicion, CrearRendicionDto, ActualizarRendicionDto, Presupuesto } from '@/data/types'
import { EstadoComprobante, TipoRubro, EstadoEdicion } from '@/data/types'
import { formatearMoneda, LABELS_RUBRO } from '@/lib/presupuesto'
import { Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export const estadoComprobanteLabel: Record<EstadoComprobante, string> = {
  [EstadoComprobante.EnRevision]: 'En revisión',
  [EstadoComprobante.Aceptado]: 'Aceptado',
  [EstadoComprobante.Rechazado]: 'Rechazado',
}

function EstadoBadge({ estado }: { estado: EstadoComprobante }) {
  const variant =
    estado === EstadoComprobante.Aceptado
      ? 'success'
      : estado === EstadoComprobante.Rechazado
        ? 'destructive'
        : 'outline'
  return <Badge variant={variant as 'success' | 'destructive' | 'outline'}>{estadoComprobanteLabel[estado]}</Badge>
}

interface FormState {
  rubro: TipoRubro
  monto: string
  descripcion: string
  fecha: string
  comprobanteUrl: string
}

const formVacio: FormState = {
  rubro: TipoRubro.ViaticosYSeguros,
  monto: '',
  descripcion: '',
  fecha: '',
  comprobanteUrl: '',
}

function conProtocolo(url: string) {
  const u = url.trim()
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function esGoogleDrive(url: string): boolean {
  const v = url.trim()
  if (!v) return false
  const normalizado = /^https?:\/\//i.test(v) ? v : `https://${v}`
  let host: string
  try {
    host = new URL(normalizado).hostname.toLowerCase()
  } catch {
    return false
  }
  const permitidos = ['drive.google.com', 'drive.usercontent.google.com', 'docs.google.com']
  return permitidos.some(d => host === d || host.endsWith(`.${d}`))
}

export function ComprobantesTab({
  edicionId,
  estado,
  puedeEditar,
  puedeGestionarEstado,
  presupuesto,
  fechaInicioEjecucion,
  fechaFinEjecucion,
}: {
  edicionId?: string
  estado?: EstadoEdicion
  puedeEditar: boolean
  puedeGestionarEstado: boolean
  presupuesto?: Presupuesto | null
  fechaInicioEjecucion?: string
  fechaFinEjecucion?: string
}) {
  const [comprobantes, setComprobantes] = useState<Rendicion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null)
  const [rechazoComp, setRechazoComp] = useState<Rendicion | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [rechazando, setRechazando] = useState(false)

  const cargar = useCallback(async () => {
    if (!edicionId) return
    setLoading(true)
    try {
      setComprobantes(await api.rendiciones.listar(edicionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar los comprobantes')
    } finally {
      setLoading(false)
    }
  }, [edicionId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const enEjecucion =
    estado === EstadoEdicion.EnEjecucion || estado === EstadoEdicion.Cerrado
  const permitidoEditar = enEjecucion && puedeEditar

  const rubrosDisponibles = useMemo(() => {
    if (!presupuesto?.rubros?.length) return []
    return presupuesto.rubros.map(r => r.tipo)
  }, [presupuesto])

  const rubroLabel = (r: TipoRubro) => LABELS_RUBRO[r] ?? r

  // Suma de comprobantes contables (EnRevisión + Aceptados) por rubro y total.
  const sumas = useMemo(() => {
    const porRubro: Record<string, number> = {}
    let total = 0
    for (const c of comprobantes) {
      if (c.estado === EstadoComprobante.Rechazado) continue
      porRubro[c.rubro] = (porRubro[c.rubro] ?? 0) + Number(c.monto)
      total += Number(c.monto)
    }
    return { porRubro, total }
  }, [comprobantes])

  const subtotalDeRubro = (tipo: TipoRubro): number => {
    const rubro = presupuesto?.rubros?.find(r => r.tipo === tipo)
    return rubro ? Number(rubro.subtotal) : 0
  }

  const topeTotal = () => Number(presupuesto?.montoTotal ?? 0)

  // Valida si, con el formulario actual, el nuevo monto excede algún tope.
  const errorPresupuesto = useMemo(() => {
    const monto = Number(form.monto)
    if (!Number.isFinite(monto) || monto <= 0) return null
    const editado = editandoId
      ? comprobantes.find(c => c.id === editandoId)
      : undefined
    const rubroActual = editado?.rubro
    const estabaContado = editado && editado.estado !== EstadoComprobante.Rechazado
    const montoActual = editado ? Number(editado.monto) : 0

    // Al editar, el comprobante que se está modificando deja de contar (si contaba).
    const totalSinActual = sumas.total - (estabaContado ? montoActual : 0)
    const totalNuevo = totalSinActual + monto
    if (totalNuevo > topeTotal()) {
      return `El total (${formatearMoneda(totalNuevo)}) supera el presupuesto del proyecto (${formatearMoneda(topeTotal())}).`
    }

    const subtotal = subtotalDeRubro(form.rubro)
    const consumoRubro = sumas.porRubro[form.rubro] ?? 0
    // Descuento del rubro objetivo el comprobante editado si era de ese rubro y contaba.
    const baseRubro = (rubroActual === form.rubro && estabaContado) ? consumoRubro - montoActual : consumoRubro
    const rubroNuevo = baseRubro + monto
    if (rubroNuevo > subtotal) {
      return `Los comprobantes del rubro (${formatearMoneda(rubroNuevo)}) superan su presupuesto (${formatearMoneda(subtotal)}).`
    }
    return null
  }, [form, sumas, editandoId, comprobantes, presupuesto])

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm({
      ...formVacio,
      rubro: rubrosDisponibles[0] ?? formVacio.rubro,
      fecha: fechaInicioEjecucion ?? new Date().toISOString().slice(0, 10),
    })
    setModalOpen(true)
  }

  const abrirEditar = (c: Rendicion) => {
    setEditandoId(c.id)
    setForm({
      rubro: c.rubro,
      monto: String(c.monto),
      descripcion: c.descripcion ?? '',
      fecha: c.fecha,
      comprobanteUrl: c.comprobanteUrl ?? '',
    })
    setModalOpen(true)
  }

  const guardar = async () => {
    if (!edicionId) return
    const monto = Number(form.monto)
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('Ingresá un monto válido mayor a cero')
      return
    }
    if (!form.comprobanteUrl.trim()) {
      toast.error('El link al comprobante es obligatorio')
      return
    }
    if (!esGoogleDrive(form.comprobanteUrl)) {
      toast.error('El link debe ser de Google Drive (drive.google.com, docs.google.com o drive.usercontent.google.com)')
      return
    }
    if (!form.fecha) {
      toast.error('La fecha es obligatoria')
      return
    }
    if (fechaInicioEjecucion && form.fecha < fechaInicioEjecucion) {
      toast.error('La fecha debe ser posterior o igual al inicio del período de ejecución')
      return
    }
    if (fechaFinEjecucion && form.fecha > fechaFinEjecucion) {
      toast.error('La fecha debe ser anterior o igual al fin del período de ejecución')
      return
    }
    if (!rubrosDisponibles.includes(form.rubro)) {
      toast.error('El rubro seleccionado no existe en el presupuesto del proyecto')
      return
    }
    if (errorPresupuesto) {
      toast.error(errorPresupuesto)
      return
    }
    setGuardando(true)
    try {
      if (editandoId) {
        const payload: ActualizarRendicionDto = {
          rubro: form.rubro,
          monto,
          descripcion: form.descripcion.trim() || undefined,
          fecha: form.fecha,
          comprobanteUrl: form.comprobanteUrl.trim(),
        }
        await api.rendiciones.actualizar(editandoId, payload)
        toast.success('Comprobante actualizado')
      } else {
        const payload: CrearRendicionDto = {
          edicionId,
          rubro: form.rubro,
          monto,
          descripcion: form.descripcion.trim() || undefined,
          fecha: form.fecha,
          comprobanteUrl: form.comprobanteUrl.trim(),
        }
        await api.rendiciones.crear(payload)
        toast.success('Comprobante cargado')
      }
      setModalOpen(false)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el comprobante')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminandoId(id)
    try {
      await api.rendiciones.eliminar(id)
      toast.success('Comprobante eliminado')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el comprobante')
    } finally {
      setEliminandoId(null)
    }
  }

  const cambiarEstado = async (c: Rendicion, nuevo: EstadoComprobante) => {
    if (nuevo === EstadoComprobante.Rechazado) {
      setRechazoComp(c)
      setMotivoRechazo('')
      return
    }
    setCambiandoEstadoId(c.id)
    try {
      await api.rendiciones.actualizar(c.id, { estado: nuevo })
      toast.success(`Comprobante ${estadoComprobanteLabel[nuevo].toLowerCase()}`)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar el estado')
    } finally {
      setCambiandoEstadoId(null)
    }
  }

  const confirmarRechazo = async () => {
    if (!rechazoComp) return
    const motivo = motivoRechazo.trim()
    if (!motivo) {
      toast.error('Debés indicar un motivo para rechazar el comprobante')
      return
    }
    setRechazando(true)
    try {
      await api.rendiciones.actualizar(rechazoComp.id, {
        estado: EstadoComprobante.Rechazado,
        motivoRechazo: motivo,
      })
      toast.success('Comprobante rechazado')
      setRechazoComp(null)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al rechazar el comprobante')
    } finally {
      setRechazando(false)
    }
  }

  const actualizarCampo = (campo: keyof FormState, valor: string) =>
    setForm(prev => ({ ...prev, [campo]: valor }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Comprobantes de gastos</CardTitle>
        {permitidoEditar && (
          <Button size="sm" onClick={abrirNuevo} disabled={rubrosDisponibles.length === 0}>
            <Plus className="h-3 w-3 mr-1" />Cargar comprobante
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!enEjecucion ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            La rendición de comprobantes está disponible durante la ejecución del proyecto.
          </p>
        ) : loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="space-y-2 rounded-md border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consumo del presupuesto</p>
              {rubrosDisponibles.map(rubro => {
                const gastado = sumas.porRubro[rubro] ?? 0
                const subtotal = subtotalDeRubro(rubro)
                const excede = subtotal > 0 && gastado > subtotal
                return (
                  <div key={rubro} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{rubroLabel(rubro)}</span>
                    <span className={excede ? 'text-destructive' : 'text-muted-foreground'}>
                      {formatearMoneda(gastado)} <span className="text-muted-foreground/70">/ {formatearMoneda(subtotal)}</span>
                    </span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatearMoneda(sumas.total)} / {formatearMoneda(topeTotal())}</span>
              </div>
            </div>

            {comprobantes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aún no se cargaron comprobantes de gastos.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Estado</TableHead>
                    {puedeGestionarEstado && <TableHead className="w-28">Revisión</TableHead>}
                    {permitidoEditar && <TableHead className="w-16 text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rubrosDisponibles.map(rubro => {
                    const filas = comprobantes.filter(c => c.rubro === rubro)
                    if (filas.length === 0) return null
                    return (
                      <Fragment key={rubro}>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell
                            colSpan={5 + (puedeGestionarEstado ? 1 : 0) + (permitidoEditar ? 1 : 0)}
                            className="font-semibold"
                          >
                            {rubroLabel(rubro)} — Subtotal: {formatearMoneda(sumas.porRubro[rubro] ?? 0)}
                          </TableCell>
                        </TableRow>
                        {filas.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm">{c.fecha}</TableCell>
                            <TableCell className="text-sm max-w-[220px]">{c.descripcion || '-'}</TableCell>
                            <TableCell className="text-sm font-medium">{formatearMoneda(c.monto)}</TableCell>
                            <TableCell className="text-sm">
                              <a
                                href={conProtocolo(c.comprobanteUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline"
                              >
                                Ver comprobante
                              </a>
                            </TableCell>
                            <TableCell>
                              <EstadoBadge estado={c.estado} />
                              {c.estado === EstadoComprobante.Rechazado && c.motivoRechazo && (
                                <p className="mt-1 max-w-[220px] text-xs text-destructive">
                                  Motivo: {c.motivoRechazo}
                                </p>
                              )}
                            </TableCell>
                            {puedeGestionarEstado && c.estado === EstadoComprobante.EnRevision && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={cambiandoEstadoId === c.id}
                                    onClick={() => cambiarEstado(c, EstadoComprobante.Aceptado)}
                                  >
                                    {cambiandoEstadoId === c.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3 text-green-600" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={cambiandoEstadoId === c.id}
                                    onClick={() => cambiarEstado(c, EstadoComprobante.Rechazado)}
                                  >
                                    <X className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                            {puedeGestionarEstado && c.estado !== EstadoComprobante.EnRevision && (
                              <TableCell className="text-sm text-muted-foreground">
                                {estadoComprobanteLabel[c.estado]}
                              </TableCell>
                            )}
                            {permitidoEditar && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={c.estado === EstadoComprobante.Aceptado}
                                    onClick={() => abrirEditar(c)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={
                                      eliminandoId === c.id || c.estado === EstadoComprobante.Aceptado
                                    }
                                    onClick={() => eliminar(c.id)}
                                  >
                                    {eliminandoId === c.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoId ? 'Editar comprobante' : 'Cargar comprobante'}</DialogTitle>
              <DialogDescription>
                Asociá un comprobante de gasto a un rubro del presupuesto. Podés pegar el link al PDF o imagen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Rubro *</label>
                <Select
                  value={form.rubro}
                  onValueChange={v => actualizarCampo('rubro', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rubrosDisponibles.map(r => (
                      <SelectItem key={r} value={r}>{rubroLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sumado en este rubro: {formatearMoneda(sumas.porRubro[form.rubro] ?? 0)} / presupuesto {formatearMoneda(subtotalDeRubro(form.rubro))}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Monto *</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={form.monto}
                    onChange={e => actualizarCampo('monto', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Fecha *</label>
                  <Input
                    type="date"
                    min={fechaInicioEjecucion}
                    max={fechaFinEjecucion}
                    value={form.fecha}
                    onChange={e => actualizarCampo('fecha', e.target.value)}
                  />
                  {(fechaInicioEjecucion || fechaFinEjecucion) && (
                    <p className="text-xs text-muted-foreground">
                      Período de ejecución: entre {fechaInicioEjecucion ?? '-'} y {fechaFinEjecucion ?? '-'}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Descripción</label>
                <Textarea
                  placeholder="Detalle del gasto"
                  value={form.descripcion}
                  onChange={e => actualizarCampo('descripcion', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Link al comprobante *</label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  maxLength={2048}
                  value={form.comprobanteUrl}
                  onChange={e => actualizarCampo('comprobanteUrl', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Solo se aceptan links de Google Drive (drive.google.com, docs.google.com o drive.usercontent.google.com). Si no lleva protocolo, se le agrega https:// automáticamente.
                </p>
              </div>
            </div>
            {errorPresupuesto && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {errorPresupuesto}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={guardar} disabled={guardando || !!errorPresupuesto}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!rechazoComp} onOpenChange={open => { if (!open) setRechazoComp(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar comprobante</DialogTitle>
              <DialogDescription>
                {rechazoComp
                  ? `Indicá el motivo del rechazo del comprobante de ${formatearMoneda(rechazoComp.monto)} (${rubroLabel(rechazoComp.rubro)}). Se lo informará al director del proyecto.`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              <label className="text-xs font-medium">Motivo *</label>
              <Textarea
                placeholder="Explicá por qué se rechaza este comprobante"
                maxLength={1000}
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRechazoComp(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmarRechazo}
                disabled={rechazando}
              >
                {rechazando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechazar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
