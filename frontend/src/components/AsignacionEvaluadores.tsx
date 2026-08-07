import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { RolUsuario, RolEjecucion, EstadoValidacionDocente, EstadoPropuestaEvaluador } from '@/data/types'
import type { ParticipacionConvocatoria, Usuario } from '@/data/types'
import { camposPerfilFaltantes } from '@/data/perfil'
import { useAuth } from '@/lib/auth-context'
import { Loader2, Trash2, Check, X, Plus, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const CANTIDAD_EVALUADORES_POR_UA = 3

const estadoVariant: Record<EstadoPropuestaEvaluador, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [EstadoPropuestaEvaluador.Propuesto]: 'outline',
  [EstadoPropuestaEvaluador.Aceptada]: 'secondary',
  [EstadoPropuestaEvaluador.Declinada]: 'outline',
  [EstadoPropuestaEvaluador.Aprobado]: 'default',
  [EstadoPropuestaEvaluador.Rechazado]: 'destructive',
}

const estadoLabel: Record<EstadoPropuestaEvaluador, string> = {
  [EstadoPropuestaEvaluador.Propuesto]: 'Propuesto',
  [EstadoPropuestaEvaluador.Aceptada]: 'Aceptada',
  [EstadoPropuestaEvaluador.Declinada]: 'Declinada',
  [EstadoPropuestaEvaluador.Aprobado]: 'Aprobado',
  [EstadoPropuestaEvaluador.Rechazado]: 'Rechazado',
}

