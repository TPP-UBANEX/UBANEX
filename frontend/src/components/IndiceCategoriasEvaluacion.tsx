import { Badge } from '@/components/ui/badge'

export interface ItemIndiceCategoria {
  id: string
  nombre: string
  completados: number
  total: number
  resumen?: string
}

/**
 * Barra de navegación rápida por categorías para el formulario de evaluación (institucional o
 * cruzada), que puede volverse muy largo. Se ubica sticky arriba de la columna de evaluación y
 * permite saltar a una categoría además de ver de un vistazo cuáles quedan incompletas.
 */
export function IndiceCategoriasEvaluacion({
  items,
  onSelect,
}: {
  items: ItemIndiceCategoria[]
  onSelect: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const completa = item.completados === item.total
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted/60 transition-colors"
          >
            <span>{item.nombre}</span>
            <Badge variant={completa ? 'secondary' : 'outline'} className="px-1.5 py-0 text-[10px]">
              {item.resumen ?? `${item.completados}/${item.total}`}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
