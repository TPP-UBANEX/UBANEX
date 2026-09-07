import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CampoFormularioLectura } from '@/components/CampoFormularioLectura'
import { TablaPartidasPresupuesto } from '@/components/TablaPartidasPresupuesto'
import { agruparCamposEnSecciones } from '@/lib/secciones-formulario'
import { LABELS_RUBRO } from '@/lib/presupuesto'
import { TipoCampo, TipoRubro } from '@/data/types'
import type { CampoFormulario, ViaticoPresupuesto } from '@/data/types'

const RUBROS_FIJOS = [TipoRubro.ViaticosYSeguros, TipoRubro.BienesDeConsumo, TipoRubro.BienesDeUso]
const NOTA_TAB_FIJA = 'Tab fija del proyecto: no depende del formulario que estás configurando.'

/**
 * Muestra un formulario de presentación (lista de `CampoFormulario`) tal como lo verá quien
 * presente un proyecto: las tabs "Resumen" + una por cada campo tipo sección, más mocks no
 * editables de las tabs fijas "Dirección" y "Presupuesto solicitado". Solo lectura, sin valores.
 */
export function VistaPreviaFormulario({ campos }: { campos: CampoFormulario[] }) {
  const secciones = agruparCamposEnSecciones(campos)
  const seccionResumen = secciones[0]
  const seccionesExtra = secciones.slice(1)

  const renderCampos = (lista: CampoFormulario[]) => {
    if (lista.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          Esta sección todavía no tiene campos.
        </p>
      )
    }
    return (
      <div className="grid grid-cols-2 gap-4 text-sm">
        {lista.map(campo =>
          campo.tipo === TipoCampo.Archivo ? (
            <p key={campo.id} className="text-muted-foreground">
              <span className="font-medium">{campo.nombre || 'Campo de archivo'}</span>: archivo
              adjunto (se sube al presentar)
            </p>
          ) : (
            <CampoFormularioLectura key={campo.id} campo={campo} valor={undefined} />
          ),
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
        Vista previa: así se verá el formulario para quien presente un proyecto en esta convocatoria.
        Los valores se muestran vacíos.
      </p>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          {seccionesExtra.map(seccion => (
            <TabsTrigger key={seccion.id} value={`seccion-${seccion.id}`}>
              {seccion.nombre || 'Sección'}
            </TabsTrigger>
          ))}
          <TabsTrigger value="direccion">Dirección</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto solicitado</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Resumen</CardTitle>
            </CardHeader>
            <CardContent>{renderCampos(seccionResumen?.campos ?? [])}</CardContent>
          </Card>
        </TabsContent>

        {seccionesExtra.map(seccion => (
          <TabsContent key={seccion.id} value={`seccion-${seccion.id}`} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{seccion.nombre || 'Sección'}</CardTitle>
                {seccion.descripcion && (
                  <p className="text-sm text-muted-foreground">{seccion.descripcion}</p>
                )}
              </CardHeader>
              <CardContent>{renderCampos(seccion.campos)}</CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="direccion" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dirección y codirección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Interfacultad:</span> —</div>
                <div><span className="text-muted-foreground">Dirección:</span> —</div>
                <div><span className="text-muted-foreground">Codirección:</span> —</div>
              </div>
              <p className="text-xs text-muted-foreground">{NOTA_TAB_FIJA}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presupuesto" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Presupuesto solicitado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {RUBROS_FIJOS.map((tipo, i) => (
                <div key={tipo} className="space-y-2">
                  <h4 className="text-sm font-medium">{LABELS_RUBRO[tipo]}</h4>
                  <TablaPartidasPresupuesto
                    rubro={{ tipo, subtotal: 0, partidas: [] as ViaticoPresupuesto[] }}
                    rubroIdx={i}
                    editando={false}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{NOTA_TAB_FIJA}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