export function AsignacionEvaluadores({ convocatoriaId }: { convocatoriaId: string }) {
  const { user } = useAuth()
  const esSecretaria = user?.roles.some(
    r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  )
  const esRectorado = user?.roles.some(r => r === RolUsuario.AutoridadDeRectorado)

  const [participaciones, setParticipaciones] = useState<ParticipacionConvocatoria[]>([])
  const [docentes, setDocentes] = useState<Usuario[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState<ParticipacionConvocatoria | null>(null)
  const [accionEvaluador, setAccionEvaluador] = useState<{
    p: ParticipacionConvocatoria
    accion: 'aprobar' | 'rechazar'
  } | null>(null)
  const [confirmandoAccion, setConfirmandoAccion] = useState(false)

  const evaluadores = participaciones.filter(p => p.rol === RolEjecucion.Evaluador)
  const evaluadoresPropios = evaluadores.filter(
    p => p.usuario?.unidadAcademicaId === user?.unidadAcademicaId,
  )
  const activosPropios = evaluadoresPropios.filter(p =>
    p.estado === EstadoPropuestaEvaluador.Propuesto ||
    p.estado === EstadoPropuestaEvaluador.Aceptada ||
    p.estado === EstadoPropuestaEvaluador.Aprobado,
  )
  const aprobados = evaluadoresPropios.filter(p => p.estado === EstadoPropuestaEvaluador.Aprobado)
  const hayRechazados = evaluadoresPropios.some(p => p.estado === EstadoPropuestaEvaluador.Rechazado)

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [parts, usersRes, ediciones] = await Promise.all([
        api.participaciones.listar(convocatoriaId),
        api.usuarios.list({ rol: RolUsuario.Docente, limit: 100 }),
        api.proyectos.list({ convocatoriaId }),
      ])
      setParticipaciones(parts)
      const idsConProyecto = new Set(ediciones.map(e => e.creadoPorId))
      setDocentes(
        usersRes.data.filter(
          (u: Usuario) =>
            u.estadoValidacionDocente === EstadoValidacionDocente.Validado &&
            u.habilitado !== false &&
            !idsConProyecto.has(u.id) &&
            !parts.some((p: ParticipacionConvocatoria) => p.usuarioId === u.id),
        ),
      )
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (convocatoriaId) cargarDatos()
  }, [convocatoriaId])

  const cupoLleno = activosPropios.length >= CANTIDAD_EVALUADORES_POR_UA
  const cupoDisponible = Math.max(0, CANTIDAD_EVALUADORES_POR_UA - activosPropios.length)

  const toggleSeleccion = (id: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= cupoDisponible) return prev
      return [...prev, id]
    })
  }

  const handleProponer = async () => {
    if (selectedUserIds.length === 0) return
    setSubmitting(true)
    try {
      const resultados = await Promise.allSettled(
        selectedUserIds.map(usuarioId =>
          api.participaciones.asignar({
            usuarioId,
            convocatoriaId,
            rol: RolEjecucion.Evaluador,
          }),
        ),
      )
      const exitos = resultados.filter(r => r.status === 'fulfilled').length
      const errores = resultados.filter(r => r.status === 'rejected')
      if (errores.length > 0) {
        const primerError = (errores[0] as PromiseRejectedResult).reason
        toast.error(
          `${exitos} evaluadores propuestos, ${errores.length} no se pudieron proponer: ${primerError instanceof Error ? primerError.message : 'error desconocido'}`,
        )
      } else {
        toast.success(`${exitos} evaluadores propuestos correctamente`)
      }
      setSelectedUserIds([])
      setDialogOpen(false)
      cargarDatos()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDesasignar = async (id: string) => {
    try {
      await api.participaciones.desasignar(id)
      toast.success('Evaluador quitado correctamente')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al quitar evaluador')
    }
  }

  const confirmarAccionEvaluador = async () => {
    if (!accionEvaluador) return
    const { p, accion } = accionEvaluador
    setConfirmandoAccion(true)
    try {
      await api.participaciones.actualizarEstado(
        p.id,
        accion === 'aprobar' ? EstadoPropuestaEvaluador.Aprobado : EstadoPropuestaEvaluador.Rechazado,
      )
      toast.success(accion === 'aprobar' ? 'Evaluador aprobado' : 'Evaluador rechazado')
      setAccionEvaluador(null)
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar evaluador')
    } finally {
      setConfirmandoAccion(false)
    }
  }

  const porUA = useMemo(() => {
    const map = new Map<string, ParticipacionConvocatoria[]>()
    evaluadores.forEach(p => {
      const nombre = p.usuario?.unidadAcademica?.nombre || 'Sin Unidad Académica'
      const lista = map.get(nombre) || []
      lista.push(p)
      map.set(nombre, lista)
    })
    return Array.from(map.entries()).map(([nombre, lista]) => ({
      nombre,
      lista,
      aprobados: lista.filter(p => p.estado === EstadoPropuestaEvaluador.Aprobado).length,
    }))
  }, [evaluadores])

  return (
    <div className="space-y-6">
      {esSecretaria && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">
              Evaluadores de tu Unidad Académica: <span className="font-bold">{activosPropios.length}</span>/{CANTIDAD_EVALUADORES_POR_UA}
            </p>
            <Badge variant="default">{aprobados.length} aprobados</Badge>
          </div>

          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={cupoLleno}>
            <Plus className="h-4 w-4 mr-2" />Proponer evaluadores
          </Button>

          {cupoLleno && (
            <p className="text-sm text-muted-foreground">
              Alcanzaste el límite de {CANTIDAD_EVALUADORES_POR_UA} evaluadores activos.
            </p>
          )}
          {!cupoLleno && hayRechazados && (
            <p className="text-sm text-destructive">
              Hay evaluadores rechazados. Podés proponer un reemplazo por cada uno.
            </p>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Proponer evaluadores</DialogTitle>
                <DialogDescription>
                  Seleccioná los docentes validados de tu Unidad Académica para proponerlos como evaluadores.
                  Podés enviar hasta {cupoDisponible} en lote.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium">
                  Seleccionados: <span className="font-bold">{selectedUserIds.length}</span> / {cupoDisponible}
                </p>
                {docentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hay docentes validados disponibles. Los docentes con proyectos en esta convocatoria no pueden ser evaluadores.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border p-2">
                    {docentes.map(d => {
                      const seleccionado = selectedUserIds.includes(d.id)
                      const perfilIncompleto = camposPerfilFaltantes(d).length > 0
                      const deshabilitado = perfilIncompleto || (!seleccionado && selectedUserIds.length >= cupoDisponible)
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                            seleccionado ? 'bg-primary/10' : 'hover:bg-muted'
                          } ${deshabilitado ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={seleccionado}
                            disabled={deshabilitado}
                            onChange={() => toggleSeleccion(d.id)}
                          />
                          <span className="truncate">
                            {d.nombreCompleto}
                            {perfilIncompleto && (
                              <span className="ml-2 text-xs text-muted-foreground">— perfil incompleto</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleProponer} disabled={selectedUserIds.length === 0 || submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar propuesta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium">
          {esRectorado
            ? 'Evaluadores propuestos por Unidad Académica'
            : `Evaluadores de tu Unidad Académica (${evaluadoresPropios.length})`}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : esRectorado ? (
          porUA.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay evaluadores en esta convocatoria
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porUA.map(grupo => (
                  <Fragment key={grupo.nombre}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={4} className="font-semibold">
                        {grupo.nombre}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {grupo.aprobados}/{CANTIDAD_EVALUADORES_POR_UA} aprobados
                        </span>
                      </TableCell>
                    </TableRow>
                    {grupo.lista.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.usuario?.nombreCompleto || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.usuario?.email || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={estadoVariant[p.estado || EstadoPropuestaEvaluador.Propuesto]}>
                            {estadoLabel[p.estado || EstadoPropuestaEvaluador.Propuesto]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.estado === EstadoPropuestaEvaluador.Aceptada && (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setAccionEvaluador({ p, accion: 'aprobar' })}>
                                <Check className="h-4 w-4 mr-1 text-green-600" />Aprobar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setAccionEvaluador({ p, accion: 'rechazar' })}>
                                <X className="h-4 w-4 mr-1 text-destructive" />Rechazar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )
        ) : evaluadoresPropios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tu Unidad Académica aún no propuso evaluadores
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Unidad Académica</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluadoresPropios.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.usuario?.nombreCompleto || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.usuario?.email || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.usuario?.unidadAcademica?.nombre || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[p.estado || EstadoPropuestaEvaluador.Propuesto]}>
                      {estadoLabel[p.estado || EstadoPropuestaEvaluador.Propuesto]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmarEliminar(p)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!accionEvaluador} onOpenChange={o => { if (!o) setAccionEvaluador(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {accionEvaluador?.accion === 'aprobar'
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertTriangle className="h-5 w-5 text-destructive" />}
              {accionEvaluador?.accion === 'aprobar' ? 'Aprobar evaluador' : 'Rechazar evaluador'}
            </DialogTitle>
            <DialogDescription>
              {accionEvaluador?.accion === 'aprobar'
                ? <>¿Estás seguro de aprobar a <strong>{accionEvaluador.p.usuario?.nombreCompleto || 'este evaluador'}</strong> como evaluador de la convocatoria?</>
                : <>¿Estás seguro de rechazar a <strong>{accionEvaluador?.p.usuario?.nombreCompleto || 'este evaluador'}</strong> como evaluador de la convocatoria?</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAccionEvaluador(null)}>Cancelar</Button>
            <Button
              variant={accionEvaluador?.accion === 'aprobar' ? 'default' : 'destructive'}
              onClick={confirmarAccionEvaluador}
              disabled={confirmandoAccion}
            >
              {confirmandoAccion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmandoAccion ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmarEliminar} onOpenChange={v => { if (!v) setConfirmarEliminar(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quitar evaluador</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de quitar a{' '}
              <span className="font-semibold text-foreground">
                {confirmarEliminar?.usuario?.nombreCompleto || 'este evaluador'}
              </span>{' '}
              de la convocatoria?
              {confirmarEliminar?.estado === EstadoPropuestaEvaluador.Aceptada ||
                confirmarEliminar?.estado === EstadoPropuestaEvaluador.Aprobado ? (
                <span className="block mt-1 text-destructive">
                  Es un evaluador activo. Esta acción no se puede deshacer.
                </span>
              ) : (
                <span className="block mt-1">Esta acción no se puede deshacer.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarEliminar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmarEliminar) handleDesasignar(confirmarEliminar.id)
              setConfirmarEliminar(null)
            }}>
              Quitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
