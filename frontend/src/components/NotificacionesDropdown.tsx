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
import { Bell, MessageSquare, CheckCheck, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Notificacion } from '@/data/types'
import { TipoNotificacion } from '@/data/types'
import { cn } from '@/lib/utils'

export function NotificacionesDropdown() {
  const navigate = useNavigate()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

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

  const handleClick = async (notif: Notificacion) => {
    if (!notif.leida) {
      await api.notificaciones.leer(notif.id).catch(() => {})
      setNotificaciones(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, leida: true } : n)),
      )
    }
    const edicion = notif.sugerencia?.edicion
    if (edicion) {
      navigate(`/proyectos/${edicion.proyectoId}`)
      setOpen(false)
    }
  }

  const handleLeerTodas = async () => {
    await api.notificaciones.leerTodas().catch(() => {})
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
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
        ) : notificaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin notificaciones</p>
        ) : (
          notificaciones.slice(0, 20).map(notif => (
            <DropdownMenuItem
              key={notif.id}
              className={cn('flex flex-col items-start gap-1 py-3 cursor-pointer', !notif.leida && 'bg-muted/50')}
              onClick={() => handleClick(notif)}
            >
              <div className="flex items-start gap-2 w-full">
                <MessageSquare className={cn('h-4 w-4 mt-0.5 shrink-0', notif.tipo === TipoNotificacion.NUEVA_SUGERENCIA ? 'text-blue-500' : 'text-green-500')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-tight', !notif.leida && 'font-medium')}>{notif.mensaje}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tiempoRelativo(notif.creadoEn)}</p>
                </div>
                {!notif.leida && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
