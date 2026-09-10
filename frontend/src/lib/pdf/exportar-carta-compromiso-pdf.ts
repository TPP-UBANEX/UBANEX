import type { OrganizacionAsociada, Proyecto } from '@/data/types'
import { crearDocPdf, slugArchivo, type PdfHelpers } from './pdf-helpers'

interface OpcionesExportarCarta {
  proyecto?: Proyecto
  /** Nombre(s) de la(s) unidad(es) académica(s), como se muestran en el detalle del proyecto. */
  unidadAcademica?: string
  directores?: { nombre: string; esPrincipal: boolean }[]
  organizaciones?: OrganizacionAsociada[]
  /** Si es true, se genera el modelo en blanco (FORMULARIO 15) para completar a mano. */
  enBlanco?: boolean
}

const puntos = (n: number) => '.'.repeat(n)

/**
 * Genera la carta de compromiso con las organizaciones de la sociedad civil en PDF
 * (modelo FORMULARIO 15 UBANEX, pág. 7). Si el proyecto tiene varias organizaciones asociadas,
 * genera **una carta por organización** en el mismo PDF (una página cada una), con la
 * institución precargada. Con `enBlanco: true` genera una sola carta modelo para completar a mano.
 */
export function exportarCartaCompromisoPdf({
  proyecto,
  unidadAcademica,
  directores = [],
  organizaciones = [],
  enBlanco = false,
}: OpcionesExportarCarta = {}): void {
  const h = crearDocPdf()
  const ua = (!enBlanco && unidadAcademica) || ''
  const universidadSeg = enBlanco
    ? `(Universidad) ${puntos(34)}`
    : `Universidad de Buenos Aires${ua ? ` — ${ua}` : ''}`
  const nombreProyecto = (!enBlanco && proyecto?.nombre) || ''
  const proyectoSeg = enBlanco ? `(Nombre del proyecto) ${puntos(34)}` : `«${nombreProyecto}»`
  const principal = directores.find(d => d.esPrincipal)
  const aclaracionDirector = enBlanco ? '' : (principal?.nombre ?? '')

  // Una carta por organización; si no hay (o es en blanco), una sola carta.
  const cartas: (OrganizacionAsociada | null)[] = enBlanco || organizaciones.length === 0
    ? [null]
    : organizaciones

  cartas.forEach((org, indice) => {
    if (indice > 0) {
      h.doc.addPage()
      h.setY(h.margin)
    }
    const institucionSeg = org ? org.nombre : `(Institución) ${puntos(36)}`
    const aclaracionInstitucion = org?.responsableNombre ?? ''
    dibujarCarta(h, { universidadSeg, proyectoSeg, institucionSeg, aclaracionDirector, aclaracionInstitucion })
  })

  const slug = enBlanco ? 'en-blanco' : slugArchivo(proyecto?.nombre ?? '', 'proyecto')
  h.guardar(`carta-compromiso-${slug}.pdf`)
}

function dibujarCarta(
  h: PdfHelpers,
  opts: {
    universidadSeg: string
    proyectoSeg: string
    institucionSeg: string
    aclaracionDirector: string
    aclaracionInstitucion: string
  },
): void {
  const { doc, margin, pageWidth, contentWidth } = h

  h.encabezadoSello({
    titulo: 'Modelo de carta de compromiso con las organizaciones de la sociedad civil',
  })

  const intro =
    `En la Ciudad de ${puntos(22)} (Localidad, provincia), a los ${puntos(8)} días del mes de ` +
    `${puntos(12)} de 20${puntos(4)}, la ${opts.institucionSeg} y la ${opts.universidadSeg}, ` +
    `en el marco del Proyecto de Extensión UBANEX ${opts.proyectoSeg}, se comprometen a trabajar ` +
    'asociadamente en su implementación.'
  h.parrafo(intro)
  h.espacio(2)

  h.parrafo(
    'Las partes participarán del proyecto a través de las siguientes acciones ' +
    '(detallar actividades del Equipo de Trabajo del proyecto):',
  )
  for (let i = 0; i < 3; i++) h.lineaPunteada()
  h.espacio(14)

  h.parrafo('Detallar actividades de la Institución:')
  for (let i = 0; i < 3; i++) h.lineaPunteada()
  h.espacio(14)

  h.parrafo('Con el objetivo de (detallar objetivos):')
  for (let i = 0; i < 2; i++) h.lineaPunteada()
  h.espacio(14)

  h.parrafo('Con la certeza que el trabajo asociado enriquece todo proyecto de desarrollo comunitario.')

  // ── Bloques de firma ──
  const anchoLinea = contentWidth * 0.4
  const dibujarFirma = (cx: number, label: string, aclaracion = '') => {
    const yLinea = h.getY()
    doc.setDrawColor(80, 80, 80).setLineWidth(0.6)
    doc.line(cx - anchoLinea / 2, yLinea, cx + anchoLinea / 2, yLinea)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(60, 60, 60)
    doc.text(label, cx, yLinea + 13, { align: 'center' })
    if (aclaracion) {
      doc.setFont('helvetica', 'bold').setTextColor(30, 30, 30)
      doc.text(aclaracion, cx, yLinea + 26, { align: 'center' })
    }
  }

  h.addPageIfNeeded(150)
  h.espacio(60)
  const cxIzq = margin + contentWidth * 0.25
  const cxDer = margin + contentWidth * 0.75
  const yFila = h.getY()
  dibujarFirma(cxIzq, 'Firma y Aclaración Autoridad Facultad')
  h.setY(yFila)
  dibujarFirma(cxDer, 'Firma y Aclaración Director', opts.aclaracionDirector)
  h.setY(yFila)
  h.espacio(70)
  dibujarFirma(pageWidth / 2, 'Firma del Responsable Institución', opts.aclaracionInstitucion)
}
