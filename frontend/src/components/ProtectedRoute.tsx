import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { Skeleton } from '@/components/ui/skeleton'
import { RolUsuario } from '@/data/types'

export function ProtectedRoute({
  children,
  roles,
  allowOwnId,
}: {
  children: React.ReactNode
  roles?: RolUsuario[]
  allowOwnId?: boolean
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const params = useParams()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && !user?.roles.some(r => roles.includes(r))) {
    const esPropio = allowOwnId && params.id === user?.id
    if (!esPropio) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
