import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CampoSugerible } from '@/components/CampoSugerible'
import type { BienPresupuesto, Convocatoria, RubroPresupuesto, ViaticoPresupuesto } from '@/data/types'
import { TipoRubro } from '@/data/types'
import {
  formatearMoneda, LABELS_CAMPO_PARTIDA, LABELS_RUBRO, numeroNoNegativo, PREFIJO_RUTA_PRESUPUESTO,
} from '@/lib/presupuesto'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface Props {
  rubro: RubroPresupuesto
  rubroIdx: number
  editando: boolean
  convocatoria?: Convocatoria
  handlers?: {
    removePartida: (rubroIdx: number, partidaIdx: number) => void
    updateViatico: (rubroIdx: number, pIdx: number, field: keyof ViaticoPresupuesto, value: string | number) => void
    updateBien: (rubroIdx: number, pIdx: number, field: keyof BienPresupuesto, value: string | number | boolean) => void
  }
  sugerencia?: {
    activo: boolean
    onSugerir: (campo: string, valorActual: string, label: string) => void
  }
}

function periodoInvalido(p: ViaticoPresupuesto, convocatoria: Convocatoria | undefined): string | null {
  if (!p.periodoInicio || !p.periodoFin) return null
  if (p.periodoInicio > p.periodoFin) return 'El inicio del período debe ser anterior o igual al fin'
  const { fechaInicioEjecucion, fechaFinEjecucion } = convocatoria ?? {}
  if (
    fechaInicioEjecucion && fechaFinEjecucion
    && (p.periodoInicio < fechaInicioEjecucion || p.periodoFin > fechaFinEjecucion)
  ) {
    return 'El período está fuera de la ejecución de la convocatoria'
  }
  return null
}

/** Grilla de las partidas de un rubro del presupuesto, con el mismo estilo que TablaCampoFormulario. */
export function TablaPartidasPresupuesto({ rubro, rubroIdx, editando, convocatoria, handlers, sugerencia }: Props) {
  const esViatico = rubro.tipo === TipoRubro.ViaticosYSeguros
  const rubroLabel = LABELS_RUBRO[rubro.tipo]

  const campoPartida = (pIdx: number, campo: string) =>
    `${PREFIJO_RUTA_PRESUPUESTO}rubros[${rubroIdx}].partidas[${pIdx}].${campo}`
  const labelPartida = (campo: string) => `${rubroLabel} > ${LABELS_CAMPO_PARTIDA[campo]}`

  const columnas = esViatico
    ? ['Tipo', 'Descripción', 'Inicio', 'Fin', 'Monto']
    : ['Descripción', 'Cantidad', 'Precio unit.', 'Monto', 'Insumo']
  const colSpan = columnas.length + (editando ? 1 : 0)

  // Ancho por columna: evita que "Descripción" (la única sin ancho fijo) le quite todo el
  // espacio a las columnas angostas y las deje demasiado apretadas para leer su valor.
  const anchoColumna: Record<string, string> = {
    Tipo: 'w-32',
    Descripción: 'min-w-[10rem] max-w-xs',
    Inicio: 'w-36',
    Fin: 'w-36',
    Cantidad: 'w-24',
    'Precio unit.': 'w-32',
    Monto: 'w-32',
    Insumo: 'w-20 text-center',
  }

  const celdaSugerible = (pIdx: number, campo: string, valorActual: string, contenido: React.ReactNode) => (
    <CampoSugerible
      campo={campoPartida(pIdx, campo)}
      valorActual={valorActual}
      label={labelPartida(campo)}
      activo={!!sugerencia?.activo}
      onClick={sugerencia?.onSugerir ?? (() => {})}
      display="flex"
      className="w-full"
    >
      <span className="text-sm">{contenido}</span>
    </CampoSugerible>
  )

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columnas.map(columna => (
              <TableHead key={columna} className={cn('whitespace-nowrap', anchoColumna[columna])}>
                {columna}
              </TableHead>
            ))}
            {editando && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rubro.partidas.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className={editando ? 'text-center text-destructive' : 'text-center text-muted-foreground'}>
                {editando ? 'Sin partidas — este rubro necesita al menos una para poder presentar el proyecto' : 'Sin partidas'}
              </TableCell>
            </TableRow>
          )}

          {esViatico
            ? (rubro.partidas as ViaticoPresupuesto[]).map((p, pIdx) => {
              const error = editando ? periodoInvalido(p, convocatoria) : null
              return (
                <Fragment key={pIdx}>
                  <TableRow className={error ? 'border-b-0' : undefined}>
                    {editando && handlers ? (
                      <>
                        <TableCell>
                          <Select value={p.tipoPersona} onValueChange={v => handlers.updateViatico(rubroIdx, pIdx, 'tipoPersona', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Docente">Docente</SelectItem>
                              <SelectItem value="Estudiante">Estudiante</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[10rem]">
                          <Input value={p.descripcion} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'descripcion', e.target.value)} placeholder="Ej: Viaje a..." />
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={p.periodoInicio} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'periodoInicio', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={p.periodoFin} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'periodoFin', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" step="0.01" value={p.monto || ''} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'monto', numeroNoNegativo(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handlers.removePartida(rubroIdx, pIdx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{celdaSugerible(pIdx, 'tipoPersona', p.tipoPersona, p.tipoPersona)}</TableCell>
                        <TableCell className="min-w-[10rem]">{celdaSugerible(pIdx, 'descripcion', p.descripcion, p.descripcion)}</TableCell>
                        <TableCell>{celdaSugerible(pIdx, 'periodoInicio', p.periodoInicio, p.periodoInicio)}</TableCell>
                        <TableCell>{celdaSugerible(pIdx, 'periodoFin', p.periodoFin, p.periodoFin)}</TableCell>
                        <TableCell>{celdaSugerible(pIdx, 'monto', String(p.monto), formatearMoneda(p.monto))}</TableCell>
                      </>
                    )}
                  </TableRow>
                  {error && (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="pt-0 text-xs text-destructive">{error}</TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
            : (rubro.partidas as BienPresupuesto[]).map((p, pIdx) => (
              <TableRow key={pIdx}>
                {editando && handlers ? (
                  <>
                    <TableCell className="min-w-[10rem]">
                      <Input value={p.descripcion} onChange={e => handlers.updateBien(rubroIdx, pIdx, 'descripcion', e.target.value)} placeholder="Ej: Resmas de papel" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="1" step="1" value={p.cantidad || ''} onChange={e => handlers.updateBien(rubroIdx, pIdx, 'cantidad', numeroNoNegativo(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" step="0.01" value={p.precioUnitario || ''} onChange={e => handlers.updateBien(rubroIdx, pIdx, 'precioUnitario', numeroNoNegativo(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={p.monto || ''} disabled className="bg-muted" />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={p.esInsumo === true}
                        onChange={e => handlers.updateBien(rubroIdx, pIdx, 'esInsumo', e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handlers.removePartida(rubroIdx, pIdx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="min-w-[10rem]">{celdaSugerible(pIdx, 'descripcion', p.descripcion, p.descripcion)}</TableCell>
                    <TableCell>{celdaSugerible(pIdx, 'cantidad', String(p.cantidad), p.cantidad)}</TableCell>
                    <TableCell>{celdaSugerible(pIdx, 'precioUnitario', String(p.precioUnitario), formatearMoneda(p.precioUnitario))}</TableCell>
                    <TableCell>{formatearMoneda(p.monto)}</TableCell>
                    <TableCell className="text-center">
                      {celdaSugerible(pIdx, 'esInsumo', String(p.esInsumo === true), p.esInsumo === true ? 'Sí' : 'No')}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
