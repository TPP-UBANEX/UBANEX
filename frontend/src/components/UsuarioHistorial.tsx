import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Auditoria } from '@/data/types'
import { TipoAccionAuditoria } from '@/data/types'
import { History } from 'lucide-react'

const accionLabels: Record<string, string> = {
  [TipoAccionAuditoria.CREACION]: 'Creación',
  [TipoAccionAuditoria.EDICION]: 'Edición',
  [TipoAccionAuditoria.CAMBIO_ROL]: 'Cambio de rol',
  [TipoAccionAuditoria.INACTIVACION]: 'Inactivación',
  [TipoAccionAuditoria.REACTIVACION]: 'Reactivación',
  [TipoAccionAuditoria.RESET_PASSWORD]: 'Reset contraseña',
  [TipoAccionAuditoria.VALIDACION_DOCENTE]: 'Validación docente',
}

function accionColor(accion: string): string {
  switch (accion) {
    case TipoAccionAuditoria.CREACION: return 'text-green-600 bg-green-50 dark:bg-green-950'
    case TipoAccionAuditoria.EDICION: return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
    case TipoAccionAuditoria.CAMBIO_ROL: return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
    case TipoAccionAuditoria.INACTIVACION: return 'text-destructive bg-destructive/10'
    case TipoAccionAuditoria.VALIDACION_DOCENTE: return 'text-purple-600 bg-purple-50 dark:bg-purple-950'
    default: return ''
  }
}

const accionOptions = [
  { value: 'todas', label: 'Todas' },
  ...Object.entries(accionLabels).map(([value, label]) => ({ value, label })),
]

export function UsuarioHistorial({ usuarioId }: { usuarioId: string }) {
  const [data, setData] = useState<Auditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    setLoading(true)
    api.usuarios.auditoria(usuarioId)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [usuarioId])

  const filtrados = filtro === 'todas'
    ? data
    : data.filter(a => a.accion === filtro)

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Historial de acciones</span>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-40 ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accionOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay acciones registradas
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Acción</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="w-40">Responsable</TableHead>
                <TableHead className="w-36">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map(a => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant="outline" className={accionColor(a.accion)}>
                      {accionLabels[a.accion] || a.accion}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.descripcion}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.responsableNombre}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatearFecha(a.fecha)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
