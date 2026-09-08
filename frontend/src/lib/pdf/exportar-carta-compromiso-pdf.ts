import type { Edicion, Proyecto } from '@/data/types'
import { crearDocPdf, slugArchivo } from './pdf-helpers'

interface OpcionesExportarCarta {
  proyecto?: Proyecto
  edicion?: Edicion
  /** Nombre(s) de la(s) unidad(es) académica(s), como se muestran en el detalle del proyecto. */
  unidadAcademica?: string
  directores?: { nombre: string; esPrincipal: boolean }[]
  /** Si es true, se genera el modelo en blanco (FORMULARIO 15) para completar a mano. */
  enBlanco?: boolean
}

const puntos = (n: number) => '.'.repeat(n)

/**
 * Genera la carta de compromiso con las organizaciones de la sociedad civil en PDF
 * (modelo FORMULARIO 15 UBANEX, pág. 7) para imprimir y firmar físicamente. Con
 * `enBlanco: true` deja también el proyecto/universidad/director como líneas a completar.
 */
export function exportarCartaCompromisoPdf({
  proyecto,
  unidadAcademica,
  directores = [],
  enBlanco = false,
}: OpcionesExportarCarta = {}): void {
  const h = crearDocPdf()
  const { doc, margin, pageWidth, contentWidth } = h

  h.encabezadoSello({
    titulo: 'Modelo de carta de compromiso con las organizaciones de la sociedad civil',
  })

  const ua = (!enBlanco && unidadAcademica) || ''
  const universidadSeg = enBlanco
    ? `(Universidad) ${puntos(24)}`
    : `Universidad de Buenos Aires${ua ? ` — ${ua}` : ''}`
  const nombreProyecto = (!enBlanco && proyecto?.nombre) || ''
  const proyectoSeg = enBlanco ? `(Nombre del proyecto) ${puntos(24)}` : `«${nombreProyecto}»`

  const intro =
    `En la Ciudad de ${puntos(16)} (Localidad, provincia), a los ${puntos(8)} días del mes de ` +
    `${puntos(12)} de 20${puntos(4)}, la (Institución) ${puntos(26)} y la ${universidadSeg}, en el ` +
    `marco del Proyecto de Extensión UBANEX ${proyectoSeg}, se comprometen a trabajar asociadamente ` +
    'en su implementación.'
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
  const principal = directores.find(d => d.esPrincipal)
  const aclaracionDirector = enBlanco ? '' : (principal?.nombre ?? '')

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
  dibujarFirma(cxDer, 'Firma y Aclaración Director', aclaracionDirector)
  h.setY(yFila)
  h.espacio(70)
  dibujarFirma(pageWidth / 2, 'Firma del Responsable Institución')

  const slug = enBlanco ? 'en-blanco' : slugArchivo(proyecto?.nombre ?? '', 'proyecto')
  h.guardar(`carta-compromiso-${slug}.pdf`)
}
