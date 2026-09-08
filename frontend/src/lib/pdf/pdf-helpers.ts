import { jsPDF } from 'jspdf'
import { SELLO_UBA_PNG, SELLO_UBA_ASPECTO } from './sello-uba'

/**
 * Helpers reutilizables para armar PDF en el cliente con jsPDF, extraídos del enfoque de
 * `exportar-proyecto-pdf.ts` (A4, unit 'pt', margin 48, sólo fuente helvetica). Se agregan
 * primitivas propias de los documentos a firmar (aval / carta compromiso): encabezado con el
 * sello de la UBA, tablas de firma y líneas punteadas para completar a mano.
 *
 * Todos los helpers mutan un cursor vertical `y` compartido; se accede/ajusta con getY/setY.
 */

export interface OpcionesTabla {
  /** Anchos relativos de cada columna (se normalizan). Default: columnas iguales. */
  anchosRelativos?: number[]
  /** Alto de cada fila de datos en pt (las filas del aval van altas para poder firmar). */
  altoFila?: number
  /** Alineación del texto de cada columna. Default: 'left'. */
  alineaciones?: ('left' | 'center')[]
}

export interface PdfHelpers {
  doc: jsPDF
  pageWidth: number
  pageHeight: number
  margin: number
  contentWidth: number
  getY: () => number
  setY: (valor: number) => void
  espacio: (alto: number) => void
  addPageIfNeeded: (altoNecesario: number) => void
  titulo: (texto: string, size?: number) => void
  subtitulo: (texto: string) => void
  parrafo: (texto: string, sangria?: number) => void
  lineaInfo: (label: string, valor: string) => void
  lineaInfoRellenable: (label: string, valor: string) => void
  regla: () => void
  encabezadoSello: (opciones?: { titulo?: string; subtitulo?: string }) => void
  tabla: (headers: string[], filas: string[][], opciones?: OpcionesTabla) => void
  lineaPunteada: (opciones?: { sangria?: number; alto?: number }) => void
  guardar: (nombreArchivo: string) => void
}

