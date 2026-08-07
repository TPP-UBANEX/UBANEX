import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { esTelefonoValido } from '@/lib/utils'

import type { Usuario, UnidadAcademica, Carrera, CrearUsuarioDto, PaginatedResponse, Genero, CargoDocente, TipoDesignacionDocente } from '@/data/types'
import { RolUsuario } from '@/data/types'
import {
  generoOptions,
  cargoDocenteOptions,
  tipoDesignacionDocenteOptions,
  personaConDiscapacidadOptions,
} from '@/data/perfil'
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
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
  if (rol.includes('Rectorado')) return 'text-blue-600'
  if (rol.includes('Secretaria')) return 'text-green-600'
  if (rol === RolUsuario.Docente) return 'text-purple-600'
  return 'text-amber-600'
}

const rolesDisponibles: Record<string, RolUsuario[]> = {
  [RolUsuario.AutoridadDeRectorado]: [
    RolUsuario.AutoridadDeRectorado,
    RolUsuario.AsistenteDeRectorado,
    RolUsuario.AutoridadDeSecretaria,
    RolUsuario.AsistenteDeSecretaria,
    RolUsuario.Docente,
    RolUsuario.Estudiante,
  ],
  [RolUsuario.AutoridadDeSecretaria]: [
    RolUsuario.AutoridadDeSecretaria,
    RolUsuario.AsistenteDeSecretaria,
    RolUsuario.Docente,
    RolUsuario.Estudiante,
  ],
}

