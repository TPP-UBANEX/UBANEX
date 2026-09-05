import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { conProtocolo } from '@/lib/utils'
import type { Hito, CrearHitoDto, Convocatoria } from '@/data/types'
import {
  CategoriaHito,
  categoriaHitoLabel,
  EstadoEdicion,
} from '@/data/types'
import { TextoLargoColapsable } from '@/components/CampoFormularioInput'
import { Plus, Pencil, Trash2, Loader2, Link2, X } from 'lucide-react'
import { toast } from 'sonner'

interface HitoFormState {
  titulo: string
  descripcion: string
  fechaInicio: string
  fechaFin: string
  integrantes: string
  links: string[]
  categoria: CategoriaHito
}

const formVacio: HitoFormState = {
  titulo: '',
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  integrantes: '',
  links: [],
  categoria: CategoriaHito.Organizacion,
}

const MAX_LINKS = 20

const CATEGORIAS = Object.values(CategoriaHito) as CategoriaHito[]

export function HitosEjecucionTab({
  edicionId,
  estado,
  puedeEditar,
  convocatoria,
}: {
  edicionId?: string
  estado?: EstadoEdicion
  puedeEditar: boolean
  convocatoria?: Convocatoria | null
}) {
  const [hitos, setHitos] = useState<Hito[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<HitoFormState>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!edicionId) return
    setLoading(true)
    try {
      setHitos(await api.ejecucion.hitos.listar(edicionId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar hitos')
    } finally {
      setLoading(false)
    }
  }, [edicionId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const enEjecucion = estado === EstadoEdicion.EnEjecucion
  const permitidoEditar = enEjecucion && puedeEditar
  const limiteFechas = {
    min: convocatoria?.fechaInicioEjecucion ?? undefined,
    max: convocatoria?.fechaFinEjecucion ?? undefined,
  }

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(formVacio)
    setModalOpen(true)
  }

  const abrirEditar = (hito: Hito) => {
    setEditandoId(hito.id)
    setForm({
      titulo: hito.titulo,
      descripcion: hito.descripcion ?? '',
      fechaInicio: hito.fechaInicio ?? '',
      fechaFin: hito.fechaFin ?? '',
      integrantes: hito.integrantes ?? '',
      links: hito.links?.length ? [...hito.links] : [],
      categoria: hito.categoria,
    })
    setModalOpen(true)
  }

  const guardar = async () => {
    if (!form.titulo.trim()) {
      toast.error('El título del hito es obligatorio')
      return
    }
    if (form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin) {
      toast.error('La fecha de inicio debe ser anterior o igual a la fecha de fin')
      return
    }
    if (limiteFechas.min && form.fechaInicio && form.fechaInicio < limiteFechas.min) {
      toast.error('La fecha de inicio debe estar dentro del período de ejecución de la convocatoria')
      return
    }
    if (limiteFechas.max && form.fechaFin && form.fechaFin > limiteFechas.max) {
      toast.error('La fecha de fin debe estar dentro del período de ejecución de la convocatoria')
      return
    }
    setGuardando(true)
    try {
      const payload: CrearHitoDto = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        fechaInicio: form.fechaInicio || undefined,
        fechaFin: form.fechaFin || undefined,
        integrantes: form.integrantes.trim() || undefined,
        links: form.links.map((l) => l.trim()).filter(Boolean),
        categoria: form.categoria,
      }
      if (editandoId) {
        await api.ejecucion.hitos.actualizar(editandoId, payload)
        toast.success('Hito modificado')
      } else {
        if (!edicionId) return
        await api.ejecucion.hitos.crear(edicionId, payload)
        toast.success('Hito creado')
      }
      setModalOpen(false)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el hito')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminandoId(id)
    try {
      await api.ejecucion.hitos.eliminar(id)
      toast.success('Hito eliminado')
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el hito')
    } finally {
      setEliminandoId(null)
    }
  }

  const actualizarCampo = (campo: keyof HitoFormState, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))

  const actualizarLink = (i: number, valor: string) =>
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l, idx) => (idx === i ? valor : l)),
    }))

  const agregarLink = () =>
    setForm((prev) =>
      prev.links.length >= MAX_LINKS ? prev : { ...prev, links: [...prev.links, ''] },
    )

  const quitarLink = (i: number) =>
    setForm((prev) => ({ ...prev, links: prev.links.filter((_, idx) => idx !== i) }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Hitos de ejecución</CardTitle>
        {permitidoEditar && (
          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="h-3 w-3 mr-1" />Nuevo hito
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : hitos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no se registraron hitos de ejecución.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Integrantes</TableHead>
                {permitidoEditar && <TableHead className="w-24 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {hitos.map((hito) => (
                <TableRow key={hito.id}>
                  <TableCell>
                    <p className="font-medium">{hito.titulo}</p>
                    {hito.descripcion && (
                      <div className="mt-0.5">
                        <TextoLargoColapsable texto={hito.descripcion} />
                      </div>
                    )}
                    {hito.links && hito.links.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {hito.links.map((link, i) => (
                          <a
                            key={i}
                            href={conProtocolo(link)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary underline break-all"
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            {link}
                          </a>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoriaHitoLabel[hito.categoria]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {hito.fechaInicio ? (
                      <>
                        {hito.fechaInicio}{hito.fechaFin ? ` → ${hito.fechaFin}` : ''}
                      </>
                    ) : '-'
                    }
                  </TableCell>
                  <TableCell className="text-sm">{hito.integrantes || '-'}</TableCell>
                  {permitidoEditar && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(hito)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={eliminandoId === hito.id}
                          onClick={() => eliminar(hito.id)}
                        >
                          {eliminandoId === hito.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {permitidoEditar && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editandoId ? 'Editar hito' : 'Nuevo hito'}</DialogTitle>
                <DialogDescription>
                  Registrá un hito de ejecución del proyecto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Título *</label>
                  <Input
                    placeholder="Título del hito"
                    value={form.titulo}
                    onChange={(e) => actualizarCampo('titulo', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Categoría</label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => actualizarCampo('categoria', v as CategoriaHito)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>{categoriaHitoLabel[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Fecha de inicio</label>
                    <Input
                      type="date"
                      min={limiteFechas.min}
                      max={limiteFechas.max}
                      value={form.fechaInicio}
                      onChange={(e) => actualizarCampo('fechaInicio', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Fecha de fin</label>
                    <Input
                      type="date"
                      min={limiteFechas.min}
                      max={limiteFechas.max}
                      value={form.fechaFin}
                      onChange={(e) => actualizarCampo('fechaFin', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Integrantes</label>
                  <Input
                    placeholder="Nombres / roles de los integrantes"
                    value={form.integrantes}
                    onChange={(e) => actualizarCampo('integrantes', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Descripción</label>
                  <Textarea
                    className="min-h-[80px]"
                    placeholder="Descripción del hito"
                    value={form.descripcion}
                    onChange={(e) => actualizarCampo('descripcion', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Links</label>
                  <p className="text-xs text-muted-foreground">
                    Enlaces para mostrar lo que se va haciendo (fotos, documentos, publicaciones).
                    Si no incluís <code>https://</code> se agrega solo.
                  </p>
                  {form.links.length > 0 && (
                    <div className="space-y-2">
                      {form.links.map((link, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder="https://…"
                            value={link}
                            onChange={(e) => actualizarLink(i, e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => quitarLink(i)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={agregarLink}
                    disabled={form.links.length >= MAX_LINKS}
                  >
                    <Link2 className="h-3 w-3 mr-1" />Agregar link
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={guardar} disabled={guardando}>
                  {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editandoId ? 'Guardar cambios' : 'Crear hito'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}