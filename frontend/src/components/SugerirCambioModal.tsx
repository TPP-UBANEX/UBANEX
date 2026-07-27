import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  onSuccess?: () => void
}

export function SugerirCambioModal({
  open,
  onOpenChange,
  campo,
  label,
  valorActual,
  edicionId,
  onSuccess,
}: SugerirCambioModalProps) {
  const [valorSugerido, setValorSugerido] = useState('')
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comentario.trim()) {
      setError('El comentario es obligatorio')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await api.sugerencias.crear(edicionId, {
        campo,
        valorSugerido,
        comentario: comentario.trim(),
      })
      toast.success('Sugerencia enviada correctamente')
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
      <DialogContent className="max-w-md">
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
            <Input value={valorActual} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Valor sugerido</p>
            <Input
              value={valorSugerido}
              onChange={e => setValorSugerido(e.target.value)}
              placeholder="Nuevo valor propuesto"
            />
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
    </Dialog>
  )
}
