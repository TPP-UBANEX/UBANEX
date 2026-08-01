import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { ParticipacionConvocatoria, Usuario, CrearParticipacionDto } from '@/data/types'
import {
  camposPerfilDocente,
  camposPerfilFaltantes,
  generoOptions,
  cargoDocenteOptions,
  tipoDesignacionDocenteOptions,
  personaConDiscapacidadOptions,
} from '@/data/perfil'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function AsignacionEvaluadores({ convocatoriaId }: { convocatoriaId: string }) {
  const [participaciones, setParticipaciones] = useState<ParticipacionConvocatoria[]>([])
  const [docentes, setDocentes] = useState<Usuario[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [completar, setCompletar] = useState<Record<string, string>>({})
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

  const selectedDocente = docentes.find(d => d.id === selectedUserId)
  const faltantes = selectedDocente ? camposPerfilFaltantes(selectedDocente) : []

  const seleccionarDocente = (id: string) => {
    setSelectedUserId(id)
    setCompletar({})
  }

  const faltantesCompletos = faltantes.every(campo => {
    const valor = completar[campo]
    if (campo === 'personaConDiscapacidad') return valor === 'true' || valor === 'false'
    return valor !== undefined && valor.trim() !== ''
  })
  const puedeAsignar = !!selectedUserId && faltantesCompletos

  const handleAsignar = async () => {
    if (!puedeAsignar) return
    setSubmitting(true)
    try {
      const payload: CrearParticipacionDto = {
        usuarioId: selectedUserId,
        convocatoriaId,
        rol: RolEjecucion.Evaluador,
      }
      const extra: Record<string, string | boolean> = {}
      for (const campo of faltantes) {
        const valor = completar[campo]
        extra[campo] = campo === 'personaConDiscapacidad' ? valor === 'true' : valor.trim()
      }
      await api.participaciones.asignar({ ...payload, ...extra })
      toast.success('Usuario de evaluación asignado correctamente')
      setSelectedUserId('')
      setCompletar({})
      cargarDatos()
    } catch {
      toast.error('Error al asignar usuario de evaluación')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesasignar = async (id: string) => {
    try {
      await api.participaciones.desasignar(id)
      toast.success('Usuario de evaluación quitado correctamente')
      cargarDatos()
    } catch {
      toast.error('Error al quitar usuario de evaluación')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">Asignar usuario de evaluación</p>
          <Select value={selectedUserId} onValueChange={seleccionarDocente}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un usuario docente validado" />
            </SelectTrigger>
            <SelectContent>
              {docentes.map(d => {
                const incompleto = camposPerfilFaltantes(d).length > 0
                return (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombreCompleto} - {d.unidadAcademica?.nombre || 'Sin UA'}
                    {incompleto ? ' — perfil incompleto' : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAsignar} disabled={!puedeAsignar || submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Asignar
        </Button>
      </div>

      {faltantes.length > 0 && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Completar datos del perfil</p>
            <p className="text-xs text-muted-foreground">
              El docente tiene el perfil incompleto. Completá los datos faltantes para poder asignarlo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {faltantes.map(campo => {
              const def = camposPerfilDocente.find(c => c.campo === campo)!
              if (def.tipo === 'select') {
                const options = campo === 'genero'
                  ? generoOptions
                  : campo === 'cargoDocente'
                    ? cargoDocenteOptions
                    : campo === 'tipoDesignacionDocente'
                      ? tipoDesignacionDocenteOptions
                      : personaConDiscapacidadOptions
                return (
                  <div key={campo} className="space-y-1.5">
                    <label className="text-xs font-medium">{def.etiqueta}</label>
                    <Select
                      value={completar[campo] ?? ''}
                      onValueChange={v => setCompletar({ ...completar, [campo]: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {options.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }
              return (
                <div key={campo} className="space-y-1.5">
                  <label className="text-xs font-medium">{def.etiqueta}</label>
                  <Input
                    placeholder={`Completar ${def.etiqueta.toLowerCase()}`}
                    value={completar[campo] ?? ''}
                    onChange={e => setCompletar({ ...completar, [campo]: e.target.value })}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">
          Usuarios de evaluación asignados ({evaluadores.length})
        </p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : evaluadores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay usuarios de evaluación asignados a esta convocatoria
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
