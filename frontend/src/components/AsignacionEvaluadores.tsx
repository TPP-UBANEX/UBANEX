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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { RolUsuario, RolEjecucion } from '@/data/types'
import type { ParticipacionConvocatoria, Usuario, UnidadAcademica } from '@/data/types'
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
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([])
  const [idsConProyecto, setIdsConProyecto] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [confirmarEliminar, setConfirmarEliminar] = useState<ParticipacionConvocatoria | null>(null)
  const [perfilUsuarioId, setPerfilUsuarioId] = useState<string | null>(null)
  const [perfilOpen, setPerfilOpen] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [uaSeleccionadaId, setUaSeleccionadaId] = useState<string>('')
  const [candidatos, setCandidatos] = useState<Usuario[]>([])
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const abrirPerfil = (usuarioId?: string) => {
    if (!usuarioId) return
    setPerfilUsuarioId(usuarioId)
    setPerfilOpen(true)
  }

  const evaluadores = participaciones.filter(p => p.rol === RolEjecucion.Evaluador)

  // Evaluadores dados de alta por Unidad Académica.
  const altasPorUa = useMemo(() => {
    const map = new Map<string, number>()
    evaluadores.forEach(p => {
      const uaId = p.usuario?.unidadAcademicaId
      if (!uaId) return
      map.set(uaId, (map.get(uaId) ?? 0) + 1)
    })
    return map
  }, [evaluadores])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [parts, ediciones, uas] = await Promise.all([
        api.participaciones.listar(convocatoriaId),
        api.proyectos.todas({ convocatoriaId }),
        esRectorado ? api.unidadesAcademicas.list() : Promise.resolve([] as UnidadAcademica[]),
      ])
      setParticipaciones(parts)
      setIdsConProyecto(new Set(ediciones.map(e => e.creadoPorId)))
      setUnidades(uas)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (convocatoriaId) cargarDatos()
  }, [convocatoriaId])

  const cargarCandidatos = async (uaId: string) => {
    setLoadingCandidatos(true)
    setSelectedUserIds([])
    setBusqueda('')
    try {
      const cands = await api.participaciones.candidatos({ unidadAcademicaId: uaId, convocatoriaId })
      // El endpoint ya excluye directores/codirectores y evaluadores existentes;
      // acá removemos además a quienes crearon proyectos en la convocatoria.
      setCandidatos(cands.filter(c => !idsConProyecto.has(c.id)))
    } catch {
      toast.error('Error al cargar los candidatos')
      setCandidatos([])
    } finally {
      setLoadingCandidatos(false)
    }
  }

  const seleccionarUa = (uaId: string) => {
    setUaSeleccionadaId(uaId)
    cargarCandidatos(uaId)
  }

  const cupoDisponible = uaSeleccionadaId
    ? Math.max(0, CANTIDAD_EVALUADORES_POR_UA - (altasPorUa.get(uaSeleccionadaId) ?? 0))
    : 0

  const toggleSeleccion = (id: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= cupoDisponible) return prev
      return [...prev, id]
    })
  }

  const abrirDialogo = () => {
    setUaSeleccionadaId('')
    setCandidatos([])
    setSelectedUserIds([])
    setBusqueda('')
    setDialogOpen(true)
  }

  // Disponibles para agregar (perfil completo) primero, luego los no habilitados
  // (perfil incompleto); cada grupo por orden alfabético. Filtra por nombre.
  const candidatosOrdenados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return candidatos
      .map(d => ({ usuario: d, perfilIncompleto: camposPerfilFaltantes(d).length > 0 }))
      .filter(c => c.usuario.nombreCompleto?.toLowerCase().includes(termino))
      .sort((a, b) => {
        if (a.perfilIncompleto !== b.perfilIncompleto) return a.perfilIncompleto ? 1 : -1
        return (a.usuario.nombreCompleto || '').localeCompare(b.usuario.nombreCompleto || '', 'es')
      })
  }, [candidatos, busqueda])

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
          <Button size="sm" onClick={abrirDialogo}>
            <Plus className="h-4 w-4 mr-2" />Dar de alta evaluadores
          </Button>
          <p className="text-sm text-muted-foreground">
            Según la resolución, seleccioná la Unidad Académica y los docentes a dar de alta como
            evaluadores. Cada Unidad Académica admite hasta {CANTIDAD_EVALUADORES_POR_UA}.
          </p>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Dar de alta evaluadores</DialogTitle>
                <DialogDescription>
                  Elegí una Unidad Académica y seleccioná los docentes validados a dar de alta como
                  evaluadores. Cada Unidad Académica admite hasta {CANTIDAD_EVALUADORES_POR_UA}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Select value={uaSeleccionadaId} onValueChange={seleccionarUa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí una Unidad Académica" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map(ua => {
                      const altas = altasPorUa.get(ua.id) ?? 0
                      return (
                        <SelectItem key={ua.id} value={ua.id}>
                          {ua.nombre} — {altas}/{CANTIDAD_EVALUADORES_POR_UA}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {uaSeleccionadaId && (
                  <p className="text-sm font-medium">
                    Seleccionados: <span className="font-bold">{selectedUserIds.length}</span> / {cupoDisponible}
                  </p>
                )}

                {!uaSeleccionadaId ? (
                  <p className="text-xs text-muted-foreground">
                    Elegí una Unidad Académica para ver sus docentes disponibles.
                  </p>
                ) : loadingCandidatos ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : cupoDisponible === 0 ? (
                  <p className="text-xs text-destructive">
                    Esta Unidad Académica ya alcanzó el límite de {CANTIDAD_EVALUADORES_POR_UA} evaluadores.
                  </p>
                ) : candidatos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No hay docentes validados disponibles en esta Unidad Académica. Los docentes con
                    proyectos en esta convocatoria no pueden ser evaluadores.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar por nombre..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    />
                    {candidatosOrdenados.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1">
                        Ningún docente coincide con la búsqueda.
                      </p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border p-2">
                        {candidatosOrdenados.map(({ usuario: d, perfilIncompleto }) => {
                          const seleccionado = selectedUserIds.includes(d.id)
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
