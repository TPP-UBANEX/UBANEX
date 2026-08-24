import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { RolUsuario, RolEjecucion, EstadoValidacionDocente } from '@/data/types'
import type { ParticipacionConvocatoria, Usuario } from '@/data/types'
import { camposPerfilFaltantes } from '@/data/perfil'
import { useAuth } from '@/lib/auth-context'
import { EvaluadorPerfilDialog } from '@/components/EvaluadorPerfilDialog'
import { Loader2, Trash2, Plus, UserRound } from 'lucide-react'
import { toast } from 'sonner'

const CANTIDAD_EVALUADORES_POR_UA = 3

export function AsignacionEvaluadores({ convocatoriaId }: { convocatoriaId: string }) {
  const { user } = useAuth()
  const esRectorado = user?.roles.some(r => r === RolUsuario.AutoridadDeRectorado)

  const [participaciones, setParticipaciones] = useState<ParticipacionConvocatoria[]>([])
  const [docentes, setDocentes] = useState<Usuario[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState<ParticipacionConvocatoria | null>(null)
  const [perfilUsuarioId, setPerfilUsuarioId] = useState<string | null>(null)
  const [perfilOpen, setPerfilOpen] = useState(false)

  const abrirPerfil = (usuarioId?: string) => {
    if (!usuarioId) return
    setPerfilUsuarioId(usuarioId)
    setPerfilOpen(true)
  }

  const evaluadores = participaciones.filter(p => p.rol === RolEjecucion.Evaluador)

  // Cantidad de evaluadores dados de alta por Unidad Académica.
  const altasPorUa = useMemo(() => {
    const map = new Map<string, number>()
    evaluadores.forEach(p => {
      const uaId = p.usuario?.unidadAcademicaId
      if (!uaId) return
      map.set(uaId, (map.get(uaId) ?? 0) + 1)
    })
    return map
  }, [evaluadores])

  // Seleccionados por UA en el diálogo, para no exceder el cupo al elegir en lote.
  const seleccionadosPorUa = useMemo(() => {
    const map = new Map<string, number>()
    selectedUserIds.forEach(id => {
      const uaId = docentes.find(d => d.id === id)?.unidadAcademicaId
      if (!uaId) return
      map.set(uaId, (map.get(uaId) ?? 0) + 1)
    })
    return map
  }, [selectedUserIds, docentes])

  const cupoLlenoParaUa = (uaId?: string | null) => {
    if (!uaId) return true
    return (altasPorUa.get(uaId) ?? 0) + (seleccionadosPorUa.get(uaId) ?? 0) >= CANTIDAD_EVALUADORES_POR_UA
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [parts, usersRes, ediciones] = await Promise.all([
        api.participaciones.listar(convocatoriaId),
        api.usuarios.list({ rol: RolUsuario.Docente, limit: 500 }),
        api.proyectos.todas({ convocatoriaId }),
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

  const toggleSeleccion = (d: Usuario) => {
    setSelectedUserIds(prev => {
      if (prev.includes(d.id)) return prev.filter(x => x !== d.id)
      if (cupoLlenoParaUa(d.unidadAcademicaId)) return prev
      return [...prev, d.id]
    })
  }

  const handleDarAlta = async () => {
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
          `${exitos} evaluadores dados de alta, ${errores.length} no se pudieron dar de alta: ${primerError instanceof Error ? primerError.message : 'error desconocido'}`,
        )
      } else {
        toast.success(`${exitos} evaluadores dados de alta correctamente`)
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
      toast.success('Evaluador dado de baja correctamente')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al dar de baja el evaluador')
    }
  }

  // Rectorado ve todas las UAs; Secretaría solo la propia.
  const evaluadoresVisibles = esRectorado
    ? evaluadores
    : evaluadores.filter(p => p.usuario?.unidadAcademicaId === user?.unidadAcademicaId)

  const porUA = useMemo(() => {
    const map = new Map<string, ParticipacionConvocatoria[]>()
    evaluadoresVisibles.forEach(p => {
      const nombre = p.usuario?.unidadAcademica?.nombre || 'Sin Unidad Académica'
      const lista = map.get(nombre) || []
      lista.push(p)
      map.set(nombre, lista)
    })
    return Array.from(map.entries()).map(([nombre, lista]) => ({ nombre, lista }))
  }, [evaluadoresVisibles])

  return (
    <div className="space-y-6">
      {esRectorado && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Dar de alta evaluadores
          </Button>
          <p className="text-sm text-muted-foreground">
            Según la resolución, seleccioná los docentes a dar de alta como evaluadores. Cada Unidad
            Académica admite hasta {CANTIDAD_EVALUADORES_POR_UA} evaluadores.
          </p>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Dar de alta evaluadores</DialogTitle>
                <DialogDescription>
                  Seleccioná los docentes validados a dar de alta como evaluadores. Cada Unidad
                  Académica admite hasta {CANTIDAD_EVALUADORES_POR_UA}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium">
                  Seleccionados: <span className="font-bold">{selectedUserIds.length}</span>
                </p>
                {docentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hay docentes validados disponibles. Los docentes con proyectos en esta
                    convocatoria no pueden ser evaluadores.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border p-2">
                    {docentes.map(d => {
                      const seleccionado = selectedUserIds.includes(d.id)
                      const perfilIncompleto = camposPerfilFaltantes(d).length > 0
                      const cupoLleno = !seleccionado && cupoLlenoParaUa(d.unidadAcademicaId)
                      const deshabilitado = perfilIncompleto || cupoLleno
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
                            onChange={() => toggleSeleccion(d)}
                          />
                          <span className="truncate">
                            {d.nombreCompleto}
                            <span className="ml-2 text-xs text-muted-foreground">
                              — {d.unidadAcademica?.nombre || 'sin UA'}
                            </span>
                            {perfilIncompleto && (
                              <span className="ml-2 text-xs text-muted-foreground">— perfil incompleto</span>
                            )}
                            {cupoLleno && (
                              <span className="ml-2 text-xs text-destructive">— cupo lleno</span>
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
                <Button onClick={handleDarAlta} disabled={selectedUserIds.length === 0 || submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar alta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium">
          {esRectorado
            ? 'Evaluadores por Unidad Académica'
            : `Evaluadores de tu Unidad Académica (${evaluadoresVisibles.length})`}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : porUA.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {esRectorado
              ? 'No hay evaluadores dados de alta en esta convocatoria'
              : 'Tu Unidad Académica aún no tiene evaluadores dados de alta'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                {esRectorado && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {porUA.map(grupo => (
                <Fragment key={grupo.nombre}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={esRectorado ? 3 : 2} className="font-semibold">
                      {grupo.nombre}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {grupo.lista.length}/{CANTIDAD_EVALUADORES_POR_UA}
                      </span>
                    </TableCell>
                  </TableRow>
                  {grupo.lista.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-left hover:text-primary hover:underline"
                          onClick={() => abrirPerfil(p.usuario?.id)}
                        >
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.usuario?.nombreCompleto || '—'}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.usuario?.email || '—'}</TableCell>
                      {esRectorado && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setConfirmarEliminar(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!confirmarEliminar} onOpenChange={v => { if (!v) setConfirmarEliminar(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dar de baja evaluador</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de dar de baja a{' '}
              <span className="font-semibold text-foreground">
                {confirmarEliminar?.usuario?.nombreCompleto || 'este evaluador'}
              </span>{' '}
              de la convocatoria? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarEliminar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmarEliminar) handleDesasignar(confirmarEliminar.id)
              setConfirmarEliminar(null)
            }}>
              Dar de baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EvaluadorPerfilDialog
        usuarioId={perfilUsuarioId}
        open={perfilOpen}
        onOpenChange={setPerfilOpen}
      />
    </div>
  )
}
