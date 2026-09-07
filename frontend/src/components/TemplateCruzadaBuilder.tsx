import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { CategoriaCruzada, EstructuraTemplateCruzada, ItemCruzada } from '@/data/types'

interface Props {
  estructura: EstructuraTemplateCruzada | null
  onChange: (estructura: EstructuraTemplateCruzada) => void
  editable?: boolean
}

function nuevoItem(): ItemCruzada {
  return { id: crypto.randomUUID(), nombre: '', puntajeMaximo: 1 }
}

export function nuevaCategoriaCruzada(): CategoriaCruzada {
  return { id: crypto.randomUUID(), nombre: '', puntajeMaximo: 10, items: [nuevoItem()] }
}

export function TemplateCruzadaBuilder({ estructura, onChange, editable = true }: Props) {
  const base: EstructuraTemplateCruzada = estructura ?? { categorias: [] }
  const categorias = base.categorias

  const actualizarCategoria = (id: string, cambios: Partial<CategoriaCruzada>) => {
    onChange({
      ...base,
      categorias: categorias.map(c => (c.id === id ? { ...c, ...cambios } : c)),
    })
  }

  const actualizarItem = (catId: string, itemId: string, cambios: Partial<ItemCruzada>) => {
    onChange({
      ...base,
      categorias: categorias.map(c =>
        c.id === catId
          ? { ...c, items: c.items.map(i => (i.id === itemId ? { ...i, ...cambios } : i)) }
          : c,
      ),
    })
  }

  const agregarCategoria = () =>
    onChange({ ...base, categorias: [...categorias, nuevaCategoriaCruzada()] })

  const eliminarCategoria = (id: string) =>
    onChange({ ...base, categorias: categorias.filter(c => c.id !== id) })

  const agregarItem = (catId: string) =>
    onChange({
      ...base,
      categorias: categorias.map(c =>
        c.id === catId ? { ...c, items: [...c.items, nuevoItem()] } : c,
      ),
    })

  const eliminarItem = (catId: string, itemId: string) =>
    onChange({
      ...base,
      categorias: categorias.map(c =>
        c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c,
      ),
    })

  const sumaItems = (categoria: CategoriaCruzada) =>
    categoria.items.reduce((acc, i) => acc + (Number(i.puntajeMaximo) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Categorías de evaluación</h4>
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
        {categorias.map(categoria => {
          const suma = sumaItems(categoria)
          const excede = suma > Number(categoria.puntajeMaximo)
          return (
            <Fragment key={categoria.id}>
              <div className="flex items-center gap-2 pl-5 pr-6 py-4 bg-muted/50 border-l-4 border-l-muted-foreground/40">
                <div className="flex-[2] space-y-1">
                  <span className="h-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />Categoría
                  </span>
                  <Input
                    className="bg-background"
                    value={categoria.nombre}
                    disabled={!editable}
                    onChange={e => actualizarCategoria(categoria.id, { nombre: e.target.value })}
                    placeholder="Ej: Justificación y Formulación"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <span className="h-4 text-xs text-muted-foreground flex items-center">Puntaje máx.</span>
                  <Input
                    className="bg-background"
                    type="number"
                    min={1}
                    value={categoria.puntajeMaximo}
                    disabled={!editable}
                    onChange={e => actualizarCategoria(categoria.id, { puntajeMaximo: Number(e.target.value) })}
                  />
                </div>
                {editable && (
                  <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => eliminarCategoria(categoria.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {categoria.items.length === 0 && (
                <p className="px-6 py-4 text-sm text-muted-foreground">Sin ítems.</p>
              )}

              {categoria.items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-6 py-4">
                  <Input
                    className="bg-muted/40 flex-[3]"
                    value={item.nombre}
                    disabled={!editable}
                    onChange={e => actualizarItem(categoria.id, item.id, { nombre: e.target.value })}
                    placeholder="Nombre del ítem"
                  />
                  <Input
                    className="bg-muted/40 w-24"
                    type="number"
                    min={1}
                    value={item.puntajeMaximo}
                    disabled={!editable}
                    onChange={e => actualizarItem(categoria.id, item.id, { puntajeMaximo: Number(e.target.value) })}
                  />
                  {editable && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => eliminarItem(categoria.id, item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {editable && (
                <div className="flex items-center justify-between gap-2 px-6 py-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => agregarItem(categoria.id)}>
                    <Plus className="h-3 w-3 mr-1" />Agregar ítem
                  </Button>
                  {suma > 0 && (
                    <p className={cn('text-xs', excede ? 'text-destructive' : 'text-muted-foreground')}>
                      Suma: {suma} / {Number(categoria.puntajeMaximo) || 0}
                      {excede && ' — supera el máximo'}
                    </p>
                  )}
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
      )}
    </div>
  )
}
