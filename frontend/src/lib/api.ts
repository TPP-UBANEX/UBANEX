const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const mensaje = body?.message || res.statusText
    throw new Error(mensaje)
  }
  return res.json()
}

function get<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}

function del(path: string): Promise<void> {
  return request<void>('DELETE', path)
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      post<{ accessToken: string }>('/auth/login', data),
    register: (data: { nombreCompleto: string; email: string; password: string; tipo: 'estudiante' | 'docente'; unidadAcademicaId?: string }) =>
      post<{ accessToken: string }>('/auth/register', data),
  },
  usuarios: {
    list: (params?: import('@/data/types').UsuariosQueryParams) => {
      const qs = params
        ? '?' + new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
            )
          ).toString()
        : ''
      return get<import('@/data/types').PaginatedResponse<import('@/data/types').Usuario>>(`/usuarios${qs}`)
    },
    get: (id: string) => get<import('@/data/types').Usuario>(`/usuarios/${id}`),
    crear: (data: import('@/data/types').CrearUsuarioDto) =>
      post<import('@/data/types').Usuario>('/usuarios', data),
    actualizar: (id: string, data: Partial<import('@/data/types').CrearUsuarioDto> & { habilitado?: boolean }) =>
      patch<import('@/data/types').Usuario>(`/usuarios/${id}`, data),
    actualizarEstadoValidacionDocente: (id: string, estadoValidacionDocente: string) =>
      patch<import('@/data/types').Usuario>(`/usuarios/${id}/estado-validacion-docente`, { estadoValidacionDocente }),
    eliminar: (id: string) => del(`/usuarios/${id}`),
    resetPassword: (id: string) => post<{ message: string }>(`/usuarios/${id}/reset-password`, {}),
    auditoria: (id: string) => get<import('@/data/types').Auditoria[]>(`/usuarios/${id}/auditoria`),
  },
  unidadesAcademicas: {
    list: () => get<import('@/data/types').UnidadAcademica[]>('/unidades-academicas'),
    get: (id: string) => get<import('@/data/types').UnidadAcademica>(`/unidades-academicas/${id}`),
    crear: (data: { nombre: string }) =>
      post<import('@/data/types').UnidadAcademica>('/unidades-academicas', data),
  },
  participaciones: {
    asignar: (data: import('@/data/types').CrearParticipacionDto) =>
      post<import('@/data/types').ParticipacionConvocatoria>('/participaciones-convocatoria', data),
    desasignar: (id: string) => del(`/participaciones-convocatoria/${id}`),
    listar: (convocatoriaId: string) =>
      get<import('@/data/types').ParticipacionConvocatoria[]>(`/participaciones-convocatoria?convocatoriaId=${convocatoriaId}`),
    listarMias: () =>
      get<import('@/data/types').ParticipacionConvocatoria[]>('/participaciones-convocatoria/mias'),
  },
  convocatorias: {
    list: () => get<import('@/data/types').Convocatoria[]>('/convocatorias'),
    get: (id: string) => get<import('@/data/types').Convocatoria>(`/convocatorias/${id}`),
    crear: (data: { nombre: string; descripcion?: string; anio: number; formularioId?: string; fechaInicioPresentacion?: string; fechaFinPresentacion?: string; fechaInicioEvaluacion?: string; fechaFinEvaluacion?: string; fechaInicioEjecucion?: string; fechaFinEjecucion?: string }) =>
      post<import('@/data/types').Convocatoria>('/convocatorias', data),
    actualizar: (id: string, data: { nombre?: string; descripcion?: string; anio?: number; estado?: string; formularioId?: string; fechaInicioPresentacion?: string; fechaFinPresentacion?: string; fechaInicioEvaluacion?: string; fechaFinEvaluacion?: string; fechaInicioEjecucion?: string; fechaFinEjecucion?: string }) =>
      patch<import('@/data/types').Convocatoria>(`/convocatorias/${id}`, data),
    eliminar: (id: string) => del(`/convocatorias/${id}`),
    emparejamientos: {
      list: (convocatoriaId: string) =>
        get<import('@/data/types').Emparejamiento[]>(`/convocatorias/${convocatoriaId}/emparejamientos`),
      guardar: (convocatoriaId: string, data: import('@/data/types').GuardarEmparejamientoDto) =>
        request<import('@/data/types').Emparejamiento[]>('PUT', `/convocatorias/${convocatoriaId}/emparejamientos`, data),
    },
  },
  proyectos: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return get<import('@/data/types').Edicion[]>(`/proyectos${qs}`)
    },
    get: (id: string) => get<import('@/data/types').Proyecto>(`/proyectos/${id}`),
    crear: (data: import('@/data/types').CrearProyectoDto) =>
      post<import('@/data/types').Proyecto>('/proyectos', data),
    actualizarEdicion: (id: string, edicionId: string, data: import('@/data/types').ActualizarEdicionDto) =>
      patch<import('@/data/types').Proyecto>(`/proyectos/${id}/ediciones/${edicionId}`, data),
    enviarEdicion: (id: string, edicionId: string) =>
      post<import('@/data/types').Proyecto>(`/proyectos/${id}/ediciones/${edicionId}/enviar`, {}),
    eliminarEdicion: (id: string, edicionId: string) =>
      del(`/proyectos/${id}/ediciones/${edicionId}`),
  },
  evaluaciones: {
    list: (proyectoId?: string) => {
      const qs = proyectoId ? `?proyectoId=${proyectoId}` : ''
      return get<import('@/data/types').Evaluacion[]>(`/evaluaciones${qs}`)
    },
  },
  formularios: {
    list: () => get<import('@/data/types').Formulario[]>('/formularios'),
    get: (id: string) => get<import('@/data/types').Formulario>(`/formularios/${id}`),
    crear: (data: { nombre: string; esDefault?: boolean }) =>
      post<import('@/data/types').Formulario>('/formularios', data),
    eliminar: (id: string) => del(`/formularios/${id}`),
  },
  rendiciones: {
    list: (proyectoId?: string) => {
      const qs = proyectoId ? `?proyectoId=${proyectoId}` : ''
      return get<import('@/data/types').Rendicion[]>(`/rendiciones${qs}`)
    },
  },
}
