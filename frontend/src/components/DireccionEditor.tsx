import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Proyecto, Edicion, ParticipacionConvocatoria, Usuario } from '@/data/types'
import { RolEjecucion, EstadoValidacionDocente } from '@/data/types'
import { toast } from 'sonner'

export function useDireccionEdicion({
  proyecto,
  edicion,
  directores,
  uas,
}: {
  proyecto: Proyecto | null
  edicion: Edicion | null
  directores: ParticipacionConvocatoria[]
  uas: { id: string; nombre: string }[]
}) {
  const [candidatosDireccion, setCandidatosDireccion] = useState<Usuario[]>([])
  const [candidatosCodireccion, setCandidatosCodireccion] = useState<Usuario[]>([])
  const [loadingCandidatos, setLoadingCandidatos] = useState(false)
  const [esInterfacultad, setEsInterfacultad] = useState(false)
  const [directorId, setDirectorId] = useState('')
  const [codirectorId, setCodirectorId] = useState('')
  const [directorUaId, setDirectorUaId] = useState('')
  const [codirectorUaId, setCodirectorUaId] = useState('')

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
    ...(directorPrincipalUsuario && directorPrincipalUsuario.unidadAcademica?.id === directorUaId
      ? [directorPrincipalUsuario]
      : []),
  ]
    .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)

  const opcionesCodireccion = [
    ...candidatosCodireccion,
    ...(codirectorUsuario && codirectorUsuario.unidadAcademica?.id === codirectorUaId
      ? [codirectorUsuario]
      : []),
  ]
    .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)

  const motivoDireccion = (() => {
    if (!esInterfacultad || !edicion) return ''
    const uaCreador = edicion.unidadAcademicaId
    if (directorUaId !== uaCreador && codirectorUaId !== uaCreador) {
      return `Una unidad académica participante tiene que ser ${nombreUA(uaCreador)}`
    }
    if (directorUaId === codirectorUaId) {
      return 'La dirección y la codirección deben pertenecer a unidades académicas distintas para ser interfacultad'
    }
    return ''
  })()

  const toggleInterfacultad = (v: boolean) => {
    setEsInterfacultad(v)
    setDirectorId('')
    setCodirectorId('')
    const uaCreador = edicion?.unidadAcademicaId ?? ''
    if (v) {
      const uaDirector = directorPrincipalUsuario?.unidadAcademica?.id ?? uaCreador
      const uaCodirector = codirectorUsuario?.unidadAcademica?.id
        ?? (proyecto?.unidadAcademicaAdicionalId && proyecto.unidadAcademicaAdicionalId !== uaCreador
          ? proyecto.unidadAcademicaAdicionalId
          : uaCreador)
      setDirectorUaId(uaDirector)
      setCodirectorUaId(uaCodirector)
      if (edicion) {
        cargarCandidatos(uaDirector, setCandidatosDireccion)
        cargarCandidatos(uaCodirector, setCandidatosCodireccion)
      }
    } else {
      setDirectorUaId(uaCreador)
      setCodirectorUaId(uaCreador)
      if (edicion) {
        cargarCandidatos(uaCreador, setCandidatosDireccion)
        cargarCandidatos(uaCreador, setCandidatosCodireccion)
      }
    }
  }

  const handleCambioDirectorUA = (uaId: string) => {
    setDirectorUaId(uaId)
    setDirectorId('')
    cargarCandidatos(uaId, setCandidatosDireccion)
  }

  const handleCambioCodirectorUA = (uaId: string) => {
    setCodirectorUaId(uaId)
    setCodirectorId('')
    cargarCandidatos(uaId, setCandidatosCodireccion)
  }

  const reset = () => {
    if (!proyecto || !edicion) return
    setEsInterfacultad(proyecto.esInterfacultad)
    setDirectorId(directores.find(d => d.esDirectorPrincipal)?.usuarioId ?? '')
    setCodirectorId(directores.find(d => !d.esDirectorPrincipal)?.usuarioId ?? '')
    const uaDirector = directores.find(d => d.esDirectorPrincipal)?.usuario?.unidadAcademica?.id ?? edicion.unidadAcademicaId
    const uaCodirector = directores.find(d => !d.esDirectorPrincipal)?.usuario?.unidadAcademica?.id
      ?? (proyecto.esInterfacultad ? proyecto.unidadAcademicaAdicionalId : edicion.unidadAcademicaId)
      ?? edicion.unidadAcademicaId
    setDirectorUaId(uaDirector)
    setCodirectorUaId(uaCodirector)
    cargarCandidatos(uaDirector, setCandidatosDireccion)
    cargarCandidatos(uaCodirector, setCandidatosCodireccion)
  }

  const uaCreador = edicion?.unidadAcademicaId
  const unidadAcademicaAdicionalId = esInterfacultad
    ? (directorUaId !== uaCreador ? directorUaId : codirectorUaId)
    : null

  const sincronizar = async (
    camposPerfilPorUsuario?: Record<string, Record<string, string | boolean>>,
  ) => {
    if (!edicion) return
    const deseado: { usuarioId: string; esDirectorPrincipal: boolean }[] = []
    if (directorId) deseado.push({ usuarioId: directorId, esDirectorPrincipal: true })
    if (codirectorId) deseado.push({ usuarioId: codirectorId, esDirectorPrincipal: false })

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
        ...(camposPerfilPorUsuario?.[des.usuarioId] ?? {}),
      })
    }
  }

  return {
    uas,
    candidatosDireccion,
    candidatosCodireccion,
    loadingCandidatos,
    esInterfacultad,
    directorId,
    codirectorId,
    directorUaId,
    codirectorUaId,
    setDirectorId,
    setCodirectorId,
    nombreUA,
    motivoCandidato,
    opcionesDireccion,
    opcionesCodireccion,
    motivoDireccion,
    toggleInterfacultad,
    handleCambioDirectorUA,
    handleCambioCodirectorUA,
    reset,
    unidadAcademicaAdicionalId,
    sincronizar,
  }
}

