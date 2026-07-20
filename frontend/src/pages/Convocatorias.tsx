import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Convocatoria, Formulario } from '@/data/types'
import { RolUsuario } from '@/data/types'
import { estadoBadge } from '@/data/types'
import { toast } from 'sonner'
import { Plus, Search, FileText } from 'lucide-react'

function erroresFechas(f: {
  fechaInicioPresentacion: string; fechaFinPresentacion: string;
  fechaInicioEvaluacion: string; fechaFinEvaluacion: string;
  fechaInicioEjecucion: string; fechaFinEjecucion: string;
}): Record<string, string> {
  const e: Record<string, string> = {}
  const p = (s: string) => s ? new Date(s) : null
  const ip = p(f.fechaInicioPresentacion), fp = p(f.fechaFinPresentacion)
  const ie = p(f.fechaInicioEvaluacion), fe = p(f.fechaFinEvaluacion)
  const iej = p(f.fechaInicioEjecucion), fej = p(f.fechaFinEjecucion)

  if (fp && ip && fp < ip) e.fechaFinPresentacion = 'Debe ser igual o posterior al inicio'
  if (ie && fp && ie < fp) e.fechaInicioEvaluacion = 'Debe ser posterior o igual a Fin Presentación'
  if (fe && ie && fe < ie) e.fechaFinEvaluacion = 'Debe ser igual o posterior al inicio'
  if (iej && fe && iej < fe) e.fechaInicioEjecucion = 'Debe ser posterior o igual a Fin Evaluación'
  if (fej && iej && fej < iej) e.fechaFinEjecucion = 'Debe ser igual o posterior al inicio'
  return e
}

function validarFechas(f: Parameters<typeof erroresFechas>[0]): string | null {
  const errs = erroresFechas(f)
  return errs[Object.keys(errs)[0]] ?? null
}

