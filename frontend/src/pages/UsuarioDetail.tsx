import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { EditarUsuarioDialog } from '@/components/EditarUsuarioDialog'
import { UsuarioHistorial } from '@/components/UsuarioHistorial'
import type { Usuario, UnidadAcademica, ParticipacionConvocatoria } from '@/data/types'
import { RolUsuario, RolEjecucion, EstadoValidacionDocente } from '@/data/types'
import {
  generoLabel,
  cargoDocenteLabel,
  tipoDesignacionDocenteLabel,
  personaConDiscapacidadLabel,
} from '@/data/perfil'
import { ArrowLeft, Mail, Calendar, Shield, UserCheck, KeyRound, Loader2, CheckCircle2, AlertTriangle, Phone, GraduationCap, UserRound, VenusAndMars, Accessibility, Building, Percent, Briefcase, Stamp, BookOpen, MapPin, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

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

export function UsuarioDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [uaList, setUaList] = useState<UnidadAcademica[]>([])
  const [loading, setLoading] = useState(true)
  const [participaciones, setParticipaciones] = useState<ParticipacionConvocatoria[]>([])
  const [resetOpen, setResetOpen] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetExito, setResetExito] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [disableSubmitting, setDisableSubmitting] = useState(false)
  const [validarOpen, setValidarOpen] = useState(false)
  const [validarSubmitting, setValidarSubmitting] = useState(false)
  const [validarAccion, setValidarAccion] = useState<EstadoValidacionDocente | null>(null)

  const cargarDatos = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [u, uas] = await Promise.all([
        api.usuarios.get(id),
        api.unidadesAcademicas.list(),
      ])
      setUsuario(u)
      setUaList(uas)
      if (user?.id === id) {
        api.participaciones.listarMias().then(setParticipaciones).catch(() => {})
      }
      setLoading(false)
    } catch {
      navigate('/usuarios')
    }
  }, [id, navigate, user?.id])

  useEffect(() => {
    let cancel = false
    cargarDatos().then(() => { if (cancel) return })
    return () => { cancel = true }
  }, [cargarDatos])

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
  const tieneRolGestion = usuario.roles.some(r =>
    r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado ||
    r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria
  )
  const puedeResetearPassword = !esMiPerfil && (
    user?.roles.includes(RolUsuario.AutoridadDeRectorado) ||
    user?.roles.includes(RolUsuario.AsistenteDeRectorado) ||
    (user?.roles.includes(RolUsuario.AutoridadDeSecretaria) && user?.unidadAcademicaId === usuario.unidadAcademicaId)
  )
  const puedeCambiarEstado = !esMiPerfil && (
    user?.roles.includes(RolUsuario.AutoridadDeRectorado) ||
    (user?.roles.includes(RolUsuario.AutoridadDeSecretaria) &&
     user?.unidadAcademicaId === usuario.unidadAcademicaId &&
     !tieneRolGestion)
  )
  const puedeValidarDocente = !esMiPerfil &&
    usuario.roles.includes(RolUsuario.Docente) &&
    (
      user?.roles.includes(RolUsuario.AutoridadDeRectorado) ||
      (user?.roles.includes(RolUsuario.AutoridadDeSecretaria) &&
       user?.unidadAcademicaId === usuario.unidadAcademicaId)
    )

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

  const handleToggleEstado = async () => {
    const nuevoEstado = !usuario.habilitado
    setDisableSubmitting(true)
    try {
      await api.usuarios.actualizar(usuario.id, { habilitado: nuevoEstado })
      toast.success(nuevoEstado ? 'Usuario habilitado correctamente' : 'Usuario deshabilitado correctamente')
      setDisableOpen(false)
      cargarDatos()
    } catch {
      toast.error(nuevoEstado ? 'Error al habilitar el usuario' : 'Error al deshabilitar el usuario')
    } finally {
      setDisableSubmitting(false)
    }
  }

  const handleValidarDocente = async () => {
    if (!validarAccion) return
    setValidarSubmitting(true)
    try {
      await api.usuarios.actualizarEstadoValidacionDocente(usuario.id, validarAccion)
      toast.success(validarAccion === EstadoValidacionDocente.Validado
        ? 'Docente validado correctamente'
        : 'Docente rechazado')
      setValidarOpen(false)
      cargarDatos()
    } catch {
      toast.error('Error al actualizar estado del docente')
    } finally {
      setValidarSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    setResetSubmitting(true)
    try {
      await api.usuarios.resetPassword(usuario.id)
      setResetExito(true)
      toast.success('Contraseña temporal enviada correctamente')
    } catch {
      setResetExito(false)
      toast.error('Error al enviar la contraseña temporal')
    } finally {
      setResetSubmitting(false)
    }
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
        <div className="flex items-center gap-2">
          {puedeResetearPassword && (
            <Button variant="outline" onClick={() => setResetOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Resetear contraseña
            </Button>
          )}
          {puedeEditar && (
            <EditarUsuarioDialog
              usuario={usuario}
              uaList={uaList}
              onUpdated={cargarDatos}
              trigger={<Button>Editar</Button>}
            />
          )}
          {puedeCambiarEstado && (
            <Button
              variant={usuario.habilitado ? 'destructive' : 'default'}
              onClick={() => setDisableOpen(true)}
            >
              {usuario.habilitado ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) setResetExito(false) }}>
        <DialogContent>
          {resetExito ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Contraseña reseteada
                </DialogTitle>
                <DialogDescription>
                  Se envió una contraseña temporal al email <strong>{usuario.email}</strong>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => { setResetOpen(false); setResetExito(false) }}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Resetear contraseña</DialogTitle>
                <DialogDescription>
                  Se generará una nueva contraseña temporal y se enviará a{' '}
                  <strong>{usuario.email}</strong>.
                  El usuario deberá cambiarla al iniciar sesión.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setResetOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleResetPassword} disabled={resetSubmitting}>
                  {resetSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {resetSubmitting ? 'Enviando...' : 'Enviar contraseña temporal'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {usuario.habilitado ? 'Deshabilitar usuario' : 'Habilitar usuario'}
            </DialogTitle>
            <DialogDescription>
              {usuario.habilitado ? (
                <>¿Estás seguro de que deseas deshabilitar a <strong>{usuario.nombreCompleto}</strong>? El usuario no podrá iniciar sesión hasta que sea habilitado nuevamente.</>
              ) : (
                <>¿Estás seguro de que deseas habilitar a <strong>{usuario.nombreCompleto}</strong>? El usuario podrá iniciar sesión nuevamente.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={usuario.habilitado ? 'destructive' : 'default'}
              onClick={handleToggleEstado}
              disabled={disableSubmitting}
            >
              {disableSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {disableSubmitting
                ? (usuario.habilitado ? 'Deshabilitando...' : 'Habilitando...')
                : (usuario.habilitado ? 'Deshabilitar' : 'Habilitar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={validarOpen} onOpenChange={setValidarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {validarAccion === EstadoValidacionDocente.Validado
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertTriangle className="h-5 w-5 text-destructive" />
              }
              {validarAccion === EstadoValidacionDocente.Validado ? 'Validar docente' : 'Rechazar docente'}
            </DialogTitle>
            <DialogDescription>
              {validarAccion === EstadoValidacionDocente.Validado
                ? <>¿Estás seguro de validar a <strong>{usuario.nombreCompleto}</strong> como Docente? Podrá participar en convocatorias.</>
                : <>¿Estás seguro de rechazar a <strong>{usuario.nombreCompleto}</strong> como Docente? No podrá participar hasta que sea validado.</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setValidarOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={validarAccion === EstadoValidacionDocente.Validado ? 'default' : 'destructive'}
              onClick={handleValidarDocente}
              disabled={validarSubmitting}
            >
              {validarSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {validarSubmitting ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {usuario.roles.includes(RolUsuario.Estudiante) && (
                <>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Carrera:</span>
                    <span>{usuario.carrera?.nombre || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Porcentaje de la carrera:</span>
                    <span>
                      {usuario.porcentajeCarrera === undefined || usuario.porcentajeCarrera === null
                        ? '—'
                        : `${usuario.porcentajeCarrera}%`}
                    </span>
                  </div>
                </>
              )}
              {usuario.roles.includes(RolUsuario.Docente) && (
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
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tipo:</span>
                <span>
                  {usuario.roles.includes(RolUsuario.Docente)
                    ? 'Docente'
                    : usuario.roles.includes(RolUsuario.Estudiante)
                      ? 'Estudiante'
                      : 'Gestión'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creado por:</span>
                <span>{usuario.creadoPor?.nombreCompleto || 'Auto-registro'}</span>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Roles:</p>
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
      </div>

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
          {usuario.roles.includes(RolUsuario.Docente) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Docente:</span>
              <Badge variant="outline" className={estadoValidacionDocenteColor(usuario.estadoValidacionDocente)}>
                {estadoValidacionDocenteLabel(usuario.estadoValidacionDocente)}
              </Badge>
              {puedeValidarDocente && usuario.estadoValidacionDocente !== EstadoValidacionDocente.Validado && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setValidarAccion(EstadoValidacionDocente.Validado); setValidarOpen(true) }}
                >
                  Validar
                </Button>
              )}
              {puedeValidarDocente && usuario.estadoValidacionDocente !== EstadoValidacionDocente.Rechazado && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setValidarAccion(EstadoValidacionDocente.Rechazado); setValidarOpen(true) }}
                >
                  Rechazar
                </Button>
              )}
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

      {esMiPerfil && participaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Mis Participaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participaciones.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <span className="font-medium">{p.convocatoria?.nombre || '—'}</span>
                    <span className="text-muted-foreground ml-2">
                      {p.rol === RolEjecucion.DirectorDeProyecto ? 'Director' : 'Evaluador'}
                      {p.esDirectorPrincipal ? ' (Principal)' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <UsuarioHistorial usuarioId={usuario.id} />
        </CardContent>
      </Card>
    </div>
  )
}