export function crearDocPdf(): PdfHelpers {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addPageIfNeeded = (altoNecesario: number) => {
    const maxY = pageHeight - margin
    if (y + altoNecesario > maxY) {
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
    addPageIfNeeded(24)
    y += 6
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(60, 60, 60)
    doc.text(texto.toUpperCase(), margin, y)
    y += 18
  }

  const parrafo = (texto: string, sangria = 0) => {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(30, 30, 30)
    for (const bloque of texto.split('\n')) {
      const lineas = doc.splitTextToSize(bloque || ' ', contentWidth - sangria) as string[]
      for (const linea of lineas) {
        addPageIfNeeded(14)
        doc.text(linea, margin + sangria, y)
        y += 14
      }
    }
    y += 4
  }

  // Ancho fijo de la columna de etiquetas para que todos los valores queden alineados.
  const anchoColumnaLabel = 108

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

  /** Como lineaInfo, pero si el valor está vacío dibuja una línea de puntos para completar a mano. */
  const lineaInfoRellenable = (label: string, valor: string) => {
    addPageIfNeeded(16)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(60, 60, 60)
    doc.text(label, margin, y)
    const xValor = margin + Math.max(anchoColumnaLabel, doc.getTextWidth(label) + 8)
    if (valor) {
      doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30)
      const lineas = doc.splitTextToSize(valor, pageWidth - margin - xValor) as string[]
      doc.text(lineas[0] ?? '', xValor, y)
      y += 15
      for (const linea of lineas.slice(1)) {
        addPageIfNeeded(14)
        doc.text(linea, xValor, y)
        y += 14
      }
    } else {
      doc.setDrawColor(120, 120, 120).setLineWidth(0.5).setLineDashPattern([1, 2], 0)
      doc.line(xValor, y, pageWidth - margin, y)
      doc.setLineDashPattern([], 0).setLineWidth(1)
      y += 15
    }
  }

  const regla = () => {
    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 14
  }

  /** Dibuja el sello/encabezado de la UBA centrado y, opcionalmente, un título y subtítulo. */
  const encabezadoSello = (opciones?: { titulo?: string; subtitulo?: string }) => {
    const anchoSello = 150
    const altoSello = anchoSello / SELLO_UBA_ASPECTO
    const x = (pageWidth - anchoSello) / 2
    doc.addImage(SELLO_UBA_PNG, 'PNG', x, y, anchoSello, altoSello)
    y += altoSello + 28
    if (opciones?.titulo) {
      doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(13, 13, 13)
      for (const linea of doc.splitTextToSize(opciones.titulo, contentWidth) as string[]) {
        doc.text(linea, pageWidth / 2, y, { align: 'center' })
        y += 17
      }
    }
    if (opciones?.subtitulo) {
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(60, 60, 60)
      for (const linea of doc.splitTextToSize(opciones.subtitulo, contentWidth) as string[]) {
        doc.text(linea, pageWidth / 2, y, { align: 'center' })
        y += 14
      }
    }
    y += 8
  }

  /** Grilla simple con encabezados y filas; alto de fila configurable para dejar lugar a firmas. */
  const tabla = (headers: string[], filas: string[][], opciones: OpcionesTabla = {}) => {
    const cols = headers.length
    const relativos = opciones.anchosRelativos ?? Array(cols).fill(1)
    const sumaRel = relativos.reduce((a, b) => a + b, 0)
    const anchos = relativos.map(r => (r / sumaRel) * contentWidth)
    const xs: number[] = [margin]
    for (let i = 1; i < cols; i++) xs.push(xs[i - 1] + anchos[i - 1])
    const alineaciones = opciones.alineaciones ?? Array(cols).fill('left')
    const altoHeader = 22
    const altoFila = opciones.altoFila ?? 22
    const padX = 6

    const dibujarFila = (celdas: string[], alto: number, esHeader: boolean) => {
      addPageIfNeeded(alto)
      const yTop = y
      doc.setDrawColor(120, 120, 120).setLineWidth(0.6)
      doc.rect(margin, yTop, contentWidth, alto)
      for (let i = 1; i < cols; i++) doc.line(xs[i], yTop, xs[i], yTop + alto)
      doc.setFont('helvetica', esHeader ? 'bold' : 'normal').setFontSize(10)
      doc.setTextColor(esHeader ? 40 : 30, esHeader ? 40 : 30, esHeader ? 40 : 30)
      celdas.forEach((celda, i) => {
        if (!celda) return
        const alineado = alineaciones[i] === 'center'
        const anchoTexto = anchos[i] - padX * 2
        const lineas = doc.splitTextToSize(celda, anchoTexto) as string[]
        const xTexto = alineado ? xs[i] + anchos[i] / 2 : xs[i] + padX
        lineas.forEach((linea, j) => {
          doc.text(linea, xTexto, yTop + 15 + j * 12, alineado ? { align: 'center' } : undefined)
        })
      })
      y += alto
    }

    dibujarFila(headers, altoHeader, true)
    for (const fila of filas) dibujarFila(fila, altoFila, false)
    doc.setLineWidth(1)
    y += 6
  }

  /** Línea punteada de ancho completo para completar a mano. */
  const lineaPunteada = (opciones?: { sangria?: number; alto?: number }) => {
    const sangria = opciones?.sangria ?? 0
    const alto = opciones?.alto ?? 16
    addPageIfNeeded(alto)
    y += alto - 4
    doc.setDrawColor(120, 120, 120).setLineWidth(0.5).setLineDashPattern([1, 2], 0)
    doc.line(margin + sangria, y, pageWidth - margin, y)
    doc.setLineDashPattern([], 0).setLineWidth(1)
    y += 4
  }

  return {
    doc,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    getY: () => y,
    setY: (valor: number) => { y = valor },
    espacio: (alto: number) => { y += alto },
    addPageIfNeeded,
    titulo,
    subtitulo,
    parrafo,
    lineaInfo,
    lineaInfoRellenable,
    regla,
    encabezadoSello,
    tabla,
    lineaPunteada,
    guardar: (nombreArchivo: string) => doc.save(nombreArchivo),
  }
}

/** Slug para nombres de archivo, igual criterio que exportar-proyecto-pdf.ts. */
export function slugArchivo(base: string, fallback: string): string {
  const slug = (base || fallback)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || fallback
}
