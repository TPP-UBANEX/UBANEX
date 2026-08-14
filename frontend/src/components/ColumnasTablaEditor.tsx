import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES_USUARIO_BUSCABLES, TIPOS_COLUMNA_TABLA, TipoCampo, tipoCampoLabels } from '@/data/types'
import type { CampoFormulario, ColumnaTabla } from '@/data/types'
import { tipoCampoIconos } from '@/lib/tipo-campo-iconos'
import { OpcionesCampoEditor, RangoNumericoEditor, RolesUsuarioEditor } from '@/components/ConfigTipoCampoEditor'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

const TIPOS_CON_OPCIONES = [TipoCampo.Select, TipoCampo.Checkbox]
const TIPOS_CON_RANGO = [TipoCampo.Numero]
const TIPOS_CON_ROLES_USUARIO = [TipoCampo.Usuario]

export function columnaVacia(): ColumnaTabla {
  return {
    id: crypto.randomUUID(),
    tipo: TipoCampo.Texto,
    nombre: '',
    esObligatorio: false,
  }
}

interface Props {
  campo: CampoFormulario
  editable: boolean
  onChange: (cambios: Partial<CampoFormulario>) => void
}

/** Editor de la estructura de un campo tipo tabla: sus columnas y la cantidad de filas permitida. */
export function ColumnasTablaEditor({ campo, editable, onChange }: Props) {
  const columnas = campo.columnas ?? []

  const actualizarColumnas = (nuevas: ColumnaTabla[]) => onChange({ columnas: nuevas })

  const actualizarColumna = (id: string, cambios: Partial<ColumnaTabla>) => {
    actualizarColumnas(columnas.map(c => {
      if (c.id !== id) return c
      const actualizada = { ...c, ...cambios }
      if (cambios.tipo && !TIPOS_CON_OPCIONES.includes(cambios.tipo)) {
        actualizada.opciones = undefined
      }
      if (cambios.tipo && !TIPOS_CON_RANGO.includes(cambios.tipo)) {
        actualizada.minimo = undefined
        actualizada.maximo = undefined
        actualizada.admiteDecimales = undefined
      }
      if (cambios.tipo && !TIPOS_CON_ROLES_USUARIO.includes(cambios.tipo)) {
        actualizada.rolesUsuario = undefined
      }
      if (cambios.tipo === TipoCampo.Usuario && !c.rolesUsuario?.length) {
        actualizada.rolesUsuario = [...ROLES_USUARIO_BUSCABLES]
      }
      return actualizada
    }))
  }

  const agregarColumna = () => actualizarColumnas([...columnas, columnaVacia()])
  const eliminarColumna = (id: string) => actualizarColumnas(columnas.filter(c => c.id !== id))

  const moverColumna = (index: number, direccion: -1 | 1) => {
    const destino = index + direccion
    if (destino < 0 || destino >= columnas.length) return
    const copia = [...columnas]
    const [columna] = copia.splice(index, 1)
    copia.splice(destino, 0, columna)
    actualizarColumnas(copia)
  }

  return (
    <div className="space-y-3 pl-2 border-l-2">
      <span className="text-xs text-muted-foreground">Columnas</span>
      <div className="space-y-3">
        {columnas.map((columna, index) => (
          <div key={columna.id} className="border rounded-lg p-3 space-y-2 bg-background">
            <div className="flex items-start gap-2">
              <div className="flex-[2] space-y-1">
                <span className="text-xs text-muted-foreground">Etiqueta</span>
                <Input
                  value={columna.nombre}
                  disabled={!editable}
                  onChange={e => actualizarColumna(columna.id, { nombre: e.target.value })}
                  placeholder="Ej: Actividad"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-xs text-muted-foreground">Tipo</span>
                <Select
                  value={columna.tipo}
                  disabled={!editable}
                  onValueChange={v => actualizarColumna(columna.id, { tipo: v as TipoCampo })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_COLUMNA_TABLA.map(t => {
                      const Icono = tipoCampoIconos[t]
                      return (
                        <SelectItem key={t} value={t}>
                          <span className="flex items-center gap-2">
                            <Icono className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {tipoCampoLabels[t]}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">¿Obligatoria?</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={columna.esObligatorio ? 'default' : 'outline'}
                    size="sm"
                    disabled={!editable}
                    onClick={() => actualizarColumna(columna.id, { esObligatorio: true })}
                  >
                    Sí
                  </Button>
                  <Button
                    type="button"
                    variant={!columna.esObligatorio ? 'default' : 'outline'}
                    size="sm"
                    disabled={!editable}
                    onClick={() => actualizarColumna(columna.id, { esObligatorio: false })}
                  >
                    No
                  </Button>
                </div>
              </div>
              {editable && (
                <div className="flex items-center gap-1 pt-5">
                  <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moverColumna(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" disabled={index === columnas.length - 1} onClick={() => moverColumna(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => eliminarColumna(columna.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {TIPOS_CON_OPCIONES.includes(columna.tipo) && (
              <OpcionesCampoEditor
                opciones={columna.opciones}
                editable={editable}
                onChange={opciones => actualizarColumna(columna.id, { opciones })}
              />
            )}

            {TIPOS_CON_RANGO.includes(columna.tipo) && (
              <RangoNumericoEditor
                minimo={columna.minimo}
                maximo={columna.maximo}
                admiteDecimales={columna.admiteDecimales}
                editable={editable}
                onChange={cambios => actualizarColumna(columna.id, cambios)}
              />
            )}

            {TIPOS_CON_ROLES_USUARIO.includes(columna.tipo) && (
              <RolesUsuarioEditor
                rolesUsuario={columna.rolesUsuario}
                editable={editable}
                onChange={rolesUsuario => actualizarColumna(columna.id, { rolesUsuario })}
              />
            )}
          </div>
        ))}
      </div>

      {editable && (
        <Button type="button" variant="outline" size="sm" onClick={agregarColumna}>
          <Plus className="h-3 w-3 mr-1" />Agregar columna
        </Button>
      )}

      <div className="space-y-2 pt-1">
        <span className="text-xs text-muted-foreground">Filas (opcional)</span>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Mínimo</span>
            <Input
              type="number"
              min={0}
              value={campo.filasMinimas ?? ''}
              disabled={!editable}
              onChange={e => onChange({ filasMinimas: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Máximo</span>
            <Input
              type="number"
              min={1}
              value={campo.filasMaximas ?? ''}
              disabled={!editable}
              onChange={e => onChange({ filasMaximas: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder="Ilimitado"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
