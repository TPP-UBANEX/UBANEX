import { cn } from '@/lib/utils'

interface ListaCamposFaltantesProps {
  titulo: string
  campos: string[]
  className?: string
}

export function ListaCamposFaltantes({ titulo, campos, className }: ListaCamposFaltantesProps) {
  return (
    <div className={cn('text-sm', className)}>
      <p>{titulo}</p>
      <ul className="list-disc list-outside pl-5 mt-1 space-y-0.5">
        {campos.map((campo, index) => (
          <li key={index}>{campo}</li>
        ))}
      </ul>
    </div>
  )
}
