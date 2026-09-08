import type { CampoFormulario, ColumnaTabla, Edicion, Proyecto } from '@/data/types'
import { TipoCampo, TipoRubro, estadoEdicionLabel } from '@/data/types'
import { formatearValorCampoFormulario } from '@/components/CampoFormularioInput'
import { agruparCamposEnSecciones } from '@/lib/secciones-formulario'
import { formatearMoneda, LABELS_RUBRO } from '@/lib/presupuesto'
import { crearDocPdf, slugArchivo } from '@/lib/pdf/pdf-helpers'

/** Datos de un director/co-director para la tabla "Datos del Director" del formulario oficial. */
export interface DirectorProyectoPdf {
  nombreCompleto: string
  esPrincipal: boolean
  unidadAcademica?: string
  cargo?: string
  designacion?: string
  area?: string
  telefono?: string
  email?: string
}

interface OpcionesExportar {
  proyecto: Proyecto
  edicion: Edicion
  campos: CampoFormulario[]
  /** Nombre(s) de la(s) unidad(es) académica(s), tal como se muestran en el detalle del proyecto. */
  unidadAcademica: string
  directores?: DirectorProyectoPdf[]
}

/**
 * Descarga el proyecto (una edición) como PDF con el aspecto del formulario oficial de
 * presentación UBANEX: encabezado con sello, datos generales y de dirección, el formulario
 * dinámico (campos cortos en recuadros, texto largo y tablas fluidos) y el presupuesto.
 * Se arma en el cliente con jsPDF (ver `@/lib/pdf/pdf-helpers`).
 */
