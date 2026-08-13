import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import { RolUsuario } from '@/data/types'

interface OpcionesCampoEditorProps {
  opciones: string[] | undefined
  editable: boolean
  onChange: (opciones: string[]) => void
}

/** Editor de las opciones de un campo de selección/casillas. Reutilizado por campos de nivel superior y por columnas de tabla. */
export function OpcionesCampoEditor({ opciones, editable, onChange }: OpcionesCampoEditorProps) {
  const lista = opciones ?? []

  return (
    <div className="space-y-2 pl-2 border-l-2">
      <span className="text-xs text-muted-foreground">Opciones</span>
      {lista.map((opcion, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={opcion}
            disabled={!editable}
            onChange={e => onChange(lista.map((o, i) => i === idx ? e.target.value : o))}
            placeholder={`Opción ${idx + 1}`}
          />
          {editable && (
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(lista.filter((_, i) => i !== idx))}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {editable && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lista, ''])}>
          <Plus className="h-3 w-3 mr-1" />Agregar opción
        </Button>
      )}
    </div>
  )
}

interface RangoNumericoEditorProps {
  minimo: number | undefined
  maximo: number | undefined
  admiteDecimales: boolean | undefined
  editable: boolean
  onChange: (cambios: { minimo?: number; maximo?: number; admiteDecimales?: boolean }) => void
}

/** Editor del rango (mínimo/máximo/decimales) de un campo numérico. Reutilizado por campos de nivel superior y por columnas de tabla. */
export function RangoNumericoEditor({ minimo, maximo, admiteDecimales, editable, onChange }: RangoNumericoEditorProps) {
  return (
    <div className="space-y-2 pl-2 border-l-2">
      <span className="text-xs text-muted-foreground">Rango (opcional)</span>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">Mínimo</span>
          <Input
            type="number"
            value={minimo ?? ''}
            disabled={!editable}
            onChange={e => onChange({ minimo: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
        <div className="flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">Máximo</span>
          <Input
            type="number"
            value={maximo ?? ''}
            disabled={!editable}
            onChange={e => onChange({ maximo: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">¿Admite decimales?</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={admiteDecimales ? 'default' : 'outline'}
              size="sm"
              disabled={!editable}
              onClick={() => onChange({ admiteDecimales: true })}
            >
              Sí
            </Button>
            <Button
              type="button"
              variant={!admiteDecimales ? 'default' : 'outline'}
              size="sm"
              disabled={!editable}
              onClick={() => onChange({ admiteDecimales: false })}
            >
              No
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ETIQUETA_ROL_USUARIO: Partial<Record<RolUsuario, string>> = {
  [RolUsuario.Docente]: 'Docentes',
  [RolUsuario.Estudiante]: 'Estudiantes',
}

interface RolesUsuarioEditorProps {
  rolesUsuario: RolUsuario[] | undefined
  editable: boolean
  onChange: (rolesUsuario: RolUsuario[]) => void
}

/** Editor de qué usuarios puede buscar un campo tipo usuario. Reutilizado por campos de nivel superior y por columnas de tabla. */
export function RolesUsuarioEditor({ rolesUsuario, editable, onChange }: RolesUsuarioEditorProps) {
  const seleccionados = rolesUsuario ?? []

  const alternar = (rol: RolUsuario) => {
    onChange(
      seleccionados.includes(rol)
        ? seleccionados.filter(r => r !== rol)
        : [...seleccionados, rol],
    )
  }

  return (
    <div className="space-y-2 pl-2 border-l-2">
      <span className="text-xs text-muted-foreground">¿A quién busca?</span>
      <div className="flex gap-2">
        {(Object.keys(ETIQUETA_ROL_USUARIO) as RolUsuario[]).map(rol => (
          <Button
            key={rol}
            type="button"
            variant={seleccionados.includes(rol) ? 'default' : 'outline'}
            size="sm"
            disabled={!editable}
            onClick={() => alternar(rol)}
          >
            {ETIQUETA_ROL_USUARIO[rol]}
          </Button>
        ))}
      </div>
    </div>
  )
}
