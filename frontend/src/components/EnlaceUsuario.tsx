import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { esRolDeGestion } from '@/data/perfil'
import { cn } from '@/lib/utils'

/**
 * Muestra el nombre de un usuario como link a su ficha (/usuarios/:id) cuando el usuario
 * logueado tiene permiso para verla (rol de gestión, o su propio perfil vía allowOwnId en
 * ProtectedRoute). En cualquier otro caso muestra el nombre como texto plano, sin exponer
 * un link que redirigiría a "/".
 */
export function EnlaceUsuario({ usuarioId, nombre, className }: {
  usuarioId?: string | null
  nombre?: string | null
  className?: string
}) {
  const { user } = useAuth()

  if (!nombre) return <>-</>

  const puedeVerPerfil = !!usuarioId && (esRolDeGestion(user?.roles) || user?.id === usuarioId)
  if (!puedeVerPerfil) return <>{nombre}</>

  return (
    <Link to={`/usuarios/${usuarioId}`} className={cn('text-primary hover:underline', className)}>
      {nombre}
    </Link>
  )
}
