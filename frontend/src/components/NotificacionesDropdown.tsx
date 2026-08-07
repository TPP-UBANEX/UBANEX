import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, MessageSquare, CheckCheck, Loader2, UserCheck, CheckCircle2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Notificacion } from '@/data/types'
import { TipoNotificacion, EstadoPropuestaEvaluador } from '@/data/types'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function NotificacionesDropdown() {
  const navigate = useNavigate()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [respondiendoId, setRespondiendoId] = useState<string | null>(null)
  const [confirmarBorrar, setConfirmarBorrar] = useState<Notificacion | null>(null)

  const cargar = useCallback(async () => {
    try {
      const data = await api.notificaciones.listar()
      setNotificaciones(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [cargar])

  const noLeidas = notificaciones.filter(n => !n.leida).length

  const esEvaluador = (n: Notificacion) =>
    n.tipo === TipoNotificacion.PROPUESTA_EVALUADOR ||
    n.tipo === TipoNotificacion.RESULTADO_EVALUADOR

  const visibles = notificaciones.filter(n => esEvaluador(n) || !n.leida)

  const handleClick = async (notif: Notificacion) => {
    if (!notif.leida) {
      await api.notificaciones.leer(notif.id).catch(() => {})
      setNotificaciones(prev =>
        esEvaluador(notif)
          ? prev.map(n => (n.id === notif.id ? { ...n, leida: true } : n))
          : prev.filter(n => n.id !== notif.id),
      )
    }
    const esPropuesta = notif.tipo === TipoNotificacion.PROPUESTA_EVALUADOR
    const esResultado = notif.tipo === TipoNotificacion.RESULTADO_EVALUADOR
    const convocatoriaId = notif.participacion?.convocatoriaId
    if (esPropuesta && notif.participacion?.estado === EstadoPropuestaEvaluador.Propuesto) {
      return
    }
    if ((esPropuesta || esResultado) && convocatoriaId) {
      navigate(`/convocatorias/${convocatoriaId}`)
      setOpen(false)
      return
    }
    const edicion = notif.sugerencia?.edicion
    if (edicion) {
      navigate(`/proyectos/${edicion.proyectoId}?tab=sugerencias`)
      setOpen(false)
    }
  }

  const responder = async (e: React.MouseEvent, notif: Notificacion, aceptada: boolean) => {
    e.stopPropagation()
    if (respondiendoId === notif.id) return
    if (notif.tipo !== TipoNotificacion.PROPUESTA_EVALUADOR ||
        notif.participacion?.estado !== EstadoPropuestaEvaluador.Propuesto) return
    setRespondiendoId(notif.id)
    try {
      await (aceptada
        ? api.participaciones.aceptar(notif.participacion.id)
        : api.participaciones.declinar(notif.participacion.id))
      toast.success(aceptada ? 'Aceptaste la propuesta como evaluador' : 'Declinaste la propuesta')
      setNotificaciones(prev => prev.filter(n => n.id !== notif.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al responder la propuesta')
    } finally {
      setRespondiendoId(null)
    }
  }

  const handleLeerTodas = async () => {
    await api.notificaciones.leerTodas().catch(() => {})
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  const borrar = async () => {
    if (!confirmarBorrar) return
    const id = confirmarBorrar.id
    try {
      await api.notificaciones.eliminar(id)
      setNotificaciones(prev => prev.filter(n => n.id !== id))
      toast.success('Notificación eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la notificación')
    } finally {
      setConfirmarBorrar(null)
    }
  }

  const tiempoRelativo = (fecha: string) => {
    const diff = Date.now() - new Date(fecha).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const dias = Math.floor(hrs / 24)
    return `hace ${dias}d`
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {noLeidas > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {noLeidas > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleLeerTodas}>
              <CheckCheck className="h-3 w-3 mr-1" />Leer todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin notificaciones</p>
        ) : (
          visibles.slice(0, 20).map(notif => (
            <DropdownMenuItem
              key={notif.id}
              className={cn('flex flex-col items-start gap-1 py-3 cursor-pointer', !notif.leida && 'bg-muted/50')}
              onClick={() => handleClick(notif)}
            >
              <div className="flex items-start gap-2 w-full">
                {(() => {
                  const Icono = notif.tipo === TipoNotificacion.PROPUESTA_EVALUADOR
                    ? UserCheck
                    : notif.tipo === TipoNotificacion.RESULTADO_EVALUADOR
                      ? CheckCircle2
                      : MessageSquare
                  const color = notif.tipo === TipoNotificacion.NUEVA_SUGERENCIA
                    ? 'text-blue-500'
                    : notif.tipo === TipoNotificacion.PROPUESTA_EVALUADOR
                      ? 'text-amber-500'
                      : notif.tipo === TipoNotificacion.RESULTADO_EVALUADOR
                        ? 'text-green-500'
                        : 'text-green-500'
                  return <Icono className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
                })()}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-tight', !notif.leida && 'font-medium')}>{notif.mensaje}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tiempoRelativo(notif.creadoEn)}</p>
                  {notif.tipo === TipoNotificacion.PROPUESTA_EVALUADOR &&
                    notif.participacion?.estado === EstadoPropuestaEvaluador.Propuesto && (
                    <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={respondiendoId === notif.id}
                        onClick={e => responder(e, notif, true)}
                      >
                        {respondiendoId === notif.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Aceptar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={respondiendoId === notif.id}
                        onClick={e => responder(e, notif, false)}
                      >
                        Declinar
                      </Button>
                    </div>
                  )}
                </div>
                {!notif.leida && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                {esEvaluador(notif) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 -mt-0.5 text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); setConfirmarBorrar(notif) }}
                    title="Eliminar notificación"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
</DropdownMenu>

      <Dialog open={!!confirmarBorrar} onOpenChange={o => { if (!o) setConfirmarBorrar(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar notificación</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar esta notificación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmarBorrar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={borrar}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
