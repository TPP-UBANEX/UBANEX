import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CampoFormularioLectura } from '@/components/CampoFormularioLectura'
import { EnlaceUsuario } from '@/components/EnlaceUsuario'
import { agruparCamposEnSecciones } from '@/lib/secciones-formulario'
import { TipoRubro, estadoBadge, estadoEdicionLabel } from '@/data/types'
import type { CampoFormulario, Convocatoria, Edicion } from '@/data/types'
import { calcularPresupuestoAAdjudicar, formatearMoneda } from '@/lib/presupuesto'

const tipoRubroLabels: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
}

export function ProyectoEvaluablePanel({
  edicion,
  campos,
  convocatoria,
  esPse,
}: {
  edicion: Edicion | null
  campos: CampoFormulario[]
  // Presentes solo para Secretaría/Rectorado (ver Evaluacion.tsx): el desglose de insumos/PSE no
  // se le muestra al docente para no incentivar a marcar todo como insumo.
  convocatoria?: Convocatoria | null
  esPse?: boolean
}) {
  const secciones = agruparCamposEnSecciones(campos)
  const seccionResumen = secciones[0]
  const seccionesExtra = secciones.slice(1).filter((s) => s.campos.length > 0)
  const [tab, setTab] = useState('detalle')

  // Al cambiar de proyecto, volver siempre al tab de detalle: el tab activo puede no existir
  // en el formulario del nuevo proyecto.
  useEffect(() => {
    setTab('detalle')
  }, [edicion?.id])

  if (!edicion) return null

  const presupuesto = edicion.presupuestoSolicitado
  const aAdjudicar = convocatoria
    ? calcularPresupuestoAAdjudicar(presupuesto, convocatoria, esPse ?? false)
    : null

  return (
    <Card className="min-w-0 lg:h-full lg:flex lg:flex-col">
      <Tabs value={tab} onValueChange={setTab} className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <CardHeader className="lg:shrink-0">
          <CardTitle className="text-sm font-medium">Información del proyecto</CardTitle>
          <div className="overflow-x-auto">
            <TabsList className="flex-nowrap w-max">
              <TabsTrigger value="detalle">Detalle</TabsTrigger>
              {seccionesExtra.map((seccion) => (
                <TabsTrigger key={seccion.id} value={seccion.id} className="whitespace-nowrap">
                  {seccion.nombre}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto space-y-3 text-sm">
        <TabsContent value="detalle" className="space-y-3 mt-0">
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
              <EnlaceUsuario usuarioId={edicion.creadoPorId} nombre={edicion.creadoPor?.nombreCompleto} />
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

          {aAdjudicar && (
            <div className="pt-2 space-y-1 border-t">
              <p className="text-xs text-muted-foreground font-medium">Presupuesto a adjudicar</p>
              <div className="flex items-center justify-between text-sm">
                <span>Insumos ({aAdjudicar.porcentajeInsumos.toFixed(1)}% del solicitado)</span>
                <span className={aAdjudicar.aplicaExtraInsumos ? 'font-medium' : 'text-muted-foreground'}>
                  {aAdjudicar.aplicaExtraInsumos
                    ? `+${formatearMoneda(aAdjudicar.extraInsumos)}`
                    : 'No aplica extra'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>PSE</span>
                <span className={aAdjudicar.esPse ? 'font-medium' : 'text-muted-foreground'}>
                  {aAdjudicar.esPse ? `+${formatearMoneda(aAdjudicar.extraPse)}` : 'No aplica extra'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
                <span>Total a adjudicar</span>
                <span>{formatearMoneda(aAdjudicar.total)}</span>
              </div>
            </div>
          )}

          {campos.length === 0 ? (
            <p className="text-muted-foreground pt-2">
              La convocatoria no tiene formulario de presentación configurado.
            </p>
          ) : edicion.datosFormulario == null ? (
            <p className="text-muted-foreground pt-2">
              El proyecto no tiene datos del formulario de presentación cargados.
            </p>
          ) : seccionResumen.campos.length > 0 ? (
            <div className="pt-2 space-y-3 border-t">
              {seccionResumen.campos.map((campo) => (
                <CampoFormularioLectura
                  key={campo.id}
                  campo={campo}
                  valor={edicion.datosFormulario?.[campo.id]}
                />
              ))}
            </div>
          ) : null}
        </TabsContent>

        {seccionesExtra.map((seccion) => (
          <TabsContent key={seccion.id} value={seccion.id} className="space-y-3 mt-0">
            {seccion.descripcion && (
              <p className="text-xs text-muted-foreground">{seccion.descripcion}</p>
            )}
            {seccion.campos.map((campo) => (
              <CampoFormularioLectura
                key={campo.id}
                campo={campo}
                valor={edicion.datosFormulario?.[campo.id]}
              />
            ))}
          </TabsContent>
        ))}
        </CardContent>
      </Tabs>
    </Card>
  )
}
