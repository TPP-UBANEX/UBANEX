export enum RolUsuario {
  AutoridadDeRectorado = 'AutoridadDeRectorado',
  AsistenteDeRectorado = 'AsistenteDeRectorado',
  AutoridadDeSecretaria = 'AutoridadDeSecretaria',
  AsistenteDeSecretaria = 'AsistenteDeSecretaria',
  Estudiante = 'Estudiante',
  Docente = 'Docente',
}

export enum RolEjecucion {
  DirectorDeProyecto = 'DirectorDeProyecto',
  Evaluador = 'Evaluador',
}

export enum EstadoValidacionDocente {
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
  estadoValidacionDocente?: EstadoValidacionDocente
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
  tipo: 'estudiante' | 'docente'
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
    rectorado?: number
    secretarias: number
    estudiantes: number
    docentes: number
  }
}

export interface UsuariosQueryParams {
  page?: number
  limit?: number
  search?: string
  rol?: string
  unidadAcademicaId?: string
}

export interface ParticipacionConvocatoria {
  id: string
  usuarioId: string
  usuario?: Usuario
  convocatoriaId: string
  convocatoria?: Convocatoria
  rol: RolEjecucion
  edicionId?: string
  esDirectorPrincipal?: boolean
  asignadoPorId: string
  creadoEn: string
}

export interface CrearParticipacionDto {
  usuarioId: string
  convocatoriaId: string
  rol: RolEjecucion
  edicionId?: string
  esDirectorPrincipal?: boolean
}

export enum TipoAccionAuditoria {
  CREACION = 'CREACION',
  EDICION = 'EDICION',
  CAMBIO_ROL = 'CAMBIO_ROL',
  INACTIVACION = 'INACTIVACION',
  REACTIVACION = 'REACTIVACION',
  RESET_PASSWORD = 'RESET_PASSWORD',
  VALIDACION_DOCENTE = 'VALIDACION_DOCENTE',
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
  Configuracion = 'configuracion',
  Presentacion = 'presentacion',
  Evaluacion = 'evaluacion',
  Ejecucion = 'ejecucion',
  Cierre = 'cierre',
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
  nombre: string
  esConsolidado: boolean
  esInterfacultad: boolean
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
  creadoPorId: string
  creadoPor?: Usuario
  unidadAcademicaId: string
  unidadAcademica?: UnidadAcademica
  convocatoria?: Convocatoria
  presupuesto?: Presupuesto
  anioEdicion?: number
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
  periodoInicio: string
  periodoFin: string
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
  anioEdicion?: number
  esConsolidado?: boolean
  esInterfacultad?: boolean
}

export interface ActualizarEdicionDto {
  nombre?: string
  anioEdicion?: number
  esConsolidado?: boolean
  esInterfacultad?: boolean
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
