import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const STORAGE_KEY = 'ubanex:evaluacion:presentacion-colapsada'

function leerColapsada(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Layout de dos paneles para la vista de completar evaluación: presentación del proyecto a la
 * izquierda, formulario de evaluación a la derecha. Cada panel scrollea de forma independiente
 * (a partir de `lg`) en lugar de compartir el scroll de la página, y la presentación se puede
 * plegar para darle todo el ancho al formulario de evaluación.
 */
export function EvaluacionSplit({
  presentacion,
  children,
}: {
  presentacion: React.ReactNode
  children: React.ReactNode
}) {
  const [colapsada, setColapsada] = useState(leerColapsada)

  useEffect(() => {
    try {
      if (colapsada) localStorage.setItem(STORAGE_KEY, '1')
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage no disponible: la preferencia simplemente no persiste entre sesiones.
    }
  }, [colapsada])

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div>
        <Button variant="ghost" size="sm" onClick={() => setColapsada((c) => !c)}>
          {colapsada ? (
            <PanelLeftOpen className="h-4 w-4 mr-1" />
          ) : (
            <PanelLeftClose className="h-4 w-4 mr-1" />
          )}
          {colapsada ? 'Ver proyecto' : 'Ocultar proyecto'}
        </Button>
      </div>
      <div className={`flex-1 min-h-0 grid gap-4 ${colapsada ? '' : 'lg:grid-cols-2'}`}>
        {!colapsada && (
          <div className="lg:h-full lg:min-h-0 lg:overflow-y-auto">{presentacion}</div>
        )}
        <div className="lg:h-full lg:min-h-0 lg:overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
