import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { RolUsuario, RolEjecucion, EstadoValidacionDocente } from '@/data/types'
import type { ParticipacionConvocatoria, Usuario } from '@/data/types'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function AsignacionEvaluadores({ convocatoriaId }: { convocatoriaId: string }) {
  const [participaciones, setParticipaciones] = useState<ParticipacionConvocatoria[]>([])
  const [docentes, setDocentes] = useState<Usuario[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [parts, usersRes] = await Promise.all([
        api.participaciones.listar(convocatoriaId),
        api.usuarios.list({ rol: RolUsuario.Docente, limit: 100 }),
      ])
      setParticipaciones(parts)
      // Solo docentes validados que no tengan ya participacion en esta convocatoria
      setDocentes(
        usersRes.data.filter(
          (u: Usuario) =>
            u.estadoValidacionDocente === EstadoValidacionDocente.Validado &&
            !parts.some((p: ParticipacionConvocatoria) => p.usuarioId === u.id),
        ),
      )
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (convocatoriaId) cargarDatos()
  }, [convocatoriaId])

  const evaluadores = participaciones.filter(p => p.rol === RolEjecucion.Evaluador)

  const handleAsignar = async () => {
    if (!selectedUserId) return
    setSubmitting(true)
    try {
      await api.participaciones.asignar({
        usuarioId: selectedUserId,
        convocatoriaId,
        rol: RolEjecucion.Evaluador,
      })
      toast.success('Usuario evaluador asignado correctamente')
      setSelectedUserId('')
      cargarDatos()
    } catch {
      toast.error('Error al asignar usuario evaluador')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesasignar = async (id: string) => {
    try {
      await api.participaciones.desasignar(id)
      toast.success('Usuario evaluador desasignado')
      cargarDatos()
    } catch {
      toast.error('Error al desasignar usuario evaluador')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">Asignar usuario evaluador</p>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un usuario docente validado" />
            </SelectTrigger>
            <SelectContent>
              {docentes.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nombreCompleto} - {d.unidadAcademica?.nombre || 'Sin UA'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAsignar} disabled={!selectedUserId || submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Asignar
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">
          Usuarios evaluadores asignados ({evaluadores.length})
        </p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : evaluadores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay usuarios evaluadores asignados a esta convocatoria
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Unidad Académica</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluadores.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.usuario?.nombreCompleto || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.usuario?.email || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.usuario?.unidadAcademica?.nombre || '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDesasignar(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
