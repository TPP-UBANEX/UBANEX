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
import { evaluaciones, proyectos, estadoBadge } from '@/data/mock'

export function Evaluacion() {
  const proyectosEnEvaluacion = proyectos.filter(p => p.estado === 'evaluacion')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evaluación</h1>
        <p className="text-sm text-muted-foreground">Evaluación institucional y cruzada de proyectos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Proyectos en Evaluación</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Facultad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectosEnEvaluacion.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.facultad}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[p.estado]}>{p.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.puntaje ?? '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Evaluar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Evaluaciones Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Evaluador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluaciones.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.proyectoTitulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.evaluador}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.tipo}</TableCell>
                  <TableCell className="text-sm">{e.puntaje || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[e.estado]}>{e.estado}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
