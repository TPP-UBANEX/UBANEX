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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Edicion, Convocatoria, ParticipacionConvocatoria } from '@/data/types'
import {
  estadoBadge, EstadoEdicion, EstadoConvocatoria, RolUsuario,
  RolEjecucion, EstadoPropuestaEvaluador,
} from '@/data/types'
import { FileText, Users, DollarSign, ClipboardCheck, UserCheck } from 'lucide-react'

export function Dashboard() {
  const { user } = useAuth()
  const esGestion = user?.roles.some(r =>
    [RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado,
     RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria].includes(r),
  )
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [invitaciones, setInvitaciones] = useState<ParticipacionConvocatoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.proyectos.list(),
      api.convocatorias.list(),
      api.participaciones.listarMias().catch(() => []),
    ]).then(([e, c, p]) => {
      setEdiciones(e)
      setConvocatorias(c)
      setInvitaciones(p.filter(pc =>
        pc.rol === RolEjecucion.Evaluador && pc.estado === EstadoPropuestaEvaluador.Propuesto,
      ))
    }).finally(() => setLoading(false))
  }, [])

  const responder = async (participacion: ParticipacionConvocatoria, aceptada: boolean) => {
    try {
      await (aceptada
        ? api.participaciones.aceptar(participacion.id)
        : api.participaciones.declinar(participacion.id))
      toast.success(aceptada ? 'Aceptaste la propuesta como evaluador' : 'Declinaste la propuesta')
      setInvitaciones(prev => prev.filter(p => p.id !== participacion.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al responder la propuesta')
    }
  }

  const stats = [
    { label: 'Proyectos Activos', value: ediciones.filter(e => e.estado === EstadoEdicion.EnEjecucion).length, icon: Users, color: 'text-blue-600' },
    { label: 'Convocatorias Abiertas', value: convocatorias.filter(c => c.estado === EstadoConvocatoria.Presentacion).length, icon: FileText, color: 'text-green-600' },
    { label: 'Evaluaciones Pendientes', value: ediciones.filter(e => e.estado === EstadoEdicion.EnEvaluacion).length, icon: ClipboardCheck, color: 'text-amber-600' },
    { label: 'Rendiciones Pendientes', value: 0, icon: DollarSign, color: 'text-purple-600' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general del sistema UBANEX</p>
      </div>

      {!esGestion && invitaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Invitaciones a ser evaluador
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : invitaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenés invitaciones pendientes.</p>
            ) : (
              <div className="space-y-2">
                {invitaciones.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
                    <div className="text-sm">
                      <span className="font-medium">{p.convocatoria?.nombre || '—'}</span>
                      <Badge variant="outline" className="ml-2">Evaluador</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => responder(p, true)}>
                        Aceptar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => responder(p, false)}>
                        Declinar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Convocatorias Activas</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="flex gap-4">{[...Array(4)].map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}</div>)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convocatorias.filter(c => c.estado === EstadoConvocatoria.Presentacion || (c.estado === EstadoConvocatoria.Configuracion && esGestion)).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.nombre}</TableCell>
                      <TableCell><Badge variant={estadoBadge[c.estado]}>{c.estado}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.fechaInicioPresentacion}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.fechaFinPresentacion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Proyectos Recientes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-4">{[...Array(3)].map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}</div>)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ediciones.slice(0, 5).map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.proyecto?.nombre || 'Sin nombre'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.creadoPor?.nombreCompleto || '-'}</TableCell>
                      <TableCell><Badge variant={estadoBadge[e.estado]}>{e.estado}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