export function Usuarios() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [rolFiltro, setRolFiltro] = useState('')
  const [uaFiltro, setUaFiltro] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState<PaginatedResponse<Usuario> | null>(null)
  const [uaList, setUaList] = useState<UnidadAcademica[]>([])

  useEffect(() => {
    api.unidadesAcademicas.list().then(setUaList).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.usuarios.list({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        rol: rolFiltro && rolFiltro !== 'todos' ? rolFiltro : undefined,
        unidadAcademicaId: uaFiltro && uaFiltro !== 'todas' ? uaFiltro : undefined,
      })
      setResponse(res)
    } catch {
      setResponse(null)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, rolFiltro, uaFiltro])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const puedeCrear = user?.roles.some(r =>
    [RolUsuario.AutoridadDeRectorado, RolUsuario.AutoridadDeSecretaria].includes(r as RolUsuario)
  )
  const rolesCreables = user ? rolesDisponibles[user.roles.find(r => r in rolesDisponibles) ?? ''] ?? [] : []
  const esRectorado = user?.roles.includes(RolUsuario.AutoridadDeRectorado)
  const esSecretaria = user?.roles.includes(RolUsuario.AutoridadDeSecretaria)
  const esRolSecretaria = user?.roles.some(r =>
    r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  )
  const secretariasLabel = esRolSecretaria ? 'De esta secretaría' : 'De las secretarías'

  const stats = response?.stats ? [
    ...(response.stats.rectorado !== undefined
      ? [{ label: 'De rectorado', value: response.stats.rectorado, color: 'text-blue-600' }]
      : []),
    { label: secretariasLabel, value: response.stats.secretarias, color: 'text-green-600' },
    { label: 'Estudiantes', value: response.stats.estudiantes, color: 'text-amber-600' },
    { label: 'Docentes', value: response.stats.docentes, color: 'text-purple-600' },
  ] : [
    ...(esRectorado ? [{ label: 'De rectorado', value: '\u2014', color: 'text-muted-foreground' }] : []),
    { label: secretariasLabel, value: '\u2014', color: 'text-muted-foreground' },
    { label: 'Estudiantes', value: '\u2014', color: 'text-muted-foreground' },
    { label: 'Docentes', value: '\u2014', color: 'text-muted-foreground' },
  ]

  const usuarios = (response?.data ?? []).filter(u => u.id !== user?.id)
  const meta = response?.meta

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Administración de usuarios</p>
        </div>
        {puedeCrear && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nuevo Usuario</Button>
            </DialogTrigger>
            <NuevoUsuarioDialog
              rolesCreables={rolesCreables}
              uaList={uaList}
              esSecretaria={esSecretaria}
              uaId={esSecretaria ? user?.unidadAcademicaId : undefined}
              onCreated={() => {
                setOpen(false)
                cargarDatos()
                toast.success('Usuario creado correctamente')
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-8" /> : <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={rolFiltro} onValueChange={v => { setRolFiltro(v); setPage(1) }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value={RolUsuario.AutoridadDeRectorado}>Autoridad Rectorado</SelectItem>
            <SelectItem value={RolUsuario.AsistenteDeRectorado}>Asistente Rectorado</SelectItem>
            <SelectItem value={RolUsuario.AutoridadDeSecretaria}>Autoridad Secretaría</SelectItem>
            <SelectItem value={RolUsuario.AsistenteDeSecretaria}>Asistente Secretaría</SelectItem>
            <SelectItem value={RolUsuario.Estudiante}>Estudiante</SelectItem>
            <SelectItem value={RolUsuario.Docente}>Docente</SelectItem>
          </SelectContent>
        </Select>
        {esRectorado && (
          <Select value={uaFiltro} onValueChange={v => { setUaFiltro(v); setPage(1) }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Unidad Académica" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {uaList.map(ua => (
                <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.total} usuario{meta.total !== 1 ? 's' : ''} &middot; p&aacute;gina {meta.page} de {meta.totalPages || 1}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No se encontraron usuarios
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Unidad Académica</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map(u => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/usuarios/${u.id}`)}
                  >
                    <TableCell className="font-medium">{u.nombreCompleto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map(r => (
                          <Badge key={r} variant="outline" className={rolColor(r)}>
                            {rolLabels[r] || r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.unidadAcademica?.nombre || '-'}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()} className="text-center">
                      <Badge variant={u.habilitado ? 'default' : 'secondary'}>
                        {u.habilitado ? 'Habilitado' : 'Deshabilitado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-1">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="text-muted-foreground px-1">...</span>
                )}
                <Button
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="min-w-[2rem]"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              </span>
            ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function NuevoUsuarioDialog({
  rolesCreables, uaList, esSecretaria, uaId, onCreated,
}: {
  rolesCreables: RolUsuario[]
  uaList: UnidadAcademica[]
  esSecretaria?: boolean
  uaId?: string
  onCreated: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('')
  const [unidadAcademicaId, setUnidadAcademicaId] = useState(uaId ?? '')
  const [telefono, setTelefono] = useState('')
  const [genero, setGenero] = useState('')
  const [personaConDiscapacidad, setPersonaConDiscapacidad] = useState('')
  const [cargoDocente, setCargoDocente] = useState('')
  const [tipoDesignacionDocente, setTipoDesignacionDocente] = useState('')
  const [areaDocente, setAreaDocente] = useState('')
  const [direccionLocalidad, setDireccionLocalidad] = useState('')
  const [porcentajeCarrera, setPorcentajeCarrera] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.carreras.list().then(setCarreras).catch(() => {})
  }, [])

  const esDocente = rol === RolUsuario.Docente
  const esEstudiante = rol === RolUsuario.Estudiante

  const carrerasDisponibles = useMemo(() => {
    if (!unidadAcademicaId) return []
    const deLaUa = carreras.filter(c => c.unidadAcademicaId === unidadAcademicaId)
    return deLaUa.length > 0 ? deLaUa : carreras
  }, [unidadAcademicaId, carreras])

  const limpiarFormulario = () => {
    setNombre('')
    setApellido('')
    setEmail('')
    setPassword('')
    setRol('')
    setUnidadAcademicaId(uaId ?? '')
    setTelefono('')
    setGenero('')
    setPersonaConDiscapacidad('')
    setCargoDocente('')
    setTipoDesignacionDocente('')
    setAreaDocente('')
    setDireccionLocalidad('')
    setPorcentajeCarrera('')
    setCarreraId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rol) return
    if (esDocente && !telefono.trim()) {
      setError('El teléfono es obligatorio para docentes')
      return
    }
    if (esDocente && telefono.trim() && !esTelefonoValido(telefono.trim())) {
      setError('El teléfono no tiene un formato válido')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const payload: CrearUsuarioDto = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email,
        password,
        roles: [rol as RolUsuario],
        unidadAcademicaId: unidadAcademicaId || undefined,
      }
      if (esDocente) {
        payload.telefono = telefono.trim()
        payload.genero = genero ? genero as Genero : undefined
        payload.personaConDiscapacidad = personaConDiscapacidad === ''
          ? undefined
          : personaConDiscapacidad === 'true'
        payload.cargoDocente = cargoDocente ? cargoDocente as CargoDocente : undefined
        payload.tipoDesignacionDocente = tipoDesignacionDocente ? tipoDesignacionDocente as TipoDesignacionDocente : undefined
        payload.areaDocente = areaDocente.trim() || undefined
        payload.direccionLocalidad = direccionLocalidad.trim() || undefined
      }
      if (esEstudiante) {
        payload.porcentajeCarrera = porcentajeCarrera === ''
          ? undefined
          : Number(porcentajeCarrera)
        payload.carreraId = carreraId || undefined
      }
      await api.usuarios.crear(payload)
      limpiarFormulario()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
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
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Rol</label>
            <Select value={rol} onValueChange={setRol} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
              <SelectContent>
                {rolesCreables.map(r => (
                  <SelectItem key={r} value={r}>{rolLabels[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!esSecretaria && (
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Unidad Académica</label>
              <Select value={unidadAcademicaId} onValueChange={id => {
                setUnidadAcademicaId(id)
                setCarreraId('')
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar (opcional)" /></SelectTrigger>
                <SelectContent>
                  {uaList.map(ua => (
                    <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {esDocente && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  type="tel"
                  placeholder="11 1234 5678"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  required
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
              <div className="space-y-2 sm:col-span-2">
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
                  <SelectTrigger><SelectValue placeholder="Seleccionar (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {carrerasDisponibles.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitting ? 'Creando...' : 'Crear'}
        </Button>
      </form>
    </DialogContent>
  )
}
