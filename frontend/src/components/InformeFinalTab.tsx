import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { InformeFinal } from '@/data/types'
import {
  EstadoInforme,
  estadoInformeLabel,
  EstadoEdicion,
} from '@/data/types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function InformeFinalTab({
  edicionId,
  estado,
  puedeEditar,
}: {
  edicionId?: string
  estado?: EstadoEdicion
  puedeEditar: boolean
}) {
  const [informe, setInforme] = useState<InformeFinal | null>(null)
  const [contenido, setContenido] = useState('')
  const [archivoAdjuntoUrl, setArchivoAdjuntoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const cargar = useCallback(async () => {
    if (!edicionId) return
    setLoading(true)
    try {
      const inf = await api.ejecucion.informeFinal.obtener(edicionId)
      setInforme(inf)
      setContenido(inf?.contenido ?? '')
      setArchivoAdjuntoUrl(inf?.archivoAdjuntoUrl ?? '')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar el informe final')
    } finally {
      setLoading(false)
    }
  }, [edicionId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const enEjecucion =
    estado === EstadoEdicion.EnEjecucion || estado === EstadoEdicion.Cerrado
  const confirmado = informe?.estado === EstadoInforme.Confirmado
  const editable = enEjecucion && puedeEditar && !confirmado

  const guardar = async () => {
    if (!edicionId) return
    setGuardando(true)
    try {
      await api.ejecucion.informeFinal.guardar(edicionId, {
        contenido,
        archivoAdjuntoUrl: archivoAdjuntoUrl.trim() || undefined,
      })
      toast.success('Borrador de informe final guardado')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el informe')
    } finally {
      setGuardando(false)
    }
  }

  const confirmar = async () => {
    if (!edicionId) return
    setConfirmando(true)
    try {
      await api.ejecucion.informeFinal.guardar(edicionId, {
        contenido,
        archivoAdjuntoUrl: archivoAdjuntoUrl.trim() || undefined,
      })
      await api.ejecucion.informeFinal.confirmar(edicionId)
      toast.success('Informe final confirmado')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar el informe')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Informe final</CardTitle>
        {informe && (
          <Badge variant={confirmado ? 'default' : 'outline'}>
            {estadoInformeLabel[informe.estado]}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Contenido</label>
                <span className="text-xs text-muted-foreground">{contenido.length} caracteres</span>
              </div>
              <Textarea
                className="min-h-[220px]"
                disabled={!editable}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Redactá el informe final del proyecto..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Adjunto (URL del PDF, opcional)</label>
              <Input
                disabled={!editable}
                placeholder="https://..."
                value={archivoAdjuntoUrl}
                onChange={(e) => setArchivoAdjuntoUrl(e.target.value)}
              />
            </div>

            {editable && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={guardar} disabled={guardando}>
                  {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar borrador
                </Button>
                <Button onClick={confirmar} disabled={confirmando}>
                  {confirmando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar informe
                </Button>
              </div>
            )}
            {confirmado && (
              <p className="text-xs text-muted-foreground">
                El informe final fue confirmado y no puede modificarse.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}