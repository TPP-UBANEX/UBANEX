import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Proyecto, Edicion, Presupuesto, ViaticoPresupuesto, BienPresupuesto, ParticipacionConvocatoria, Usuario, CrearParticipacionDto, UnidadAcademica, CampoFormulario, SugerenciaCambio } from '@/data/types'
import { estadoBadge, estadoEdicionLabel, EstadoEdicion, TipoRubro, TipoPersona, RolUsuario, RolEjecucion, EstadoSugerencia, EstadoValidacionDocente, TipoCampo, MAX_LONGITUD_POR_TIPO } from '@/data/types'
import {
  camposPerfilDocente,
  camposPerfilFaltantes,
  generoOptions,
  cargoDocenteOptions,
  tipoDesignacionDocenteOptions,
  personaConDiscapacidadOptions,
} from '@/data/perfil'
import { CampoSugerible } from '@/components/CampoSugerible'
import { SugerirCambioModal } from '@/components/SugerirCambioModal'
import { SugerenciasTab } from '@/components/SugerenciasTab'
import {
  CampoFormularioInput,
  EtiquetaCampoFormulario,
  TextoLargoColapsable,
  campoFormularioVacio,
  formatearValorCampoFormulario,
} from '@/components/CampoFormularioInput'
import { ArrowLeft, Loader2, Pencil, Send, Save, Plus, Trash2, MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'

const tipoRubroLabels: Record<TipoRubro, string> = {
  [TipoRubro.ViaticosYSeguros]: 'Viáticos y Seguros',
  [TipoRubro.BienesDeConsumo]: 'Bienes de Consumo',
  [TipoRubro.BienesDeUso]: 'Bienes de Uso',
}

export function ProyectoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const TABS = ['info', 'direccion', 'presupuesto', 'evaluaciones', 'rendiciones', 'cierre', 'sugerencias'] as const
  const [tabActivo, setTabActivo] = useState<string>(() => {
    const t = searchParams.get('tab')
    return t && (TABS as readonly string[]).includes(t) ? t : 'info'
  })
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && (TABS as readonly string[]).includes(t)) setTabActivo(t)
  }, [searchParams])

  const [editando, setEditando] = useState(false)
  const [editNombre, setEditNombre] = useState('')
  const [editAnioEdicion, setEditAnioEdicion] = useState<number | null>(null)
  const [editEsConsolidado, setEditEsConsolidado] = useState(false)
  const [editEsInterfacultad, setEditEsInterfacultad] = useState(false)
  const [editPresupuesto, setEditPresupuesto] = useState<Presupuesto | null>(null)
  const [editDatosFormulario, setEditDatosFormulario] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)

  const [camposFormulario, setCamposFormulario] = useState<CampoFormulario[]>([])
  const [directores, setDirectores] = useState<ParticipacionConvocatoria[]>([])
  const [showAsignarDirector, setShowAsignarDirector] = useState(false)

  const [uas, setUas] = useState<UnidadAcademica[]>([])
  const [candidatosDireccion, setCandidatosDireccion] = useState<Usuario[]>([])
  const [candidatosCodireccion, setCandidatosCodireccion] = useState<Usuario[]>([])
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)
  const [editDirectorId, setEditDirectorId] = useState('')
  const [editCodirectorId, setEditCodirectorId] = useState('')
  const [editDirectorUaId, setEditDirectorUaId] = useState('')
  const [editCodirectorUaId, setEditCodirectorUaId] = useState('')

  const [modoSugerencia, setModoSugerencia] = useState(false)
  const [sugerenciasPropias, setSugerenciasPropias] = useState<SugerenciaCambio[]>([])
  const [sugerenciaModal, setSugerenciaModal] = useState<{
    open: boolean
    campo: string
    valorActual: string
    label: string
    valorSugeridoInicial: string
    comentarioInicial: string
  }>({
    open: false, campo: '', valorActual: '', label: '', valorSugeridoInicial: '', comentarioInicial: '',
  })

  // Tipo del campo del formulario sobre el que se está sugiriendo (null si es un campo fijo del proyecto).
  const tipoCampoSugerido = sugerenciaModal.campo.startsWith('datosFormulario.')
    ? camposFormulario.find(c => c.id === sugerenciaModal.campo.replace('datosFormulario.', ''))?.tipo ?? null
    : null

  const esPropietario = edicion?.creadoPorId === user?.id
  const esEditable = esPropietario && edicion?.estado === EstadoEdicion.Borrador
  const esSecretaria = user?.roles.some(
    r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  )
  const puedeAsignarDirector = user?.roles.some(r =>
    [RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria, RolUsuario.AutoridadDeRectorado].includes(r),
  )
  const esDocenteValidado = user?.roles.includes(RolUsuario.Docente) &&
    user?.estadoValidacionDocente === 'Validado'
  const tieneDirectorPrincipal = directores.some(d => d.esDirectorPrincipal)
  const tieneSegundoDirector = directores.filter(
    d => d.rol === RolEjecucion.DirectorDeProyecto,
  ).length >= 2
  const directoresCompletos = tieneDirectorPrincipal && tieneSegundoDirector
  const camposObligatoriosFaltantes = camposFormulario.filter(
    c => c.esObligatorio && campoFormularioVacio(c, edicion?.datosFormulario?.[c.id]),
  )
  const puedeEnviar = esPropietario && esDocenteValidado && directoresCompletos && camposObligatoriosFaltantes.length === 0
  const esDocente = user?.roles.includes(RolUsuario.Docente)
  const esMismaUA = user?.unidadAcademicaId === edicion?.unidadAcademicaId
  const esSecretariaMismaUA = esSecretaria && esMismaUA

  const nombreUnidadesAcademicas = () => {
    const principal = edicion?.unidadAcademica?.nombre
    const adicionalId = proyecto?.esInterfacultad ? proyecto.unidadAcademicaAdicionalId : undefined
    const adicional = adicionalId && adicionalId !== edicion?.unidadAcademicaId
      ? proyecto?.unidadAcademicaAdicional?.nombre
      : undefined
    if (principal && adicional) return `${principal} y ${adicional}`
    return principal || 'Sin UA'
  }

  const nombreConUA = (d: ParticipacionConvocatoria | undefined) => {
    if (!d?.usuario) return '-'
    const ua = d.usuario.unidadAcademica?.nombre
    return ua ? `${d.usuario.nombreCompleto} (${ua})` : d.usuario.nombreCompleto
  }

  const motivoEnvio = !esDocenteValidado
    ? 'Tu usuario no está validado'
    : !directoresCompletos
      ? 'El proyecto no tiene usuarios de dirección ni codirección asignados aún'
      : camposObligatoriosFaltantes.length > 0
        ? `Faltan completar campos obligatorios: ${camposObligatoriosFaltantes.map(c => c.nombre).join(', ')}`
        : ''

  const cargarDatos = async () => {
    if (!id) return
    setLoading(true)
    try {
      const p = await api.proyectos.get(id)
      setProyecto(p)
      const eds = p.ediciones || []
      const ed = eds.length > 0 ? eds[0] : null
      setEdicion(ed)

      if (ed) {
        setEdicion(ed)
        if (ed.convocatoriaId) {
          const [participaciones, formulario] = await Promise.all([
            api.participaciones.listar(ed.convocatoriaId),
            api.convocatorias.formulario.get(ed.convocatoriaId),
          ])
          setDirectores(participaciones.filter(p => p.rol === RolEjecucion.DirectorDeProyecto && p.edicionId === ed.id))
          setCamposFormulario((formulario.campos ?? []).slice().sort((a, b) => a.orden - b.orden))
        }
      }
    } catch {
      toast.error('Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  useEffect(() => {
    api.unidadesAcademicas.list()
      .then(setUas)
      .catch(() => toast.error('Error al cargar unidades académicas'))
  }, [])

  useEffect(() => {
    if (!modoSugerencia || !edicion?.id || !user?.id) return
    api.sugerencias.listar(edicion.id)
      .then(data =>
        setSugerenciasPropias(
          data.filter(s =>
            s.sugeridoPor?.id === user.id && s.estado === EstadoSugerencia.Pendiente,
          ),
        ),
      )
      .catch(() => toast.error('Error al cargar sugerencias'))
  }, [modoSugerencia, edicion?.id, user?.id])

  const cargarCandidatos = async (uaId: string, setter: (u: Usuario[]) => void) => {
    if (!edicion) return
    setLoadingCandidatos(true)
    try {
      const res = await api.participaciones.candidatos({
        unidadAcademicaId: uaId,
        convocatoriaId: edicion.convocatoriaId,
        edicionId: edicion.id,
        incluirBloqueados: true,
      })
      setter(res)
    } catch {
      toast.error('Error al cargar docentes candidatos')
    } finally {
      setLoadingCandidatos(false)
    }
  }

  const nombreUA = (uaId?: string) => uas.find(u => u.id === uaId)?.nombre ?? 'Sin UA'

  const motivoCandidato = (u: Usuario): string | null => {
    if (u.ocupado) return 'Participa de otro proyecto'
    if (u.estadoValidacionDocente && u.estadoValidacionDocente !== EstadoValidacionDocente.Validado) {
      return 'No validado'
    }
    if (u.habilitado === false) return 'Deshabilitado'
    return null
  }

  const directorPrincipalUsuario = directores.find(d => d.esDirectorPrincipal)?.usuario
  const codirectorUsuario = directores.find(d => !d.esDirectorPrincipal)?.usuario

  const opcionesDireccion = [
    ...candidatosDireccion,
    ...(directorPrincipalUsuario && directorPrincipalUsuario.unidadAcademica?.id === editDirectorUaId
      ? [directorPrincipalUsuario]
      : []),
  ]
    .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)

  const opcionesCodireccion = [
    ...candidatosCodireccion,
    ...(codirectorUsuario && codirectorUsuario.unidadAcademica?.id === editCodirectorUaId
      ? [codirectorUsuario]
      : []),
  ]
    .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)

  const motivoDireccion = (() => {
    if (!editEsInterfacultad || !edicion) return ''
    const uaCreador = edicion.unidadAcademicaId
    if (editDirectorUaId !== uaCreador && editCodirectorUaId !== uaCreador) {
      return `Una unidad académica participante tiene que ser ${nombreUA(uaCreador)}`
    }
    if (editDirectorUaId === editCodirectorUaId) {
      return 'La dirección y la codirección deben pertenecer a unidades académicas distintas para ser interfacultad'
    }
    return ''
  })()

  const toggleInterfacultad = (v: boolean) => {
    setEditEsInterfacultad(v)
    setEditDirectorId('')
    setEditCodirectorId('')
    const uaCreador = edicion?.unidadAcademicaId ?? ''
    if (v) {
      const uaDirector = directorPrincipalUsuario?.unidadAcademica?.id ?? uaCreador
      const uaCodirector = codirectorUsuario?.unidadAcademica?.id
        ?? (proyecto?.unidadAcademicaAdicionalId && proyecto.unidadAcademicaAdicionalId !== uaCreador
          ? proyecto.unidadAcademicaAdicionalId
          : uaCreador)
      setEditDirectorUaId(uaDirector)
      setEditCodirectorUaId(uaCodirector)
      if (edicion) {
        cargarCandidatos(uaDirector, setCandidatosDireccion)
        cargarCandidatos(uaCodirector, setCandidatosCodireccion)
      }
    } else {
      setEditDirectorUaId(uaCreador)
      setEditCodirectorUaId(uaCreador)
      if (edicion) {
        cargarCandidatos(uaCreador, setCandidatosDireccion)
        cargarCandidatos(uaCreador, setCandidatosCodireccion)
      }
    }
  }

  const handleCambioDirectorUA = (uaId: string) => {
    setEditDirectorUaId(uaId)
    setEditDirectorId('')
    cargarCandidatos(uaId, setCandidatosDireccion)
  }

  const handleCambioCodirectorUA = (uaId: string) => {
    setEditCodirectorUaId(uaId)
    setEditCodirectorId('')
    cargarCandidatos(uaId, setCandidatosCodireccion)
  }

  const iniciarEdicion = () => {
    if (!proyecto || !edicion) return
    setEditNombre(proyecto.nombre)
    setEditAnioEdicion(edicion.anioEdicion ?? null)
    setEditEsConsolidado(proyecto.esConsolidado)
    setEditEsInterfacultad(proyecto.esInterfacultad)
    setEditPresupuesto(edicion.presupuesto ? JSON.parse(JSON.stringify(edicion.presupuesto)) : null)
    setEditDirectorId(directores.find(d => d.esDirectorPrincipal)?.usuarioId ?? '')
    setEditCodirectorId(directores.find(d => !d.esDirectorPrincipal)?.usuarioId ?? '')
    const uaDirector = directores.find(d => d.esDirectorPrincipal)?.usuario?.unidadAcademica?.id ?? edicion.unidadAcademicaId
    const uaCodirector = directores.find(d => !d.esDirectorPrincipal)?.usuario?.unidadAcademica?.id
      ?? (proyecto.esInterfacultad ? proyecto.unidadAcademicaAdicionalId : edicion.unidadAcademicaId)
      ?? edicion.unidadAcademicaId
    setEditDirectorUaId(uaDirector)
    setEditCodirectorUaId(uaCodirector)
    setEditDatosFormulario(edicion.datosFormulario ? JSON.parse(JSON.stringify(edicion.datosFormulario)) : {})
    setEditando(true)
    cargarCandidatos(uaDirector, setCandidatosDireccion)
    cargarCandidatos(uaCodirector, setCandidatosCodireccion)
  }

  const cancelarEdicion = () => {
    setEditando(false)
  }

  const sincronizarDirecciones = async () => {
    if (!edicion) return
    const deseado: { usuarioId: string; esDirectorPrincipal: boolean }[] = []
    if (editDirectorId) deseado.push({ usuarioId: editDirectorId, esDirectorPrincipal: true })
    if (editCodirectorId) deseado.push({ usuarioId: editCodirectorId, esDirectorPrincipal: false })

    const actual = directores

    const crear = deseado.filter(des =>
      !actual.some(p => p.usuarioId === des.usuarioId && p.esDirectorPrincipal === des.esDirectorPrincipal),
    )
    const borrar = actual.filter(p =>
      !deseado.some(des => des.usuarioId === p.usuarioId && des.esDirectorPrincipal === p.esDirectorPrincipal),
    )

    for (const p of borrar) {
      await api.participaciones.desasignar(p.id)
    }
    for (const des of crear) {
      await api.participaciones.asignar({
        usuarioId: des.usuarioId,
        convocatoriaId: edicion.convocatoriaId,
        rol: RolEjecucion.DirectorDeProyecto,
        edicionId: edicion.id,
        esDirectorPrincipal: des.esDirectorPrincipal,
      })
    }
  }

  const handleGuardar = async () => {
    if (!id || !edicion) return
    if (motivoDireccion) {
      toast.error(motivoDireccion)
      return
    }
    setGuardando(true)
    try {
      const uaCreador = edicion.unidadAcademicaId
      const unidadAcademicaAdicionalId = editEsInterfacultad
        ? (editDirectorUaId !== uaCreador ? editDirectorUaId : editCodirectorUaId)
        : null
      await api.proyectos.actualizarEdicion(id, edicion.id, {
        nombre: editNombre,
        anioEdicion: editAnioEdicion ?? undefined,
        esConsolidado: editEsConsolidado,
        esInterfacultad: editEsInterfacultad,
        unidadAcademicaAdicionalId,
        presupuesto: editPresupuesto || undefined,
        datosFormulario: editDatosFormulario,
      })
      await sincronizarDirecciones()
      toast.success('Proyecto actualizado')
      setEditando(false)
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEnviar = async () => {
    if (!id || !edicion) return
    setEnviando(true)
    try {
      await api.proyectos.enviarEdicion(id, edicion.id)
      toast.success('Proyecto enviado para corrección')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminar = async () => {
    if (!id || !edicion) return
    setEliminando(true)
    try {
      await api.proyectos.eliminarEdicion(id, edicion.id)
      toast.success('Proyecto eliminado')
      navigate('/proyectos')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setEliminando(false)
      setConfirmarEliminar(false)
    }
  }

  const handleSugerirClick = (campo: string, valorActual: string, label: string) => {
    const previa = sugerenciasPropias.find(s => s.campo === campo)
    setSugerenciaModal({
      open: true,
      campo,
      valorActual,
      label,
      valorSugeridoInicial: previa?.valorSugerido ?? '',
      comentarioInicial: previa?.comentario ?? '',
    })
  }

  const presupuestoVacio = (): Presupuesto => ({
    montoTotal: 0,
    rubros: [
      { tipo: TipoRubro.ViaticosYSeguros, subtotal: 0, partidas: [] },
      { tipo: TipoRubro.BienesDeConsumo, subtotal: 0, partidas: [] },
      { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
    ],
  })

  const addPartida = (rubroIdx: number, tipo: TipoRubro) => {
    const actual = editPresupuesto || presupuestoVacio()
    const rubros = [...actual.rubros]
    const rubro = { ...rubros[rubroIdx] }
    if (tipo === TipoRubro.ViaticosYSeguros) {
      const partidas = [...(rubro.partidas as ViaticoPresupuesto[])]
      partidas.push({ tipoPersona: TipoPersona.Docente, descripcion: '', periodoInicio: '', periodoFin: '', monto: 0 })
      rubro.partidas = partidas
    } else {
      const partidas = [...(rubro.partidas as BienPresupuesto[])]
      partidas.push({ descripcion: '', cantidad: 1, precioUnitario: 0, monto: 0 })
      rubro.partidas = partidas
    }
    rubros[rubroIdx] = rubro
    setEditPresupuesto(recalcularPresupuesto({ ...actual, rubros }))
  }

  const removePartida = (rubroIdx: number, partidaIdx: number) => {
    if (!editPresupuesto) return
    const rubros = [...editPresupuesto.rubros]
    const rubro = { ...rubros[rubroIdx] }
    const partidas = rubro.partidas
    if (rubro.tipo === TipoRubro.ViaticosYSeguros) {
      rubro.partidas = (partidas as ViaticoPresupuesto[]).filter((_, i) => i !== partidaIdx)
    } else {
      rubro.partidas = (partidas as BienPresupuesto[]).filter((_, i) => i !== partidaIdx)
    }
    rubros[rubroIdx] = rubro
    setEditPresupuesto(recalcularPresupuesto({ ...editPresupuesto, rubros }))
  }

  const updateViatico = (rubroIdx: number, pIdx: number, field: keyof ViaticoPresupuesto, value: string | number) => {
    if (!editPresupuesto) return
    const rubros = [...editPresupuesto.rubros]
    const rubro = { ...rubros[rubroIdx] }
    const partidas = [...(rubro.partidas as ViaticoPresupuesto[])]
    partidas[pIdx] = { ...partidas[pIdx], [field]: value }
    if (field === 'monto') {
      rubro.subtotal = partidas.reduce((sum, p) => sum + p.monto, 0)
    }
    rubro.partidas = partidas
    rubros[rubroIdx] = rubro
    setEditPresupuesto(recalcularPresupuesto({ ...editPresupuesto, rubros }))
  }

  const updateBien = (rubroIdx: number, pIdx: number, field: keyof BienPresupuesto, value: string | number) => {
    if (!editPresupuesto) return
    const rubros = [...editPresupuesto.rubros]
    const rubro = { ...rubros[rubroIdx] }
    const partidas = [...(rubro.partidas as BienPresupuesto[])]
    partidas[pIdx] = { ...partidas[pIdx], [field]: value }
    if (field === 'cantidad' || field === 'precioUnitario') {
      partidas[pIdx].monto = partidas[pIdx].cantidad * partidas[pIdx].precioUnitario
    }
    rubro.subtotal = partidas.reduce((sum, p) => sum + p.monto, 0)
    rubro.partidas = partidas
    rubros[rubroIdx] = rubro
    setEditPresupuesto(recalcularPresupuesto({ ...editPresupuesto, rubros }))
  }

  const recalcularPresupuesto = (p: Presupuesto): Presupuesto => ({
    ...p,
    montoTotal: p.rubros.reduce((sum, r) => sum + r.subtotal, 0),
  })

  if (loading) return <ProyectoDetailSkeleton />

  if (!proyecto) return <div className="p-6"><p className="text-muted-foreground">Proyecto no encontrado</p></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {edicion && <Badge variant={estadoBadge[edicion.estado]}>{estadoEdicionLabel[edicion.estado] || edicion.estado}</Badge>}
          </div>
          {edicion && (
            <p className="text-sm text-muted-foreground">
              {edicion?.creadoPor?.nombreCompleto || 'Sin creador'} · {nombreUnidadesAcademicas()}
              {edicion.convocatoria && ` · ${edicion.convocatoria.nombre}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {esEditable && !editando && (
            <>
              <Button variant="outline" onClick={iniciarEdicion}>
                <Pencil className="h-4 w-4 mr-2" />Editar Proyecto
              </Button>
              {esDocente && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button onClick={handleEnviar} disabled={!puedeEnviar || enviando}>
                          {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Enviar para corrección
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {motivoEnvio && (
                      <TooltipContent>
                        <p>{motivoEnvio}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button variant="destructive" onClick={() => setConfirmarEliminar(true)} disabled={eliminando}>
                {eliminando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Eliminar Proyecto
              </Button>
            </>
          )}
          {editando && (
            <>
              <Button variant="outline" onClick={cancelarEdicion}>Cancelar</Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button onClick={handleGuardar} disabled={guardando || !!motivoDireccion}>
                        {guardando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {motivoDireccion && (
                    <TooltipContent>
                      <p>{motivoDireccion}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          {!editando && esSecretariaMismaUA && !modoSugerencia && edicion?.estado === EstadoEdicion.Presentado && (
            <Button variant="outline" onClick={() => setModoSugerencia(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />Sugerir
            </Button>
          )}
          {modoSugerencia && (
            <Button variant="ghost" onClick={() => setModoSugerencia(false)}>
              <X className="h-4 w-4 mr-2" />Cancelar sugerencia
            </Button>
          )}
          {!editando && esSecretaria && edicion?.estado === EstadoEdicion.Presentado && (
            <>
              <Button onClick={() => toast('Iniciar evaluación — funcionalidad pendiente')}>
                Iniciar evaluación
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Creado por</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{edicion?.creadoPor?.nombreCompleto || '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Unidad Académica</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{nombreUnidadesAcademicas()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Dirección</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Dirección:</span>{' '}
                {nombreConUA(directores.find(d => d.esDirectorPrincipal))}
              </div>
              <div>
                <span className="text-muted-foreground">Codirección:</span>{' '}
                {nombreConUA(directores.find(d => !d.esDirectorPrincipal))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Edición</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{edicion?.anioEdicion || '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Presupuesto</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-bold">${(edicion?.presupuesto?.montoTotal ?? 0).toLocaleString()}</p></CardContent>
        </Card>
        {puedeAsignarDirector && (
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowAsignarDirector(true)}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Asignar usuario de dirección</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">+ Agregar usuario de dirección</p></CardContent>
          </Card>
        )}
      </div>

      <Tabs value={tabActivo} onValueChange={setTabActivo}>
        <TabsList>
          <TabsTrigger value="info">Resumen</TabsTrigger>
          <TabsTrigger value="direccion">Dirección</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
          <TabsTrigger value="rendiciones">Rendiciones</TabsTrigger>
          <TabsTrigger value="cierre">Cierre</TabsTrigger>
          <TabsTrigger value="sugerencias">Sugerencias</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          {editando ? (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Editar proyecto</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Nombre del proyecto</p>
                      <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Edición (año)</p>
                    <Input
                      type="number"
                      min={2000}
                      max={2100}
                      value={editAnioEdicion ?? ''}
                      onChange={e => setEditAnioEdicion(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">¿Es consolidado?</p>
                      <div className="flex gap-2">
                        <Button type="button" variant={editEsConsolidado ? 'default' : 'outline'} size="sm" onClick={() => setEditEsConsolidado(true)}>Sí</Button>
                        <Button type="button" variant={!editEsConsolidado ? 'default' : 'outline'} size="sm" onClick={() => setEditEsConsolidado(false)}>No</Button>
                      </div>
                    </div>
                  {camposFormulario.map(campo => (
                    <CampoFormularioInput
                      key={campo.id}
                      campo={campo}
                      valor={editDatosFormulario[campo.id]}
                      onChange={v => setEditDatosFormulario(prev => ({ ...prev, [campo.id]: v }))}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {esPropietario && edicion?.estado === EstadoEdicion.Borrador && camposObligatoriosFaltantes.length > 0 && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  Faltan completar {camposObligatoriosFaltantes.length === 1 ? '1 campo obligatorio' : `${camposObligatoriosFaltantes.length} campos obligatorios`} para poder enviar: {camposObligatoriosFaltantes.map(c => c.nombre).join(', ')}.
                </div>
              )}
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Detalle del proyecto</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>{' '}
                      <CampoSugerible campo="nombre" valorActual={proyecto.nombre} label="Nombre" activo={modoSugerencia} onClick={handleSugerirClick}>
                        {proyecto.nombre}
                      </CampoSugerible>
                    </div>
                    <div><span className="text-muted-foreground">Creado por:</span> {edicion?.creadoPor?.nombreCompleto || '-'}</div>
                    <div><span className="text-muted-foreground">Unidad Académica:</span> {nombreUnidadesAcademicas()}</div>
                    <div><span className="text-muted-foreground">Convocatoria:</span> {edicion?.convocatoria?.nombre || '-'}</div>
                    <div>
                      <span className="text-muted-foreground">Edición:</span>{' '}
                      <CampoSugerible campo="anioEdicion" valorActual={String(edicion?.anioEdicion ?? '')} label="Año de edición" activo={modoSugerencia} onClick={handleSugerirClick}>
                        {edicion?.anioEdicion || '-'}
                      </CampoSugerible>
                    </div>
                    <div><span className="text-muted-foreground">Estado:</span> {estadoEdicionLabel[edicion?.estado ?? ''] || edicion?.estado || '-'}</div>
                    <div>
                      <span className="text-muted-foreground">Consolidado:</span>{' '}
                      <CampoSugerible campo="esConsolidado" valorActual={String(proyecto.esConsolidado)} label="Es consolidado" activo={modoSugerencia} onClick={handleSugerirClick}>
                        {proyecto.esConsolidado ? 'Sí' : 'No'}
                      </CampoSugerible>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interfacultad:</span>{' '}
                      <CampoSugerible campo="esInterfacultad" valorActual={String(proyecto.esInterfacultad)} label="Es interfacultad" activo={modoSugerencia} onClick={handleSugerirClick}>
                        {proyecto.esInterfacultad ? 'Sí' : 'No'}
                      </CampoSugerible>
                    </div>
                    {camposFormulario.map(campo => {
                      const valorFormateado = formatearValorCampoFormulario(campo, edicion?.datosFormulario?.[campo.id])
                      // Los campos de texto largo ocupan las dos columnas, en su posición según el orden definido.
                      const esTextoLargo = campo.tipo === TipoCampo.TextoLargo
                      return (
                        <div key={campo.id} className={esTextoLargo ? 'col-span-2 space-y-1' : undefined}>
                          {esTextoLargo ? (
                            <p className="text-muted-foreground">
                              <EtiquetaCampoFormulario campo={campo} />:
                            </p>
                          ) : (
                            <>
                              <span className="text-muted-foreground">
                                <EtiquetaCampoFormulario campo={campo} />:
                              </span>{' '}
                            </>
                          )}
                          <CampoSugerible
                            campo={`datosFormulario.${campo.id}`}
                            valorActual={valorFormateado}
                            label={campo.nombre}
                            activo={modoSugerencia}
                            onClick={handleSugerirClick}
                            display={esTextoLargo ? 'flex' : 'inline-flex'}
                            className={esTextoLargo ? 'w-full items-start' : undefined}
                          >
                            {esTextoLargo
                              ? <TextoLargoColapsable texto={valorFormateado} />
                              : valorFormateado}
                          </CampoSugerible>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {camposFormulario.some(c => c.esObligatorio) && (
            <p className="text-xs text-muted-foreground mt-2">* Campos obligatorios para enviar la presentación</p>
          )}
        </TabsContent>

        <TabsContent value="direccion" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Dirección y codirección</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editando ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">¿Es interfacultad?</p>
                    <div className="flex gap-2">
                      <Button type="button" variant={editEsInterfacultad ? 'default' : 'outline'} size="sm" onClick={() => toggleInterfacultad(true)}>Sí</Button>
                      <Button type="button" variant={!editEsInterfacultad ? 'default' : 'outline'} size="sm" onClick={() => toggleInterfacultad(false)}>No</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Dirección</p>
                    {editEsInterfacultad ? (
                      <Select value={editDirectorUaId} onValueChange={handleCambioDirectorUA}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar unidad académica" /></SelectTrigger>
                        <SelectContent>
                          {uas.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Unidad académica: <span className="font-medium text-foreground">{nombreUA(edicion?.unidadAcademicaId)}</span>
                      </p>
                    )}
                    <Select value={editDirectorId} onValueChange={setEditDirectorId}>
                      <SelectTrigger><SelectValue placeholder={loadingCandidatos ? 'Cargando...' : 'Seleccionar director'} /></SelectTrigger>
                      <SelectContent>
                        {opcionesDireccion.map(u => {
                          const motivo = motivoCandidato(u)
                          return (
                            <SelectItem key={u.id} value={u.id} disabled={!!motivo}>
                              {u.nombreCompleto}{motivo ? ` — ${motivo}` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Codirección</p>
                    {editEsInterfacultad ? (
                      <Select value={editCodirectorUaId} onValueChange={handleCambioCodirectorUA}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar unidad académica" /></SelectTrigger>
                        <SelectContent>
                          {uas.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Unidad académica: <span className="font-medium text-foreground">{nombreUA(edicion?.unidadAcademicaId)}</span>
                      </p>
                    )}
                    <Select value={editCodirectorId} onValueChange={setEditCodirectorId}>
                      <SelectTrigger><SelectValue placeholder={loadingCandidatos ? 'Cargando...' : 'Seleccionar codirector'} /></SelectTrigger>
                      <SelectContent>
                        {opcionesCodireccion.filter(u => u.id !== editDirectorId).map(u => {
                          const motivo = motivoCandidato(u)
                          return (
                            <SelectItem key={u.id} value={u.id} disabled={!!motivo}>
                              {u.nombreCompleto}{motivo ? ` — ${motivo}` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Interfacultad:</span>{' '}
                    {proyecto?.esInterfacultad ? 'Sí' : 'No'}
                  </div>
                  {proyecto?.esInterfacultad && (
                    <div>
                      <span className="text-muted-foreground">Unidad académica adicional:</span>{' '}
                      {proyecto?.unidadAcademicaAdicional?.nombre || '-'}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Dirección:</span>{' '}
                    {nombreConUA(directores.find(d => d.esDirectorPrincipal))}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Codirección:</span>{' '}
                    {nombreConUA(directores.find(d => !d.esDirectorPrincipal))}
                  </div>
                  {!esEditable && (
                    <p className="text-muted-foreground text-xs col-span-2">
                      Solo el creador de la edición puede modificar las direcciones mientras esté en borrador.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presupuesto" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
              <span className="text-sm font-bold">
                Total: ${(editando ? (editPresupuesto?.montoTotal ?? 0) : (edicion?.presupuesto?.montoTotal ?? 0)).toLocaleString()}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPresupuesto(editPresupuesto || edicion?.presupuesto || null, editando, {
                addPartida, removePartida, updateViatico, updateBien,
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluaciones" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Evaluaciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                {edicion?.estado === EstadoEdicion.Borrador || edicion?.estado === EstadoEdicion.Presentado
                  ? 'El proyecto aún no está en etapa de evaluación.'
                  : 'Módulo de evaluaciones próximamente.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rendiciones" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Rendiciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                {edicion?.estado !== EstadoEdicion.EnEjecucion && edicion?.estado !== EstadoEdicion.Cerrado
                  ? 'El proyecto aún no está en etapa de ejecución.'
                  : 'Módulo de rendiciones próximamente.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sugerencias" className="mt-4">
          {edicion ? (
            <SugerenciasTab edicionId={edicion.id} creadoPorId={edicion.creadoPorId} directorIds={directores.map(d => d.usuarioId)} camposFormulario={camposFormulario} onRespondida={cargarDatos} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          )}
        </TabsContent>

        <TabsContent value="cierre" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Cierre</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                {edicion?.estado === EstadoEdicion.Cerrado
                  ? 'Proyecto cerrado.'
                  : 'El cierre estará disponible cuando corresponda.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SugerirCambioModal
        open={sugerenciaModal.open}
        onOpenChange={open => setSugerenciaModal(prev => ({ ...prev, open }))}
        campo={sugerenciaModal.campo}
        label={sugerenciaModal.label}
        valorActual={sugerenciaModal.valorActual}
        edicionId={edicion?.id ?? ''}
        valorSugeridoInicial={sugerenciaModal.valorSugeridoInicial}
        comentarioInicial={sugerenciaModal.comentarioInicial}
        multilinea={tipoCampoSugerido === TipoCampo.TextoLargo}
        maxLongitud={tipoCampoSugerido ? MAX_LONGITUD_POR_TIPO[tipoCampoSugerido] : undefined}
        tipoInput={tipoCampoSugerido === TipoCampo.Fecha ? 'date' : 'text'}
        geo={tipoCampoSugerido === TipoCampo.Geolocalizacion}
      />

      {edicion && (
        <AsignarDirectorModal
          open={showAsignarDirector}
          onOpenChange={setShowAsignarDirector}
          convocatoriaId={edicion.convocatoriaId}
          edicionId={edicion.id}
          onSuccess={cargarDatos}
        />
      )}

      <Dialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar proyecto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El proyecto se eliminará permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarEliminar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminar} disabled={eliminando}>
              {eliminando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AsignarDirectorModal({
  open,
  onOpenChange,
  convocatoriaId,
  edicionId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  convocatoriaId: string
  edicionId: string
  onSuccess: () => void
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('')
  const [esDirectorPrincipal, setEsDirectorPrincipal] = useState(false)
  const [completar, setCompletar] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchUsuarios = async () => {
      setLoadingUsuarios(true)
      try {
        const [res, resParticipaciones] = await Promise.all([
          api.usuarios.list({ rol: 'Docente', limit: 100 }),
          api.participaciones.listar(convocatoriaId),
        ])
        const idsConRol = new Set(resParticipaciones.map(p => p.usuarioId))
        setUsuarios(res.data.filter(u =>
          !idsConRol.has(u.id) &&
          u.estadoValidacionDocente === 'Validado'
        ))
      } catch {
        toast.error('Error al cargar docentes')
      } finally {
        setLoadingUsuarios(false)
      }
    }
    fetchUsuarios()
  }, [open, convocatoriaId])

  const selectedUsuario = usuarios.find(u => u.id === selectedUsuarioId)
  const faltantes = selectedUsuario ? camposPerfilFaltantes(selectedUsuario) : []

  const seleccionarUsuario = (id: string) => {
    setSelectedUsuarioId(id)
    setCompletar({})
  }

  const faltantesCompletos = faltantes.every(campo => {
    const valor = completar[campo]
    if (campo === 'personaConDiscapacidad') return valor === 'true' || valor === 'false'
    return valor !== undefined && valor.trim() !== ''
  })
  const puedeAsignar = !!selectedUsuarioId && faltantesCompletos

  const handleSubmit = async () => {
    if (!puedeAsignar) return
    setSubmitting(true)
    try {
      const payload: CrearParticipacionDto = {
        usuarioId: selectedUsuarioId,
        convocatoriaId,
        rol: RolEjecucion.DirectorDeProyecto,
        edicionId,
        esDirectorPrincipal,
      }
      const extra: Record<string, string | boolean> = {}
      for (const campo of faltantes) {
        const valor = completar[campo]
        extra[campo] = campo === 'personaConDiscapacidad' ? valor === 'true' : valor.trim()
      }
      await api.participaciones.asignar({ ...payload, ...extra })
      toast.success('Usuario de dirección asignado correctamente')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar usuario de dirección')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar usuario de dirección</DialogTitle>
          <DialogDescription>Seleccione un usuario docente para asignar como dirección del proyecto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Docente</p>
            <Select value={selectedUsuarioId} onValueChange={seleccionarUsuario}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsuarios ? 'Cargando...' : 'Seleccionar usuario docente'} />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map(u => {
                  const incompleto = camposPerfilFaltantes(u).length > 0
                  return (
                    <SelectItem key={u.id} value={u.id} disabled={u.habilitado === false}>
                      {u.nombreCompleto}{incompleto ? ' — perfil incompleto' : ''}{u.habilitado === false ? ' — Deshabilitado' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          {faltantes.length > 0 && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Completar datos del perfil</p>
                <p className="text-xs text-muted-foreground">
                  El docente tiene el perfil incompleto. Completá los datos faltantes para poder asignarlo.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {faltantes.map(campo => {
                  const def = camposPerfilDocente.find(c => c.campo === campo)!
                  if (def.tipo === 'select') {
                    const options = campo === 'genero'
                      ? generoOptions
                      : campo === 'cargoDocente'
                        ? cargoDocenteOptions
                        : campo === 'tipoDesignacionDocente'
                          ? tipoDesignacionDocenteOptions
                          : personaConDiscapacidadOptions
                    return (
                      <div key={campo} className="space-y-1.5">
                        <label className="text-xs font-medium">{def.etiqueta}</label>
                        <Select
                          value={completar[campo] ?? ''}
                          onValueChange={v => setCompletar({ ...completar, [campo]: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {options.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  }
                  return (
                    <div key={campo} className="space-y-1.5">
                      <label className="text-xs font-medium">{def.etiqueta}</label>
                      <Input
                        placeholder={`Completar ${def.etiqueta.toLowerCase()}`}
                        value={completar[campo] ?? ''}
                        onChange={e => setCompletar({ ...completar, [campo]: e.target.value })}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esDirectorPrincipal"
              checked={esDirectorPrincipal}
              onChange={e => setEsDirectorPrincipal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="esDirectorPrincipal" className="text-sm">Dirección principal</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!puedeAsignar || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function renderPresupuesto(
  presupuesto: Presupuesto | null,
  editando: boolean,
  handlers?: {
    addPartida: (rubroIdx: number, tipo: TipoRubro) => void
    removePartida: (rubroIdx: number, partidaIdx: number) => void
    updateViatico: (rubroIdx: number, pIdx: number, field: keyof ViaticoPresupuesto, value: string | number) => void
    updateBien: (rubroIdx: number, pIdx: number, field: keyof BienPresupuesto, value: string | number) => void
  },
) {
  const rubros = presupuesto?.rubros?.length
    ? presupuesto.rubros
    : [
        { tipo: TipoRubro.ViaticosYSeguros, subtotal: 0, partidas: [] as ViaticoPresupuesto[] },
        { tipo: TipoRubro.BienesDeConsumo, subtotal: 0, partidas: [] as BienPresupuesto[] },
        { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] as BienPresupuesto[] },
      ]

  return (
    <div className="space-y-4">
      {rubros.map((rubro, rubroIdx) => (
        <div key={rubro.tipo} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{tipoRubroLabels[rubro.tipo as TipoRubro]}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Subtotal: ${rubro.subtotal.toLocaleString()}</span>
              {editando && handlers && (
                <Button type="button" variant="outline" size="sm" onClick={() => handlers.addPartida(rubroIdx, rubro.tipo as TipoRubro)}>
                  <Plus className="h-3 w-3 mr-1" />Agregar
                </Button>
              )}
            </div>
          </div>

          {rubro.partidas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin partidas</p>
          ) : rubro.tipo === TipoRubro.ViaticosYSeguros ? (
            <div className="space-y-2">
              {(rubro.partidas as ViaticoPresupuesto[]).map((p, pIdx) => (
                <div key={pIdx} className="flex items-end gap-2 bg-muted/30 p-2 rounded-md">
                  {editando && handlers ? (
                    <>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Tipo</span>
                        <Select value={p.tipoPersona} onValueChange={v => handlers.updateViatico(rubroIdx, pIdx, 'tipoPersona', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Docente">Docente</SelectItem>
                            <SelectItem value="Estudiante">Estudiante</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-[2] space-y-1">
                        <span className="text-xs">Descripción</span>
                        <Input value={p.descripcion} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'descripcion', e.target.value)} placeholder="Ej: Viaje a..." />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Inicio</span>
                        <Input type="date" value={p.periodoInicio} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'periodoInicio', e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Fin</span>
                        <Input type="date" value={p.periodoFin} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'periodoFin', e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Monto</span>
                        <Input type="number" min="0" step="0.01" value={p.monto || ''} onChange={e => handlers.updateViatico(rubroIdx, pIdx, 'monto', Number(e.target.value))} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handlers.removePartida(rubroIdx, pIdx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{p.tipoPersona}</span>
                      <span className="text-sm flex-[2]">{p.descripcion}</span>
                      <span className="text-sm flex-1">{p.periodoInicio} → {p.periodoFin}</span>
                      <span className="text-sm flex-1">${p.monto.toLocaleString()}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(rubro.partidas as BienPresupuesto[]).map((p, pIdx) => (
                <div key={pIdx} className="flex items-end gap-2 bg-muted/30 p-2 rounded-md">
                  {editando && handlers ? (
                    <>
                      <div className="flex-[2] space-y-1">
                        <span className="text-xs">Descripción</span>
                        <Input value={p.descripcion} onChange={e => handlers.updateBien(rubroIdx, pIdx, 'descripcion', e.target.value)} placeholder="Ej: Resmas de papel" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Cantidad</span>
                        <Input type="number" min="1" step="1" value={p.cantidad || ''} onChange={e => handlers.updateBien(rubroIdx, pIdx, 'cantidad', Number(e.target.value))} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Precio unit.</span>
                        <Input type="number" min="0" step="0.01" value={p.precioUnitario || ''} onChange={e => handlers.updateBien(rubroIdx, pIdx, 'precioUnitario', Number(e.target.value))} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-xs">Monto</span>
                        <Input type="number" value={p.monto || ''} disabled className="bg-muted" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handlers.removePartida(rubroIdx, pIdx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-[2]">{p.descripcion}</span>
                      <span className="text-sm flex-1">{p.cantidad}</span>
                      <span className="text-sm flex-1">${p.precioUnitario.toLocaleString()}</span>
                      <span className="text-sm flex-1">${p.monto.toLocaleString()}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ProyectoDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-md" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}
