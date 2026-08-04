import { useState, useEffect, useMemo } from 'react'
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
import { useAuth } from '@/lib/auth-context'
import { esTelefonoValido } from '@/lib/utils'
import type { Usuario, UnidadAcademica, Carrera } from '@/data/types'
import { RolUsuario } from '@/data/types'
import {
  generoOptions,
  cargoDocenteOptions,
  tipoDesignacionDocenteOptions,
  personaConDiscapacidadOptions,
  generoLabel,
  cargoDocenteLabel,
  tipoDesignacionDocenteLabel,
  personaConDiscapacidadLabel,
} from '@/data/perfil'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const rolLabels: Record<string, string> = {
  [RolUsuario.AutoridadDeRectorado]: 'Autoridad Rectorado',
  [RolUsuario.AsistenteDeRectorado]: 'Asistente Rectorado',
  [RolUsuario.AutoridadDeSecretaria]: 'Autoridad Secretaría',
  [RolUsuario.AsistenteDeSecretaria]: 'Asistente Secretaría',
  [RolUsuario.Estudiante]: 'Estudiante',
  [RolUsuario.Docente]: 'Docente',
}

export function EditarUsuarioDialog({
  usuario,
  uaList,
  trigger,
  onUpdated,
}: {
  usuario: Usuario
  uaList: UnidadAcademica[]
  trigger: React.ReactNode
  onUpdated: () => void
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState(usuario.nombre ?? '')
  const [apellido, setApellido] = useState(usuario.apellido ?? '')
  const [email, setEmail] = useState(usuario.email)
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [genero, setGenero] = useState(usuario.genero ?? '')
  const [personaConDiscapacidad, setPersonaConDiscapacidad] = useState(
    usuario.personaConDiscapacidad === undefined || usuario.personaConDiscapacidad === null
      ? ''
      : String(usuario.personaConDiscapacidad)
  )
  const [cargoDocente, setCargoDocente] = useState(usuario.cargoDocente ?? '')
  const [tipoDesignacionDocente, setTipoDesignacionDocente] = useState(usuario.tipoDesignacionDocente ?? '')
  const [areaDocente, setAreaDocente] = useState(usuario.areaDocente ?? '')
  const [direccionLocalidad, setDireccionLocalidad] = useState(usuario.direccionLocalidad ?? '')
  const [porcentajeCarrera, setPorcentajeCarrera] = useState(
    usuario.porcentajeCarrera === undefined || usuario.porcentajeCarrera === null
      ? ''
      : String(usuario.porcentajeCarrera)
  )
  const [carreraId, setCarreraId] = useState(usuario.carreraId ?? '')
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [roles, setRoles] = useState<string[]>(usuario.roles)
  const [unidadAcademicaId, setUnidadAcademicaId] = useState(usuario.unidadAcademicaId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const esAutoEdicion = user?.id === usuario.id
  const esRectorado = user?.roles.includes(RolUsuario.AutoridadDeRectorado)
  const esSecretariaMismaUA =
    user?.roles.includes(RolUsuario.AutoridadDeSecretaria) &&
    user?.unidadAcademicaId === usuario.unidadAcademicaId
  const puedeEditarRoles = esRectorado || esSecretariaMismaUA
  const puedeEditarUA = esRectorado
  const rolesDisponibles: RolUsuario[] = esRectorado
    ? Object.keys(rolLabels) as RolUsuario[]
    : [RolUsuario.Docente, RolUsuario.Estudiante]
  const puedeEditar = esAutoEdicion || esRectorado || esSecretariaMismaUA
  const esDocente = usuario.roles.includes(RolUsuario.Docente)
  const esEstudiante = usuario.roles.includes(RolUsuario.Estudiante)

  useEffect(() => {
    if (!open) return
    setNombre(usuario.nombre ?? '')
    setApellido(usuario.apellido ?? '')
    setEmail(usuario.email)
    setPassword('')
    setTelefono(usuario.telefono ?? '')
    setGenero(usuario.genero ?? '')
    setPersonaConDiscapacidad(
      usuario.personaConDiscapacidad === undefined || usuario.personaConDiscapacidad === null
        ? ''
        : String(usuario.personaConDiscapacidad)
    )
    setCargoDocente(usuario.cargoDocente ?? '')
    setTipoDesignacionDocente(usuario.tipoDesignacionDocente ?? '')
    setAreaDocente(usuario.areaDocente ?? '')
    setDireccionLocalidad(usuario.direccionLocalidad ?? '')
    setPorcentajeCarrera(
      usuario.porcentajeCarrera === undefined || usuario.porcentajeCarrera === null
        ? ''
        : String(usuario.porcentajeCarrera)
    )
    setCarreraId(usuario.carreraId ?? '')
    setRoles(usuario.roles)
    setUnidadAcademicaId(usuario.unidadAcademicaId ?? '')
    setError('')
  }, [open, usuario])

  useEffect(() => {
    if (!open || !esAutoEdicion || !esEstudiante) return
    const cargar = usuario.unidadAcademicaId
      ? api.carreras.porUnidadAcademica(usuario.unidadAcademicaId)
          .then(list => list.length > 0 ? list : api.carreras.list())
      : api.carreras.list()
    cargar.then(setCarreras).catch(() => {})
  }, [open, esAutoEdicion, esEstudiante, usuario.unidadAcademicaId])

  const carrerasOptions = useMemo(() => {
    if (!usuario.carrera) return carreras
    return carreras.some(c => c.id === usuario.carrera?.id)
      ? carreras
      : [usuario.carrera, ...carreras]
  }, [carreras, usuario.carrera])

  if (!puedeEditar) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (esAutoEdicion && telefono.trim() && !esTelefonoValido(telefono.trim())) {
        setError('El teléfono no tiene un formato válido')
        setSubmitting(false)
        return
      }
      const data: Record<string, unknown> = { email }
      if (esAutoEdicion) {
        data.nombre = nombre.trim()
        data.apellido = apellido.trim()
        data.telefono = telefono.trim() || null
        data.genero = genero || null
        data.personaConDiscapacidad = personaConDiscapacidad === ''
          ? null
          : personaConDiscapacidad === 'true'
        if (esDocente) {
          data.cargoDocente = cargoDocente || null
          data.tipoDesignacionDocente = tipoDesignacionDocente || null
          data.areaDocente = areaDocente.trim() || null
          data.direccionLocalidad = direccionLocalidad.trim() || null
        }
        if (esEstudiante) {
          data.porcentajeCarrera = porcentajeCarrera === ''
            ? null
            : Number(porcentajeCarrera)
          data.carreraId = carreraId || null
        }
        if (password) data.password = password
      } else {
        data.nombre = nombre.trim()
        data.apellido = apellido.trim()
        if (password) data.password = password
      }
      if (puedeEditarRoles && roles.length > 0) {
        data.roles = roles
      }
      if (puedeEditarUA) {
        data.unidadAcademicaId = unidadAcademicaId || null
      }
      await api.usuarios.actualizar(usuario.id, data)
      setOpen(false)
      onUpdated()
      toast.success('Usuario actualizado correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {esAutoEdicion ? 'Mi Perfil' : `Editar: ${usuario.nombreCompleto}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          {esAutoEdicion ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Juan"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  placeholder="Pérez"
                  value={apellido}
                  onChange={e => setApellido(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  type="tel"
                  placeholder="11 1234 5678"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Identidad de género</label>
                <Select value={genero} onValueChange={setGenero}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {generoOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Persona con discapacidad</label>
                <Select value={personaConDiscapacidad} onValueChange={setPersonaConDiscapacidad}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {personaConDiscapacidadOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {esDocente && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cargo</label>
                    <Select value={cargoDocente} onValueChange={setCargoDocente}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {cargoDocenteOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de designación</label>
                    <Select value={tipoDesignacionDocente} onValueChange={setTipoDesignacionDocente}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {tipoDesignacionDocenteOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Materia / Área / Departamento</label>
                    <Input
                      placeholder="Ej: Matemática, Depto. de Física"
                      value={areaDocente}
                      onChange={e => setAreaDocente(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dirección o localidad</label>
                    <Input
                      placeholder="Ej: Av. San Juan 1000, CABA"
                      value={direccionLocalidad}
                      onChange={e => setDireccionLocalidad(e.target.value)}
                    />
                  </div>
                </>
              )}
              {esEstudiante && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Porcentaje de la carrera (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0 a 100"
                      value={porcentajeCarrera}
                      onChange={e => setPorcentajeCarrera(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Carrera</label>
                    <Select value={carreraId} onValueChange={setCarreraId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {carrerasOptions.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <Input
                  placeholder="Dejar vacío para mantener la actual"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Apellido</label>
                  <Input
                    placeholder="Pérez"
                    value={apellido}
                    onChange={e => setApellido(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    placeholder="Juan"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              {(esDocente || esEstudiante) && (
                <div className="border rounded-md p-4 bg-muted/30 text-sm">
                  <p className="font-medium mb-3">Datos de perfil (solo lectura)</p>
                  <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_1fr]">
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd>{usuario.telefono || '—'}</dd>
                    <dt className="text-muted-foreground">Identidad de género</dt>
                    <dd>{generoLabel(usuario.genero)}</dd>
                    <dt className="text-muted-foreground">Persona con discapacidad</dt>
                    <dd>{personaConDiscapacidadLabel(usuario.personaConDiscapacidad)}</dd>
                    {esDocente && (
                      <>
                        <dt className="text-muted-foreground">Cargo</dt>
                        <dd>{cargoDocenteLabel(usuario.cargoDocente)}</dd>
                        <dt className="text-muted-foreground">Tipo de designación</dt>
                        <dd>{tipoDesignacionDocenteLabel(usuario.tipoDesignacionDocente)}</dd>
                        <dt className="text-muted-foreground">Materia/Área</dt>
                        <dd>{usuario.areaDocente || '—'}</dd>
                        <dt className="text-muted-foreground">Dirección o localidad</dt>
                        <dd>{usuario.direccionLocalidad || '—'}</dd>
                      </>
                    )}
                    {esEstudiante && (
                      <>
                        <dt className="text-muted-foreground">Porcentaje de la carrera</dt>
                        <dd>{usuario.porcentajeCarrera === undefined || usuario.porcentajeCarrera === null ? '—' : `${usuario.porcentajeCarrera}%`}</dd>
                        <dt className="text-muted-foreground">Carrera</dt>
                        <dd>{usuario.carrera?.nombre || '—'}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
              {puedeEditarRoles && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {rolesDisponibles.map(rol => {
                      const selected = roles.includes(rol)
                      return (
                        <Button
                          key={rol}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (selected) {
                              setRoles(roles.filter(r => r !== rol))
                            } else {
                              setRoles([...roles, rol])
                            }
                          }}
                        >
                          {rolLabels[rol]}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}
              {puedeEditarUA && (
                <Select value={unidadAcademicaId} onValueChange={setUnidadAcademicaId}>
                  <SelectTrigger><SelectValue placeholder="Unidad Académica" /></SelectTrigger>
                  <SelectContent>
                    {uaList.map(ua => (
                      <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
