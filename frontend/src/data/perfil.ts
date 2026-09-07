import { Genero, CargoDocente, TipoDesignacionDocente, RolUsuario } from './types'
import type { Usuario } from './types'

export type CampoPerfilDocente =
  | 'nombre'
  | 'apellido'
  | 'telefono'
  | 'cargoDocente'
  | 'tipoDesignacionDocente'
  | 'genero'
  | 'areaDocente'
  | 'personaConDiscapacidad'
  | 'direccionLocalidad'

export const camposPerfilDocente: { campo: CampoPerfilDocente; etiqueta: string; tipo: 'text' | 'select' }[] = [
  { campo: 'nombre', etiqueta: 'Nombre', tipo: 'text' },
  { campo: 'apellido', etiqueta: 'Apellido', tipo: 'text' },
  { campo: 'telefono', etiqueta: 'Teléfono', tipo: 'text' },
  { campo: 'cargoDocente', etiqueta: 'Cargo', tipo: 'select' },
  { campo: 'tipoDesignacionDocente', etiqueta: 'Tipo de designación', tipo: 'select' },
  { campo: 'genero', etiqueta: 'Identidad de género', tipo: 'select' },
  { campo: 'areaDocente', etiqueta: 'Materia/Área', tipo: 'text' },
  { campo: 'personaConDiscapacidad', etiqueta: 'Persona con discapacidad', tipo: 'select' },
  { campo: 'direccionLocalidad', etiqueta: 'Dirección o localidad', tipo: 'text' },
]

export function camposPerfilFaltantes(u: Usuario): CampoPerfilDocente[] {
  return camposPerfilDocente
    .filter(({ campo }) => {
      const v = u[campo]
      return v === null || v === undefined || v === ''
    })
    .map(({ campo }) => campo)
}

export const generoOptions: { value: Genero; label: string }[] = [
  { value: Genero.Femenino, label: 'Femenino' },
  { value: Genero.Masculino, label: 'Masculino' },
  { value: Genero.Otro, label: 'Otro' },
  { value: Genero.PrefieroNoResponder, label: 'Prefiero no responder' },
]

export const cargoDocenteOptions: { value: CargoDocente; label: string }[] = [
  { value: CargoDocente.ProfesorTitular, label: 'Profesor/a Titular' },
  { value: CargoDocente.ProfesorAsociado, label: 'Profesor/a Asociado/a' },
  { value: CargoDocente.ProfesorAdjunto, label: 'Profesor/a Adjunto/a' },
  { value: CargoDocente.JefeDeTrabajosPracticos, label: 'Jefe/a de Trabajos Prácticos' },
  { value: CargoDocente.AyudanteDePrimera, label: 'Ayudante de 1ª' },
  { value: CargoDocente.AyudanteDeSegunda, label: 'Ayudante de 2ª' },
  { value: CargoDocente.Otro, label: 'Otro' },
]

export const tipoDesignacionDocenteOptions: { value: TipoDesignacionDocente; label: string }[] = [
  { value: TipoDesignacionDocente.Concursado, label: 'Concursado' },
  { value: TipoDesignacionDocente.Regular, label: 'Regular' },
  { value: TipoDesignacionDocente.Ordinario, label: 'Ordinario' },
  { value: TipoDesignacionDocente.Interino, label: 'Interino' },
  { value: TipoDesignacionDocente.Suplente, label: 'Suplente' },
]

export const personaConDiscapacidadOptions = [
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

export function generoLabel(g?: Genero | null): string {
  return generoOptions.find(o => o.value === g)?.label || '—'
}

export function cargoDocenteLabel(c?: CargoDocente | null): string {
  return cargoDocenteOptions.find(o => o.value === c)?.label || '—'
}

export function tipoDesignacionDocenteLabel(t?: TipoDesignacionDocente | null): string {
  return tipoDesignacionDocenteOptions.find(o => o.value === t)?.label || '—'
}

export function personaConDiscapacidadLabel(v?: boolean | null): string {
  if (v === undefined || v === null) return '—'
  return v ? 'Sí' : 'No'
}

export const rolUsuarioLabels: Record<RolUsuario, string> = {
  [RolUsuario.AutoridadDeRectorado]: 'Autoridad de rectorado',
  [RolUsuario.AsistenteDeRectorado]: 'Asistente de rectorado',
  [RolUsuario.AutoridadDeSecretaria]: 'Autoridad de secretaría',
  [RolUsuario.AsistenteDeSecretaria]: 'Asistente de secretaría',
  [RolUsuario.Estudiante]: 'Estudiante',
  [RolUsuario.Docente]: 'Docente',
}

export function rolUsuarioLabel(rol: string): string {
  return rolUsuarioLabels[rol as RolUsuario] || rol
}

export function rolUsuarioColor(rol: string): string {
  if (rol.includes('Rectorado')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
  if (rol.includes('Secretaria')) return 'text-green-600 bg-green-50 dark:bg-green-950'
  if (rol === RolUsuario.Docente) return 'text-purple-600 bg-purple-50 dark:bg-purple-950'
  return 'text-amber-600 bg-amber-50 dark:bg-amber-950'
}

/** Orden de jerarquía de roles, de mayor a menor, usado para elegir el "rol principal" a mostrar. */
export const JERARQUIA_ROLES_USUARIO: RolUsuario[] = [
  RolUsuario.AutoridadDeRectorado,
  RolUsuario.AsistenteDeRectorado,
  RolUsuario.AutoridadDeSecretaria,
  RolUsuario.AsistenteDeSecretaria,
  RolUsuario.Docente,
  RolUsuario.Estudiante,
]

export function rolUsuarioPrincipal(roles: RolUsuario[]): RolUsuario | undefined {
  return JERARQUIA_ROLES_USUARIO.find(r => roles.includes(r)) ?? roles[0]
}