export type DireccionEdicion = ReturnType<typeof useDireccionEdicion>

export function DireccionEditor({ direccion, edicionUnidadAcademicaId }: {
  direccion: DireccionEdicion
  edicionUnidadAcademicaId?: string
}) {
  const {
    uas, loadingCandidatos, esInterfacultad, directorId, codirectorId, directorUaId, codirectorUaId,
    setDirectorId, setCodirectorId, nombreUA, motivoCandidato, opcionesDireccion, opcionesCodireccion,
    toggleInterfacultad, handleCambioDirectorUA, handleCambioCodirectorUA,
  } = direccion

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium">¿Es interfacultad?</p>
        <div className="flex gap-2">
          <Button type="button" variant={esInterfacultad ? 'default' : 'outline'} size="sm" onClick={() => toggleInterfacultad(true)}>Sí</Button>
          <Button type="button" variant={!esInterfacultad ? 'default' : 'outline'} size="sm" onClick={() => toggleInterfacultad(false)}>No</Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Dirección</p>
        {esInterfacultad ? (
          <Select value={directorUaId} onValueChange={handleCambioDirectorUA}>
            <SelectTrigger><SelectValue placeholder="Seleccionar unidad académica" /></SelectTrigger>
            <SelectContent>
              {uas.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Unidad académica: <span className="font-medium text-foreground">{nombreUA(edicionUnidadAcademicaId)}</span>
          </p>
        )}
        <Select value={directorId} onValueChange={setDirectorId}>
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
        {esInterfacultad ? (
          <Select value={codirectorUaId} onValueChange={handleCambioCodirectorUA}>
            <SelectTrigger><SelectValue placeholder="Seleccionar unidad académica" /></SelectTrigger>
            <SelectContent>
              {uas.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Unidad académica: <span className="font-medium text-foreground">{nombreUA(edicionUnidadAcademicaId)}</span>
          </p>
        )}
        <Select value={codirectorId} onValueChange={setCodirectorId}>
          <SelectTrigger><SelectValue placeholder={loadingCandidatos ? 'Cargando...' : 'Seleccionar codirector'} /></SelectTrigger>
          <SelectContent>
            {opcionesCodireccion.filter(u => u.id !== directorId).map(u => {
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
  )
}
