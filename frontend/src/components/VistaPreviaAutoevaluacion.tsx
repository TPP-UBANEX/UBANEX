import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PreguntaAutoevaluacionRenderer } from '@/components/PreguntaAutoevaluacionRenderer'
import type { EstructuraTemplateAutoevaluacion } from '@/data/types'

/**
 * Muestra un formulario de autoevaluación de impacto (lista de `PreguntaAutoevaluacion`) tal
 * como lo verá quien complete la autoevaluación. Solo lectura, sin valores.
 */
export function VistaPreviaAutoevaluacion({ estructura }: { estructura: EstructuraTemplateAutoevaluacion | null }) {
  const preguntas = estructura?.preguntas ?? []

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
        Vista previa: así se verá el formulario para quien complete la autoevaluación de impacto.
        Los valores se muestran vacíos.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Autoevaluación de impacto</CardTitle>
        </CardHeader>
        <CardContent>
          {preguntas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este formulario todavía no tiene preguntas.
            </p>
          ) : (
            <div className="space-y-5">
              {preguntas.map(pregunta => (
                <PreguntaAutoevaluacionRenderer
                  key={pregunta.id}
                  pregunta={pregunta}
                  valor={undefined}
                  disabled
                  onChange={() => {}}
                  onToggle={() => {}}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
