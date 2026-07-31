import { cn } from '@/lib/utils'
import { Pencil } from 'lucide-react'

interface CampoSugeribleProps {
  campo: string
  valorActual: string
  label: string
  activo: boolean
  onClick: (campo: string, valorActual: string, label: string) => void
  children: React.ReactNode
  className?: string
}

export function CampoSugerible({ campo, valorActual, label, activo, onClick, children, className }: CampoSugeribleProps) {
  if (!activo) return <>{children}</>

  return (
    <span
      className={cn(
        'cursor-pointer rounded-sm border border-dashed border-blue-300 dark:border-blue-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors px-1 -mx-1 inline-flex items-center gap-1',
        className,
      )}
      onClick={() => onClick(campo, valorActual, label)}
      title={`Sugerir cambio en "${label}"`}
    >
      <Pencil className="h-3 w-3 shrink-0 text-blue-400" />
      {children}
    </span>
  )
}
