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
import { proyectos, estadoBadge } from '@/data/mock'

export function Cierre() {
  const proyectosCerrables = proyectos.filter(p => p.estado === 'rendicion' || p.estado === 'adjudicado' || p.estado === 'ejecucion')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cierre</h1>
        <p className="text-sm text-muted-foreground">Informes finales y cierre de proyectos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Proyectos para Cierre</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Director</TableHead>
                <TableHead>Facultad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectosCerrables.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.director}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.facultad}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[p.estado]}>{p.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Iniciar cierre</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Proyectos Cerrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Director</TableHead>
                <TableHead>Monto Asignado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.filter(p => p.estado === 'cerrado').map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.director}</TableCell>
                  <TableCell className="text-sm">${p.montoAsignado?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
