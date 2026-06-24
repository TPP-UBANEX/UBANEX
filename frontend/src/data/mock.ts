export interface Convocatoria {
  id: string
  nombre: string
  estado: 'abierta' | 'cerrada' | 'evaluacion'
  fechaApertura: string
  fechaCierre: string
  totalProyectos: number
}

export interface Proyecto {
  id: string
  titulo: string
  director: string
  facultad: string
  estado: 'presentado' | 'evaluacion' | 'adjudicado' | 'ejecucion' | 'rendicion' | 'cerrado'
  puntaje?: number
  montoAsignado?: number
}

export interface Evaluacion {
  id: string
  proyectoId: string
  proyectoTitulo: string
  evaluador: string
  tipo: 'institucional' | 'cruzada'
  puntaje: number
  estado: 'pendiente' | 'completada'
}

export interface Rendicion {
  id: string
  proyectoId: string
  proyectoTitulo: string
  rubro: string
  monto: number
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'observado'
  fecha: string
}

export interface Actividad {
  id: string
  descripcion: string
  usuario: string
  fecha: string
  tipo: 'creacion' | 'evaluacion' | 'aprobacion' | 'observacion'
}

export const convocatorias: Convocatoria[] = [
  { id: 'C001', nombre: 'UBANEX 2025', estado: 'evaluacion', fechaApertura: '01/03/2025', fechaCierre: '30/04/2025', totalProyectos: 45 },
  { id: 'C002', nombre: 'UBANEX 2026 - Convocatoria Ordinaria', estado: 'abierta', fechaApertura: '01/06/2026', fechaCierre: '31/08/2026', totalProyectos: 12 },
  { id: 'C003', nombre: 'UBANEX 2026 - Proyectos Consolidados', estado: 'abierta', fechaApertura: '01/05/2026', fechaCierre: '15/07/2026', totalProyectos: 8 },
]

export const proyectos: Proyecto[] = [
  { id: 'P001', titulo: 'Huerta Comunitaria en Barrio Mugica', director: 'María González', facultad: 'Agronomía', estado: 'adjudicado', puntaje: 87, montoAsignado: 450000 },
  { id: 'P002', titulo: 'Alfabetización Digital para Adultos Mayores', director: 'Juan Pérez', facultad: 'Sociales', estado: 'ejecucion', puntaje: 92, montoAsignado: 320000 },
  { id: 'P003', titulo: 'Talleres de Ciencia en Escuelas Públicas', director: 'Lucía Martínez', facultad: 'Exactas', estado: 'evaluacion', puntaje: 78 },
  { id: 'P004', titulo: 'Promoción de Derechos Humanos en Barrios Populares', director: 'Pedro Rodríguez', facultad: 'Derecho', estado: 'presentado' },
  { id: 'P005', titulo: 'Salud Comunitaria e Higiene Ambiental', director: 'Ana López', facultad: 'Medicina', estado: 'rendicion', puntaje: 85, montoAsignado: 280000 },
  { id: 'P006', titulo: 'Arte y Cultura en Espacios Públicos', director: 'Sofía Díaz', facultad: 'FILO', estado: 'cerrado', puntaje: 90, montoAsignado: 200000 },
  { id: 'P007', titulo: 'Capacitación en Oficios para Jóvenes', director: 'Carlos Fernández', facultad: 'Ingeniería', estado: 'ejecucion', puntaje: 81, montoAsignado: 380000 },
  { id: 'P008', titulo: 'Reciclaje y Economía Circular', director: 'Valentina Torres', facultad: 'Arquitectura', estado: 'evaluacion', puntaje: 74 },
]

export const evaluaciones: Evaluacion[] = [
  { id: 'E001', proyectoId: 'P003', proyectoTitulo: 'Talleres de Ciencia en Escuelas Públicas', evaluador: 'Dr. Ricardo Soto', tipo: 'institucional', puntaje: 78, estado: 'completada' },
  { id: 'E002', proyectoId: 'P003', proyectoTitulo: 'Talleres de Ciencia en Escuelas Públicas', evaluador: 'Dra. Mabel Ríos', tipo: 'cruzada', puntaje: 82, estado: 'completada' },
  { id: 'E003', proyectoId: 'P008', proyectoTitulo: 'Reciclaje y Economía Circular', evaluador: 'Dr. Ricardo Soto', tipo: 'institucional', puntaje: 0, estado: 'pendiente' },
  { id: 'E004', proyectoId: 'P004', proyectoTitulo: 'Promoción de Derechos Humanos en Barrios Populares', evaluador: 'Dra. Laura Medina', tipo: 'cruzada', puntaje: 0, estado: 'pendiente' },
]

export const rendiciones: Rendicion[] = [
  { id: 'R001', proyectoId: 'P005', proyectoTitulo: 'Salud Comunitaria e Higiene Ambiental', rubro: 'Equipamiento', monto: 85000, estado: 'pendiente', fecha: '10/06/2026' },
  { id: 'R002', proyectoId: 'P005', proyectoTitulo: 'Salud Comunitaria e Higiene Ambiental', rubro: 'Material didáctico', monto: 32000, estado: 'observado', fecha: '05/06/2026' },
  { id: 'R003', proyectoId: 'P002', proyectoTitulo: 'Alfabetización Digital para Adultos Mayores', rubro: 'Recursos humanos', monto: 120000, estado: 'aprobado', fecha: '28/05/2026' },
  { id: 'R004', proyectoId: 'P007', proyectoTitulo: 'Capacitación en Oficios para Jóvenes', rubro: 'Insumos', monto: 55000, estado: 'pendiente', fecha: '15/06/2026' },
  { id: 'R005', proyectoId: 'P007', proyectoTitulo: 'Capacitación en Oficios para Jóvenes', rubro: 'Viáticos', monto: 18000, estado: 'rechazado', fecha: '01/06/2026' },
]

export const actividades: Actividad[] = [
  { id: 'A001', descripcion: 'Se creó la convocatoria UBANEX 2026', usuario: 'Rectorado', fecha: '01/06/2026', tipo: 'creacion' },
  { id: 'A002', descripcion: 'Proyecto "Huerta Comunitaria" adjudicado', usuario: 'Rectorado', fecha: '28/05/2026', tipo: 'aprobacion' },
  { id: 'A003', descripcion: 'Evaluación cruzada completada para P003', usuario: 'Dra. Mabel Ríos', fecha: '25/05/2026', tipo: 'evaluacion' },
  { id: 'A004', descripcion: 'Observación en rendición R002', usuario: 'Secretaría', fecha: '20/05/2026', tipo: 'observacion' },
  { id: 'A005', descripcion: 'Proyecto "Alfabetización Digital" ingresó a ejecución', usuario: 'Director', fecha: '15/05/2026', tipo: 'creacion' },
]

export const estadoBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  abierta: 'default',
  cerrada: 'secondary',
  evaluacion: 'outline',
  presentado: 'outline',
  adjudicado: 'default',
  ejecucion: 'default',
  rendicion: 'secondary',
  cerrado: 'secondary',
  pendiente: 'outline',
  completada: 'default',
  aprobado: 'default',
  rechazado: 'destructive',
  observado: 'secondary',
}
