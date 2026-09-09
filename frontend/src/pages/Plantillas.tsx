import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutTemplate, Library, ListChecks } from 'lucide-react'

const tipos = [
  {
    ruta: '/plantillas/presentacion',
    label: 'Presentación',
    icon: LayoutTemplate,
    descripcion: 'Formularios de presentación que se usan al configurar una convocatoria.',
  },
  {
    ruta: '/plantillas/evaluacion',
    label: 'Evaluación',
    icon: Library,
    descripcion: 'Grillas de evaluación institucional y cruzada entre proyectos.',
  },
  {
    ruta: '/plantillas/impacto',
    label: 'Autoevaluación de impacto',
    icon: ListChecks,
    descripcion: 'Cuestionarios de autoevaluación de impacto de los proyectos.',
  },
]

export function Plantillas() {
  const navigate = useNavigate()

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-muted-foreground">
        Elegí qué tipo de plantilla querés gestionar.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tipos.map(t => (
          <Card
            key={t.ruta}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(t.ruta)}
          >
            <CardHeader className="flex flex-row items-center gap-3">
              <t.icon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-medium">{t.label}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t.descripcion}</p>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
