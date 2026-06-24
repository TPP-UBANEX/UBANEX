import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  DollarSign,
  FolderCheck,
  FolderOpen,
  ChevronLeft,
} from 'lucide-react'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'convocatorias', label: 'Convocatorias', icon: FileText },
  { id: 'evaluacion', label: 'Evaluación', icon: ClipboardCheck },
  { id: 'rendicion', label: 'Rendición', icon: DollarSign },
  { id: 'cierre', label: 'Cierre', icon: FolderCheck },
  { id: 'proyectos', label: 'Proyectos', icon: FolderOpen },
]

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'border-r bg-card flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight">UBANEX</span>
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
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={currentPage === item.id ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3',
              collapsed && 'justify-center px-2'
            )}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </Button>
        ))}
      </nav>
    </aside>
  )
}
