import type { OrganizacionAsociada } from '@/data/types'
import type { PdfHelpers } from './pdf-helpers'

/**
 * Dibuja la sección "Información institucional de organizaciones sociales participantes"
 * con un recuadro por organización (formato del formulario oficial UBANEX). Se usa tanto en
 * el PDF del proyecto como en el del aval.
 */
export function renderOrganizacionesPdf(h: PdfHelpers, organizaciones: OrganizacionAsociada[]): void {
  if (organizaciones.length === 0) return
  const v = (s: string | null) => s || ''

  const bloqueTexto = (titulo: string, texto: string | null) => {
    if (!texto) return
    h.espacio(6)
    h.addPageIfNeeded(20)
    h.doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(60, 60, 60)
    h.doc.text(titulo, h.margin, h.getY())
    h.setY(h.getY() + 14)
    h.parrafo(texto, 8)
  }

  h.subtitulo('Información institucional de organizaciones sociales participantes')
  for (const org of organizaciones) {
    h.subtitulo(org.tipo ? `${org.nombre} — ${org.tipo}` : org.nombre)
    h.tabla(
      ['', ''],
      [
        [`Personería jurídica: ${v(org.personeriaJuridica)}`, `Inicio de actividades: ${v(org.fechaInicioActividades)}`],
        [`Responsable: ${v(org.responsableNombre)}`, `Cargo que desempeña: ${v(org.responsableCargo)}`],
        [`Calle y número: ${v(org.direccion)}`, ''],
        [`Localidad: ${v(org.localidad)}`, `Código Postal: ${v(org.codigoPostal)}`],
        [`Departamento/Partido: ${v(org.departamentoPartido)}`, `Provincia: ${v(org.provincia)}`],
        [`Teléfonos: ${v(org.telefonos)}`, ''],
        [`Correo electrónico: ${v(org.email)}`, `Página o sitio web: ${v(org.web)}`],
      ],
      { sinEncabezado: true },
    )
    bloqueTexto('Objetivos de la organización', org.objetivos)
    bloqueTexto('Principales actividades', org.actividades)
    bloqueTexto('Otra información importante', org.otraInfo)
  }
}
