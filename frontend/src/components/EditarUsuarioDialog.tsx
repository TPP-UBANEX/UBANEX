import { useState } from 'react'
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
import type { Usuario, UnidadAcademica } from '@/data/types'
import { RolUsuario } from '@/data/types'
import { Loader2 } from 'lucide-react'

const rolLabels: Record<string, string> = {
  [RolUsuario.AutoridadDeRectorado]: 'Autoridad Rectorado',
  [RolUsuario.AsistenteDeRectorado]: 'Asistente Rectorado',
  [RolUsuario.AutoridadDeSecretaria]: 'Autoridad Secretaría',
  [RolUsuario.AsistenteDeSecretaria]: 'Asistente Secretaría',
  [RolUsuario.DirectorDeProyecto]: 'Director',
  [RolUsuario.Evaluador]: 'Evaluador',
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
  const [nombreCompleto, setNombreCompleto] = useState(usuario.nombreCompleto)
  const [email, setEmail] = useState(usuario.email)
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<string[]>(usuario.roles)
  const [unidadAcademicaId, setUnidadAcademicaId] = useState(usuario.unidadAcademicaId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const esAutoEdicion = user?.id === usuario.id
  const esRectorado = user?.roles.includes(RolUsuario.AutoridadDeRectorado)
  const esSecretariaMismaUA =
    user?.roles.includes(RolUsuario.AutoridadDeSecretaria) &&
    user?.unidadAcademicaId === usuario.unidadAcademicaId
  const puedeEditarRolesUA = esRectorado
  const puedeEditar = esAutoEdicion || esRectorado || esSecretariaMismaUA

  if (!puedeEditar) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data: Record<string, unknown> = { nombreCompleto, email }
      if (password) data.password = password
      if (puedeEditarRolesUA) {
        if (roles.length > 0) data.roles = roles
        if (unidadAcademicaId) data.unidadAcademicaId = unidadAcademicaId
      }
      await api.usuarios.actualizar(usuario.id, data)
      setOpen(false)
      onUpdated()
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
            placeholder={esAutoEdicion ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña (opcional)'}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {puedeEditarRolesUA && (
            <Select
              value={roles[0] ?? ''}
              onValueChange={v => setRoles([v])}
            >
              <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
              <SelectContent>
                {Object.entries(rolLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {puedeEditarRolesUA && (
            <Select value={unidadAcademicaId} onValueChange={setUnidadAcademicaId}>
              <SelectTrigger><SelectValue placeholder="Unidad Académica" /></SelectTrigger>
              <SelectContent>
                {uaList.map(ua => (
                  <SelectItem key={ua.id} value={ua.id}>{ua.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
