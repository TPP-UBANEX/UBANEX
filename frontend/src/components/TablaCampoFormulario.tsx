import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CampoFormulario } from '@/data/types'
import { ControlCampoFormulario, formatearValorCampoFormulario } from '@/components/CampoFormularioInput'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  campo: CampoFormulario
  valor: unknown
  /** Si se pasa, la tabla es editable; si se omite, se muestra en modo lectura. */
  onChange?: (valor: unknown) => void
}

/** Grilla de un campo tipo tabla: en edición permite cargar/quitar filas, en lectura solo muestra los valores. */
export function TablaCampoFormulario({ campo, valor, onChange }: Props) {
  const editable = !!onChange
  const columnas = campo.columnas ?? []
  const filas = Array.isArray(valor) ? valor as Record<string, unknown>[] : []

  const actualizarCelda = (filaIdx: number, columnaId: string, celda: unknown) => {
    onChange?.(filas.map((fila, i) => i === filaIdx ? { ...fila, [columnaId]: celda } : fila))
  }

  const agregarFila = () => onChange?.([...filas, {}])
  const eliminarFila = (filaIdx: number) => onChange?.(filas.filter((_, i) => i !== filaIdx))

  const alcanzoMaximo = campo.filasMaximas !== undefined && filas.length >= campo.filasMaximas

  if (!editable && filas.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin filas cargadas</p>
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columnas.map(columna => (
                <TableHead key={columna.id} className="whitespace-nowrap">
                  {columna.nombre}
                  {columna.esObligatorio && <span className="text-destructive"> *</span>}
                </TableHead>
              ))}
              {editable && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas.length + (editable ? 1 : 0)} className="text-center text-muted-foreground">
                  Sin filas cargadas
                </TableCell>
              </TableRow>
            )}
            {filas.map((fila, filaIdx) => (
              <TableRow key={filaIdx}>
                {columnas.map(columna => (
                  <TableCell key={columna.id} className="min-w-[10rem] align-top">
                    {editable ? (
                      <ControlCampoFormulario
                        campo={columna}
                        valor={fila[columna.id]}
                        onChange={v => actualizarCelda(filaIdx, columna.id, v)}
                        compacto
                      />
                    ) : (
                      formatearValorCampoFormulario(columna, fila[columna.id])
                    )}
                  </TableCell>
                ))}
                {editable && (
                  <TableCell className="align-top">
                    <Button type="button" variant="ghost" size="icon" onClick={() => eliminarFila(filaIdx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editable && (
        <Button type="button" variant="outline" size="sm" onClick={agregarFila} disabled={alcanzoMaximo}>
          <Plus className="h-3 w-3 mr-1" />Agregar fila
        </Button>
      )}
    </div>
  )
}
