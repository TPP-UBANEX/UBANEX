import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type {
  InformeFinal,
  Hito,
  AutoevaluacionImpacto,
  TemplateAutoevaluacionImpacto,
  Convocatoria,
  PreguntaAutoevaluacion,
} from '@/data/types'
import {
  EstadoInforme,
  estadoInformeLabel,
  EstadoEdicion,
  categoriaHitoLabel,
} from '@/data/types'
import { jsPDF } from 'jspdf'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function InformeFinalTab({
  edicionId,
  estado,
  puedeEditar,
  convocatoria,
  proyectoNombre,
  unidadAcademicaNombre,
}: {
  edicionId?: string
  estado?: EstadoEdicion
  puedeEditar: boolean
  convocatoria?: Convocatoria | null
  proyectoNombre?: string
  unidadAcademicaNombre?: string
}) {
  const [informe, setInforme] = useState<InformeFinal | null>(null)
  const [contenido, setContenido] = useState('')
  const [archivoAdjuntoUrl, setArchivoAdjuntoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [descargando, setDescargando] = useState(false)

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

  const descargarPdf = async () => {
    if (!edicionId || !informe) return
    setDescargando(true)
    try {
      let hitos: Hito[] = []
      try { hitos = await api.ejecucion.hitos.listar(edicionId) } catch { hitos = [] }
      let autoevaluacion: AutoevaluacionImpacto | null = null
      let template: TemplateAutoevaluacionImpacto | null = null
      try {
        const res = await api.ejecucion.autoevaluacion.obtener(edicionId)
        autoevaluacion = res.autoevaluacion
        template = res.template
      } catch { /* sin autoevaluación */ }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 48
      const contentWidth = pageWidth - margin * 2
      let y = margin

      const addPageIfNeeded = (heightNeeded: number) => {
        const maxY = doc.internal.pageSize.getHeight() - margin
        if (y + heightNeeded > maxY) {
          doc.addPage()
          y = margin
        }
      }

      const titulo = (texto: string, size = 16) => {
        addPageIfNeeded(28)
        doc.setFont('helvetica', 'bold').setFontSize(size).setTextColor(13, 13, 13)
        doc.text(texto, margin, y)
        y += size + 6
      }

      const subtitulo = (texto: string) => {
        addPageIfNeeded(20)
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(60, 60, 60)
        doc.text(texto.toUpperCase(), margin, y)
        y += 18
      }

      const parrafo = (texto: string) => {
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(30, 30, 30)
        const lineas = doc.splitTextToSize(texto, contentWidth) as string[]
        for (const linea of lineas) {
          addPageIfNeeded(14)
          doc.text(linea, margin, y)
          y += 14
        }
        y += 4
      }

      const lineaInfo = (label: string, valor: string) => {
        addPageIfNeeded(18)
        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(60, 60, 60)
        doc.text(label, margin, y)
        doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30)
        const anchoLabel = doc.getTextWidth(label + ' ')
        doc.text(valor, margin + anchoLabel, y)
        y += 18
      }

      const regla = () => {
        y += 6
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y, pageWidth - margin, y)
        y += 14
      }

      // ── Encabezado ──
      titulo('Informe Final de Proyecto', 18)
      lineaInfo('Convocatoria:', convocatoria?.nombre ?? 'Convocatoria UBANEX')
      if (convocatoria?.fechaInicioEjecucion || convocatoria?.fechaFinEjecucion) {
        lineaInfo('Período de ejecución:', `${convocatoria.fechaInicioEjecucion ?? '—'} a ${convocatoria.fechaFinEjecucion ?? '—'}`)
      }
      lineaInfo('Unidad Académica:', unidadAcademicaNombre ?? '—')
      lineaInfo('Proyecto:', proyectoNombre ?? '—')
      if (informe.actualizadoPorId || informe.estado) {
        lineaInfo('Estado:', estadoInformeLabel[informe.estado] ?? informe.estado)
      }
      regla()

      // ── Contenido del informe ──
      subtitulo('Contenido del informe')
      parrafo(informe.contenido || 'Sin contenido redactado.')

      // ── Resumen de hitos ──
      subtitulo('Hitos de ejecución')
      if (hitos.length === 0) {
        parrafo('No se registraron hitos de ejecución.')
      } else {
        hitos.forEach((h, i) => {
          addPageIfNeeded(60)
          doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(30, 30, 30)
          doc.text(`${i + 1}. ${h.titulo}`, margin, y)
          y += 15
          doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(60, 60, 60)
          const detalle = `Categoría: ${categoriaHitoLabel[h.categoria] ?? h.categoria}` +
            `\nPeríodo: ${h.fechaInicio ?? '—'} a ${h.fechaFin ?? '—'}` +
            `\nIntegrantes: ${h.integrantes ?? '—'}`
          const lineas = doc.splitTextToSize(detalle, contentWidth) as string[]
          for (const l of lineas) {
            addPageIfNeeded(13)
            doc.text(l, margin + 8, y)
            y += 13
          }
          y += 6
        })
      }

      // ── Autoevaluación ──
      subtitulo('Autoevaluación de impacto')
      if (!template?.estructura?.preguntas?.length) {
        parrafo('La convocatoria no tiene configurada la autoevaluación de impacto.')
      } else {
        const respuestas = (autoevaluacion?.respuestas ?? {}) as Record<string, unknown>
        template.estructura.preguntas.forEach((p) => {
          addPageIfNeeded(40)
          doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(30, 30, 30)
          const pLineas = doc.splitTextToSize(p.texto + (p.esObligatorio ? ' *' : ''), contentWidth) as string[]
          for (const l of pLineas) {
            addPageIfNeeded(13)
            doc.text(l, margin, y)
            y += 13
          }
          y += 2
          doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(70, 70, 70)
          const respLineas = doc.splitTextToSize(formatearValorRespuesta(p, respuestas[p.id]), contentWidth) as string[]
          for (const l of respLineas) {
            addPageIfNeeded(13)
            doc.text(l, margin + 8, y)
            y += 13
          }
          y += 6
        })
      }

      if (informe.archivoAdjuntoUrl) {
        subtitulo('Adjunto')
        parrafo(informe.archivoAdjuntoUrl)
      }

      if (informe.confirmadoEn || informe.estado === EstadoInforme.Confirmado) {
        regla()
        doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(110, 110, 110)
        doc.text(
          `Documento confirmado${informe.confirmadoEn ? ` el ${informe.confirmadoEn}` : ''}.`,
          margin,
          y,
        )
      }

      const slug = (proyectoNombre ?? 'proyecto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      doc.save(`informe-final-${slug}.pdf`)
      toast.success('PDF descargado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el PDF')
    } finally {
      setDescargando(false)
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={descargarPdf} disabled={descargando}>
                {descargando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Descargar PDF
              </Button>
              {editable && (
                <>
                  <Button variant="outline" onClick={guardar} disabled={guardando}>
                    {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar borrador
                  </Button>
                  <Button onClick={confirmar} disabled={confirmando}>
                    {confirmando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmar informe
                  </Button>
                </>
              )}
            </div>
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

function formatearValorRespuesta(
  pregunta: PreguntaAutoevaluacion,
  valor: unknown,
): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  switch (pregunta.tipo) {
    case 'booleano':
      return valor === true ? 'Sí' : 'No'
    case 'checkbox':
      return Array.isArray(valor) && valor.length > 0
        ? (valor as string[]).join(', ')
        : '—'
    default:
      return String(valor)
  }
}