import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type {
  AutoevaluacionImpacto,
  TemplateAutoevaluacionImpacto,
  PreguntaAutoevaluacion,
} from '@/data/types'
import {
  EstadoAutoevaluacion,
  estadoAutoevaluacionLabel,
  EstadoEdicion,
} from '@/data/types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Respuestas = Record<string, unknown>

export function AutoevaluacionTab({
  edicionId,
  estado,
  puedeEditar,
}: {
  edicionId?: string
  estado?: EstadoEdicion
  puedeEditar: boolean
}) {
  const [autoevaluacion, setAutoevaluacion] = useState<AutoevaluacionImpacto | null>(null)
  const [template, setTemplate] = useState<TemplateAutoevaluacionImpacto | null>(null)
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [completando, setCompletando] = useState(false)

  const cargar = useCallback(async () => {
    if (!edicionId) return
    setLoading(true)
    try {
      const { autoevaluacion: ev, template: tpl } = await api.ejecucion.autoevaluacion.obtener(
        edicionId,
      )
      setAutoevaluacion(ev)
      setTemplate(tpl)
      const iniciales: Respuestas = {}
      for (const p of tpl?.estructura?.preguntas ?? []) {
        if (p.tipo === 'checkbox') iniciales[p.id] = []
        else iniciales[p.id] = null
      }
      const previas = (ev?.respuestas ?? {}) as Respuestas
      for (const [id, valor] of Object.entries(previas)) {
        if (id in iniciales) iniciales[id] = valor
      }
      setRespuestas(iniciales)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar la autoevaluación')
    } finally {
      setLoading(false)
    }
  }, [edicionId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const enEjecucion =
    estado === EstadoEdicion.EnEjecucion || estado === EstadoEdicion.Cerrado
  const completada = autoevaluacion?.estado === EstadoAutoevaluacion.Completada
  const editable = enEjecucion && puedeEditar && !completada

  const setRespuesta = (id: string, valor: unknown) =>
    setRespuestas((prev) => ({ ...prev, [id]: valor }))

  const togglearCheckbox = (id: string, opcion: string) => {
    const actual = (respuestas[id] as string[]) ?? []
    setRespuestas((prev) => ({
      ...prev,
      [id]: actual.includes(opcion)
        ? actual.filter((o) => o !== opcion)
        : [...actual, opcion],
    }))
  }

  const guardar = async () => {
    if (!edicionId) return
    setGuardando(true)
    try {
      await api.ejecucion.autoevaluacion.guardar(edicionId, { respuestas })
      toast.success('Borrador de autoevaluación guardado')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la autoevaluación')
    } finally {
      setGuardando(false)
    }
  }

  const completar = async () => {
    if (!edicionId) return
    setCompletando(true)
    try {
      await api.ejecucion.autoevaluacion.guardar(edicionId, { respuestas })
      await api.ejecucion.autoevaluacion.completar(edicionId)
      toast.success('Autoevaluación completada')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al completar la autoevaluación')
    } finally {
      setCompletando(false)
    }
  }

  const preguntas = template?.estructura?.preguntas ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Autoevaluación de impacto</CardTitle>
        {autoevaluacion && (
          <Badge variant={completada ? 'default' : 'outline'}>
            {estadoAutoevaluacionLabel[autoevaluacion.estado]}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : preguntas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            La convocatoria no tiene configurada la autoevaluación de impacto.
          </p>
        ) : (
          <>
            <div className="space-y-5">
              {preguntas.map((p) => (
                <PreguntaRenderer
                  key={p.id}
                  pregunta={p}
                  valor={respuestas[p.id]}
                  disabled={!editable}
                  onChange={(valor) => setRespuesta(p.id, valor)}
                  onToggle={(opcion) => togglearCheckbox(p.id, opcion)}
                />
              ))}
            </div>

            {editable && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={guardar} disabled={guardando}>
                  {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar borrador
                </Button>
                <Button onClick={completar} disabled={completando}>
                  {completando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Completar autoevaluación
                </Button>
              </div>
            )}
            {completada && (
              <p className="text-xs text-muted-foreground">
                La autoevaluación fue completada y no puede modificarse.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PreguntaRenderer({
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
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm flex-1">
          {pregunta.texto}
          {pregunta.esObligatorio && <span className="text-destructive"> *</span>}
        </p>
        {renderInput(pregunta, valor, disabled, onChange, onToggle)}
      </div>
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
            className="w-24"
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
        <div className="w-56">
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
        <div className="flex flex-col items-end gap-1.5">
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