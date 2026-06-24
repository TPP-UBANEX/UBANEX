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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { Convocatoria } from '@/data/types'
import { estadoBadge } from '@/data/types'
import { Plus, Search } from 'lucide-react'

export function Convocatorias() {
  const navigate = useNavigate()
  const [data, setData] = useState<Convocatoria[]>([])
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.convocatorias.list().then(setData)
  }, [])

  const filtradas = data.filter(c => {
    const matchNombre = c.nombre.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'todas' || c.estado === filtroEstado
    return matchNombre && matchEstado
  })

  const activas = data.filter(c => c.estado === 'abierta')
  const pasadas = data.filter(c => c.estado === 'cerrada' || c.estado === 'evaluacion')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convocatorias</h1>
          <p className="text-sm text-muted-foreground">Gestión de convocatorias UBANEX</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva Convocatoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Convocatoria</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Nombre de la convocatoria" />
              <Input placeholder="Descripción" />
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" />
                <Input type="date" />
              </div>
              <Button className="w-full" onClick={() => setOpen(false)}>Crear</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="abierta">Activas</SelectItem>
            <SelectItem value="evaluacion">En evaluación</SelectItem>
            <SelectItem value="cerrada">Cerradas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas ({data.length})</TabsTrigger>
          <TabsTrigger value="activas">Activas ({activas.length})</TabsTrigger>
          <TabsTrigger value="pasadas">Pasadas ({pasadas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="todas" className="mt-4">
          <TablaConvocatorias data={filtradas} onClick={id => navigate(`/convocatorias/${id}`)} />
        </TabsContent>
        <TabsContent value="activas" className="mt-4">
          <TablaConvocatorias data={activas} onClick={id => navigate(`/convocatorias/${id}`)} />
        </TabsContent>
        <TabsContent value="pasadas" className="mt-4">
          <TablaConvocatorias data={pasadas} onClick={id => navigate(`/convocatorias/${id}`)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TablaConvocatorias({ data, onClick }: { data: Convocatoria[]; onClick: (id: string) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Listado de Convocatorias</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Apertura</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(c => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onClick(c.id)}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell><Badge variant={estadoBadge[c.estado]}>{c.estado}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.fechaApertura}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.fechaCierre}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onClick(c.id) }}>Ver</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
