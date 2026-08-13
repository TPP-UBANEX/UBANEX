import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES_USUARIO_BUSCABLES, TipoCampo, tipoCampoLabels } from '@/data/types'
import type { CampoFormulario } from '@/data/types'
import { tipoCampoIconos } from '@/lib/tipo-campo-iconos'
import { OpcionesCampoEditor, RangoNumericoEditor, RolesUsuarioEditor } from '@/components/ConfigTipoCampoEditor'
import { ColumnasTablaEditor, columnaVacia } from '@/components/ColumnasTablaEditor'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const TIPOS_CON_OPCIONES = [TipoCampo.Select, TipoCampo.Checkbox]
const TIPOS_CON_RANGO = [TipoCampo.Numero]
const TIPOS_CON_ROLES_USUARIO = [TipoCampo.Usuario]

export function campoVacio(): CampoFormulario {
  return {
    id: crypto.randomUUID(),
    tipo: TipoCampo.Texto,
    nombre: '',
    textoAyuda: '',
    esObligatorio: false,
    orden: 0,
  }
}

/** Valida los campos antes de guardar y avisa por toast del primer problema encontrado. */
export function validarCampos(campos: CampoFormulario[]): boolean {
  for (const campo of campos) {
    if (!campo.nombre.trim()) {
      toast.error('Todos los campos deben tener una etiqueta')
      return false
    }
    if (TIPOS_CON_OPCIONES.includes(campo.tipo)) {
      const opciones = (campo.opciones ?? []).map(o => o.trim()).filter(Boolean)
      if (opciones.length === 0) {
        toast.error(`El campo "${campo.nombre}" debe tener al menos una opción`)
        return false
      }
    }
    if (campo.tipo === TipoCampo.Numero) {
      if (!campo.admiteDecimales) {
        if (campo.minimo !== undefined && !Number.isInteger(campo.minimo)) {
          toast.error(`El campo "${campo.nombre}" debe tener un mínimo entero`)
          return false
        }
        if (campo.maximo !== undefined && !Number.isInteger(campo.maximo)) {
          toast.error(`El campo "${campo.nombre}" debe tener un máximo entero`)
          return false
        }
      }
      if (campo.minimo !== undefined && campo.maximo !== undefined && campo.minimo > campo.maximo) {
        toast.error(`El campo "${campo.nombre}" tiene un mínimo mayor que el máximo`)
        return false
      }
    }
    if (campo.tipo === TipoCampo.Usuario && (campo.rolesUsuario ?? []).length === 0) {
      toast.error(`El campo "${campo.nombre}" debe buscar al menos un tipo de usuario`)
      return false
    }
    if (campo.tipo === TipoCampo.Tabla) {
      const columnas = campo.columnas ?? []
      if (columnas.length === 0) {
        toast.error(`El campo "${campo.nombre}" debe tener al menos una columna`)
        return false
      }
      for (const columna of columnas) {
        if (!columna.nombre.trim()) {
          toast.error(`El campo "${campo.nombre}" tiene una columna sin etiqueta`)
          return false
        }
        if (TIPOS_CON_OPCIONES.includes(columna.tipo)) {
          const opciones = (columna.opciones ?? []).map(o => o.trim()).filter(Boolean)
          if (opciones.length === 0) {
            toast.error(`La columna "${columna.nombre}" de "${campo.nombre}" debe tener al menos una opción`)
            return false
          }
        }
        if (columna.tipo === TipoCampo.Usuario && (columna.rolesUsuario ?? []).length === 0) {
          toast.error(`La columna "${columna.nombre}" de "${campo.nombre}" debe buscar al menos un tipo de usuario`)
          return false
        }
      }
      const nombresColumnas = columnas.map(c => c.nombre.trim())
      if (new Set(nombresColumnas).size !== nombresColumnas.length) {
        toast.error(`El campo "${campo.nombre}" tiene columnas con nombres duplicados`)
        return false
      }
      if (campo.filasMinimas !== undefined && campo.filasMaximas !== undefined && campo.filasMinimas > campo.filasMaximas) {
        toast.error(`El campo "${campo.nombre}" tiene una cantidad mínima de filas mayor que la máxima`)
        return false
      }
    }
  }
  return true
}

interface Props {
  campos: CampoFormulario[]
  onChange: (campos: CampoFormulario[]) => void
  editable: boolean
  /** Qué mostrar cuando todavía no hay campos cargados. */
  slotVacio?: React.ReactNode
  /** Acciones propias del contenedor (ej. "Guardar"), alineadas a la derecha del pie. */
  slotAcciones?: React.ReactNode
}

