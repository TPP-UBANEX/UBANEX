import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type {
  EstructuraTemplateAutoevaluacion,
  PreguntaAutoevaluacion,
} from '@/data/types'
import { tipoPreguntaLabel } from '@/data/types'

interface Props {
  estructura: EstructuraTemplateAutoevaluacion | null
  onChange: (estructura: EstructuraTemplateAutoevaluacion) => void
  editable?: boolean
}

const TIPOS = ['texto', 'booleano', 'escalaNumerica', 'select', 'checkbox'] as const

export function TemplateAutoevaluacionBuilder({ estructura, onChange, editable = true }: Props) {
  const base: EstructuraTemplateAutoevaluacion = estructura ?? { preguntas: [] }
  const preguntas = base.preguntas

  const nuevaPregunta = (): PreguntaAutoevaluacion => ({
    id: crypto.randomUUID(),
    tipo: 'texto',
    texto: '',
    esObligatorio: true,
    orden: preguntas.length,
    opciones: null,
    escalaMin: null,
    escalaMax: null,
  })

  const actualizarPregunta = (id: string, cambios: Partial<PreguntaAutoevaluacion>) => {
    onChange({
      preguntas: preguntas.map(p =>
        p.id === id
          ? { ...p, ...cambios }
          : p,
      ),
    })
  }

  const agregarPregunta = () =>
    onChange({ preguntas: [...preguntas, nuevaPregunta()] })

  const eliminarPregunta = (id: string) => {
    const restantes = preguntas.filter(p => p.id !== id)
    onChange({ preguntas: restantes.map((p, i) => ({ ...p, orden: i })) })
  }

  const cambiarTipo = (id: string, tipo: PreguntaAutoevaluacion['tipo']) => {
    actualizarPregunta(id, {
      tipo,
      opciones: tipo === 'select' || tipo === 'checkbox' ? [''] : null,
      escalaMin: tipo === 'escalaNumerica' ? 1 : null,
      escalaMax: tipo === 'escalaNumerica' ? 10 : null,
    })
  }

  const agregarOpcion = (id: string) =>
    actualizarPregunta(id, { opciones: [...(preguntas.find(p => p.id === id)?.opciones ?? []), ''] })

  const actualizarOpcion = (id: string, idx: number, valor: string) => {
    const opciones = [...(preguntas.find(p => p.id === id)?.opciones ?? [])]
    opciones[idx] = valor
    actualizarPregunta(id, { opciones })
  }

  const eliminarOpcion = (id: string, idx: number) => {
    const opciones = [...(preguntas.find(p => p.id === id)?.opciones ?? [])]
    opciones.splice(idx, 1)
    actualizarPregunta(id, { opciones })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Preguntas de autoevaluación</h4>
        {editable && (
          <Button type="button" variant="outline" size="sm" onClick={agregarPregunta}>
            <Plus className="h-4 w-4 mr-1" />Agregar pregunta
          </Button>
        )}
      </div>

      {preguntas.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin preguntas definidas.</p>
      )}

      {preguntas.map(pregunta => (
        <div key={pregunta.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-40 space-y-1">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <Select
                value={pregunta.tipo}
                disabled={!editable}
                onValueChange={v => cambiarTipo(pregunta.id, v as PreguntaAutoevaluacion['tipo'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t} value={t}>{tipoPreguntaLabel[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[2] space-y-1">
              <span className="text-xs text-muted-foreground">Enunciado</span>
              <Input
                value={pregunta.texto}
                disabled={!editable}
                onChange={e => actualizarPregunta(pregunta.id, { texto: e.target.value })}
                placeholder="Ej: ¿En qué medida el proyecto logró su impacto esperado?"
              />
            </div>
            {editable && (
              <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => eliminarPregunta(pregunta.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">¿Obligatoria?</span>
            <Button
              type="button"
              size="sm"
              variant={pregunta.esObligatorio ? 'default' : 'outline'}
              disabled={!editable}
              onClick={() => actualizarPregunta(pregunta.id, { esObligatorio: !pregunta.esObligatorio })}
            >
              {pregunta.esObligatorio ? 'Sí' : 'No'}
            </Button>
          </div>

          {pregunta.tipo === 'escalaNumerica' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Mínimo</span>
                <Input
                  type="number"
                  value={pregunta.escalaMin ?? ''}
                  disabled={!editable}
                  onChange={e => actualizarPregunta(pregunta.id, { escalaMin: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Máximo</span>
                <Input
                  type="number"
                  value={pregunta.escalaMax ?? ''}
                  disabled={!editable}
                  onChange={e => actualizarPregunta(pregunta.id, { escalaMax: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {(pregunta.tipo === 'select' || pregunta.tipo === 'checkbox') && (
            <div className="space-y-2 pl-2 border-l-2">
              <span className="text-xs text-muted-foreground">Opciones predefinidas</span>
              {(pregunta.opciones ?? []).map((opcion, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-[2]">
                    <Input
                      value={opcion}
                      disabled={!editable}
                      onChange={e => actualizarOpcion(pregunta.id, idx, e.target.value)}
                      placeholder={`Opción ${idx + 1}`}
                    />
                  </div>
                  {editable && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => eliminarOpcion(pregunta.id, idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editable && (
                <Button type="button" variant="outline" size="sm" onClick={() => agregarOpcion(pregunta.id)}>
                  <Plus className="h-3 w-3 mr-1" />Agregar opción
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}