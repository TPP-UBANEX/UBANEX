import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OpcionesCampoEditor } from '@/components/ConfigTipoCampoEditor'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type {
  EstructuraTemplateAutoevaluacion,
  PreguntaAutoevaluacion,
} from '@/data/types'
import { tipoPreguntaLabel } from '@/data/types'

interface Props {
  estructura: EstructuraTemplateAutoevaluacion | null
  onChange: (estructura: EstructuraTemplateAutoevaluacion) => void
  editable?: boolean
  /** Qué mostrar cuando todavía no hay preguntas cargadas. */
  slotVacio?: React.ReactNode
  /** Acciones propias del contenedor (ej. "Guardar"), alineadas a la derecha del pie. */
  slotAcciones?: React.ReactNode
}

const TIPOS = ['texto', 'booleano', 'escalaNumerica', 'select', 'checkbox'] as const
const TIPOS_CON_OPCIONES = ['select', 'checkbox']

export function TemplateAutoevaluacionBuilder({
  estructura,
  onChange,
  editable = true,
  slotVacio,
  slotAcciones,
}: Props) {
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

  const moverPregunta = (index: number, direccion: -1 | 1) => {
    const destino = index + direccion
    if (destino < 0 || destino >= preguntas.length) return
    const copia = [...preguntas]
    const [pregunta] = copia.splice(index, 1)
    copia.splice(destino, 0, pregunta)
    onChange({ preguntas: copia.map((p, i) => ({ ...p, orden: i })) })
  }

  const cambiarTipo = (id: string, tipo: PreguntaAutoevaluacion['tipo']) => {
    actualizarPregunta(id, {
      tipo,
      opciones: tipo === 'select' || tipo === 'checkbox' ? [''] : null,
      escalaMin: tipo === 'escalaNumerica' ? 1 : null,
      escalaMax: tipo === 'escalaNumerica' ? 10 : null,
    })
  }

  return (
    <div className="space-y-4">
      {preguntas.length === 0 ? slotVacio : (
      <div className="-mx-6 border-y divide-y">
        {preguntas.map((pregunta, index) => (
          <div key={pregunta.id} className="px-6 py-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-[2] space-y-1">
                <span className="h-4 text-xs text-muted-foreground flex items-center">Enunciado</span>
                <Input
                  className="bg-muted/40"
                  value={pregunta.texto}
                  disabled={!editable}
                  onChange={e => actualizarPregunta(pregunta.id, { texto: e.target.value })}
                  placeholder="Ej: ¿En qué medida el proyecto logró su impacto esperado?"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="h-4 text-xs text-muted-foreground flex items-center">Tipo</span>
                <Select
                  value={pregunta.tipo}
                  disabled={!editable}
                  onValueChange={v => cambiarTipo(pregunta.id, v as PreguntaAutoevaluacion['tipo'])}
                >
                  <SelectTrigger className="bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => (
                      <SelectItem key={t} value={t}>{tipoPreguntaLabel[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editable && (
                <div className="flex items-center gap-1 pt-5">
                  <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moverPregunta(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" disabled={index === preguntas.length - 1} onClick={() => moverPregunta(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => eliminarPregunta(pregunta.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">¿Obligatoria?</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={pregunta.esObligatorio ? 'default' : 'outline'}
                    size="sm"
                    disabled={!editable}
                    onClick={() => actualizarPregunta(pregunta.id, { esObligatorio: true })}
                  >
                    Sí
                  </Button>
                  <Button
                    type="button"
                    variant={!pregunta.esObligatorio ? 'default' : 'outline'}
                    size="sm"
                    disabled={!editable}
                    onClick={() => actualizarPregunta(pregunta.id, { esObligatorio: false })}
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>

            {pregunta.tipo === 'escalaNumerica' && (
              <div className="space-y-2 pl-3 border-l border-muted-foreground/20">
                <span className="text-xs text-muted-foreground">Escala (opcional)</span>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Mínimo</span>
                    <Input
                      className="bg-muted/40"
                      type="number"
                      value={pregunta.escalaMin ?? ''}
                      disabled={!editable}
                      onChange={e => actualizarPregunta(pregunta.id, { escalaMin: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Máximo</span>
                    <Input
                      className="bg-muted/40"
                      type="number"
                      value={pregunta.escalaMax ?? ''}
                      disabled={!editable}
                      onChange={e => actualizarPregunta(pregunta.id, { escalaMax: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {TIPOS_CON_OPCIONES.includes(pregunta.tipo) && (
              <OpcionesCampoEditor
                opciones={pregunta.opciones ?? undefined}
                editable={editable}
                onChange={opciones => actualizarPregunta(pregunta.id, { opciones })}
              />
            )}
          </div>
        ))}
      </div>
      )}

      {editable && (
        <div className="flex items-center justify-between pt-2">
          {preguntas.length > 0 ? (
            <Button type="button" variant="outline" onClick={agregarPregunta}>
              <Plus className="h-4 w-4 mr-2" />Agregar pregunta
            </Button>
          ) : <span />}
          {slotAcciones}
        </div>
      )}
    </div>
  )
}
