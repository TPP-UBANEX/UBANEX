import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SugerirCambioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campo: string
  label: string
  valorActual: string
  edicionId: string
  valorSugeridoInicial?: string
  comentarioInicial?: string
  /** Para campos de texto largo: muestra los valores en textarea en vez de input de una línea. */
  multilinea?: boolean
  maxLongitud?: number
  onSuccess?: () => void
}

export function SugerirCambioModal({
  open,
  onOpenChange,
  campo,
  label,
  valorActual,
  edicionId,
  valorSugeridoInicial = '',
  comentarioInicial = '',
  multilinea = false,
  maxLongitud,
  onSuccess,
}: SugerirCambioModalProps) {
  const [valorSugerido, setValorSugerido] = useState(valorSugeridoInicial)
  const [comentario, setComentario] = useState(comentarioInicial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (open) {
      setValorSugerido(valorSugeridoInicial)
      setComentario(comentarioInicial)
      setError('')
      setConfirmar(false)
    }
  }, [open, valorSugeridoInicial, comentarioInicial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comentario.trim()) {
      setError('El comentario es obligatorio')
      return
    }
    setError('')
    setConfirmar(true)
  }

  const enviar = async () => {
    setSubmitting(true)
    try {
      await api.sugerencias.crear(edicionId, {
        campo,
        valorSugerido: valorSugerido.trim() || undefined,
        comentario: comentario.trim(),
      })
      toast.success('Sugerencia enviada correctamente')
      setConfirmar(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar sugerencia')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={multilinea ? 'max-w-2xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>Sugerir cambio</DialogTitle>
          <DialogDescription>
            Propone un nuevo valor para <strong>{label}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Valor actual</p>
            {multilinea
              ? <Textarea value={valorActual} disabled rows={6} className="bg-muted" />
              : <Input value={valorActual} disabled className="bg-muted" />}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Valor sugerido <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </p>
            {multilinea ? (
              <Textarea
                rows={8}
                value={valorSugerido}
                maxLength={maxLongitud}
                onChange={e => setValorSugerido(e.target.value)}
                placeholder="Nuevo valor propuesto"
              />
            ) : (
              <Input
                value={valorSugerido}
                maxLength={maxLongitud}
                onChange={e => setValorSugerido(e.target.value)}
                placeholder="Nuevo valor propuesto"
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Comentario <span className="text-destructive">*</span>
            </p>
            <Textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Explicá por qué sugerís este cambio..."
              rows={3}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Enviando...' : 'Enviar sugerencia'}
          </Button>
        </form>
      </DialogContent>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Enviar sugerencia?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés enviar la sugerencia para <strong>{label}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={enviar} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