export function exportarProyectoPdf({
  proyecto,
  edicion,
  campos,
  unidadAcademica,
  directores = [],
}: OpcionesExportar): void {
  const h = crearDocPdf()

  // ── Encabezado ──
  const convocatoria = edicion.convocatoria?.nombre
  h.encabezadoSello({
    titulo: convocatoria ? `${convocatoria} — «${proyecto.nombre}»` : proyecto.nombre,
    subtitulo: 'Formulario para la presentación de proyectos',
  })

  // ── Datos generales ──
  h.subtitulo('Información general')
  h.campoRecuadro('Nombre del Proyecto', proyecto.nombre || '-')
  h.campoRecuadro('Convocatoria', convocatoria ?? '-')
  h.campoRecuadro('Unidad Académica', unidadAcademica || '-')
  h.campoRecuadro('Edición', String(edicion.anioEdicion ?? '-'))
  h.campoRecuadro('Estado', estadoEdicionLabel[edicion.estado] ?? edicion.estado)
  h.campoRecuadro('Interfacultad', proyecto.esInterfacultad ? 'Sí' : 'No')

  // ── Datos del Director / Co-director ──
  const ordenados = [...directores].sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal))
  if (ordenados.length > 0) {
    h.subtitulo('Datos del Director y Co-director')
    for (const d of ordenados) {
      h.subtitulo(d.esPrincipal ? 'Director' : 'Co-director')
      const uaYCargo = [d.unidadAcademica, d.cargo, d.designacion].filter(Boolean).join(' — ')
      h.tabla(
        ['Campo', 'Valor'],
        [
          ['Apellido y Nombres', d.nombreCompleto || '-'],
          ['CUIT/CUIL', ''],
          ['Unidad Académica y Cargo', uaYCargo || '-'],
          ['Área', d.area || '-'],
          ['Teléfono', d.telefono || '-'],
          ['Correo electrónico', d.email || '-'],
        ],
        { anchosRelativos: [1, 2] },
      )
    }
  }

  // ── Formulario de presentación ──
  h.subtitulo('Formulario de presentación')
  const datos = edicion.datosFormulario ?? {}
  const secciones = agruparCamposEnSecciones(campos).filter(s => s.campos.length > 0)
  if (secciones.length === 0) {
    h.parrafo('La convocatoria no tiene formulario de presentación configurado.')
  } else {
    for (const seccion of secciones) {
      if (seccion.id !== 'resumen') {
        h.espacio(8)
        h.doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(45, 45, 45)
        h.addPageIfNeeded(20)
        h.doc.text(seccion.nombre, h.margin, h.getY())
        h.setY(h.getY() + 16)
      }
      for (const campo of seccion.campos) {
        const etiqueta = campo.nombre + (campo.esObligatorio ? ' *' : '')
        if (campo.tipo === TipoCampo.TextoLargo) {
          h.espacio(6)
          h.addPageIfNeeded(20)
          h.doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(60, 60, 60)
          h.doc.text(etiqueta, h.margin, h.getY())
          h.setY(h.getY() + 14)
          h.parrafo(formatearValorCampoFormulario(campo, datos[campo.id]), 8)
        } else if (campo.tipo === TipoCampo.Tabla) {
          h.espacio(6)
          h.addPageIfNeeded(20)
          h.doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(60, 60, 60)
          h.doc.text(etiqueta, h.margin, h.getY())
          h.setY(h.getY() + 16)
          renderarCampoTabla(h, campo, datos[campo.id])
        } else {
          h.campoRecuadro(etiqueta, formatearValorCampoFormulario(campo, datos[campo.id]))
        }
      }
    }
  }

  // ── Presupuesto solicitado ──
  const presupuesto = edicion.presupuestoSolicitado
  h.subtitulo('Presupuesto solicitado')
  if (!presupuesto || !presupuesto.rubros?.some(r => r.partidas.length > 0)) {
    h.parrafo('El proyecto no tiene presupuesto cargado.')
  } else {
    for (const rubro of presupuesto.rubros) {
      h.espacio(8)
      h.addPageIfNeeded(20)
      h.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(45, 45, 45)
      h.doc.text(`${LABELS_RUBRO[rubro.tipo]} — subtotal ${formatearMoneda(rubro.subtotal)}`, h.margin, h.getY())
      h.setY(h.getY() + 16)
      if (rubro.partidas.length === 0) {
        h.parrafo('Sin partidas.', 8)
        continue
      }
      if (rubro.tipo === TipoRubro.ViaticosYSeguros) {
        h.tabla(
          ['Tipo de persona', 'Descripción', 'Período', 'Monto'],
          rubro.partidas.map(p => {
            const v = p as { tipoPersona?: string; descripcion?: string; periodo?: string; monto?: number }
            return [v.tipoPersona ?? '-', v.descripcion || '-', v.periodo || '-', formatearMoneda(v.monto ?? 0)]
          }),
          { anchosRelativos: [1.2, 2.4, 1.4, 1], alineaciones: ['left', 'left', 'left', 'center'] },
        )
      } else {
        h.tabla(
          ['Descripción', 'Cantidad', 'P. unitario', 'Monto', 'Insumo'],
          rubro.partidas.map(p => {
            const v = p as { descripcion?: string; cantidad?: number; precioUnitario?: number; monto?: number; esInsumo?: boolean }
            return [
              v.descripcion || '-',
              String(v.cantidad ?? '-'),
              formatearMoneda(v.precioUnitario ?? 0),
              formatearMoneda(v.monto ?? 0),
              v.esInsumo ? 'Sí' : 'No',
            ]
          }),
          { anchosRelativos: [2.6, 0.9, 1.1, 1.1, 0.8], alineaciones: ['left', 'center', 'center', 'center', 'center'] },
        )
      }
    }
    h.addPageIfNeeded(18)
    h.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(30, 30, 30)
    h.doc.text(`Total solicitado: ${formatearMoneda(presupuesto.montoTotal)}`, h.margin, h.getY())
    h.setY(h.getY() + 16)
  }

  h.guardar(`proyecto-${slugArchivo(proyecto.nombre ?? '', 'proyecto')}.pdf`)
}

/** Renderiza un campo de tipo tabla como una tabla real, usando sus columnas y filas. */
function renderarCampoTabla(
  h: ReturnType<typeof crearDocPdf>,
  campo: CampoFormulario,
  valor: unknown,
): void {
  const columnas = (campo.columnas ?? []) as ColumnaTabla[]
  const filas = Array.isArray(valor) ? (valor as Record<string, unknown>[]) : []
  if (columnas.length === 0 || filas.length === 0) {
    h.parrafo('-', 8)
    return
  }
  h.tabla(
    columnas.map(c => c.nombre),
    filas.map(fila => columnas.map(c => formatearValorCampoFormulario(c, fila[c.id]))),
  )
}
