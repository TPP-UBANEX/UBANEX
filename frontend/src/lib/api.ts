const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = body?.message || res.statusText;
    throw new Error(mensaje);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

function del(path: string): Promise<void> {
  return request<void>('DELETE', path);
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      post<{ accessToken: string }>('/auth/login', data),
    register: (data: import('@/data/types').RegisterDto) =>
      post<{ accessToken: string }>('/auth/register', data),
  },
  usuarios: {
    list: (params?: import('@/data/types').UsuariosQueryParams) => {
      const qs = params
        ? '?' +
          new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([_, v]) => v !== undefined && v !== ''),
            ),
          ).toString()
        : '';
      return get<import('@/data/types').PaginatedResponse<import('@/data/types').Usuario>>(
        `/usuarios${qs}`,
      );
    },
    get: (id: string) => get<import('@/data/types').Usuario>(`/usuarios/${id}`),
    crear: (data: import('@/data/types').CrearUsuarioDto) =>
      post<import('@/data/types').Usuario>('/usuarios', data),
    actualizar: (
      id: string,
      data: Partial<import('@/data/types').CrearUsuarioDto> & { habilitado?: boolean },
    ) => patch<import('@/data/types').Usuario>(`/usuarios/${id}`, data),
    actualizarEstadoValidacionDocente: (id: string, estadoValidacionDocente: string) =>
      patch<import('@/data/types').Usuario>(`/usuarios/${id}/estado-validacion-docente`, {
        estadoValidacionDocente,
      }),
    eliminar: (id: string) => del(`/usuarios/${id}`),
    resetPassword: (id: string) => post<{ message: string }>(`/usuarios/${id}/reset-password`, {}),
    auditoria: (id: string) => get<import('@/data/types').Auditoria[]>(`/usuarios/${id}/auditoria`),
    buscar: (q: string, roles?: import('@/data/types').RolUsuario[]) =>
      get<import('@/data/types').UsuarioSugerido[]>(
        `/usuarios/buscar?q=${encodeURIComponent(q)}${roles?.length ? `&roles=${roles.join(',')}` : ''}`,
      ),
  },
  geo: {
    localidades: (q: string) =>
      get<import('@/data/types').Localidad[]>(`/geo/localidades?q=${encodeURIComponent(q)}`),
  },
  unidadesAcademicas: {
    list: () => get<import('@/data/types').UnidadAcademica[]>('/unidades-academicas'),
    get: (id: string) => get<import('@/data/types').UnidadAcademica>(`/unidades-academicas/${id}`),
    crear: (data: { nombre: string }) =>
      post<import('@/data/types').UnidadAcademica>('/unidades-academicas', data),
  },
  carreras: {
    list: () => get<import('@/data/types').Carrera[]>('/carreras'),
    get: (id: string) => get<import('@/data/types').Carrera>(`/carreras/${id}`),
    porUnidadAcademica: (unidadAcademicaId: string) =>
      get<import('@/data/types').Carrera[]>(`/carreras/unidad-academica/${unidadAcademicaId}`),
    crear: (data: { nombre: string; unidadAcademicaId: string }) =>
      post<import('@/data/types').Carrera>('/carreras', data),
  },
  participaciones: {
    asignar: (data: import('@/data/types').CrearParticipacionDto) =>
      post<import('@/data/types').ParticipacionConvocatoria>('/participaciones-convocatoria', data),
    desasignar: (id: string) => del(`/participaciones-convocatoria/${id}`),
    listar: (convocatoriaId: string) =>
      get<import('@/data/types').ParticipacionConvocatoria[]>(
        `/participaciones-convocatoria?convocatoriaId=${convocatoriaId}`,
      ),
    candidatos: (params: {
      unidadAcademicaId: string;
      unidadAcademicaAdicionalId?: string;
      convocatoriaId: string;
      edicionId?: string;
      incluirBloqueados?: boolean;
    }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([_, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)] as [string, string]),
        ),
      ).toString();
      return get<import('@/data/types').Usuario[]>(
        `/participaciones-convocatoria/candidatos?${qs}`,
      );
    },
    listarMias: () =>
      get<import('@/data/types').ParticipacionConvocatoria[]>('/participaciones-convocatoria/mias'),
  },
  convocatorias: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      estado?: string;
      fase?: string;
    }) => {
      const qs = params
        ? '?' +
          new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
            ) as Record<string, string>,
          ).toString()
        : '';
      return get<import('@/data/types').PaginatedResponse<import('@/data/types').Convocatoria>>(
        `/convocatorias${qs}`,
      );
    },
    todas: () => get<import('@/data/types').Convocatoria[]>('/convocatorias/todas'),
    get: (id: string) => get<import('@/data/types').Convocatoria>(`/convocatorias/${id}`),
    crear: (data: {
      nombre: string;
      descripcion?: string;
      anio: number;
      fechaInicioPresentacion?: string;
      fechaFinPresentacion?: string;
      fechaInicioEvaluacion?: string;
      fechaFinEvaluacion?: string;
      fechaInicioEjecucion?: string;
      fechaFinEjecucion?: string;
      cuotaFederativa?: number;
      presupuestoTotal?: number | null;
      topePresupuestoNoConsolidado?: number | null;
      topePresupuestoConsolidado?: number | null;
      porcentajeExtraInsumos?: number;
      umbralInsumos?: number;
      porcentajeExtraPse?: number;
    }) => post<import('@/data/types').Convocatoria>('/convocatorias', data),
    actualizar: (
      id: string,
      data: {
        nombre?: string;
        descripcion?: string;
        anio?: number;
        estado?: string;
        fechaInicioPresentacion?: string;
        fechaFinPresentacion?: string;
        fechaInicioEvaluacion?: string;
        fechaFinEvaluacion?: string;
        fechaInicioEjecucion?: string;
        fechaFinEjecucion?: string;
        cuotaFederativa?: number;
        presupuestoTotal?: number | null;
        topePresupuestoNoConsolidado?: number | null;
        topePresupuestoConsolidado?: number | null;
        porcentajeExtraInsumos?: number;
        umbralInsumos?: number;
        porcentajeExtraPse?: number;
      },
    ) => patch<import('@/data/types').Convocatoria>(`/convocatorias/${id}`, data),
    eliminar: (id: string) => del(`/convocatorias/${id}`),
    emparejamientos: {
      list: (convocatoriaId: string) =>
        get<import('@/data/types').Emparejamiento[]>(
          `/convocatorias/${convocatoriaId}/emparejamientos`,
        ),
      guardar: (convocatoriaId: string, data: import('@/data/types').GuardarEmparejamientoDto) =>
        request<import('@/data/types').Emparejamiento[]>(
          'PUT',
          `/convocatorias/${convocatoriaId}/emparejamientos`,
          data,
        ),
    },
    formulario: {
      get: (convocatoriaId: string) =>
        get<import('@/data/types').Formulario>(`/convocatorias/${convocatoriaId}/formulario`),
      guardar: (convocatoriaId: string, campos: import('@/data/types').CampoFormulario[]) =>
        request<import('@/data/types').Formulario>(
          'PUT',
          `/convocatorias/${convocatoriaId}/formulario`,
          { campos },
        ),
    },
    templateInstitucional: {
      get: (convocatoriaId: string) =>
        get<import('@/data/types').TemplateEvaluacionInstitucional>(
          `/convocatorias/${convocatoriaId}/template-evaluacion-institucional`,
        ),
      guardar: (
        convocatoriaId: string,
        estructura: import('@/data/types').EstructuraTemplateInstitucional | null,
      ) =>
        request<import('@/data/types').TemplateEvaluacionInstitucional>(
          'PUT',
          `/convocatorias/${convocatoriaId}/template-evaluacion-institucional`,
          { estructura },
        ),
    },
    templateCruzada: {
      get: (convocatoriaId: string) =>
        get<import('@/data/types').TemplateEvaluacionCruzada>(
          `/convocatorias/${convocatoriaId}/template-evaluacion-cruzada`,
        ),
      guardar: (
        convocatoriaId: string,
        estructura: import('@/data/types').EstructuraTemplateCruzada | null,
      ) =>
        request<import('@/data/types').TemplateEvaluacionCruzada>(
          'PUT',
          `/convocatorias/${convocatoriaId}/template-evaluacion-cruzada`,
          { estructura },
        ),
    },
  },
  proyectos: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      estado?: string;
      convocatoriaId?: string;
      anio?: number;
    }) => {
      const qs = params
        ? '?' +
          new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
            ) as Record<string, string>,
          ).toString()
        : '';
      return get<import('@/data/types').PaginatedResponse<import('@/data/types').Edicion>>(
        `/proyectos${qs}`,
      );
    },
    todas: (params?: { convocatoriaId?: string }) => {
      const qs = params?.convocatoriaId
        ? `?convocatoriaId=${encodeURIComponent(params.convocatoriaId)}`
        : '';
      return get<import('@/data/types').Edicion[]>(`/proyectos/todas${qs}`);
    },
    get: (id: string) => get<import('@/data/types').Proyecto>(`/proyectos/${id}`),
    crear: (data: import('@/data/types').CrearProyectoDto) =>
      post<import('@/data/types').Proyecto>('/proyectos', data),
    actualizarEdicion: (
      id: string,
      edicionId: string,
      data: import('@/data/types').ActualizarEdicionDto,
    ) => patch<import('@/data/types').Proyecto>(`/proyectos/${id}/ediciones/${edicionId}`, data),
    enviarEdicion: (id: string, edicionId: string) =>
      post<import('@/data/types').Proyecto>(`/proyectos/${id}/ediciones/${edicionId}/enviar`, {}),
    iniciarEvaluacion: (id: string, edicionId: string) =>
      post<import('@/data/types').Proyecto>(
        `/proyectos/${id}/ediciones/${edicionId}/iniciar-evaluacion`,
        {},
      ),
    actualizarAval: (id: string, edicionId: string, data: { avalUrl: string | null }) =>
      patch<import('@/data/types').Proyecto>(`/proyectos/${id}/ediciones/${edicionId}/aval`, data),
    eliminarEdicion: (id: string, edicionId: string) =>
      del(`/proyectos/${id}/ediciones/${edicionId}`),
    resubir: (id: string, data: { convocatoriaId: string; anioEdicion?: number }) =>
      post<import('@/data/types').Proyecto>(`/proyectos/${id}/resubir`, data),
    disponiblesParaResubir: (convocatoriaId: string, search?: string) => {
      const qs = `?convocatoriaId=${encodeURIComponent(convocatoriaId)}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      return get<{ proyectoId: string; proyectoNombre: string; esConsolidado: boolean | null }[]>(`/proyectos/disponibles-para-resubir${qs}`)
    },
  },
  evaluaciones: {
    monitoreo: (
      convocatoriaId: string,
      params?: {
        page?: number;
        limit?: number;
        search?: string;
        estado?: string;
        unidadAcademicaId?: string;
      },
    ) =>
      get<import('@/data/types').MonitoreoEvaluacion>(
        `/evaluaciones?convocatoriaId=${encodeURIComponent(convocatoriaId)}${params?.page ? `&page=${params.page}` : ''}${params?.limit ? `&limit=${params.limit}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params?.estado ? `&estado=${params.estado}` : ''}${params?.unidadAcademicaId ? `&unidadAcademicaId=${params.unidadAcademicaId}` : ''}`,
      ),
    generarOrdenMerito: (convocatoriaId: string) =>
      post<import('@/data/types').Edicion[]>(
        `/evaluaciones/convocatoria/${convocatoriaId}/orden-merito`,
        {},
      ),
    confirmarOrdenMerito: (convocatoriaId: string) =>
      post<import('@/data/types').Convocatoria>(
        `/evaluaciones/convocatoria/${convocatoriaId}/confirmar-orden-merito`,
        {},
      ),
    ordenMeritoUa: (convocatoriaId: string) =>
      get<{
        convocatoria: import('@/data/types').Convocatoria;
        meta: { total: number; page: number; limit: number; totalPages: number };
        ediciones: Array<{
          edicion: import('@/data/types').Edicion;
          institucional: {
            id: string;
            estado: string;
            observaciones: string | null;
            realizadoPor: { id: string; nombreCompleto: string } | null;
            confirmadoPor: { id: string; nombreCompleto: string } | null;
          } | null;
          cruzadas: Array<{
            id: string;
            tipo: string;
            estado: string;
            evaluador: { id: string; nombreCompleto: string } | null;
          }>;
        }>;
      }>(`/evaluaciones/convocatoria/${convocatoriaId}/orden-merito/ua`),
    ordenMeritoDocente: (convocatoriaId: string) =>
      get<{
        convocatoria: import('@/data/types').Convocatoria;
        ediciones: Array<{
          edicionId: string;
          proyecto: { nombre: string } | null;
          unidadAcademica: { nombre: string } | null;
          adjudicado: boolean;
        }>;
      }>(`/evaluaciones/convocatoria/${convocatoriaId}/orden-merito/docente`),
    actualizarPropuestaAdjudicacion: (
      edicionId: string,
      adjudicado: boolean,
      mecanismo?: 'MERITO' | 'CUOTA_FEDERATIVA',
    ) =>
      patch<import('@/data/types').Edicion>(
        `/evaluaciones/edicion/${edicionId}/adjudicacion-propuesta`,
        { adjudicado, mecanismo },
      ),
    edicion: (edicionId: string) =>
      get<import('@/data/types').EvaluacionEdicionDetalle>(`/evaluaciones/edicion/${edicionId}`),
    institucionales: {
      listar: (
        convocatoriaId: string,
        params?: { page?: number; limit?: number; search?: string; estado?: string },
      ) =>
        get<
          import('@/data/types').PaginatedResponse<
            import('@/data/types').EdicionEvaluableInstitucional
          >
        >(
          `/evaluaciones/institucionales?convocatoriaId=${encodeURIComponent(convocatoriaId)}${params?.page ? `&page=${params.page}` : ''}${params?.limit ? `&limit=${params.limit}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params?.estado ? `&estado=${params.estado}` : ''}`,
        ),
      obtener: (convocatoriaId: string, edicionId: string) =>
        get<{
          evaluacion: import('@/data/types').EvaluacionInstitucional | null;
          template: import('@/data/types').TemplateEvaluacionInstitucional | null;
        }>(`/evaluaciones/institucionales/${edicionId}?convocatoriaId=${convocatoriaId}`),
      guardar: (
        convocatoriaId: string,
        edicionId: string,
        data: import('@/data/types').GuardarEvaluacionInstitucionalDto,
      ) =>
        request<{
          evaluacion: import('@/data/types').EvaluacionInstitucional;
          template: import('@/data/types').TemplateEvaluacionInstitucional | null;
        }>(
          'PUT',
          `/evaluaciones/institucionales/${edicionId}?convocatoriaId=${convocatoriaId}`,
          data,
        ),
      confirmar: (convocatoriaId: string, edicionId: string) =>
        post<import('@/data/types').EvaluacionInstitucional>(
          `/evaluaciones/institucionales/${edicionId}/confirmar?convocatoriaId=${convocatoriaId}`,
          {},
        ),
      historial: (convocatoriaId: string, edicionId: string) =>
        get<import('@/data/types').HistorialEvaluacion[]>(
          `/evaluaciones/institucionales/${edicionId}/historial?convocatoriaId=${convocatoriaId}`,
        ),
    },
    cruzadas: {
      disponibles: (
        convocatoriaId: string,
        params?: { page?: number; limit?: number; search?: string; estado?: string },
      ) =>
        get<
          import('@/data/types').PaginatedResponse<import('@/data/types').EdicionEvaluableCruzada>
        >(
          `/evaluaciones/cruzadas/disponibles?convocatoriaId=${encodeURIComponent(convocatoriaId)}${params?.page ? `&page=${params.page}` : ''}${params?.limit ? `&limit=${params.limit}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params?.estado ? `&estado=${params.estado}` : ''}`,
        ),
      obtener: (convocatoriaId: string, edicionId: string) =>
        get<{
          evaluacion: import('@/data/types').EvaluacionCruzada | null;
          template: import('@/data/types').TemplateEvaluacionCruzada | null;
        }>(`/evaluaciones/cruzadas/${edicionId}?convocatoriaId=${convocatoriaId}`),
      guardar: (
        convocatoriaId: string,
        edicionId: string,
        data: import('@/data/types').GuardarEvaluacionCruzadaDto,
      ) =>
        request<{
          evaluacion: import('@/data/types').EvaluacionCruzada;
          template: import('@/data/types').TemplateEvaluacionCruzada | null;
        }>('PUT', `/evaluaciones/cruzadas/${edicionId}?convocatoriaId=${convocatoriaId}`, data),
      confirmar: (convocatoriaId: string, edicionId: string) =>
        post<import('@/data/types').EvaluacionCruzada>(
          `/evaluaciones/cruzadas/${edicionId}/confirmar?convocatoriaId=${convocatoriaId}`,
          {},
        ),
      designarTercera: (convocatoriaId: string, edicionId: string, evaluadorId: string) =>
        post<import('@/data/types').EvaluacionCruzada>(
          `/evaluaciones/cruzadas/${edicionId}/designar-tercera?convocatoriaId=${convocatoriaId}`,
          { evaluadorId },
        ),
      historial: (convocatoriaId: string, edicionId: string) =>
        get<import('@/data/types').HistorialEvaluacion[]>(
          `/evaluaciones/cruzadas/${edicionId}/historial?convocatoriaId=${convocatoriaId}`,
        ),
    },
  },
  templatesEvaluacion: {
    institucionales: {
      list: () =>
        get<import('@/data/types').TemplateEvaluacionInstitucional[]>(
          '/templates-evaluacion-institucional',
        ),
      get: (id: string) =>
        get<import('@/data/types').TemplateEvaluacionInstitucional>(
          `/templates-evaluacion-institucional/${id}`,
        ),
      crear: (data: import('@/data/types').GuardarTemplateInstitucionalDto) =>
        post<import('@/data/types').TemplateEvaluacionInstitucional>(
          '/templates-evaluacion-institucional',
          data,
        ),
      actualizar: (
        id: string,
        data: Partial<import('@/data/types').GuardarTemplateInstitucionalDto>,
      ) =>
        patch<import('@/data/types').TemplateEvaluacionInstitucional>(
          `/templates-evaluacion-institucional/${id}`,
          data,
        ),
      eliminar: (id: string) => del(`/templates-evaluacion-institucional/${id}`),
    },
    cruzadas: {
      list: () =>
        get<import('@/data/types').TemplateEvaluacionCruzada[]>('/templates-evaluacion-cruzada'),
      get: (id: string) =>
        get<import('@/data/types').TemplateEvaluacionCruzada>(
          `/templates-evaluacion-cruzada/${id}`,
        ),
      crear: (data: import('@/data/types').GuardarTemplateCruzadaDto) =>
        post<import('@/data/types').TemplateEvaluacionCruzada>(
          '/templates-evaluacion-cruzada',
          data,
        ),
      actualizar: (id: string, data: Partial<import('@/data/types').GuardarTemplateCruzadaDto>) =>
        patch<import('@/data/types').TemplateEvaluacionCruzada>(
          `/templates-evaluacion-cruzada/${id}`,
          data,
        ),
      eliminar: (id: string) => del(`/templates-evaluacion-cruzada/${id}`),
    },
  },
  formularios: {
    list: () => get<import('@/data/types').Formulario[]>('/formularios'),
    get: (id: string) => get<import('@/data/types').Formulario>(`/formularios/${id}`),
    crear: (data: {
      nombre: string;
      esDefault?: boolean;
      campos?: import('@/data/types').CampoFormulario[];
    }) => post<import('@/data/types').Formulario>('/formularios', data),
    actualizar: (
      id: string,
      data: {
        nombre?: string;
        esDefault?: boolean;
        campos?: import('@/data/types').CampoFormulario[];
      },
    ) => patch<import('@/data/types').Formulario>(`/formularios/${id}`, data),
    eliminar: (id: string) => del(`/formularios/${id}`),
  },
  sugerencias: {
    listar: (edicionId: string) =>
      get<import('@/data/types').SugerenciaCambio[]>(`/ediciones/${edicionId}/sugerencias`),
    crear: (edicionId: string, data: import('@/data/types').CrearSugerenciaDto) =>
      post<import('@/data/types').SugerenciaCambio>(`/ediciones/${edicionId}/sugerencias`, data),
    responder: (id: string, data: import('@/data/types').ResponderSugerenciaDto) =>
      patch<import('@/data/types').SugerenciaCambio>(`/sugerencias/${id}/responder`, data),
  },
  notificaciones: {
    listar: () => get<import('@/data/types').Notificacion[]>('/notificaciones'),
    leer: (id: string) => patch<{ message: string }>(`/notificaciones/${id}/leer`, {}),
    leerTodas: () => patch<{ message: string }>('/notificaciones/leer-todas', {}),
    eliminar: (id: string) => del(`/notificaciones/${id}`),
  },
  rendiciones: {
    list: (proyectoId?: string) => {
      const qs = proyectoId ? `?proyectoId=${proyectoId}` : '';
      return get<import('@/data/types').Rendicion[]>(`/rendiciones${qs}`);
    },
  },
  ejecucion: {
    hitos: {
      listar: (edicionId: string) =>
        get<import('@/data/types').Hito[]>(`/hitos/ediciones/${edicionId}`),
      crear: (edicionId: string, data: import('@/data/types').CrearHitoDto) =>
        post<import('@/data/types').Hito>(`/hitos/ediciones/${edicionId}`, data),
      actualizar: (id: string, data: import('@/data/types').ActualizarHitoDto) =>
        request<import('@/data/types').Hito>('PUT', `/hitos/${id}`, data),
      eliminar: (id: string) => del(`/hitos/${id}`),
    },
    autoevaluacion: {
      obtener: (edicionId: string) =>
        get<{ autoevaluacion: import('@/data/types').AutoevaluacionImpacto | null; template: import('@/data/types').TemplateAutoevaluacionImpacto | null }>(`/autoevaluacion-impacto/ediciones/${edicionId}`),
      guardar: (edicionId: string, data: import('@/data/types').GuardarAutoevaluacionDto) =>
        request<{ autoevaluacion: import('@/data/types').AutoevaluacionImpacto; template: import('@/data/types').TemplateAutoevaluacionImpacto | null }>('PUT', `/autoevaluacion-impacto/ediciones/${edicionId}`, data),
      completar: (edicionId: string) =>
        post<import('@/data/types').AutoevaluacionImpacto>(`/autoevaluacion-impacto/ediciones/${edicionId}/completar`, {}),
    },
    informeFinal: {
      obtener: (edicionId: string) =>
        get<import('@/data/types').InformeFinal | null>(`/informe-final/ediciones/${edicionId}`),
      guardar: (edicionId: string, data: import('@/data/types').GuardarInformeFinalDto) =>
        request<import('@/data/types').InformeFinal>('PUT', `/informe-final/ediciones/${edicionId}`, data),
      confirmar: (edicionId: string) =>
        post<import('@/data/types').InformeFinal>(`/informe-final/ediciones/${edicionId}/confirmar`, {}),
    },
  },
  templatesAutoevaluacion: {
    list: () => get<import('@/data/types').TemplateAutoevaluacionImpacto[]>('/templates-autoevaluacion-impacto'),
    get: (id: string) => get<import('@/data/types').TemplateAutoevaluacionImpacto>(`/templates-autoevaluacion-impacto/${id}`),
    crear: (data: { nombre: string; esDefault?: boolean; estructura?: import('@/data/types').EstructuraTemplateAutoevaluacion }) =>
      post<import('@/data/types').TemplateAutoevaluacionImpacto>('/templates-autoevaluacion-impacto', data),
    actualizar: (id: string, data: { nombre?: string; esDefault?: boolean; estructura?: import('@/data/types').EstructuraTemplateAutoevaluacion }) =>
      request<import('@/data/types').TemplateAutoevaluacionImpacto>('PUT', `/templates-autoevaluacion-impacto/${id}`, data),
    eliminar: (id: string) => del(`/templates-autoevaluacion-impacto/${id}`),
    porConvocatoria: {
      get: (convocatoriaId: string) =>
        get<import('@/data/types').TemplateAutoevaluacionImpacto>(`/convocatorias/${convocatoriaId}/template-autoevaluacion-impacto`),
      guardar: (convocatoriaId: string, estructura: import('@/data/types').EstructuraTemplateAutoevaluacion | null) =>
        request<import('@/data/types').TemplateAutoevaluacionImpacto>('PUT', `/convocatorias/${convocatoriaId}/template-autoevaluacion-impacto`, { estructura }),
    },
  },
};
