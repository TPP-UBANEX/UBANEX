import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import type { CategoriaCruzada, EstructuraTemplateCruzada, ItemCruzada } from '@/data/types'

interface Props {
  estructura: EstructuraTemplateCruzada | null
  onChange: (estructura: EstructuraTemplateCruzada) => void
  editable?: boolean
}

function nuevoItem(): ItemCruzada {
  return { id: crypto.randomUUID(), nombre: '', puntajeMaximo: 1 }
}

function nuevaCategoria(): CategoriaCruzada {
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
    onChange({ ...base, categorias: [...categorias, nuevaCategoria()] })

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

      {categorias.map(categoria => {
        const suma = sumaItems(categoria)
        const excede = suma > Number(categoria.puntajeMaximo)
        return (
          <div key={categoria.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-[2] space-y-1">
                <span className="text-xs text-muted-foreground">Nombre de la categoría</span>
                <Input
                  value={categoria.nombre}
                  disabled={!editable}
                  onChange={e => actualizarCategoria(categoria.id, { nombre: e.target.value })}
                  placeholder="Ej: Justificación y Formulación"
                />
              </div>
              <div className="w-28 space-y-1">
                <span className="text-xs text-muted-foreground">Puntaje máx.</span>
                <Input
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

            {editable && suma > 0 && (
              <p className={`text-xs ${excede ? 'text-destructive' : 'text-muted-foreground'}`}>
                Suma de ítems: {suma} / {Number(categoria.puntajeMaximo) || 0}
                {excede && ' — supera el puntaje máximo de la categoría'}
              </p>
            )}

            <div className="space-y-2 pl-2 border-l-2">
              <span className="text-xs text-muted-foreground">Ítems</span>
              {categoria.items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-[3]">
                    <Input
                      value={item.nombre}
                      disabled={!editable}
                      onChange={e => actualizarItem(categoria.id, item.id, { nombre: e.target.value })}
                      placeholder="Nombre del ítem"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={1}
                      value={item.puntajeMaximo}
                      disabled={!editable}
                      onChange={e => actualizarItem(categoria.id, item.id, { puntajeMaximo: Number(e.target.value) })}
                    />
                  </div>
                  {editable && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => eliminarItem(categoria.id, item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editable && (
                <Button type="button" variant="outline" size="sm" onClick={() => agregarItem(categoria.id)}>
                  <Plus className="h-3 w-3 mr-1" />Agregar ítem
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
