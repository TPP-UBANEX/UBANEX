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
  ultimaActividad?: string
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

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
  stats?: {
    rectorado: number
    secretarias: number
    evaluadores: number
    directores: number
  }
}

export interface UsuariosQueryParams {
  page?: number
  limit?: number
  search?: string
  rol?: string
  unidadAcademicaId?: string
}

export enum TipoAccionAuditoria {
  CREACION = 'CREACION',
  EDICION = 'EDICION',
  CAMBIO_ROL = 'CAMBIO_ROL',
  INACTIVACION = 'INACTIVACION',
  REACTIVACION = 'REACTIVACION',
  RESET_PASSWORD = 'RESET_PASSWORD',
  VALIDACION_DIRECTOR = 'VALIDACION_DIRECTOR',
}

export interface Auditoria {
  id: string
  usuarioId: string
  accion: TipoAccionAuditoria
  descripcion: string
  responsableId: string
  responsableNombre: string
  fecha: string
  motivo: string | null
}

// --- Entidades existentes (se mantienen, se actualizarán en fases siguientes) ---

export enum EstadoConvocatoria {
  Configuracion = 'configuracion',
  Presentacion = 'presentacion',
  Evaluacion = 'evaluacion',
  Ejecucion = 'ejecucion',
  Cierre = 'cierre',
}

export interface Convocatoria {
  id: string
  nombre: string
  descripcion: string
  anio: number
  estado: EstadoConvocatoria
  fechaInicioPresentacion: string | null
  fechaFinPresentacion: string | null
  fechaInicioEvaluacion: string | null
  fechaFinEvaluacion: string | null
  fechaInicioEjecucion: string | null
  fechaFinEjecucion: string | null
  formularioId: string | null
  formulario?: Formulario
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

export interface Formulario {
  id: string
  nombre: string
  esDefault: boolean
}

export interface Emparejamiento {
  id: string
  convocatoriaId: string
  unidadAId: string
  unidadA: UnidadAcademica
  unidadBId: string
  unidadB: UnidadAcademica
}

export interface ParEmparejamientoDto {
  unidadAId: string
  unidadBId: string
}

export interface GuardarEmparejamientoDto {
  pares: ParEmparejamientoDto[]
}

export const estadoBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  configuracion: 'outline',
  presentacion: 'default',
  evaluacion: 'secondary',
  ejecucion: 'default',
  cierre: 'secondary',
  presentado: 'outline',
  revision: 'secondary',
  adjudicado: 'default',
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
