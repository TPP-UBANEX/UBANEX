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
import { useAuth } from '@/lib/auth-context'
import type { Convocatoria, Edicion } from '@/data/types'
import { estadoBadge, EstadoEdicion, RolUsuario } from '@/data/types'
import { NuevoProyectoDialog } from '@/components/NuevoProyectoDialog'
import { ArrowLeft, Plus } from 'lucide-react'

export function ConvocatoriaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conv, setConv] = useState<Convocatoria | null>(null)
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [loading, setLoading] = useState(true)

  const esDirector = user?.roles.includes(RolUsuario.DirectorDeProyecto)

  const cargarDatos = () => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.convocatorias.get(id),
      api.proyectos.list({ convocatoriaId: id }),
    ]).then(([c, e]) => {
      setConv(c)
      setEdiciones(e)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  if (loading) return <DetailSkeleton />

  if (!conv) return <div className="p-6"><p className="text-muted-foreground">Convocatoria no encontrada</p></div>

  const conteo: Record<string, number> = {}
  Object.values(EstadoEdicion).forEach(estado => {
    conteo[estado] = ediciones.filter(e => e.estado === estado).length
  })

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
          <TabsTrigger value="proyectos">Proyectos ({ediciones.length})</TabsTrigger>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
        </TabsList>
        <TabsContent value="proyectos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Proyectos Presentados</CardTitle>
              {esDirector && (
                <NuevoProyectoDialog
                  onCreated={cargarDatos}
                  trigger={
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo Proyecto</Button>
                  }
                />
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ediciones.map(e => (
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="detalle" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Información</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Inicio Presentación:</span> {conv.fechaInicioPresentacion}</div>
                <div><span className="text-muted-foreground">Fin Presentación:</span> {conv.fechaFinPresentacion}</div>
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
