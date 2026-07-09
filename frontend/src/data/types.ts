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

// --- Enums de dominio ---

export enum EstadoEdicion {
  Borrador = 'Borrador',
  Presentado = 'Presentado',
  PendienteDeCambios = 'PendienteDeCambios',
  EnEvaluacion = 'EnEvaluacion',
  Adjudicado = 'Adjudicado',
  NoAdjudicado = 'NoAdjudicado',
  EnEjecucion = 'EnEjecucion',
  Cerrado = 'Cerrado',
}

export enum EstadoConvocatoria {
  Configuracion = 'Configuracion',
  Presentacion = 'Presentacion',
  Evaluacion = 'Evaluacion',
  Ejecucion = 'Ejecucion',
  Cierre = 'Cierre',
}

export enum TipoRubro {
  ViaticosYSeguros = 'ViaticosYSeguros',
  BienesDeConsumo = 'BienesDeConsumo',
  BienesDeUso = 'BienesDeUso',
}

export enum TipoPersona {
  Docente = 'Docente',
  Estudiante = 'Estudiante',
}

// --- Entidades de dominio ---

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
  nombre: string
  esConsolidado: boolean
  creadoPor: Usuario
  creadoPorId: string
  creadoEn: string
  ediciones?: Edicion[]
}

export interface Edicion {
  id: string
  proyectoId: string
  proyecto?: Proyecto
  convocatoriaId: string
  estado: EstadoEdicion
  directorId: string
  director?: Usuario
  codirectorId?: string
  codirector?: Usuario
  unidadAcademicaId: string
  unidadAcademica?: UnidadAcademica
  convocatoria?: Convocatoria
  presupuesto?: Presupuesto
  datosFormulario?: Record<string, unknown>
  creadoEn: string
  actualizadoEn: string
}

export interface Presupuesto {
  montoTotal: number
  rubros: RubroPresupuesto[]
}

export interface RubroPresupuesto {
  tipo: TipoRubro
  subtotal: number
  partidas: ViaticoPresupuesto[] | BienPresupuesto[]
}

export interface ViaticoPresupuesto {
  tipoPersona: TipoPersona
  descripcion: string
  periodo: string
  monto: number
}

export interface BienPresupuesto {
  descripcion: string
  cantidad: number
  precioUnitario: number
  monto: number
}

export interface CrearProyectoDto {
  nombre: string
  convocatoriaId: string
  codirectorId?: string
  presupuesto?: Presupuesto
}

export interface ActualizarEdicionDto {
  nombre?: string
  codirectorId?: string
  presupuesto?: Presupuesto
  datosFormulario?: Record<string, unknown>
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
  Borrador: 'secondary',
  Presentado: 'outline',
  PendienteDeCambios: 'secondary',
  EnEvaluacion: 'outline',
  Adjudicado: 'default',
  NoAdjudicado: 'destructive',
  EnEjecucion: 'default',
  Cerrado: 'secondary',
  Configuracion: 'outline',
  Presentacion: 'default',
  Evaluacion: 'outline',
  Ejecucion: 'default',
  Cierre: 'secondary',
}
