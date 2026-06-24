import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Proyecto, Evaluacion, Rendicion } from '@/data/types'
import { estadoBadge } from '@/data/types'
import { ArrowLeft, Plus } from 'lucide-react'

export function ProyectoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.proyectos.get(id),
      api.evaluaciones.list(id),
      api.rendiciones.list(id),
    ]).then(([p, e, r]) => {
      setProyecto(p)
      setEvaluaciones(e)
      setRendiciones(r)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <ProyectoDetailSkeleton />

  if (!proyecto) return <div className="p-6"><p className="text-muted-foreground">Proyecto no encontrado</p></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{proyecto.titulo}</h1>
            <Badge variant={estadoBadge[proyecto.estado]}>{proyecto.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{proyecto.director} · {proyecto.facultad}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Director</CardTitle></CardHeader><CardContent><p className="text-sm">{proyecto.director}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Facultad</CardTitle></CardHeader><CardContent><p className="text-sm">{proyecto.facultad}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Puntaje</CardTitle></CardHeader><CardContent><p className="text-sm font-bold">{proyecto.puntaje ?? '-'}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Monto</CardTitle></CardHeader><CardContent><p className="text-sm font-bold">{proyecto.montoAsignado ? `$${proyecto.montoAsignado.toLocaleString()}` : '-'}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="evaluaciones">Evaluaciones ({evaluaciones.length})</TabsTrigger>
          <TabsTrigger value="rendiciones">Rendiciones ({rendiciones.length})</TabsTrigger>
          <TabsTrigger value="cierre">Cierre</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm font-medium">Resumen</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{proyecto.resumen}</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="evaluaciones" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Evaluaciones</CardTitle>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Asignar</Button>
            </CardHeader>
            <CardContent>
              {evaluaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin evaluaciones</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evaluador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Puntaje</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluaciones.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.evaluador}</TableCell>
                        <TableCell><Badge variant="outline">{e.tipo}</Badge></TableCell>
                        <TableCell className="text-sm font-medium">{e.puntaje || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{e.observaciones || '-'}</TableCell>
                        <TableCell><Badge variant={estadoBadge[e.estado]}>{e.estado}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rendiciones" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Rendiciones</CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nueva</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nueva Rendición</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input placeholder="Rubro" />
                    <Input type="number" placeholder="Monto" />
                    <Input type="date" />
                    <Button className="w-full" onClick={() => setOpen(false)}>Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rendiciones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin rendiciones</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rubro</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rendiciones.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.rubro}</TableCell>
                        <TableCell className="text-sm">${r.monto.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.fecha}</TableCell>
                        <TableCell><Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm">Comprobante</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cierre" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Cierre del Proyecto</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {proyecto.estado === 'cerrado' ? 'Proyecto cerrado.' : 'Complete los pasos para cerrar.'}
              </p>
              {proyecto.estado !== 'cerrado' && (
                <div className="space-y-3">
                  <Input placeholder="Informe final (PDF)" disabled />
                  <Button variant="default">Solicitar Cierre</Button>
                </div>
              )}
              {proyecto.estado === 'cerrado' && (
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Monto:</span> ${proyecto.montoAsignado?.toLocaleString()}</p>
                  <p><span className="text-muted-foreground">Puntaje:</span> {proyecto.puntaje}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProyectoDetailSkeleton() {
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
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-md" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}
