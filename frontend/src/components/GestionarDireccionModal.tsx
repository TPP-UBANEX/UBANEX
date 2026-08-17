import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Proyecto, Edicion, ParticipacionConvocatoria, Usuario, UnidadAcademica } from '@/data/types'
import {
  camposPerfilDocente,
  camposPerfilFaltantes,
  generoOptions,
  cargoDocenteOptions,
  tipoDesignacionDocenteOptions,
  personaConDiscapacidadOptions,
  type CampoPerfilDocente,
} from '@/data/perfil'
import { useDireccionEdicion, DireccionEditor } from '@/components/DireccionEditor'

function BloqueCompletarPerfil({
  titulo,
  usuario,
  valores,
  onChange,
}: {
  titulo: string
  usuario: Usuario
  valores: Record<string, string>
  onChange: (valores: Record<string, string>) => void
}) {
  const faltantes = camposPerfilFaltantes(usuario)
  if (faltantes.length === 0) return null

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div>
        <p className="text-sm font-medium">Completar datos del perfil de {titulo}</p>
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
                  value={valores[campo] ?? ''}
                  onValueChange={v => onChange({ ...valores, [campo]: v })}
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
                value={valores[campo] ?? ''}
                onChange={e => onChange({ ...valores, [campo]: e.target.value })}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function faltantesCompletos(usuario: Usuario | undefined, valores: Record<string, string>): boolean {
  if (!usuario) return true
  return camposPerfilFaltantes(usuario).every(campo => {
    const valor = valores[campo]
    if (campo === 'personaConDiscapacidad') return valor === 'true' || valor === 'false'
    return valor !== undefined && valor.trim() !== ''
  })
}

function extraDePerfil(usuario: Usuario | undefined, valores: Record<string, string>): Record<string, string | boolean> {
  if (!usuario) return {}
  const extra: Record<string, string | boolean> = {}
  for (const campo of camposPerfilFaltantes(usuario)) {
    const valor = valores[campo]
    extra[campo] = campo === ('personaConDiscapacidad' as CampoPerfilDocente) ? valor === 'true' : valor.trim()
  }
  return extra
}

export function GestionarDireccionModal({
  open,
  onOpenChange,
  proyecto,
  edicion,
  directores,
  uas,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyecto: Proyecto
  edicion: Edicion
  directores: ParticipacionConvocatoria[]
  uas: UnidadAcademica[]
  onSuccess: () => void
}) {
  const direccion = useDireccionEdicion({ proyecto, edicion, directores, uas })
  const [perfilDirector, setPerfilDirector] = useState<Record<string, string>>({})
  const [perfilCodirector, setPerfilCodirector] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    direccion.reset()
    setPerfilDirector({})
    setPerfilCodirector({})
  }, [open])

  const directorEsNuevo = !!direccion.directorId &&
    !directores.some(d => d.usuarioId === direccion.directorId && d.esDirectorPrincipal)
  const codirectorEsNuevo = !!direccion.codirectorId &&
    !directores.some(d => d.usuarioId === direccion.codirectorId && !d.esDirectorPrincipal)

  const usuarioDirector = direccion.opcionesDireccion.find(u => u.id === direccion.directorId)
  const usuarioCodirector = direccion.opcionesCodireccion.find(u => u.id === direccion.codirectorId)

  const perfilesCompletos =
    (!directorEsNuevo || faltantesCompletos(usuarioDirector, perfilDirector)) &&
    (!codirectorEsNuevo || faltantesCompletos(usuarioCodirector, perfilCodirector))

  const puedeGuardar = !direccion.motivoDireccion && perfilesCompletos

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    try {
      await api.proyectos.actualizarEdicion(proyecto.id, edicion.id, {
        esInterfacultad: direccion.esInterfacultad,
        unidadAcademicaAdicionalId: direccion.unidadAcademicaAdicionalId,
      })
      const camposPerfilPorUsuario: Record<string, Record<string, string | boolean>> = {}
      if (directorEsNuevo) {
        camposPerfilPorUsuario[direccion.directorId] = extraDePerfil(usuarioDirector, perfilDirector)
      }
      if (codirectorEsNuevo) {
        camposPerfilPorUsuario[direccion.codirectorId] = extraDePerfil(usuarioCodirector, perfilCodirector)
      }
      await direccion.sincronizar(camposPerfilPorUsuario)
      toast.success('Dirección actualizada correctamente')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la dirección')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar dirección y codirección</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <DireccionEditor direccion={direccion} edicionUnidadAcademicaId={edicion.unidadAcademicaId} />
          {directorEsNuevo && usuarioDirector && (
            <BloqueCompletarPerfil
              titulo={usuarioDirector.nombreCompleto}
              usuario={usuarioDirector}
              valores={perfilDirector}
              onChange={setPerfilDirector}
            />
          )}
          {codirectorEsNuevo && usuarioCodirector && (
            <BloqueCompletarPerfil
              titulo={usuarioCodirector.nombreCompleto}
              usuario={usuarioCodirector}
              valores={perfilCodirector}
              onChange={setPerfilCodirector}
            />
          )}
          {direccion.motivoDireccion && (
            <p className="text-sm text-destructive">{direccion.motivoDireccion}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={!puedeGuardar || guardando}>
            {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
