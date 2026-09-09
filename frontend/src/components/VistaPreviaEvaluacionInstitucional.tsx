import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { EstructuraTemplateInstitucional } from '@/data/types'

const NOTA_BLOQUE_FIJO = 'Bloque fijo de la evaluación: no depende del formulario que estás configurando.'

/**
 * Muestra un formulario de evaluación institucional tal como lo verá quien evalúe: categorías,
 * subcategorías (numérico o Sí/No + fundamentación) y checklist, más los bloques fijos "¿Es una
 * Práctica Social Educativa?" y "Observaciones". Solo lectura, sin valores ni acciones de guardado.
 */
export function VistaPreviaEvaluacionInstitucional({
  estructura,
}: {
  estructura: EstructuraTemplateInstitucional | null
}) {
  const categorias = estructura?.categorias ?? []
  const checklist = estructura?.checklist ?? []

  if (categorias.length === 0 && checklist.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Este formulario todavía no tiene categorías ni checklist definidos.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
        Vista previa: así verá el formulario quien realice la evaluación institucional. Los valores
        se muestran vacíos.
      </p>

      <div className="space-y-6">
        {categorias.map(cat => (
          <div key={cat.id} className="space-y-3">
            <h3 className="text-sm font-semibold border-b pb-1">{cat.nombre || 'Categoría'}</h3>
            {cat.subcategorias.map(sub => (
              <div key={sub.id} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm flex-1">{sub.texto || 'Subcategoría'}</p>
                  {sub.tipoValor === 'numerico' ? (
                    <Input
                      type="number"
                      className="w-24"
                      disabled
                      value=""
                      placeholder={`${sub.minimo}-${sub.maximo}`}
                    />
                  ) : (
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="outline" disabled>Sí</Button>
                      <Button type="button" size="sm" variant="outline" disabled>No</Button>
                    </div>
                  )}
                </div>
                <Textarea
                  className="min-h-[60px] text-sm"
                  disabled
                  value=""
                  placeholder={`Fundamentación de "${sub.texto}"`}
                />
              </div>
            ))}
          </div>
        ))}

        {checklist.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-1">Checklist institucional</h3>
            {checklist.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <p className="text-sm flex-1">{item.texto || 'Ítem'}</p>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" disabled>Sí</Button>
                  <Button type="button" size="sm" variant="outline" disabled>No</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">¿Es una Práctica Social Educativa?</p>
              <p className="text-xs text-muted-foreground">
                Determina un extra sobre el presupuesto a adjudicar, no suma puntaje.
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button type="button" size="sm" variant="outline" disabled>Sí</Button>
              <Button type="button" size="sm" variant="outline" disabled>No</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{NOTA_BLOQUE_FIJO}</p>
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
            placeholder="Observaciones generales de la evaluación..."
          />
          <p className="text-xs text-muted-foreground">{NOTA_BLOQUE_FIJO}</p>
        </div>
      </div>
    </div>
  )
}
