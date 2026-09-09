import type { Edicion, OrganizacionAsociada, Proyecto } from '@/data/types'
import { crearDocPdf, slugArchivo } from './pdf-helpers'
import { renderOrganizacionesPdf } from './organizaciones-pdf'

interface OpcionesExportarAval {
  proyecto?: Proyecto
  edicion?: Edicion
  /** Nombre(s) de la(s) unidad(es) académica(s), como se muestran en el detalle del proyecto. */
  unidadAcademica?: string
  directores?: { nombre: string; esPrincipal: boolean }[]
  organizaciones?: OrganizacionAsociada[]
  /** Si es true, se genera la planilla en blanco (modelo FORMULARIO 15) para completar a mano. */
  enBlanco?: boolean
}

// Texto de conformidad, literal del modelo oficial (FORMULARIO 15 UBANEX, pág. 5).
const TEXTO_CONFORMIDAD =
  'De ser acreditado el presente proyecto dejo constancia que esta Unidad Académica otorga ' +
  'su conformidad para su realización en el ámbito de la misma y que los datos de vinculación ' +
  'laboral del personal afectado al proyecto son correctos.'

/**
 * Genera el aval de la Unidad Académica en PDF (modelo FORMULARIO 15 UBANEX, pág. 5) para
 * imprimir y firmar físicamente. Con `enBlanco: true` deja los datos del proyecto vacíos.
 * El PDF firmado luego se sube por el mecanismo existente de `avalUrl` (no lo maneja esto).
 */
export function exportarAvalPdf({
  proyecto,
  edicion,
  unidadAcademica,
  directores = [],
  organizaciones = [],
  enBlanco = false,
}: OpcionesExportarAval = {}): void {
  const h = crearDocPdf()

  const convocatoria = enBlanco ? undefined : edicion?.convocatoria?.nombre
  h.encabezadoSello({
    titulo: convocatoria || 'UBANEX',
    subtitulo: 'Formulario para la presentación de proyectos',
  })

  h.subtitulo('a) Información general')
  const nombreProyecto = enBlanco ? '' : proyecto?.nombre
  const principal = directores.find(d => d.esPrincipal)
  const codirector = directores.find(d => !d.esPrincipal)
  const nombresDirectores = enBlanco
    ? ''
    : [principal?.nombre, codirector?.nombre].filter(Boolean).join(' — ')

  h.lineaInfoRellenable('1. Nombre del Proyecto:', nombreProyecto || '')
  h.lineaInfoRellenable('2. Nombre del Director y Co-director:', nombresDirectores || '')
  h.lineaInfoRellenable('3. Unidad Académica por la que participa:', (enBlanco ? '' : unidadAcademica) || '')
  h.espacio(10)

  h.parrafo(TEXTO_CONFORMIDAD)
  h.espacio(6)

  // Tabla de firmas: filas altas y vacías para firmar a mano.
  h.tabla(
    ['Cargo', 'Firma', 'Aclaración'],
    [
      ['Decano', '', ''],
      ['Secretario de Extensión Universitaria', '', ''],
      ['Docente responsable', '', ''],
    ],
    { anchosRelativos: [1.2, 1, 1], altoFila: 54 },
  )

  // Información institucional de las organizaciones participantes (no en la versión en blanco).
  if (!enBlanco) renderOrganizacionesPdf(h, organizaciones)

  const slug = enBlanco ? 'en-blanco' : slugArchivo(proyecto?.nombre ?? '', 'proyecto')
  h.guardar(`aval-${slug}.pdf`)
}
