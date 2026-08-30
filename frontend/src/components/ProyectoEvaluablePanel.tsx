import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CampoFormularioLectura } from '@/components/CampoFormularioLectura'
import { agruparCamposEnSecciones } from '@/lib/secciones-formulario'
import { TipoRubro, estadoBadge, estadoEdicionLabel } from '@/data/types'
import type { CampoFormulario, Edicion } from '@/data/types'
import { formatearMoneda } from '@/lib/presupuesto'

const tipoRubroLabels: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
}

export function ProyectoEvaluablePanel({
  edicion,
  campos,
}: {
  edicion: Edicion | null
  campos: CampoFormulario[]
}) {
  if (!edicion) return null

  const presupuesto = edicion.presupuestoSolicitado
  const secciones = agruparCamposEnSecciones(campos)

  return (
    <div className="space-y-4 min-w-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Detalle del proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Nombre:</span>{' '}
              {edicion.proyecto?.nombre || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">Unidad Académica:</span>{' '}
              {edicion.proyecto?.esInterfacultad &&
              edicion.proyecto.unidadAcademicaAdicionalId !== edicion.unidadAcademicaId &&
              edicion.proyecto.unidadAcademicaAdicional
                ? `${edicion.unidadAcademica?.nombre} y ${edicion.proyecto.unidadAcademicaAdicional.nombre}`
                : edicion.unidadAcademica?.nombre || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">Creado por:</span>{' '}
              {edicion.creadoPor?.nombreCompleto || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">Edición:</span> {edicion.anioEdicion ?? '-'}
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{' '}
              <Badge variant={estadoBadge[edicion.estado]}>
                {estadoEdicionLabel[edicion.estado] || edicion.estado}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Consolidado:</span>{' '}
              {edicion.proyecto?.esConsolidado === true
                ? 'Sí'
                : edicion.proyecto?.esConsolidado === false
                  ? 'No'
                  : 'Automático'}
            </div>
            <div>
              <span className="text-muted-foreground">Interfacultad:</span>{' '}
              {edicion.proyecto?.esInterfacultad ? 'Sí' : 'No'}
            </div>
            <div>
              <span className="text-muted-foreground">Presupuesto solicitado:</span>{' '}
              {presupuesto ? formatearMoneda(presupuesto.montoTotal) : '-'}
            </div>
          </div>

          {presupuesto && presupuesto.rubros.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Rubros presupuestarios</p>
              {presupuesto.rubros.map((rubro) => (
                <div key={rubro.tipo} className="flex items-center justify-between text-sm">
                  <span>{tipoRubroLabels[rubro.tipo] ?? rubro.tipo}</span>
                  <span className="text-muted-foreground">{formatearMoneda(rubro.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Formulario de presentación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {campos.length === 0 ? (
            <p className="text-muted-foreground">
              La convocatoria no tiene formulario de presentación configurado.
            </p>
          ) : edicion.datosFormulario == null ? (
            <p className="text-muted-foreground">
              El proyecto no tiene datos del formulario de presentación cargados.
            </p>
          ) : (
            secciones
              .filter(seccion => seccion.campos.length > 0)
              .map(seccion => (
                <div key={seccion.id} className="space-y-3">
                  {seccion.id !== 'resumen' && (
                    <div className="border-b pb-1">
                      <p className="font-medium">{seccion.nombre}</p>
                      {seccion.descripcion && (
                        <p className="text-xs text-muted-foreground">{seccion.descripcion}</p>
                      )}
                    </div>
                  )}
                  {seccion.campos.map(campo => (
                    <CampoFormularioLectura
                      key={campo.id}
                      campo={campo}
                      valor={edicion.datosFormulario?.[campo.id]}
                    />
                  ))}
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
