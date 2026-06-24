import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Convocatoria, Proyecto } from '@/data/types'
import { estadoBadge } from '@/data/types'
import { ArrowLeft, Plus } from 'lucide-react'

export function ConvocatoriaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [conv, setConv] = useState<Convocatoria | null>(null)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.convocatorias.get(id),
      api.proyectos.list({ convocatoriaId: id }),
    ]).then(([c, p]) => {
      setConv(c)
      setProyectos(p)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <DetailSkeleton />

  if (!conv) return <div className="p-6"><p className="text-muted-foreground">Convocatoria no encontrada</p></div>

  const conteo = {
    presentado: proyectos.filter(p => p.estado === 'presentado').length,
    revision: proyectos.filter(p => p.estado === 'revision').length,
    evaluacion: proyectos.filter(p => p.estado === 'evaluacion').length,
    adjudicado: proyectos.filter(p => p.estado === 'adjudicado').length,
    ejecucion: proyectos.filter(p => p.estado === 'ejecucion').length,
    rendicion: proyectos.filter(p => p.estado === 'rendicion').length,
    cerrado: proyectos.filter(p => p.estado === 'cerrado').length,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/convocatorias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{conv.nombre}</h1>
            <Badge variant={estadoBadge[conv.estado]}>{conv.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{conv.descripcion}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(conteo).map(([etapa, count]) => (
          <Card key={etapa}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium capitalize">{etapa}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="proyectos">
        <TabsList>
          <TabsTrigger value="proyectos">Proyectos ({proyectos.length})</TabsTrigger>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
        </TabsList>
        <TabsContent value="proyectos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Proyectos Presentados</CardTitle>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyectos.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${p.id}`)}>
                      <TableCell className="font-medium">{p.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.director}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.facultad}</TableCell>
                      <TableCell><Badge variant={estadoBadge[p.estado]}>{p.estado}</Badge></TableCell>
                      <TableCell className="text-sm">{p.puntaje ?? '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(`/proyectos/${p.id}`) }}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="detalle" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Información</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Apertura:</span> {conv.fechaApertura}</div>
                <div><span className="text-muted-foreground">Cierre:</span> {conv.fechaCierre}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