export function CamposFormularioEditor({
  campos,
  onChange,
  editable,
  slotVacio,
  slotAcciones,
}: Props) {
  const actualizarCampo = (id: string, cambios: Partial<CampoFormulario>) => {
    onChange(campos.map(c => {
      if (c.id !== id) return c
      const actualizado = { ...c, ...cambios }
      if (cambios.tipo && !TIPOS_CON_OPCIONES.includes(cambios.tipo)) {
        actualizado.opciones = undefined
      }
      if (cambios.tipo && !TIPOS_CON_RANGO.includes(cambios.tipo)) {
        actualizado.minimo = undefined
        actualizado.maximo = undefined
        actualizado.admiteDecimales = undefined
      }
      if (cambios.tipo && !TIPOS_CON_ROLES_USUARIO.includes(cambios.tipo)) {
        actualizado.rolesUsuario = undefined
      }
      if (cambios.tipo === TipoCampo.Usuario && !c.rolesUsuario?.length) {
        actualizado.rolesUsuario = [...ROLES_USUARIO_BUSCABLES]
      }
      if (cambios.tipo === TipoCampo.Seccion) {
        actualizado.esObligatorio = false
      }
      if (cambios.tipo === TipoCampo.Tabla && !c.columnas?.length) {
        actualizado.columnas = [columnaVacia()]
      }
      if (cambios.tipo && cambios.tipo !== TipoCampo.Tabla) {
        actualizado.columnas = undefined
        actualizado.filasMinimas = undefined
        actualizado.filasMaximas = undefined
      }
      return actualizado
    }))
  }

  const agregarCampo = () => {
    onChange([...campos, campoVacio()])
  }

  const eliminarCampo = (id: string) => {
    onChange(campos.filter(c => c.id !== id))
  }

  const moverCampo = (index: number, direccion: -1 | 1) => {
    const destino = index + direccion
    if (destino < 0 || destino >= campos.length) return
    const copia = [...campos]
    const [campo] = copia.splice(index, 1)
    copia.splice(destino, 0, campo)
    onChange(copia)
  }

  return (
    <div className="space-y-4">
      {campos.length === 0 ? slotVacio : (
      <div className="space-y-3">
        {campos.map((campo, index) => {
          const esSeccion = campo.tipo === TipoCampo.Seccion
          return (
            <div
              key={campo.id}
              className={esSeccion ? 'border rounded-lg p-4 space-y-3 bg-primary/5 border-primary/30' : 'border rounded-lg p-4 space-y-3 bg-muted/30'}
            >
              <div className="flex items-start gap-2">
                <div className="flex-[2] space-y-1">
                  <span className="text-xs text-muted-foreground">Etiqueta</span>
                  <Input
                    value={campo.nombre}
                    disabled={!editable}
                    onChange={e => actualizarCampo(campo.id, { nombre: e.target.value })}
                    placeholder={esSeccion ? 'Ej: Contraparte' : 'Ej: Resumen del proyecto'}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <Select
                    value={campo.tipo}
                    disabled={!editable}
                    onValueChange={v => actualizarCampo(campo.id, { tipo: v as TipoCampo })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(TipoCampo).filter(t => t !== TipoCampo.Archivo).map(t => {
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
                {editable && (
                  <div className="flex items-center gap-1 pt-5">
                    <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moverCampo(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={index === campos.length - 1} onClick={() => moverCampo(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => eliminarCampo(campo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-[2] space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {esSeccion ? 'Descripción (opcional)' : 'Texto de ayuda (opcional)'}
                  </span>
                  <Input
                    value={campo.textoAyuda ?? ''}
                    disabled={!editable}
                    onChange={e => actualizarCampo(campo.id, { textoAyuda: e.target.value })}
                    placeholder={esSeccion ? 'Texto que se muestra al inicio de la pestaña' : 'Aclaración que ve quien completa el formulario'}
                  />
                </div>
                {!esSeccion && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">¿Obligatorio?</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={campo.esObligatorio ? 'default' : 'outline'}
                        size="sm"
                        disabled={!editable}
                        onClick={() => actualizarCampo(campo.id, { esObligatorio: true })}
                      >
                        Sí
                      </Button>
                      <Button
                        type="button"
                        variant={!campo.esObligatorio ? 'default' : 'outline'}
                        size="sm"
                        disabled={!editable}
                        onClick={() => actualizarCampo(campo.id, { esObligatorio: false })}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {TIPOS_CON_OPCIONES.includes(campo.tipo) && (
                <OpcionesCampoEditor
                  opciones={campo.opciones}
                  editable={editable}
                  onChange={opciones => actualizarCampo(campo.id, { opciones })}
                />
              )}

              {TIPOS_CON_RANGO.includes(campo.tipo) && (
                <RangoNumericoEditor
                  minimo={campo.minimo}
                  maximo={campo.maximo}
                  admiteDecimales={campo.admiteDecimales}
                  editable={editable}
                  onChange={cambios => actualizarCampo(campo.id, cambios)}
                />
              )}

              {TIPOS_CON_ROLES_USUARIO.includes(campo.tipo) && (
                <RolesUsuarioEditor
                  rolesUsuario={campo.rolesUsuario}
                  editable={editable}
                  onChange={rolesUsuario => actualizarCampo(campo.id, { rolesUsuario })}
                />
              )}

              {campo.tipo === TipoCampo.Tabla && (
                <ColumnasTablaEditor
                  campo={campo}
                  editable={editable}
                  onChange={cambios => actualizarCampo(campo.id, cambios)}
                />
              )}
            </div>
          )
        })}
      </div>
      )}

      {editable && (
        <div className="flex items-center justify-between pt-2">
          {campos.length > 0 ? (
            <Button type="button" variant="outline" onClick={agregarCampo}>
              <Plus className="h-4 w-4 mr-2" />Agregar campo
            </Button>
          ) : <span />}
          {slotAcciones}
        </div>
      )}
    </div>
  )
}
