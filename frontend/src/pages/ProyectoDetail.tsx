import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { Proyecto, Edicion, Convocatoria, Presupuesto, ViaticoPresupuesto, BienPresupuesto, ParticipacionConvocatoria, UnidadAcademica, CampoFormulario, SugerenciaCambio } from '@/data/types'
import { estadoBadge, estadoEdicionLabel, EstadoEdicion, EstadoConvocatoria, TipoRubro, TipoPersona, RolUsuario, RolEjecucion, EstadoSugerencia, TipoCampo, MAX_LONGITUD_POR_TIPO, TIPOS_VALOR_OBJETO } from '@/data/types'
import { CampoSugerible } from '@/components/CampoSugerible'
import { SugerirCambioModal } from '@/components/SugerirCambioModal'
import { SugerenciasTab } from '@/components/SugerenciasTab'
import { ListaCamposFaltantes } from '@/components/ListaCamposFaltantes'
import { EvaluacionesProyectoTab } from '@/components/EvaluacionesProyectoTab'
import { HitosEjecucionTab } from '@/components/HitosEjecucionTab'
import { AutoevaluacionTab } from '@/components/AutoevaluacionTab'
import { InformeFinalTab } from '@/components/InformeFinalTab'
import { TablaPartidasPresupuesto } from '@/components/TablaPartidasPresupuesto'
import { useDireccionEdicion, DireccionEditor } from '@/components/DireccionEditor'
import { GestionarDireccionModal } from '@/components/GestionarDireccionModal'
import {
  CampoFormularioInput,
  camposIncompletosParaEnvio,
} from '@/components/CampoFormularioInput'
import { CampoFormularioLectura } from '@/components/CampoFormularioLectura'
import { agruparCamposEnSecciones } from '@/lib/secciones-formulario'
import {
  formatearMoneda, LABELS_RUBRO, MAX_LONGITUD_DESCRIPCION_PARTIDA,
  normalizarPresupuesto, parsearRutaPartida, presupuestoIncompletoParaEnvio,
} from '@/lib/presupuesto'
import { ArrowLeft, Loader2, Pencil, Send, Save, Plus, Trash2, MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'

const OPCIONES_TIPO_PERSONA = [
  { value: TipoPersona.Docente, label: 'Docente' },
  { value: TipoPersona.Estudiante, label: 'Estudiante' },
]

const TABS_FIJAS_POST = ['direccion', 'presupuesto', 'evaluaciones', 'ejecucion-hitos', 'autoevaluacion', 'informe-final', 'sugerencias']

interface ModalConfigSugerencia {
  multilinea?: boolean
  maxLongitud?: number
  tipoInput?: 'text' | 'date' | 'number'
  min?: number
  max?: number
  step?: number | 'any'
  tipoObjeto?: TipoCampo.Geolocalizacion | TipoCampo.Usuario | null
  rolesUsuario?: RolUsuario[]
  soloComentario?: boolean
  opciones?: { value: string; label: string }[]
}

export function ProyectoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const [editando, setEditando] = useState(false)
  const [editNombre, setEditNombre] = useState('')
  const [editAnioEdicion, setEditAnioEdicion] = useState<number | null>(null)
  const [editEsConsolidado, setEditEsConsolidado] = useState(false)
  const [editPresupuesto, setEditPresupuesto] = useState<Presupuesto | null>(null)
  const [editDatosFormulario, setEditDatosFormulario] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)
  const [iniciandoEvaluacion, setIniciandoEvaluacion] = useState(false)

  const [camposFormulario, setCamposFormulario] = useState<CampoFormulario[]>([])
  const secciones = useMemo(() => agruparCamposEnSecciones(camposFormulario), [camposFormulario])
  const seccionResumen = secciones[0]
  const seccionesExtra = useMemo(() => secciones.slice(1), [secciones])

  const tabs = useMemo(
    () => ['info', ...seccionesExtra.map(s => `seccion-${s.id}`), ...TABS_FIJAS_POST],
    [seccionesExtra],
  )
  const tabParam = searchParams.get('tab')
  const tabActivo = tabParam && tabs.includes(tabParam) ? tabParam : 'info'

  const cambiarTab = useCallback((tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (tab === 'info') next.delete('tab')
      else next.set('tab', tab)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const [directores, setDirectores] = useState<ParticipacionConvocatoria[]>([])
  const [showGestionarDireccion, setShowGestionarDireccion] = useState(false)

  const [uas, setUas] = useState<UnidadAcademica[]>([])

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

  // Campo del formulario sobre el que se está sugiriendo (null si es un campo fijo del proyecto).
  const campoSugerido = sugerenciaModal.campo.startsWith('datosFormulario.')
    ? camposFormulario.find(c => c.id === sugerenciaModal.campo.replace('datosFormulario.', '')) ?? null
    : null
  const tipoCampoSugerido = campoSugerido?.tipo ?? null

  const modalConfig: ModalConfigSugerencia = ((): ModalConfigSugerencia => {
    if (sugerenciaModal.campo.startsWith('presupuesto.')) {
      const ruta = parsearRutaPartida(sugerenciaModal.campo.replace('presupuesto.', ''))
      if (!ruta) return { soloComentario: true }
      if (ruta.campo === 'tipoPersona') return { opciones: OPCIONES_TIPO_PERSONA }
      if (ruta.campo === 'monto' || ruta.campo === 'precioUnitario') return { tipoInput: 'number', min: 0, step: 'any' }
      if (ruta.campo === 'cantidad') return { tipoInput: 'number', min: 1, step: 1 }
      if (ruta.campo === 'periodoInicio' || ruta.campo === 'periodoFin') return { tipoInput: 'date' }
      if (ruta.campo === 'descripcion') return { maxLongitud: MAX_LONGITUD_DESCRIPCION_PARTIDA }
      return {}
    }
    return {
      multilinea: tipoCampoSugerido === TipoCampo.TextoLargo || tipoCampoSugerido === TipoCampo.Tabla,
      maxLongitud: tipoCampoSugerido ? MAX_LONGITUD_POR_TIPO[tipoCampoSugerido] : undefined,
      tipoInput: tipoCampoSugerido === TipoCampo.Fecha ? 'date' : tipoCampoSugerido === TipoCampo.Numero ? 'number' : 'text',
      min: campoSugerido?.minimo,
      max: campoSugerido?.maximo,
      step: campoSugerido?.admiteDecimales ? 'any' : 1,
      tipoObjeto: tipoCampoSugerido && TIPOS_VALOR_OBJETO.includes(tipoCampoSugerido)
        ? (tipoCampoSugerido as TipoCampo.Geolocalizacion | TipoCampo.Usuario)
        : null,
      rolesUsuario: campoSugerido?.rolesUsuario,
      soloComentario: tipoCampoSugerido === TipoCampo.Tabla,
    }
  })()

  const esPropietario = edicion?.creadoPorId === user?.id
  const esEditable = esPropietario && edicion?.estado === EstadoEdicion.Borrador
  const esSecretaria = user?.roles.some(
    r => r === RolUsuario.AutoridadDeSecretaria || r === RolUsuario.AsistenteDeSecretaria,
  )
  const puedeAsignarDirector = user?.roles.some(r =>
    [RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria, RolUsuario.AutoridadDeRectorado].includes(r),
  )
  const puedeGestionarDireccion = puedeAsignarDirector &&
    [EstadoEdicion.Borrador, EstadoEdicion.Presentado, EstadoEdicion.PendienteDeCambios].includes(
      edicion?.estado as EstadoEdicion,
    )
  const esDocenteValidado = user?.roles.includes(RolUsuario.Docente) &&
    user?.estadoValidacionDocente === 'Validado'
  const tieneDirectorPrincipal = directores.some(d => d.esDirectorPrincipal)
  const tieneSegundoDirector = directores.filter(
    d => d.rol === RolEjecucion.DirectorDeProyecto,
  ).length >= 2
  const directoresCompletos = tieneDirectorPrincipal && tieneSegundoDirector
  const camposObligatoriosFaltantes = camposIncompletosParaEnvio(
    camposFormulario, (edicion?.datosFormulario ?? {}) as Record<string, unknown>,
  )
  const presupuestoFaltante = presupuestoIncompletoParaEnvio(edicion?.presupuesto, edicion?.convocatoria)
  const puedeEnviar = esPropietario && esDocenteValidado && directoresCompletos
    && camposObligatoriosFaltantes.length === 0 && presupuestoFaltante.length === 0
  const esDocente = user?.roles.includes(RolUsuario.Docente)
  const esMismaUA = user?.unidadAcademicaId === edicion?.unidadAcademicaId
  const esSecretariaMismaUA = esSecretaria && esMismaUA
  const esDirector = directores.some(d => d.usuarioId === user?.id)
  const puedeEditarEjecucion = esPropietario || esDirector

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

  const motivoEnvio: ReactNode = !esDocenteValidado
    ? 'Tu usuario no está validado'
    : !directoresCompletos
      ? 'El proyecto no tiene usuarios de dirección ni codirección asignados aún'
      : camposObligatoriosFaltantes.length > 0
        ? <ListaCamposFaltantes titulo="Falta completar lo siguiente:" campos={camposObligatoriosFaltantes} />
        : presupuestoFaltante.length > 0
          ? <ListaCamposFaltantes titulo="Falta completar el presupuesto:" campos={presupuestoFaltante} />
          : null

  const cargarDatos = async () => {
    if (!id) return
    setLoading(true)
    try {
      const p = await api.proyectos.get(id)
      setProyecto(p)
      const eds = p.ediciones || []
      const convocatoriaId = searchParams.get('convocatoria')
      const ed = convocatoriaId
        ? eds.find(e => e.convocatoriaId === convocatoriaId) ?? eds[0] ?? null
        : eds[0] ?? null
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
  }, [id, searchParams.get('convocatoria')])

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

  const direccion = useDireccionEdicion({ proyecto, edicion, directores, uas })

  const iniciarEdicion = () => {
    if (!proyecto || !edicion) return
    setEditNombre(proyecto.nombre)
    setEditAnioEdicion(edicion.anioEdicion ?? null)
    setEditEsConsolidado(proyecto.esConsolidado)
    setEditPresupuesto(edicion.presupuesto ? JSON.parse(JSON.stringify(edicion.presupuesto)) : null)
    setEditDatosFormulario(edicion.datosFormulario ? JSON.parse(JSON.stringify(edicion.datosFormulario)) : {})
    setEditando(true)
    direccion.reset()
  }

  const cancelarEdicion = () => {
    setEditando(false)
  }

  const handleGuardar = async () => {
    if (!id || !edicion) return
    if (direccion.motivoDireccion) {
      toast.error(direccion.motivoDireccion)
      return
    }
    setGuardando(true)
    try {
      await api.proyectos.actualizarEdicion(id, edicion.id, {
        nombre: editNombre,
        anioEdicion: editAnioEdicion ?? undefined,
        esConsolidado: editEsConsolidado,
        esInterfacultad: direccion.esInterfacultad,
        unidadAcademicaAdicionalId: direccion.unidadAcademicaAdicionalId,
        presupuesto: editPresupuesto || undefined,
        datosFormulario: editDatosFormulario,
      })
      await direccion.sincronizar()
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
    setEditPresupuesto(normalizarPresupuesto({ ...actual, rubros }))
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
    setEditPresupuesto(normalizarPresupuesto({ ...editPresupuesto, rubros }))
  }

  const updateViatico = (rubroIdx: number, pIdx: number, field: keyof ViaticoPresupuesto, value: string | number) => {
    if (!editPresupuesto) return
    const rubros = [...editPresupuesto.rubros]
    const rubro = { ...rubros[rubroIdx] }
    const partidas = [...(rubro.partidas as ViaticoPresupuesto[])]
    partidas[pIdx] = { ...partidas[pIdx], [field]: value }
    rubro.partidas = partidas
    rubros[rubroIdx] = rubro
    setEditPresupuesto(normalizarPresupuesto({ ...editPresupuesto, rubros }))
  }

  const updateBien = (rubroIdx: number, pIdx: number, field: keyof BienPresupuesto, value: string | number) => {
    if (!editPresupuesto) return
    const rubros = [...editPresupuesto.rubros]
    const rubro = { ...rubros[rubroIdx] }
    const partidas = [...(rubro.partidas as BienPresupuesto[])]
    partidas[pIdx] = { ...partidas[pIdx], [field]: value }
    rubro.partidas = partidas
    rubros[rubroIdx] = rubro
    setEditPresupuesto(normalizarPresupuesto({ ...editPresupuesto, rubros }))
  }

  const renderCamposEdicion = (campos: CampoFormulario[]) => (
    <>
      {campos.map(campo => (
        <CampoFormularioInput
          key={campo.id}
          campo={campo}
          valor={editDatosFormulario[campo.id]}
          onChange={v => setEditDatosFormulario(prev => ({ ...prev, [campo.id]: v }))}
        />
      ))}
    </>
  )

  const renderCamposLectura = (campos: CampoFormulario[]) => (
    <>
      {campos.map(campo => (
        <CampoFormularioLectura
          key={campo.id}
          campo={campo}
          valor={edicion?.datosFormulario?.[campo.id]}
          envolverValor={(contenido, { valorFormateado, anchoCompleto }) => (
            <CampoSugerible
              campo={`datosFormulario.${campo.id}`}
              valorActual={valorFormateado}
              label={campo.nombre}
              activo={modoSugerencia}
              onClick={handleSugerirClick}
              display={anchoCompleto ? 'flex' : 'inline-flex'}
              className={anchoCompleto ? 'w-full items-start' : undefined}
            >
              {contenido}
            </CampoSugerible>
          )}
        />
      ))}
    </>
  )

  if (loading) return <ProyectoDetailSkeleton />

  if (!proyecto) return <div className="p-6"><p className="text-muted-foreground">Proyecto no encontrado</p></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/proyectos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground truncate" title={proyecto.nombre}>
            {proyecto.nombre}
          </h2>
          {edicion && (
            <Badge variant={estadoBadge[edicion.estado]} className="shrink-0">
              {estadoEdicionLabel[edicion.estado] || edicion.estado}
            </Badge>
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
                      <TooltipContent className="max-w-xs">
                        {motivoEnvio}
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
                      <Button onClick={handleGuardar} disabled={guardando || !!direccion.motivoDireccion}>
                        {guardando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {direccion.motivoDireccion && (
                    <TooltipContent>
                      <p>{direccion.motivoDireccion}</p>
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
          {!editando && esSecretariaMismaUA && edicion?.estado === EstadoEdicion.Presentado && edicion.convocatoria?.estado === EstadoConvocatoria.Evaluacion && (
            <>
              <Button
                onClick={async () => {
                  if (!id || !edicion?.id) return
                  try {
                    setIniciandoEvaluacion(true)
                    await api.proyectos.iniciarEvaluacion(id, edicion.id)
                    toast.success('Evaluación iniciada')
                    cargarDatos()
                  } catch {
                    toast.error('No se pudo iniciar la evaluación')
                  } finally {
                    setIniciandoEvaluacion(false)
                  }
                }}
                disabled={iniciandoEvaluacion}
              >
                {iniciandoEvaluacion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
          <CardContent><p className="text-sm font-bold">{formatearMoneda(edicion?.presupuesto?.montoTotal)}</p></CardContent>
        </Card>
        {puedeGestionarDireccion && (
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowGestionarDireccion(true)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                Gestionar dirección y codirección
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Editar dirección, codirección e interfacultad</p></CardContent>
          </Card>
        )}
      </div>

      <Tabs value={tabActivo} onValueChange={cambiarTab}>
        <TabsList>
          <TabsTrigger value="info">Resumen</TabsTrigger>
          {seccionesExtra.map(seccion => (
            <TabsTrigger key={seccion.id} value={`seccion-${seccion.id}`}>{seccion.nombre}</TabsTrigger>
          ))}
          <TabsTrigger value="direccion">Dirección</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
          <TabsTrigger value="ejecucion-hitos">Hitos</TabsTrigger>
          <TabsTrigger value="autoevaluacion">Autoevaluación</TabsTrigger>
          <TabsTrigger value="informe-final">Informe final</TabsTrigger>
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
                  {renderCamposEdicion(seccionResumen.campos)}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {esPropietario && edicion?.estado === EstadoEdicion.Borrador && camposObligatoriosFaltantes.length > 0 && (
                <ListaCamposFaltantes
                  titulo="Falta completar lo siguiente para poder enviar:"
                  campos={camposObligatoriosFaltantes}
                  className="text-destructive bg-destructive/10 rounded-md p-3"
                />
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
                    {renderCamposLectura(seccionResumen.campos)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {camposFormulario.some(c => c.esObligatorio) && (
            <p className="text-xs text-muted-foreground mt-2">* Campos obligatorios para enviar la presentación</p>
          )}
        </TabsContent>

        {seccionesExtra.map(seccion => (
          <TabsContent key={seccion.id} value={`seccion-${seccion.id}`} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{seccion.nombre}</CardTitle>
                {seccion.descripcion && (
                  <p className="text-sm text-muted-foreground">{seccion.descripcion}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {seccion.campos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Esta sección no cuenta con ningún campo.
                  </p>
                ) : editando ? (
                  <div className="space-y-4">
                    {renderCamposEdicion(seccion.campos)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {renderCamposLectura(seccion.campos)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="direccion" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Dirección y codirección</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editando ? (
                <DireccionEditor direccion={direccion} edicionUnidadAcademicaId={edicion?.unidadAcademicaId} />
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
                Total: {formatearMoneda(editando ? editPresupuesto?.montoTotal : edicion?.presupuesto?.montoTotal)}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPresupuesto(editPresupuesto || edicion?.presupuesto || null, editando, edicion?.convocatoria, {
                addPartida, removePartida, updateViatico, updateBien,
              }, { activo: modoSugerencia, onSugerir: handleSugerirClick })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluaciones" className="mt-4">
          <EvaluacionesProyectoTab edicionId={edicion?.id} estado={edicion?.estado} />
        </TabsContent>

        <TabsContent value="ejecucion-hitos" className="mt-4">
          {edicion?.estado === EstadoEdicion.EnEjecucion || edicion?.estado === EstadoEdicion.Cerrado ? (
            <HitosEjecucionTab edicionId={edicion?.id} estado={edicion?.estado} puedeEditar={puedeEditarEjecucion} convocatoria={edicion?.convocatoria} />
          ) : (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  El proyecto aún no está en etapa de ejecución.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="autoevaluacion" className="mt-4">
          {edicion?.estado === EstadoEdicion.EnEjecucion || edicion?.estado === EstadoEdicion.Cerrado ? (
            <AutoevaluacionTab edicionId={edicion?.id} estado={edicion?.estado} puedeEditar={puedeEditarEjecucion} />
          ) : (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  El proyecto aún no está en etapa de ejecución.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="informe-final" className="mt-4">
          {edicion?.estado === EstadoEdicion.EnEjecucion || edicion?.estado === EstadoEdicion.Cerrado ? (
            <InformeFinalTab
                  edicionId={edicion?.id}
                  estado={edicion?.estado}
                  puedeEditar={puedeEditarEjecucion}
                  convocatoria={edicion?.convocatoria}
                  proyectoNombre={proyecto?.nombre}
                  unidadAcademicaNombre={edicion?.unidadAcademica?.nombre}
                />
          ) : (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  El proyecto aún no está en etapa de ejecución.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sugerencias" className="mt-4">
          {edicion ? (
            <SugerenciasTab edicionId={edicion.id} creadoPorId={edicion.creadoPorId} directorIds={directores.map(d => d.usuarioId)} camposFormulario={camposFormulario} presupuesto={edicion.presupuesto} onRespondida={cargarDatos} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          )}
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
        multilinea={modalConfig.multilinea}
        maxLongitud={modalConfig.maxLongitud}
        tipoInput={modalConfig.tipoInput}
        min={modalConfig.min}
        max={modalConfig.max}
        step={modalConfig.step}
        tipoObjeto={modalConfig.tipoObjeto}
        rolesUsuario={modalConfig.rolesUsuario}
        soloComentario={modalConfig.soloComentario}
        opciones={modalConfig.opciones}
      />

      {proyecto && edicion && (
        <GestionarDireccionModal
          open={showGestionarDireccion}
          onOpenChange={setShowGestionarDireccion}
          proyecto={proyecto}
          edicion={edicion}
          directores={directores}
          uas={uas}
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

function renderPresupuesto(
  presupuesto: Presupuesto | null,
  editando: boolean,
  convocatoria: Convocatoria | undefined,
  handlers?: {
    addPartida: (rubroIdx: number, tipo: TipoRubro) => void
    removePartida: (rubroIdx: number, partidaIdx: number) => void
    updateViatico: (rubroIdx: number, pIdx: number, field: keyof ViaticoPresupuesto, value: string | number) => void
    updateBien: (rubroIdx: number, pIdx: number, field: keyof BienPresupuesto, value: string | number) => void
  },
  sugerencia?: {
    activo: boolean
    onSugerir: (campo: string, valorActual: string, label: string) => void
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
            <h4 className="text-sm font-medium">{LABELS_RUBRO[rubro.tipo as TipoRubro]}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Subtotal: {formatearMoneda(rubro.subtotal)}</span>
              {editando && handlers && (
                <Button type="button" variant="outline" size="sm" onClick={() => handlers.addPartida(rubroIdx, rubro.tipo as TipoRubro)}>
                  <Plus className="h-3 w-3 mr-1" />Agregar
                </Button>
              )}
              {!editando && sugerencia?.activo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => sugerencia.onSugerir(
                    `presupuesto.rubros[${rubroIdx}]`, '', LABELS_RUBRO[rubro.tipo as TipoRubro],
                  )}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />Comentar
                </Button>
              )}
            </div>
          </div>

          <TablaPartidasPresupuesto
            rubro={rubro}
            rubroIdx={rubroIdx}
            editando={editando}
            convocatoria={convocatoria}
            handlers={handlers}
            sugerencia={sugerencia}
          />
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
        <div className="flex gap-3 items-center">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-5 w-24 rounded-full" />
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