export function Convocatorias() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<Convocatoria[]>([])
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [formularioSeleccionado, setFormularioSeleccionado] = useState<Formulario | null>(null)
  const [form, setForm] = useState({
    nombre: '', descripcion: '', anio: new Date().getFullYear(),
    fechaInicioPresentacion: '', fechaFinPresentacion: '',
    fechaInicioEvaluacion: '', fechaFinEvaluacion: '',
    fechaInicioEjecucion: '', fechaFinEjecucion: '',
  })

  const errores = erroresFechas(form)

  const cargar = () => {
    Promise.all([
      api.convocatorias.list(),
      api.formularios.list(),
    ]).then(([c, f]) => {
      setData(c)
      setFormularios(f)
    }).finally(() => setLoading(false))
  }

  useEffect(cargar, [])

  const handleCrear = async () => {
    if (!form.nombre || !form.anio) {
      toast.error('Completá los campos obligatorios')
      return
    }

    const errorFechas = validarFechas(form)
    if (errorFechas) {
      toast.error(errorFechas)
      return
    }

    setCreando(true)
    try {
      await api.convocatorias.crear({
        ...form,
        formularioId: formularioSeleccionado?.id,
      })
      toast.success('Convocatoria creada correctamente')
      setOpen(false)
      setFormularioSeleccionado(null)
      setForm({
        nombre: '', descripcion: '', anio: new Date().getFullYear(),
        fechaInicioPresentacion: '', fechaFinPresentacion: '',
        fechaInicioEvaluacion: '', fechaFinEvaluacion: '',
        fechaInicioEjecucion: '', fechaFinEjecucion: '',
      })
      cargar()
    } catch {
      toast.error('Error al crear la convocatoria')
    } finally {
      setCreando(false)
    }
  }

  const filtradas = data.filter(c => {
    const matchNombre = c.nombre.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'todas' || c.estado === filtroEstado
    return matchNombre && matchEstado
  })

  const activas = data.filter(c => c.estado === 'presentacion' || c.estado === 'evaluacion')
  const pasadas = data.filter(c => c.estado === 'ejecucion' || c.estado === 'cierre')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convocatorias</h1>
          <p className="text-sm text-muted-foreground">Gestión de convocatorias UBANEX</p>
        </div>
        {user?.roles.includes(RolUsuario.AutoridadDeRectorado) && (
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva Convocatoria</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Convocatoria</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4 min-w-0">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nombre</p>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre de la convocatoria" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Descripción</p>
                <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Año</p>
                <Input type="number" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Presentación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                    <Input type="date" className="mt-1" value={form.fechaInicioPresentacion} onChange={e => setForm(f => ({ ...f, fechaInicioPresentacion: e.target.value }))} />
                    {errores.fechaInicioPresentacion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioPresentacion}</p>}
                  </div>
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Fin</p>
                    <Input type="date" className="mt-1" value={form.fechaFinPresentacion} onChange={e => setForm(f => ({ ...f, fechaFinPresentacion: e.target.value }))} />
                    {errores.fechaFinPresentacion && <p className="text-xs text-destructive mt-2">{errores.fechaFinPresentacion}</p>}
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Evaluación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                    <Input type="date" className="mt-1" value={form.fechaInicioEvaluacion} onChange={e => setForm(f => ({ ...f, fechaInicioEvaluacion: e.target.value }))} />
                    {errores.fechaInicioEvaluacion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioEvaluacion}</p>}
                  </div>
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Fin</p>
                    <Input type="date" className="mt-1" value={form.fechaFinEvaluacion} onChange={e => setForm(f => ({ ...f, fechaFinEvaluacion: e.target.value }))} />
                    {errores.fechaFinEvaluacion && <p className="text-xs text-destructive mt-2">{errores.fechaFinEvaluacion}</p>}
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Ejecución</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Inicio</p>
                    <Input type="date" className="mt-1" value={form.fechaInicioEjecucion} onChange={e => setForm(f => ({ ...f, fechaInicioEjecucion: e.target.value }))} />
                    {errores.fechaInicioEjecucion && <p className="text-xs text-destructive mt-2">{errores.fechaInicioEjecucion}</p>}
                  </div>
                  <div className="relative min-h-[4.5rem]">
                    <p className="text-xs text-muted-foreground mt-1">Fin</p>
                    <Input type="date" className="mt-1" value={form.fechaFinEjecucion} onChange={e => setForm(f => ({ ...f, fechaFinEjecucion: e.target.value }))} />
                    {errores.fechaFinEjecucion && <p className="text-xs text-destructive mt-2">{errores.fechaFinEjecucion}</p>}
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold">Formulario</p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={formularioSeleccionado?.id === formularios.find(f => f.esDefault)?.id}
                    onChange={e => {
                      if (e.target.checked) {
                        const defaultForm = formularios.find(f => f.esDefault)
                        if (defaultForm) setFormularioSeleccionado(defaultForm)
                      } else {
                        setFormularioSeleccionado(null)
                      }
                    }}
                  />
                  Usar formulario default
                </label>
                {formularios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay formularios disponibles</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {formularios.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                          formularioSeleccionado?.id === f.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setFormularioSeleccionado(f)}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{f.nombre}</span>
                        {f.esDefault && <span className="text-xs opacity-70 ml-auto">Default</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={handleCrear} disabled={creando}>
                {creando ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="configuracion">Configuración</SelectItem>
            <SelectItem value="presentacion">Presentación</SelectItem>
            <SelectItem value="evaluacion">Evaluación</SelectItem>
            <SelectItem value="ejecucion">Ejecución</SelectItem>
            <SelectItem value="cierre">Cierre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas ({data.length})</TabsTrigger>
          <TabsTrigger value="activas">Activas ({activas.length})</TabsTrigger>
          <TabsTrigger value="pasadas">Pasadas ({pasadas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="todas" className="mt-4">
          {loading ? <TableSkeleton /> : <TablaConvocatorias data={filtradas} onClick={id => navigate(`/convocatorias/${id}`)} />}
        </TabsContent>
        <TabsContent value="activas" className="mt-4">
          {loading ? <TableSkeleton /> : <TablaConvocatorias data={activas} onClick={id => navigate(`/convocatorias/${id}`)} />}
        </TabsContent>
        <TabsContent value="pasadas" className="mt-4">
          {loading ? <TableSkeleton /> : <TablaConvocatorias data={pasadas} onClick={id => navigate(`/convocatorias/${id}`)} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TablaConvocatorias({ data, onClick }: { data: Convocatoria[]; onClick: (id: string) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Listado</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Presentación</TableHead>
              <TableHead>Formulario</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(c => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onClick(c.id)}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.anio}</TableCell>
                <TableCell><Badge variant={estadoBadge[c.estado]}>{c.estado}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.fechaInicioPresentacion && c.fechaFinPresentacion
                    ? `${c.fechaInicioPresentacion} — ${c.fechaFinPresentacion}`
                    : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.formulario?.nombre || '-'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onClick(c.id) }}>Ver</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
