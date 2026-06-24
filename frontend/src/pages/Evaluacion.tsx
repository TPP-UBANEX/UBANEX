import { useEffect, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { Evaluacion } from '@/data/types'
import { ClipboardCheck } from 'lucide-react'

export function Evaluacion() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [selected, setSelected] = useState<Evaluacion | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.evaluaciones.list().then(setEvaluaciones)
  }, [])

  const pendientes = evaluaciones.filter(e => e.estado === 'pendiente')
  const completadas = evaluaciones.filter(e => e.estado === 'completada')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evaluación</h1>
        <p className="text-sm text-muted-foreground">Evaluación institucional y cruzada de proyectos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">En Evaluación</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{evaluaciones.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Pendientes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{pendientes.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Completadas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{completadas.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList>
          <TabsTrigger value="pendientes">Pendientes ({pendientes.length})</TabsTrigger>
          <TabsTrigger value="completadas">Completadas ({completadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Evaluaciones Asignadas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Evaluador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendientes.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{e.proyectoTitulo || e.proyectoId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.evaluador}</TableCell>
                      <TableCell><Badge variant="outline">{e.tipo}</Badge></TableCell>
                      <TableCell>
                        <Dialog open={open && selected?.id === e.id} onOpenChange={(v) => { setOpen(v); if (v) { setSelected(e) } }}>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => { setSelected(e); setOpen(true) }}>
                              <ClipboardCheck className="h-4 w-4 mr-2" />Evaluar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Evaluar: {e.proyectoTitulo || e.proyectoId}</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="text-sm"><span className="text-muted-foreground">Tipo:</span> {e.tipo} · <span className="text-muted-foreground">Evaluador:</span> {e.evaluador}</div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Puntaje (0-100)</label>
                                <input type="number" min={0} max={100} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Observaciones</label>
                                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Observaciones..." />
                              </div>
                              <Button className="w-full" onClick={() => setOpen(false)}>Guardar</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completadas" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Historial</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Evaluador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completadas.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm font-medium">{e.proyectoTitulo || e.proyectoId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.evaluador}</TableCell>
                      <TableCell><Badge variant="outline">{e.tipo}</Badge></TableCell>
                      <TableCell className="text-sm font-bold">{e.puntaje}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{e.observaciones}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
