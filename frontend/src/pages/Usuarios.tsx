import { useEffect, useState } from 'react'
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
import type { Usuario, UnidadAcademica } from '@/data/types'
import { RolUsuario } from '@/data/types'
import { Plus, Search, Loader2 } from 'lucide-react'

const rolLabels: Record<string, string> = {
  [RolUsuario.AutoridadDeRectorado]: 'Autoridad Rectorado',
  [RolUsuario.AsistenteDeRectorado]: 'Asistente Rectorado',
  [RolUsuario.AutoridadDeSecretaria]: 'Autoridad Secretaría',
  [RolUsuario.AsistenteDeSecretaria]: 'Asistente Secretaría',
  [RolUsuario.DirectorDeProyecto]: 'Director',
  [RolUsuario.Evaluador]: 'Evaluador',
}

function rolColor(rol: string): string {
  if (rol.includes('Rectorado')) return 'text-blue-600'
  if (rol.includes('Secretaria')) return 'text-green-600'
  if (rol === RolUsuario.Evaluador) return 'text-amber-600'
  return 'text-purple-600'
}

const rolesDisponibles: Record<string, RolUsuario[]> = {
  [RolUsuario.AutoridadDeRectorado]: [
    RolUsuario.AsistenteDeRectorado,
    RolUsuario.AutoridadDeSecretaria,
    RolUsuario.AsistenteDeSecretaria,
  ],
  [RolUsuario.AutoridadDeSecretaria]: [
    RolUsuario.AsistenteDeSecretaria,
    RolUsuario.Evaluador,
  ],
}

export function Usuarios() {
  const { user } = useAuth()
  const [data, setData] = useState<Usuario[]>([])
  const [open, setOpen] = useState(false)
  const [rolFiltro, setRolFiltro] = useState('todos')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uaList, setUaList] = useState<UnidadAcademica[]>([])

  useEffect(() => {
    Promise.all([
      api.usuarios.list(),
      api.unidadesAcademicas.list(),
    ]).then(([users, uas]) => {
      setData(users)
      setUaList(uas)
    }).finally(() => setLoading(false))
  }, [])

  const puedeCrear = user?.roles.some(r =>
    [RolUsuario.AutoridadDeRectorado, RolUsuario.AutoridadDeSecretaria].includes(r as RolUsuario)
  )
  const rolesCreables = user ? rolesDisponibles[user.roles.find(r => r in rolesDisponibles) ?? ''] ?? [] : []
  const esSecretaria = user?.roles.includes(RolUsuario.AutoridadDeSecretaria)

  const filtrados = data.filter(u => {
    if (rolFiltro !== 'todos' && !u.roles.includes(rolFiltro as RolUsuario)) return false
    if (search && !u.nombreCompleto.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = [
    { label: 'Rectorado', value: data.filter(u => u.roles.some(r => r.includes('Rectorado'))).length, color: 'text-blue-600' },
    { label: 'Secretarías', value: data.filter(u => u.roles.some(r => r.includes('Secretaria'))).length, color: 'text-green-600' },
    { label: 'Evaluadores', value: data.filter(u => u.roles.includes(RolUsuario.Evaluador)).length, color: 'text-amber-600' },
    { label: 'Directores', value: data.filter(u => u.roles.includes(RolUsuario.DirectorDeProyecto)).length, color: 'text-purple-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
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
                api.usuarios.list().then(setData)
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
        <Select value={rolFiltro} onValueChange={setRolFiltro}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value={RolUsuario.AutoridadDeRectorado}>Autoridad Rectorado</SelectItem>
            <SelectItem value={RolUsuario.AsistenteDeRectorado}>Asistente Rectorado</SelectItem>
            <SelectItem value={RolUsuario.AutoridadDeSecretaria}>Autoridad Secretaría</SelectItem>
            <SelectItem value={RolUsuario.AsistenteDeSecretaria}>Asistente Secretaría</SelectItem>
            <SelectItem value={RolUsuario.Evaluador}>Evaluador</SelectItem>
            <SelectItem value={RolUsuario.DirectorDeProyecto}>Director</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Usuarios</CardTitle></CardHeader>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Unidad Académica</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(u => (
                  <TableRow key={u.id}>
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
                    <TableCell><Button variant="ghost" size="sm">Editar</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('')
  const [unidadAcademicaId, setUnidadAcademicaId] = useState(uaId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rol) return
    setError('')
    setSubmitting(true)
    try {
      await api.usuarios.crear({
        nombreCompleto,
        email,
        password,
        roles: [rol as RolUsuario],
        unidadAcademicaId: unidadAcademicaId || undefined,
      })
      setNombreCompleto('')
      setEmail('')
      setPassword('')
      setRol('')
      setUnidadAcademicaId(uaId ?? '')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
        <Input
          placeholder="Nombre completo"
          value={nombreCompleto}
          onChange={e => setNombreCompleto(e.target.value)}
          required
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Select value={rol} onValueChange={setRol} required>
          <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
          <SelectContent>
            {rolesCreables.map(r => (
              <SelectItem key={r} value={r}>{rolLabels[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!esSecretaria && (
          <Select value={unidadAcademicaId} onValueChange={setUnidadAcademicaId}>
            <SelectTrigger><SelectValue placeholder="Unidad Académica (opcional)" /></SelectTrigger>
            <SelectContent>
              {uaList.map(ua => (
                <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitting ? 'Creando...' : 'Crear'}
        </Button>
      </form>
    </DialogContent>
  )
}
