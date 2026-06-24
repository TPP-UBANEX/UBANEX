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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Proyecto, Convocatoria } from '@/data/types'
import { estadoBadge } from '@/data/types'
import { Search, Plus } from 'lucide-react'

export function Proyectos() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('todas')
  const [filtroConv, setFiltroConv] = useState('todas')
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.proyectos.list(),
      api.convocatorias.list(),
    ]).then(([p, c]) => {
      setProyectos(p)
      setConvocatorias(c)
    }).finally(() => setLoading(false))
  }, [])

  const filtrados = proyectos.filter(p => {
    if (filtroEtapa !== 'todas' && p.estado !== filtroEtapa) return false
    if (filtroConv !== 'todas' && p.convocatoriaId !== filtroConv) return false
    if (search && !p.titulo.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pipelineColumns = [
    { key: 'presentado', label: 'Presentados' },
    { key: 'revision', label: 'Revisión' },
    { key: 'evaluacion', label: 'Evaluación' },
    { key: 'adjudicado', label: 'Adjudicados' },
    { key: 'ejecucion', label: 'Ejecución' },
    { key: 'rendicion', label: 'Rendición' },
    { key: 'cerrado', label: 'Cerrados' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground">Pipeline de proyectos de extensión</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={vista === 'tabla' ? 'default' : 'outline'} size="sm" onClick={() => setVista('tabla')}>Tabla</Button>
          <Button variant={vista === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setVista('kanban')}>Kanban</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
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
          <SelectTrigger className="w-48"><SelectValue placeholder="Convocatoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {convocatorias.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
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
                    {[...Array(7)].map((_, j) => (
                      <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${p.id}`)}>
                      <TableCell className="font-medium">{p.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.director}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.facultad}</TableCell>
                      <TableCell><Badge variant={estadoBadge[p.estado]}>{p.estado}</Badge></TableCell>
                      <TableCell className="text-sm">{p.puntaje ?? '-'}</TableCell>
                      <TableCell className="text-sm">{p.montoAsignado ? `$${p.montoAsignado.toLocaleString()}` : '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(`/proyectos/${p.id}`) }}>Ver</Button>
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
                  {proyectos.filter(p => p.estado === col.key).map(p => (
                    <Card key={p.id} className="cursor-pointer hover:bg-accent" onClick={() => navigate(`/proyectos/${p.id}`)}>
                      <CardContent className="p-3 space-y-1">
                        <p className="text-sm font-medium leading-tight">{p.titulo}</p>
                        <p className="text-xs text-muted-foreground">{p.director}</p>
                        {p.puntaje && <Badge variant="outline" className="text-xs">{p.puntaje} pts</Badge>}
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
