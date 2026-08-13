import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  FolderOpen,
  Users,
  ChevronLeft,
  ClipboardList,
  UserCheck,
  LayoutTemplate,
  // CalendarCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { RolUsuario } from '@/data/types'
import { Logo } from '@/components/Logo'

const menuItems = [
  { id: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: '/convocatorias', label: 'Convocatorias', icon: FileText },
  { id: '/proyectos', label: 'Proyectos', icon: FolderOpen },
  { id: '/evaluacion', label: 'Evaluación', icon: ClipboardCheck },
  { id: '/usuarios', label: 'Usuarios', icon: Users },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const esSecretaria = user?.roles.some(
    r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  )
  const esRectorado = user?.roles.some(
    r => r === RolUsuario.AutoridadDeRectorado || r === RolUsuario.AsistenteDeRectorado,
  )
  const esGestion = user?.roles.some(
    r =>
      r === RolUsuario.AutoridadDeRectorado ||
      r === RolUsuario.AsistenteDeRectorado ||
      r === RolUsuario.AutoridadDeSecretaria ||
      r === RolUsuario.AsistenteDeSecretaria,
  )

  return (
    <aside
      className={cn(
        'border-r bg-card flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed && (
          <Logo className="h-8 w-auto" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menuItems
          .filter(item => item.id !== '/usuarios' || esGestion)
          .map((item) => (
          <Button
            key={item.id}
            variant={location.pathname === item.id || location.pathname.startsWith(item.id + '/') ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3',
              collapsed && 'justify-center px-2',
            )}
            onClick={() => navigate(item.id)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </Button>
        ))}
        {esGestion && (
          <>
            <div className="border-t my-2" />
            {!collapsed && (
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1 pb-0.5">
                Gestión
              </p>
            )}
            {esSecretaria && (
              <Button
                key="/validacion-docente"
                variant={location.pathname === '/validacion-docente' ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  collapsed && 'justify-center px-2',
                )}
                onClick={() => navigate('/validacion-docente')}
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">Validación Docente</span>}
              </Button>
            )}
            {esRectorado && (
              <Button
                key="/plantillas-formulario"
                variant={location.pathname.startsWith('/plantillas-formulario') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  collapsed && 'justify-center px-2',
                )}
                onClick={() => navigate('/plantillas-formulario')}
              >
                <LayoutTemplate className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">Plantillas presentación</span>}
              </Button>
            )}
            <Button
              key="/proyectos?revision=true"
              variant={
                location.pathname === '/proyectos' && location.search.includes('revision=true')
                  ? 'secondary'
                  : 'ghost'
              }
              className={cn(
                'w-full justify-start gap-3',
                collapsed && 'justify-center px-2',
              )}
              onClick={() => navigate('/proyectos?revision=true')}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Revisión</span>}
            </Button>
          </>
        )}
        {!esGestion && (
          <>
            <div className="border-t my-2" />
            {!collapsed && (
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1 pb-0.5">
                Participación
              </p>
            )}
            <Button
              key="/mis-participaciones"
              variant={location.pathname === '/convocatorias' ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                collapsed && 'justify-center px-2',
              )}
              onClick={() => navigate('/convocatorias')}
            >
              <FileText className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Mis Participaciones</span>}
            </Button>
          </>
        )}
      </nav>
    </aside>
  )
}
