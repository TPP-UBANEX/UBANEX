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
import { convocatorias, estadoBadge } from '@/data/mock'
import { Plus } from 'lucide-react'

export function Convocatorias() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convocatorias</h1>
          <p className="text-sm text-muted-foreground">Gestión de convocatorias UBANEX</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Convocatoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Todas las Convocatorias</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Apertura</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Proyectos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convocatorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadge[c.estado]}>{c.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.fechaApertura}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.fechaCierre}</TableCell>
                  <TableCell className="text-sm">{c.totalProyectos}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Ver</Button>
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
