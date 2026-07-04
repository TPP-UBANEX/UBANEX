import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { EditarUsuarioDialog } from '@/components/EditarUsuarioDialog'
import type { Usuario, UnidadAcademica } from '@/data/types'
import { RolUsuario, EstadoDirector } from '@/data/types'
import { ArrowLeft, Mail, Building, Calendar, Shield, UserCheck } from 'lucide-react'

const rolLabels: Record<string, string> = {
  [RolUsuario.AutoridadDeRectorado]: 'Autoridad Rectorado',
  [RolUsuario.AsistenteDeRectorado]: 'Asistente Rectorado',
  [RolUsuario.AutoridadDeSecretaria]: 'Autoridad Secretaría',
  [RolUsuario.AsistenteDeSecretaria]: 'Asistente Secretaría',
  [RolUsuario.DirectorDeProyecto]: 'Director',
  [RolUsuario.Evaluador]: 'Evaluador',
}

function rolColor(rol: string): string {
  if (rol.includes('Rectorado')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
  if (rol.includes('Secretaria')) return 'text-green-600 bg-green-50 dark:bg-green-950'
  if (rol === RolUsuario.Evaluador) return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
  return 'text-purple-600 bg-purple-50 dark:bg-purple-950'
}

function estadoDirectorColor(estado: EstadoDirector | null | undefined): string {
  switch (estado) {
    case EstadoDirector.Validado: return 'text-green-600 bg-green-50 dark:bg-green-950'
    case EstadoDirector.Rechazado: return 'text-destructive bg-destructive/10'
    default: return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
  }
}

function estadoDirectorLabel(estado: EstadoDirector | null | undefined): string {
  switch (estado) {
    case EstadoDirector.Validado: return 'Validado'
    case EstadoDirector.Rechazado: return 'Rechazado'
    default: return 'Pendiente de validación'
  }
}

export function UsuarioDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [uaList, setUaList] = useState<UnidadAcademica[]>([])
  const [loading, setLoading] = useState(true)

  const cargarDatos = () => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.usuarios.get(id),
      api.unidadesAcademicas.list(),
    ])
      .then(([u, uas]) => {
        setUsuario(u)
        setUaList(uas)
      })
      .catch(() => navigate('/usuarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (!usuario) return null

  const esMiPerfil = user?.id === usuario.id
  const puedeEditar = user?.id === usuario.id
    || user?.roles.includes(RolUsuario.AutoridadDeRectorado)
    || (user?.roles.includes(RolUsuario.AutoridadDeSecretaria) && user?.unidadAcademicaId === usuario.unidadAcademicaId)

  const formatearFecha = (fecha?: string) => {
    if (!fecha) return 'Sin actividad'
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/usuarios')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {esMiPerfil ? 'Mi Perfil' : usuario.nombreCompleto}
              </h1>
              <Badge variant={usuario.habilitado ? 'default' : 'secondary'}>
                {usuario.habilitado ? 'Habilitado' : 'Inhabilitado'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{usuario.email}</p>
          </div>
        </div>
        {puedeEditar && (
          <EditarUsuarioDialog
            usuario={usuario}
            uaList={uaList}
            onUpdated={cargarDatos}
            trigger={<Button>Editar</Button>}
          />
        )}
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
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span>{usuario.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Unidad Académica:</span>
              <span>{usuario.unidadAcademica?.nombre || 'Sin asignar'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Creado por:</span>
              <span>{usuario.creadoPor?.nombreCompleto || 'Auto-registro'}</span>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Roles</p>
              <div className="flex gap-2 flex-wrap">
                {usuario.roles.map(r => (
                  <Badge key={r} variant="outline" className={rolColor(r)}>
                    {rolLabels[r] || r}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Estado y Actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={usuario.habilitado ? 'default' : 'secondary'}>
                {usuario.habilitado ? 'Habilitado' : 'Inhabilitado'}
              </Badge>
            </div>
            {usuario.roles.includes(RolUsuario.DirectorDeProyecto) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Director:</span>
                <Badge variant="outline" className={estadoDirectorColor(usuario.estadoDirector)}>
                  {estadoDirectorLabel(usuario.estadoDirector)}
                </Badge>
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Última actividad:</span>
              <span>{formatearFecha(usuario.ultimaActividad)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
