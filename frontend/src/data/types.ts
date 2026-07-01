export enum RolUsuario {
  AutoridadDeRectorado = 'AutoridadDeRectorado',
  AsistenteDeRectorado = 'AsistenteDeRectorado',
  AutoridadDeSecretaria = 'AutoridadDeSecretaria',
  AsistenteDeSecretaria = 'AsistenteDeSecretaria',
  DirectorDeProyecto = 'DirectorDeProyecto',
  Evaluador = 'Evaluador',
}

export enum EstadoDirector {
  PendienteDeValidacion = 'PendienteDeValidacion',
  Validado = 'Validado',
  Rechazado = 'Rechazado',
}

export interface UnidadAcademica {
  id: string
  nombre: string
}

export interface Usuario {
  id: string
  nombreCompleto: string
  email: string
  roles: RolUsuario[]
  unidadAcademica?: UnidadAcademica
  unidadAcademicaId?: string
  estadoDirector?: EstadoDirector
  habilitado: boolean
  creadoPor?: Usuario
  creadoPorId?: string
}

export interface AuthResponse {
  accessToken: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  nombreCompleto: string
  email: string
  password: string
  unidadAcademicaId?: string
}

export interface CrearUsuarioDto {
  nombreCompleto: string
  email: string
  password: string
  roles: RolUsuario[]
  unidadAcademicaId?: string
}

// --- Entidades existentes (se mantienen, se actualizarán en fases siguientes) ---

export interface Convocatoria {
  id: string
  nombre: string
  descripcion: string
  estado: string
  fechaApertura: string
  fechaCierre: string
}

export interface Proyecto {
  id: string
  convocatoriaId: string
  titulo: string
  director: string
  facultad: string
  resumen: string
  estado: string
  puntaje?: number
  montoAsignado?: number
}

export interface Evaluacion {
  id: string
  proyectoId: string
  proyectoTitulo?: string
  evaluador: string
  tipo: string
  puntaje: number
  observaciones: string
  estado: string
}

export interface Rendicion {
  id: string
  proyectoId: string
  proyectoTitulo?: string
  rubro: string
  monto: number
  estado: string
  fecha: string
  comprobanteUrl?: string
}

export const estadoBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  abierta: 'default',
  cerrada: 'secondary',
  evaluacion: 'outline',
  presentado: 'outline',
  revision: 'secondary',
  adjudicado: 'default',
  ejecucion: 'default',
  rendicion: 'secondary',
  cerrado: 'secondary',
  pendiente: 'outline',
  completada: 'default',
  aprobado: 'default',
  rechazado: 'destructive',
  observado: 'secondary',
  rectorado: 'default',
  secretaria: 'secondary',
  evaluador: 'outline',
  director: 'default',
}
