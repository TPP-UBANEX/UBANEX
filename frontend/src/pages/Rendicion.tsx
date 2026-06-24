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
import { rendiciones, estadoBadge } from '@/data/mock'

export function Rendicion() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rendición</h1>
        <p className="text-sm text-muted-foreground">Gestión de rendiciones de fondos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Todas las Rendiciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Rubro</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rendiciones.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.proyectoTitulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.rubro}</TableCell>
                  <TableCell className="text-sm">${r.monto.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.fecha}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[r.estado]}>{r.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Revisar</Button>
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
