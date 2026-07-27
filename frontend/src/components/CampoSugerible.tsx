import { cn } from '@/lib/utils'

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
        'cursor-pointer rounded-sm border border-dashed border-transparent hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors px-0.5 -mx-0.5',
        className,
      )}
      onClick={() => onClick(campo, valorActual, label)}
      title={`Sugerir cambio en "${label}"`}
    >
      {children}
    </span>
  )
}
