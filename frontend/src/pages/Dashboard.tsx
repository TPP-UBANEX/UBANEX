import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { proyectos, convocatorias, actividades, estadoBadge } from '@/data/mock'
import { FileText, Users, DollarSign, ClipboardCheck } from 'lucide-react'

export function Dashboard() {
  const stats = [
    { label: 'Proyectos Activos', value: proyectos.filter(p => p.estado === 'ejecucion').length, icon: Users, color: 'text-blue-600' },
    { label: 'Convocatorias Abiertas', value: convocatorias.filter(c => c.estado === 'abierta').length, icon: FileText, color: 'text-green-600' },
    { label: 'Evaluaciones Pendientes', value: proyectos.filter(p => p.estado === 'evaluacion').length, icon: ClipboardCheck, color: 'text-amber-600' },
    { label: 'Rendiciones por Revisar', value: 0, icon: DollarSign, color: 'text-purple-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del sistema UBANEX</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimas Actividades</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actividades.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{a.descripcion}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.usuario}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.fecha}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Proyectos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Director</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectos.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.titulo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.director}</TableCell>
                    <TableCell>
                      <Badge variant={estadoBadge[p.estado]}>{p.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
