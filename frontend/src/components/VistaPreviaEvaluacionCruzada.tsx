import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { EstructuraTemplateCruzada } from '@/data/types'

const NOTA_BLOQUE_FIJO = 'Bloque fijo de la evaluación: no depende del formulario que estás configurando.'

/**
 * Muestra un formulario de evaluación cruzada tal como lo verá quien evalúe: categorías con sus
 * ítems puntuables, el resumen de puntaje total y el bloque fijo de observaciones. Solo lectura,
 * sin valores ni acciones de guardado.
 */
export function VistaPreviaEvaluacionCruzada({
  estructura,
}: {
  estructura: EstructuraTemplateCruzada | null
}) {
  const categorias = estructura?.categorias ?? []

  if (categorias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Este formulario todavía no tiene categorías definidas.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
        Vista previa: así verá el formulario quien realice la evaluación cruzada. Los valores se
        muestran vacíos.
      </p>

      <div className="space-y-4">
        {categorias.map(cat => (
          <div key={cat.id} className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-1">
              {cat.nombre || 'Categoría'}{' '}
              <span className="text-muted-foreground font-normal">
                (0 / {cat.puntajeMaximo})
              </span>
            </h3>
            {cat.items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <p className="text-sm flex-1">{item.nombre || 'Ítem'}</p>
                <Input
                  type="number"
                  className="w-24"
                  min={0}
                  max={item.puntajeMaximo}
                  disabled
                  value=""
                  placeholder={`0-${item.puntajeMaximo}`}
                />
              </div>
            ))}
          </div>
        ))}

        <div className="bg-muted/50 rounded-md p-3 flex items-center justify-between">
          <span className="text-sm font-medium">Puntaje total</span>
          <span className="text-lg font-bold">0 pts</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold border-b pb-1">Observaciones</h3>
            <span className="text-xs text-muted-foreground">0/500</span>
          </div>
          <Textarea
            className="min-h-[80px]"
            disabled
            value=""
            placeholder="Observaciones de la evaluación..."
          />
          <p className="text-xs text-muted-foreground">{NOTA_BLOQUE_FIJO}</p>
        </div>
      </div>
    </div>
  )
}
