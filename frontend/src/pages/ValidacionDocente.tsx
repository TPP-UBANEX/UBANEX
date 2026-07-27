import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Usuario } from '@/data/types'
import { RolUsuario, EstadoValidacionDocente } from '@/data/types'
import { Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export function ValidacionDocente() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [confirmAction, setConfirmAction] = useState<EstadoValidacionDocente | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.usuarios.list({ rol: RolUsuario.Docente, limit: 100 })
      setUsuarios(res.data)
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const pendientes = usuarios.filter(
    u => u.estadoValidacionDocente === EstadoValidacionDocente.PendienteDeValidacion,
  )

  const filtrados = search
    ? pendientes.filter(u =>
        u.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : pendientes

  const abrirConfirmacion = (usuario: Usuario, accion: EstadoValidacionDocente) => {
    setSelectedUser(usuario)
    setConfirmAction(accion)
    setConfirmOpen(true)
  }

  const ejecutarValidacion = async () => {
    if (!selectedUser || !confirmAction) return
    setSubmitting(true)
    try {
      await api.usuarios.actualizarEstadoValidacionDocente(selectedUser.id, confirmAction)
      toast.success(
        confirmAction === EstadoValidacionDocente.Validado
          ? `${selectedUser.nombreCompleto} validado correctamente`
          : `${selectedUser.nombreCompleto} rechazado`,
      )
      setConfirmOpen(false)
      cargarDatos()
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Validación de Docentes</h1>
        <p className="text-sm text-muted-foreground">
          Docentes pendientes de validación: {pendientes.length}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar docente..."
          className="pl-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Docentes Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'No se encontraron docentes' : 'No hay docentes pendientes de validación'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Unidad Académica</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombreCompleto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.unidadAcademica?.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => abrirConfirmacion(u, EstadoValidacionDocente.Validado)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />Validar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => abrirConfirmacion(u, EstadoValidacionDocente.Rechazado)}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction === EstadoValidacionDocente.Validado ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {confirmAction === EstadoValidacionDocente.Validado ? 'Validar docente' : 'Rechazar docente'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === EstadoValidacionDocente.Validado
                ? `¿Estás seguro de validar a ${selectedUser?.nombreCompleto}? Podrá participar como dirección o usuario evaluador en convocatorias.`
                : `¿Estás seguro de rechazar a ${selectedUser?.nombreCompleto}? No podrá participar hasta que sea validado.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={confirmAction === EstadoValidacionDocente.Validado ? 'default' : 'destructive'}
              onClick={ejecutarValidacion}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitting ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
