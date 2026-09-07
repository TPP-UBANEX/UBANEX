import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { ThemeToggle } from './ThemeToggle'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { rolUsuarioLabel, rolUsuarioColor, rolUsuarioPrincipal } from '@/data/perfil'
import { cn } from '@/lib/utils'
import { LogOut, User } from 'lucide-react'

function tituloSeccion(pathname: string, search: string, userId?: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname === '/convocatorias') return 'Convocatorias'
  if (pathname.startsWith('/convocatorias/')) return 'Convocatoria'
  if (pathname === '/proyectos') return search.includes('revision=true') ? 'Revisión de proyectos' : 'Proyectos'
  if (pathname.startsWith('/proyectos/')) return 'Proyecto'
  if (pathname === '/evaluacion') return 'Evaluación'
  if (pathname === '/plantillas') return 'Plantillas'
  if (pathname === '/plantillas/presentacion') return 'Plantillas de presentación'
  if (pathname.startsWith('/plantillas/presentacion/')) return 'Plantilla de presentación'
  if (pathname === '/plantillas/evaluacion') return 'Plantillas de evaluación'
  if (pathname === '/plantillas/impacto') return 'Plantillas de autoevaluación de impacto'
  if (pathname === '/usuarios') return 'Usuarios'
  if (pathname.startsWith('/usuarios/')) {
    const id = pathname.split('/')[2]
    return id === userId ? 'Mi Perfil' : 'Usuario'
  }
  if (pathname === '/validacion-docente') return 'Validación de Docentes'
  return 'UBANEX'
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const iniciales = user?.nombreCompleto
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  const roles = user?.roles ?? []
  const rolPrincipal = rolUsuarioPrincipal(roles)

  return (
    <header className="border-b bg-background px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold text-heading">
          {tituloSeccion(location.pathname, location.search, user?.id)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <NotificacionesDropdown />

        {rolPrincipal && (
          <Badge variant="outline" className={cn('hidden sm:inline-flex', rolUsuarioColor(rolPrincipal))}>
            {rolUsuarioLabel(rolPrincipal)}
            {roles.length > 1 && <span className="ml-1 opacity-70">+{roles.length - 1}</span>}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{iniciales}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.nombreCompleto}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {roles.map(r => (
                      <Badge key={r} variant="outline" className={rolUsuarioColor(r)}>
                        {rolUsuarioLabel(r)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/usuarios/${user?.id}`)}>
              <User className="h-4 w-4 mr-2" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); navigate('/login') }} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
