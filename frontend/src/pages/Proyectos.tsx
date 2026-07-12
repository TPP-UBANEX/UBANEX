import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Edicion, Convocatoria } from '@/data/types'
import { estadoBadge, EstadoEdicion, RolUsuario } from '@/data/types'
import { NuevoProyectoDialog } from '@/components/NuevoProyectoDialog'
import { Search, Plus } from 'lucide-react'

const pipelineColumns = [
  { key: EstadoEdicion.Borrador, label: 'Borrador' },
  { key: EstadoEdicion.Presentado, label: 'Presentados' },
  { key: EstadoEdicion.PendienteDeCambios, label: 'Revisión' },
  { key: EstadoEdicion.EnEvaluacion, label: 'Evaluación' },
  { key: EstadoEdicion.Adjudicado, label: 'Adjudicados' },
  { key: EstadoEdicion.EnEjecucion, label: 'Ejecución' },
  { key: EstadoEdicion.Cerrado, label: 'Cerrados' },
]

export function Proyectos() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const esRevision = searchParams.get('revision') === 'true'
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState(esRevision ? EstadoEdicion.Presentado : 'todas')
  const [filtroConv, setFiltroConv] = useState('todas')
  const [filtroAnio, setFiltroAnio] = useState('todas')
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [loading, setLoading] = useState(true)

  const esDirector = user?.roles.includes(RolUsuario.DirectorDeProyecto)

  const cargarDatos = () => {
    setLoading(true)
    Promise.all([
      api.proyectos.list(),
      api.convocatorias.list(),
    ]).then(([e, c]) => {
      setEdiciones(e)
      setConvocatorias(c)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
  }, [esRevision])

  useEffect(() => {
    setFiltroEtapa(esRevision ? EstadoEdicion.Presentado : 'todas')
  }, [esRevision])

  const anios = [...new Set(ediciones.map(e => e.anioEdicion).filter((a): a is number => a != null))].sort((a, b) => b - a)

  const filtrados = ediciones.filter(e => {
    if (filtroEtapa !== 'todas' && e.estado !== filtroEtapa) return false
    if (filtroConv !== 'todas' && e.convocatoriaId !== filtroConv) return false
    if (filtroAnio !== 'todas' && e.anioEdicion !== Number(filtroAnio)) return false
    if (search && !e.proyecto?.nombre?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {esRevision ? 'Revisión de proyectos' : 'Proyectos'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {esRevision
              ? 'Proyectos presentados pendientes de revisión'
              : 'Pipeline de proyectos de extensión'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={vista === 'tabla' ? 'default' : 'outline'} size="sm" onClick={() => setVista('tabla')}>Tabla</Button>
          <Button variant={vista === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setVista('kanban')}>Kanban</Button>
          {esDirector && (
            <NuevoProyectoDialog
              onCreated={cargarDatos}
              trigger={
                <Button><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
              }
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las etapas</SelectItem>
            {pipelineColumns.map(c => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroConv} onValueChange={setFiltroConv}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas las convocatorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las convocatorias</SelectItem>
            {convocatorias.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroAnio} onValueChange={setFiltroAnio}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Edición" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las ediciones</SelectItem>
            {anios.map(a => (
              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {vista === 'tabla' ? (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Listado de Proyectos</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    {[...Array(5)].map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(e => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${e.proyectoId}`)}>
                      <TableCell className="font-medium">{e.proyecto?.nombre || 'Sin nombre'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.director?.nombreCompleto || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.unidadAcademica?.nombre || '-'}</TableCell>
                      <TableCell><Badge variant={estadoBadge[e.estado]}>{e.estado}</Badge></TableCell>
                      <TableCell className="text-sm">${(e.presupuesto?.montoTotal ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={e2 => { e2.stopPropagation(); navigate(`/proyectos/${e.proyectoId}`) }}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        loading ? (
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-20" />
                {[...Array(2)].map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3 overflow-x-auto">
            {pipelineColumns.map(col => (
              <div key={col.key} className="min-w-[160px]">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{col.label}</div>
                <div className="space-y-2">
                  {ediciones.filter(e => e.estado === col.key).map(e => (
                    <Card key={e.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/proyectos/${e.proyectoId}`)}>
                      <CardContent className="p-3 space-y-1">
                        <p className="text-sm font-medium leading-tight">{e.proyecto?.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground">{e.director?.nombreCompleto || '-'}</p>
                        {e.presupuesto && <Badge variant="outline" className="text-xs">${e.presupuesto.montoTotal.toLocaleString()}</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
