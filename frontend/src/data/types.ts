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

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  facultad?: string
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
