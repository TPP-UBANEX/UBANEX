import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UsuarioHistorial } from '@/components/UsuarioHistorial'
import { api } from '@/lib/api'
import type { Usuario } from '@/data/types'
import { RolUsuario, EstadoValidacionDocente } from '@/data/types'
import {
  generoLabel,
  cargoDocenteLabel,
  tipoDesignacionDocenteLabel,
  personaConDiscapacidadLabel,
} from '@/data/perfil'
import {
  Shield,
  GraduationCap,
  UserCheck,
  Mail,
  Phone,
  UserRound,
  VenusAndMars,
  Accessibility,
  Building,
  Briefcase,
  Stamp,
  BookOpen,
  MapPin,
  ExternalLink,
} from 'lucide-react'

const rolLabels: Record<string, string> = {
  [RolUsuario.AutoridadDeRectorado]: 'Autoridad Rectorado',
  [RolUsuario.AsistenteDeRectorado]: 'Asistente Rectorado',
  [RolUsuario.AutoridadDeSecretaria]: 'Autoridad Secretaría',
  [RolUsuario.AsistenteDeSecretaria]: 'Asistente Secretaría',
  [RolUsuario.Estudiante]: 'Estudiante',
  [RolUsuario.Docente]: 'Docente',
}

function rolColor(rol: string): string {
  if (rol.includes('Rectorado')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
  if (rol.includes('Secretaria')) return 'text-green-600 bg-green-50 dark:bg-green-950'
  if (rol === RolUsuario.Docente) return 'text-purple-600 bg-purple-50 dark:bg-purple-950'
  return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
}

function estadoValidacionDocenteColor(estado: EstadoValidacionDocente | null | undefined): string {
  switch (estado) {
    case EstadoValidacionDocente.Validado: return 'text-green-600 bg-green-50 dark:bg-green-950'
    case EstadoValidacionDocente.Rechazado: return 'text-destructive bg-destructive/10'
    default: return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
  }
}

function estadoValidacionDocenteLabel(estado: EstadoValidacionDocente | null | undefined): string {
  switch (estado) {
    case EstadoValidacionDocente.Validado: return 'Validado'
    case EstadoValidacionDocente.Rechazado: return 'Rechazado'
    default: return 'Pendiente de validación'
  }
}

export function EvaluadorPerfilDialog({
  usuarioId,
  open,
  onOpenChange,
}: {
  usuarioId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !usuarioId) return
    setLoading(true)
    api.usuarios.get(usuarioId)
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setLoading(false))
  }, [open, usuarioId])

  const esDocente = usuario?.roles.includes(RolUsuario.Docente)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Perfil del evaluador
          </DialogTitle>
        </DialogHeader>

        {loading || !usuario ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-lg font-semibold">{usuario.nombreCompleto}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {usuario.roles.map(r => (
                    <Badge key={r} variant="outline" className={rolColor(r)}>
                      {rolLabels[r] || r}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" onClick={() => { onOpenChange(false); navigate(`/usuarios/${usuario.id}`) }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver perfil completo
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Datos Personales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Nombre:</span>
                    <span>{usuario.nombre || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Apellido:</span>
                    <span>{usuario.apellido || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span>{usuario.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span>{usuario.telefono || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <VenusAndMars className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Identidad de género:</span>
                    <span>{generoLabel(usuario.genero)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Accessibility className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Persona con discapacidad:</span>
                    <span>{personaConDiscapacidadLabel(usuario.personaConDiscapacidad)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Datos de Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Unidad Académica:</span>
                      <span>{usuario.unidadAcademica?.nombre || 'Sin asignar'}</span>
                    </div>
                    {esDocente && (
                      <>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Cargo:</span>
                          <span>{cargoDocenteLabel(usuario.cargoDocente)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Stamp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Tipo de designación:</span>
                          <span>{tipoDesignacionDocenteLabel(usuario.tipoDesignacionDocente)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Materia / Área / Departamento:</span>
                          <span>{usuario.areaDocente || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Dirección o localidad:</span>
                          <span>{usuario.direccionLocalidad || '—'}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge variant={usuario.habilitado ? 'default' : 'secondary'}>
                        {usuario.habilitado ? 'Habilitado' : 'Inhabilitado'}
                      </Badge>
                      {esDocente && (
                        <Badge variant="outline" className={estadoValidacionDocenteColor(usuario.estadoValidacionDocente)}>
                          {estadoValidacionDocenteLabel(usuario.estadoValidacionDocente)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <UsuarioHistorial usuarioId={usuario.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
