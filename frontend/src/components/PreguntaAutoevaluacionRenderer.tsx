import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PreguntaAutoevaluacion } from '@/data/types'

/**
 * Renderiza una pregunta de autoevaluación de impacto con su input según tipo.
 * Compartido entre `AutoevaluacionTab` (llenado real) y `VistaPreviaAutoevaluacion` (vista previa vacía).
 */
export function PreguntaAutoevaluacionRenderer({
  pregunta,
  valor,
  disabled,
  onChange,
  onToggle,
}: {
  pregunta: PreguntaAutoevaluacion
  valor: unknown
  disabled: boolean
  onChange: (valor: unknown) => void
  onToggle: (opcion: string) => void
}) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-medium">
        {pregunta.texto}
        {pregunta.esObligatorio && <span className="text-destructive"> *</span>}
      </p>
      {renderInput(pregunta, valor, disabled, onChange, onToggle)}
    </div>
  )
}

function renderInput(
  pregunta: PreguntaAutoevaluacion,
  valor: unknown,
  disabled: boolean,
  onChange: (valor: unknown) => void,
  onToggle: (opcion: string) => void,
) {
  switch (pregunta.tipo) {
    case 'texto':
      return (
        <Textarea
          className="min-h-[60px] text-sm w-full"
          disabled={disabled}
          value={valor === null || valor === undefined ? '' : String(valor)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribí tu respuesta..."
        />
      )
    case 'booleano':
      return (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={valor === true ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onChange(true)}
          >
            Sí
          </Button>
          <Button
            type="button"
            size="sm"
            variant={valor === false ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onChange(false)}
          >
            No
          </Button>
        </div>
      )
    case 'escalaNumerica': {
      const min = pregunta.escalaMin ?? 0
      const max = pregunta.escalaMax ?? 10
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-full max-w-[6rem]"
            disabled={disabled}
            value={valor === null || valor === undefined ? '' : String(valor)}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
            placeholder={`${min}-${max}`}
          />
          <span className="text-xs text-muted-foreground">{min}–{max}</span>
        </div>
      )
    }
    case 'select':
      return (
        <div className="w-full max-w-xs">
          <Select
            value={typeof valor === 'string' ? valor : ''}
            onValueChange={(v) => onChange(v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {(pregunta.opciones ?? []).map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case 'checkbox':
      return (
        <div className="flex flex-col items-start gap-1.5">
          {(pregunta.opciones ?? []).map((o) => {
            const marcado = (valor as string[])?.includes(o) ?? false
            return (
              <label key={o} className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-70' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={disabled}
                  onChange={() => onToggle(o)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {o}
              </label>
            )
          })}
        </div>
      )
    default:
      return null
  }
}
