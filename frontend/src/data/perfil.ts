import { Genero, CargoDocente, TipoDesignacionDocente } from './types'

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
