import { jsPDF } from 'jspdf'
import type { AdjudicacionResumen } from '@/data/types'
import { formatearMoneda } from '@/lib/presupuesto'

interface OpcionesExportar {
  resumen: AdjudicacionResumen
  /** Nombre de la convocatoria, tal como se muestra en la pantalla. */
  convocatoriaNombre: string
}

/**
 * Descarga la resolución de adjudicación como PDF: documento formal con el resultado de todos
 * los proyectos de la convocatoria (orden de mérito, adjudicado/no y monto). Se arma en el
 * cliente con jsPDF, mismo enfoque que exportarProyectoPdf.
 */
export function exportarResolucionPdf({ resumen, convocatoriaNombre }: OpcionesExportar): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 48
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

  const anchoColumnaLabel = 120

  const lineaInfo = (label: string, valor: string) => {
    addPageIfNeeded(16)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(60, 60, 60)
    doc.text(label, margin, y)
    const xValor = margin + Math.max(anchoColumnaLabel, doc.getTextWidth(label) + 8)
    doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30)
    const lineas = doc.splitTextToSize(String(valor || '-'), pageWidth - margin - xValor) as string[]
    doc.text(lineas[0] ?? '-', xValor, y)
    y += 15
    for (const linea of lineas.slice(1)) {
      addPageIfNeeded(14)
      doc.text(linea, xValor, y)
      y += 14
    }
  }

  const regla = () => {
    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 14
  }

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return '-'
    const d = new Date(fecha)
    return Number.isNaN(d.getTime()) ? fecha : d.toLocaleDateString('es-AR')
  }

  // Una edición quedó adjudicada si tiene monto adjudicado (o la propuesta confirmada). No se
  // usa el estado porque, al avanzar la convocatoria, las adjudicadas pasan a EnEjecucion/Cerrado.
  const fueAdjudicada = (item: AdjudicacionResumen['items'][number]) =>
    item.montoAdjudicado != null || item.adjudicacionPropuesta === true

  const resultado = (item: AdjudicacionResumen['items'][number]) =>
    fueAdjudicada(item) ? 'Adjudicado' : 'No adjudicado'

  // ── Encabezado ──
  titulo('Resolución de adjudicación', 18)
  lineaInfo('Convocatoria:', convocatoriaNombre || '-')
  lineaInfo('Fecha de resolución:', formatearFecha(resumen.convocatoria.fechaResolucion))
  if (resumen.convocatoria.resolucionUrl) {
    lineaInfo('Resolución:', resumen.convocatoria.resolucionUrl)
  }
  regla()

  // ── Tabla de proyectos ──
  const cols = [
    { label: 'N°', x: margin, w: 32, align: 'left' as const },
    { label: 'Proyecto', x: margin + 32, w: 210, align: 'left' as const },
    { label: 'Unidad Académica', x: margin + 242, w: 150, align: 'left' as const },
    { label: 'Resultado', x: margin + 392, w: 70, align: 'left' as const },
  ]
  const xMonto = pageWidth - margin

  const encabezadoTabla = () => {
    addPageIfNeeded(22)
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(60, 60, 60)
    for (const c of cols) doc.text(c.label, c.x, y)
    doc.text('Monto', xMonto, y, { align: 'right' })
    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 12
  }

  encabezadoTabla()

  if (resumen.items.length === 0) {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(30, 30, 30)
    doc.text('La convocatoria no tiene proyectos.', margin, y)
    y += 14
  } else {
    doc.setFontSize(9)
    for (const item of resumen.items) {
      const nombreLineas = doc.splitTextToSize(item.proyectoNombre ?? 'Sin nombre', cols[1].w - 4) as string[]
      const uaLineas = doc.splitTextToSize(item.unidadAcademica?.nombre ?? '-', cols[2].w - 4) as string[]
      const filas = Math.max(nombreLineas.length, uaLineas.length, 1)
      addPageIfNeeded(filas * 12 + 6)
      const yFila = y
      doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30)
      doc.text(item.ordenMerito != null ? String(item.ordenMerito) : '-', cols[0].x, yFila)
      nombreLineas.forEach((l, i) => doc.text(l, cols[1].x, yFila + i * 12))
      uaLineas.forEach((l, i) => doc.text(l, cols[2].x, yFila + i * 12))
      doc.text(resultado(item), cols[3].x, yFila)
      const monto = item.montoAdjudicado != null
        ? formatearMoneda(item.montoAdjudicado)
        : '-'
      doc.text(monto, xMonto, yFila, { align: 'right' })
      y = yFila + filas * 12 + 4
    }
  }

  const slug = (convocatoriaNombre || 'convocatoria')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  doc.save(`resolucion-adjudicacion-${slug || 'convocatoria'}.pdf`)
}
