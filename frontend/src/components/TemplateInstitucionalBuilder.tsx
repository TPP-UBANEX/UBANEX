import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type {
  CategoriaInstitucional,
  EstructuraTemplateInstitucional,
  ItemChecklist,
  SubcategoriaInstitucional,
  TipoValorSubcategoria,
} from '@/data/types'

interface Props {
  estructura: EstructuraTemplateInstitucional | null
  onChange: (estructura: EstructuraTemplateInstitucional) => void
  editable?: boolean
}

function nuevaSubcategoria(): SubcategoriaInstitucional {
  return {
    id: crypto.randomUUID(),
    texto: '',
    tipoValor: 'numerico',
    minimo: 0,
    maximo: 10,
    fundamentacion: null,
  }
}

export function nuevaCategoriaInstitucional(): CategoriaInstitucional {
  return { id: crypto.randomUUID(), nombre: '', subcategorias: [nuevaSubcategoria()] }
}

function nuevoChecklistItem(): ItemChecklist {
  return { id: crypto.randomUUID(), texto: '' }
}

export function TemplateInstitucionalBuilder({ estructura, onChange, editable = true }: Props) {
  const base: EstructuraTemplateInstitucional = estructura ?? { categorias: [], checklist: [] }
  const categorias = base.categorias
  const checklist = base.checklist

  const actualizarCategoria = (id: string, cambios: Partial<CategoriaInstitucional>) => {
    onChange({
      ...base,
      categorias: categorias.map(c => (c.id === id ? { ...c, ...cambios } : c)),
    })
  }

  const actualizarSubcategoria = (
    catId: string,
    subId: string,
    cambios: Partial<SubcategoriaInstitucional>,
  ) => {
    onChange({
      ...base,
      categorias: categorias.map(c =>
        c.id === catId
          ? {
              ...c,
              subcategorias: c.subcategorias.map(s =>
                s.id === subId ? { ...s, ...cambios } : s,
              ),
            }
          : c,
      ),
    })
  }

  const agregarCategoria = () =>
    onChange({ ...base, categorias: [...categorias, nuevaCategoriaInstitucional()] })

  const eliminarCategoria = (id: string) =>
    onChange({ ...base, categorias: categorias.filter(c => c.id !== id) })

  const agregarSubcategoria = (catId: string) =>
    onChange({
      ...base,
      categorias: categorias.map(c =>
        c.id === catId ? { ...c, subcategorias: [...c.subcategorias, nuevaSubcategoria()] } : c,
      ),
    })

  const eliminarSubcategoria = (catId: string, subId: string) =>
    onChange({
      ...base,
      categorias: categorias.map(c =>
        c.id === catId
          ? { ...c, subcategorias: c.subcategorias.filter(s => s.id !== subId) }
          : c,
      ),
    })

  const actualizarChecklist = (id: string, cambios: Partial<ItemChecklist>) => {
    onChange({ ...base, checklist: checklist.map(i => (i.id === id ? { ...i, ...cambios } : i)) })
  }

  const agregarChecklist = () => onChange({ ...base, checklist: [...checklist, nuevoChecklistItem()] })

  const eliminarChecklist = (id: string) =>
    onChange({ ...base, checklist: checklist.filter(i => i.id !== id) })

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Categorías</h4>
          {editable && (
            <Button type="button" variant="outline" size="sm" onClick={agregarCategoria}>
              <Plus className="h-4 w-4 mr-1" />Agregar categoría
            </Button>
          )}
        </div>

        {categorias.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin categorías definidas.</p>
        )}

        {categorias.length > 0 && (
        <div className="-mx-6 border-y divide-y">
          {categorias.map(categoria => (
            <Fragment key={categoria.id}>
              <div className="flex items-center gap-2 pl-5 pr-6 py-4 bg-muted/50 border-l-4 border-l-muted-foreground/40">
                <div className="flex-1 space-y-1">
                  <span className="h-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />Categoría
                  </span>
                  <Input
                    className="bg-background"
                    value={categoria.nombre}
                    disabled={!editable}
                    onChange={e => actualizarCategoria(categoria.id, { nombre: e.target.value })}
                    placeholder="Ej: Puntaje diferencial"
                  />
                </div>
                {editable && (
                  <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => eliminarCategoria(categoria.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {categoria.subcategorias.length === 0 && (
                <p className="px-6 py-4 text-sm text-muted-foreground">Sin subcategorías.</p>
              )}

              {categoria.subcategorias.map(sub => (
                <div key={sub.id} className="px-6 py-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Input
                      className="bg-muted/40 flex-1"
                      value={sub.texto}
                      disabled={!editable}
                      onChange={e => actualizarSubcategoria(categoria.id, sub.id, { texto: e.target.value })}
                      placeholder="Texto de la subcategoría"
                    />
                    <Select
                      value={sub.tipoValor}
                      disabled={!editable}
                      onValueChange={v => actualizarSubcategoria(categoria.id, sub.id, { tipoValor: v as TipoValorSubcategoria })}
                    >
                      <SelectTrigger className="bg-muted/40 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numerico">Numérico</SelectItem>
                        <SelectItem value="booleano">Sí / No</SelectItem>
                      </SelectContent>
                    </Select>
                    {editable && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => eliminarSubcategoria(categoria.id, sub.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {sub.tipoValor === 'numerico' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 space-y-1">
                        <span className="text-xs text-muted-foreground">Mínimo</span>
                        <Input
                          className="bg-muted/40"
                          type="number"
                          value={sub.minimo ?? ''}
                          disabled={!editable}
                          onChange={e => actualizarSubcategoria(categoria.id, sub.id, { minimo: Number(e.target.value) })}
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <span className="text-xs text-muted-foreground">Máximo</span>
                        <Input
                          className="bg-muted/40"
                          type="number"
                          value={sub.maximo ?? ''}
                          disabled={!editable}
                          onChange={e => actualizarSubcategoria(categoria.id, sub.id, { maximo: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {editable && (
                <div className="px-6 py-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => agregarSubcategoria(categoria.id)}>
                    <Plus className="h-3 w-3 mr-1" />Agregar subcategoría
                  </Button>
                </div>
              )}
            </Fragment>
          ))}
        </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Checklist institucional</h4>
          {editable && (
            <Button type="button" variant="outline" size="sm" onClick={agregarChecklist}>
              <Plus className="h-4 w-4 mr-1" />Agregar ítem
            </Button>
          )}
        </div>

        {checklist.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin ítems de checklist.</p>
        )}

        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={item.texto}
                disabled={!editable}
                onChange={e => actualizarChecklist(item.id, { texto: e.target.value })}
                placeholder="Ítem del checklist"
              />
            </div>
            {editable && (
              <Button type="button" variant="ghost" size="icon" onClick={() => eliminarChecklist(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
