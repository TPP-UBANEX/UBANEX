import { jsPDF } from 'jspdf'
import type { CampoFormulario, Edicion, Proyecto } from '@/data/types'
import { TipoRubro, estadoEdicionLabel } from '@/data/types'
import { formatearValorCampoFormulario } from '@/components/CampoFormularioInput'
import { agruparCamposEnSecciones } from '@/lib/secciones-formulario'
import { formatearMoneda, LABELS_RUBRO } from '@/lib/presupuesto'

interface OpcionesExportar {
  proyecto: Proyecto
  edicion: Edicion
  campos: CampoFormulario[]
  /** Nombre(s) de la(s) unidad(es) académica(s), tal como se muestran en el detalle del proyecto. */
  unidadAcademica: string
  directores?: { nombre: string; esPrincipal: boolean }[]
}

/**
 * Descarga el proyecto (una edición) como PDF: detalle + formulario de presentación + presupuesto
 * solicitado. Se arma en el cliente con jsPDF, mismo enfoque que InformeFinalTab#descargarPdf.
 */
export function exportarProyectoPdf({
  proyecto,
  edicion,
  campos,
  unidadAcademica,
  directores = [],
}: OpcionesExportar): void {
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
    // Se mide con la fuente en negrita (la que se usó para dibujar la etiqueta), y se deja al
    // menos un espacio: así el valor nunca queda pegado a una etiqueta larga.
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

  // ── Encabezado ──
  titulo('Proyecto de extensión', 18)
  lineaInfo('Nombre:', proyecto.nombre || '-')
  lineaInfo('Convocatoria:', edicion.convocatoria?.nombre ?? '-')
  lineaInfo('Unidad Académica:', unidadAcademica || '-')
  lineaInfo('Edición:', String(edicion.anioEdicion ?? '-'))
  lineaInfo('Estado:', estadoEdicionLabel[edicion.estado] ?? edicion.estado)
  lineaInfo('Creado por:', edicion.creadoPor?.nombreCompleto ?? '-')
  lineaInfo('Interfacultad:', proyecto.esInterfacultad ? 'Sí' : 'No')
  const principal = directores.find(d => d.esPrincipal)
  const codirector = directores.find(d => !d.esPrincipal)
  lineaInfo('Dirección:', principal?.nombre ?? '-')
  lineaInfo('Codirección:', codirector?.nombre ?? '-')
  regla()

  // ── Formulario de presentación ──
  subtitulo('Formulario de presentación')
  const datos = edicion.datosFormulario ?? {}
  const secciones = agruparCamposEnSecciones(campos).filter(s => s.campos.length > 0)
  if (secciones.length === 0) {
    parrafo('La convocatoria no tiene formulario de presentación configurado.')
  } else {
    for (const seccion of secciones) {
      if (seccion.id !== 'resumen') {
        addPageIfNeeded(22)
        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(45, 45, 45)
        doc.text(seccion.nombre, margin, y)
        y += 16
      }
      for (const campo of seccion.campos) {
        const etiqueta = campo.nombre + (campo.esObligatorio ? ' *' : '')
        const valor = formatearValorCampoFormulario(campo, datos[campo.id])
        addPageIfNeeded(16)
        doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(60, 60, 60)
        doc.text(etiqueta, margin, y)
        y += 13
        parrafo(valor, 8)
      }
    }
  }

  // ── Presupuesto solicitado ──
  const presupuesto = edicion.presupuestoSolicitado
  subtitulo('Presupuesto solicitado')
  if (!presupuesto || !presupuesto.rubros?.some(r => r.partidas.length > 0)) {
    parrafo('El proyecto no tiene presupuesto cargado.')
  } else {
    for (const rubro of presupuesto.rubros) {
      addPageIfNeeded(22)
      doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(45, 45, 45)
      doc.text(`${LABELS_RUBRO[rubro.tipo]} — subtotal ${formatearMoneda(rubro.subtotal)}`, margin, y)
      y += 15
      if (rubro.partidas.length === 0) {
        parrafo('Sin partidas.', 8)
        continue
      }
      rubro.partidas.forEach((partida, indice) => {
        const detalle = rubro.tipo === TipoRubro.ViaticosYSeguros
          ? [
              `${indice + 1}. ${partida.descripcion || 'Sin descripción'}`,
              `Tipo de persona: ${(partida as { tipoPersona?: string }).tipoPersona ?? '-'}`,
              `Período: ${(partida as { periodo?: string }).periodo || '-'}`,
              `Monto: ${formatearMoneda(partida.monto)}`,
            ].join('\n')
          : [
              `${indice + 1}. ${partida.descripcion || 'Sin descripción'}`,
              `Cantidad: ${(partida as { cantidad?: number }).cantidad ?? '-'}`,
              `Precio unitario: ${formatearMoneda((partida as { precioUnitario?: number }).precioUnitario ?? 0)}`,
              `Monto: ${formatearMoneda(partida.monto)}`,
              `Insumo: ${(partida as { esInsumo?: boolean }).esInsumo ? 'Sí' : 'No'}`,
            ].join('\n')
        parrafo(detalle, 8)
      })
    }
    addPageIfNeeded(18)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(30, 30, 30)
    doc.text(`Total solicitado: ${formatearMoneda(presupuesto.montoTotal)}`, margin, y)
    y += 16
  }

  const slug = (proyecto.nombre || 'proyecto')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  doc.save(`proyecto-${slug || 'proyecto'}.pdf`)
}
