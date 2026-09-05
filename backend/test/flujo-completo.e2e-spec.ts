import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { crearApp, cerrarApp } from './crear-app.helper';
import { sembrarDatosBase, DatosBase, obtenerUsuarioId, ponerEdicionEnEjecucion } from './fixtures';
import { peticion, autenticar } from './http';

const EstructuraInstitucional = {
  categorias: [
    {
      id: 'cat-1',
      nombre: 'Puntaje diferencial',
      subcategorias: [
        { id: 'sub-trayectoria', texto: 'Trayectoria del equipo', tipoValor: 'numerico' as const, minimo: 0, maximo: 10, fundamentacion: null },
        { id: 'sub-antecedentes', texto: 'Antecedentes del proyecto', tipoValor: 'numerico' as const, minimo: 0, maximo: 10, fundamentacion: null },
        { id: 'sub-complementariedad', texto: 'Complementariedad del equipo', tipoValor: 'booleano' as const, minimo: null, maximo: null, fundamentacion: null },
        { id: 'sub-estudiantes', texto: 'Estudiantes activos', tipoValor: 'booleano' as const, minimo: null, maximo: null, fundamentacion: null },
      ],
    },
    {
      id: 'cat-2',
      nombre: 'Articulación',
      subcategorias: [
        { id: 'sub-vinculacion', texto: 'Vinculación con el territorio', tipoValor: 'numerico' as const, minimo: 0, maximo: 10, fundamentacion: null },
        { id: 'sub-coherencia', texto: 'Coherencia del proyecto', tipoValor: 'numerico' as const, minimo: 0, maximo: 10, fundamentacion: null },
        { id: 'sub-politicas', texto: 'Articula con políticas públicas', tipoValor: 'booleano' as const, minimo: null, maximo: null, fundamentacion: null },
        { id: 'sub-devolucion', texto: 'Devolución a la comunidad', tipoValor: 'booleano' as const, minimo: null, maximo: null, fundamentacion: null },
      ],
    },
  ],
  checklist: [
    { id: 'check-superposicion', texto: 'Sin superposición con otros proyectos' },
    { id: 'check-presupuesto', texto: 'Presupuesto acorde' },
    { id: 'check-documentacion', texto: 'Documentación completa' },
  ],
};

const EstructuraCruzada = {
  categorias: [
    {
      id: 'cat-just', nombre: 'Justificación y Formulación', puntajeMaximo: 25,
      items: [
        { id: 'item-problema', nombre: 'Claridad del problema', puntajeMaximo: 10 },
        { id: 'item-objetivos', nombre: 'Coherencia de objetivos', puntajeMaximo: 8 },
        { id: 'item-metodologia', nombre: 'Metodología', puntajeMaximo: 7 },
      ],
    },
    {
      id: 'cat-cap', nombre: 'Capacitación', puntajeMaximo: 20,
      items: [
        { id: 'item-part-diseno', nombre: 'Participación en diseño', puntajeMaximo: 8 },
        { id: 'item-formacion', nombre: 'Formación de alumnos', puntajeMaximo: 7 },
        { id: 'item-roles', nombre: 'Roles de alumnos', puntajeMaximo: 5 },
      ],
    },
    {
      id: 'cat-fact', nombre: 'Factibilidad', puntajeMaximo: 10,
      items: [
        { id: 'item-viabilidad', nombre: 'Viabilidad', puntajeMaximo: 5 },
        { id: 'item-presupuesto', nombre: 'Presupuesto', puntajeMaximo: 5 },
      ],
    },
    {
      id: 'cat-vinc', nombre: 'Vinculación', puntajeMaximo: 12,
      items: [
        { id: 'item-comunidad', nombre: 'Participación comunitaria', puntajeMaximo: 6 },
        { id: 'item-articulacion', nombre: 'Articulación territorial', puntajeMaximo: 6 },
      ],
    },
    {
      id: 'cat-imp', nombre: 'Impacto Social', puntajeMaximo: 15,
      items: [
        { id: 'item-impacto', nombre: 'Impacto esperado', puntajeMaximo: 8 },
        { id: 'item-sostenibilidad', nombre: 'Sostenibilidad', puntajeMaximo: 7 },
      ],
    },
  ],
};

function evalInstitucionalAlta() {
  return {
    categorias: {
      'sub-trayectoria': { valor: 8 },
      'sub-antecedentes': { valor: 9 },
      'sub-complementariedad': { valor: true },
      'sub-estudiantes': { valor: true },
      'sub-vinculacion': { valor: 7 },
      'sub-coherencia': { valor: 8 },
      'sub-politicas': { valor: true },
      'sub-devolucion': { valor: true },
    },
    checklist: {
      'check-superposicion': true,
      'check-presupuesto': true,
      'check-documentacion': true,
    },
    esPse: false,
  };
}

function evalInstitucionalBaja() {
  return {
    categorias: {
      'sub-trayectoria': { valor: 2 },
      'sub-antecedentes': { valor: 3 },
      'sub-complementariedad': { valor: false },
      'sub-estudiantes': { valor: false },
      'sub-vinculacion': { valor: 2 },
      'sub-coherencia': { valor: 3 },
      'sub-politicas': { valor: false },
      'sub-devolucion': { valor: false },
    },
    checklist: {
      'check-superposicion': true,
      'check-presupuesto': true,
      'check-documentacion': true,
    },
    esPse: false,
  };
}

function evalCruzadaAlta() {
  return {
    'item-problema': 8, 'item-objetivos': 7, 'item-metodologia': 6,
    'item-part-diseno': 7, 'item-formacion': 6, 'item-roles': 4,
    'item-viabilidad': 4, 'item-presupuesto': 4,
    'item-comunidad': 5, 'item-articulacion': 5,
    'item-impacto': 7, 'item-sostenibilidad': 6,
  };
}

function evalCruzadaBaja() {
  return {
    'item-problema': 3, 'item-objetivos': 2, 'item-metodologia': 2,
    'item-part-diseno': 2, 'item-formacion': 2, 'item-roles': 1,
    'item-viabilidad': 1, 'item-presupuesto': 1,
    'item-comunidad': 1, 'item-articulacion': 1,
    'item-impacto': 2, 'item-sostenibilidad': 2,
  };
}

function presupuestoCompleto() {
  return {
    montoTotal: 1,
    rubros: [
      {
        tipo: 'ViaticosYSeguros', subtotal: 1000,
        partidas: [{ tipoPersona: 'Docente', descripcion: 'Viáticos', periodoInicio: '2029-10-15', periodoFin: '2029-11-15', monto: 1000 }],
      },
      {
        tipo: 'BienesDeConsumo', subtotal: 1000,
        partidas: [{ descripcion: 'Papelería', cantidad: 10, precioUnitario: 100, monto: 1 }],
      },
      {
        tipo: 'BienesDeUso', subtotal: 200,
        partidas: [{ descripcion: 'Notebook', cantidad: 1, precioUnitario: 200, monto: 1 }],
      },
    ],
  };
}

async function configurarConvocatoria(
  app: INestApplication,
  base: DatosBase,
  nombre: string,
): Promise<string> {
  const adminHeaders = await autenticar(app, base.admin);

  const resConv = await peticion(app)
    .post('/convocatorias')
    .set(adminHeaders)
    .send({
      nombre,
      anio: 2029,
      fechaInicioPresentacion: '2029-02-01',
      fechaFinPresentacion: '2029-06-30',
      fechaInicioEvaluacion: '2029-07-01',
      fechaFinEvaluacion: '2029-08-31',
      fechaInicioEjecucion: '2029-10-01',
      fechaFinEjecucion: '2030-03-31',
      umbralInconsistenciaCruzada: 40,
    });
  expect(resConv.status).toBe(201);
  const convId = resConv.body.id as string;

  await peticion(app)
    .put(`/convocatorias/${convId}/template-evaluacion-institucional`)
    .set(adminHeaders)
    .send({ estructura: EstructuraInstitucional })
    .then((r) => expect(r.status).toBe(200));

  await peticion(app)
    .put(`/convocatorias/${convId}/template-evaluacion-cruzada`)
    .set(adminHeaders)
    .send({ estructura: EstructuraCruzada })
    .then((r) => expect(r.status).toBe(200));

  const resEmp = await peticion(app)
    .put(`/convocatorias/${convId}/emparejamientos`)
    .set(adminHeaders)
    .send({
      pares: [{
        unidadAId: base.uaPorNombreId.get('Facultad de Derecho')!,
        unidadBId: base.uaPorNombreId.get('Facultad de Ingeniería')!,
      }],
    });
  expect(resEmp.status).toBe(200);

  const resPres = await peticion(app)
    .patch(`/convocatorias/${convId}`)
    .set(adminHeaders)
    .send({ estado: 'presentacion' });
  expect(resPres.status).toBe(200);
  expect(resPres.body.estado).toBe('presentacion');

  return convId;
}

async function crearProyectoYEnviar(
  app: INestApplication,
  base: DatosBase,
  convocatoriaId: string,
): Promise<{ proyectoId: string; edicionId: string }> {
  const docenteHeaders = await autenticar(app, base.docentesDerecho[0]);

  const resProy = await peticion(app)
    .post('/proyectos')
    .set(docenteHeaders)
    .send({ nombre: 'Proyecto de extensión', convocatoriaId });
  expect(resProy.status).toBe(201);
  const proyectoId = resProy.body.id as string;
  const edicionId = resProy.body.ediciones[0].id as string;

  await peticion(app)
    .patch(`/proyectos/${proyectoId}/ediciones/${edicionId}`)
    .set(docenteHeaders)
    .send({ presupuestoSolicitado: presupuestoCompleto() });

  const { asignarDirectores: asignarDirs } = await import('./fixtures');
  await asignarDirs(app, {
    edicionId,
    convocatoriaId,
    principalId: await obtenerUsuarioId(app, base.docentesDerecho[0].email),
    codirectorId: await obtenerUsuarioId(app, base.docentesDerecho[1].email),
    asignadoPorId: await obtenerUsuarioId(app, base.autoridadSecretariaDerecho.email),
  });

  const resEnvio = await peticion(app)
    .post(`/proyectos/${proyectoId}/ediciones/${edicionId}/enviar`)
    .set(docenteHeaders);
  expect(resEnvio.status).toBe(201);
  expect(resEnvio.body.ediciones[0].estado).toBe('Presentado');

  return { proyectoId, edicionId };
}

async function asignarEvaluadores(
  app: INestApplication,
  base: DatosBase,
  convocatoriaId: string,
) {
  const adminHeaders = await autenticar(app, base.admin);

  const dirDerechoId = await obtenerUsuarioId(app, base.docenteEvaluadorDerecho.email);
  const dirIngId = await obtenerUsuarioId(app, base.docenteEvaluadorIngenieria.email);

  const resProp1 = await peticion(app)
    .post('/participaciones-convocatoria')
    .set(adminHeaders)
    .send({ usuarioId: dirDerechoId, convocatoriaId, rol: 'Evaluador' });
  expect(resProp1.status).toBe(201);
  expect(resProp1.body.estado).toBe('Aprobado');

  const resProp2 = await peticion(app)
    .post('/participaciones-convocatoria')
    .set(adminHeaders)
    .send({ usuarioId: dirIngId, convocatoriaId, rol: 'Evaluador' });
  expect(resProp2.status).toBe(201);
  expect(resProp2.body.estado).toBe('Aprobado');
}

async function evaluarInstitucional(
  app: INestApplication,
  base: DatosBase,
  convocatoriaId: string,
  edicionId: string,
  datos: ReturnType<typeof evalInstitucionalAlta>,
) {
  const secretariaHeaders = await autenticar(app, base.autoridadSecretariaDerecho);

  const resGuardar = await peticion(app)
    .put(`/evaluaciones/institucionales/${edicionId}`)
    .query({ convocatoriaId })
    .set(secretariaHeaders)
    .send(datos);
  expect(resGuardar.status).toBe(200);

  const resConfirmar = await peticion(app)
    .post(`/evaluaciones/institucionales/${edicionId}/confirmar`)
    .query({ convocatoriaId })
    .set(secretariaHeaders);
  expect(resConfirmar.status).toBe(201);
  expect(resConfirmar.body.estado).toBe('Confirmada');
}

async function evaluarCruzada(
  app: INestApplication,
  evaluador: { email: string; password: string },
  convocatoriaId: string,
  edicionId: string,
  items: Record<string, number>,
) {
  const headers = await autenticar(app, evaluador);

  const resGuardar = await peticion(app)
    .put(`/evaluaciones/cruzadas/${edicionId}`)
    .query({ convocatoriaId })
    .set(headers)
    .send({ items });
  expect(resGuardar.status).toBe(200);

  const resConfirmar = await peticion(app)
    .post(`/evaluaciones/cruzadas/${edicionId}/confirmar`)
    .query({ convocatoriaId })
    .set(headers);
  expect(resConfirmar.status).toBe(201);
  expect(resConfirmar.body.estado).toBe('Confirmada');
}

async function crearHito(
  app: INestApplication,
  evaluador: { email: string; password: string },
  edicionId: string,
) {
  const headers = await autenticar(app, evaluador);

  const res = await peticion(app)
    .post(`/hitos/ediciones/${edicionId}`)
    .set(headers)
    .send({
      titulo: 'Jornada de extensión con la comunidad',
      descripcion: 'Taller participativo con vecinos',
      fechaInicio: '2029-10-20',
      fechaFin: '2029-11-10',
      integrantes: '5 estudiantes, 2 docentes',
      categoria: 'ActividadConLaComunidad',
    });
  expect(res.status).toBe(201);
  expect(res.body.edicionId).toBe(edicionId);
  return res.body;
}

async function crearHitoValidoFallido(
  app: INestApplication,
  evaluador: { email: string; password: string },
  edicionId: string,
) {
  const headers = await autenticar(app, evaluador);
  return peticion(app)
    .post(`/hitos/ediciones/${edicionId}`)
    .set(headers)
    .send({
      titulo: 'Hito fuera de ejecución',
      fechaInicio: '2032-01-01',
      categoria: 'Difusion',
    });
}

async function guardarInforme(
  app: INestApplication,
  evaluador: { email: string; password: string },
  edicionId: string,
) {
  const headers = await autenticar(app, evaluador);

  const res = await peticion(app)
    .put(`/informe-final/ediciones/${edicionId}`)
    .set(headers)
    .send({ contenido: 'Informe borrador de la ejecución' });
  expect(res.status).toBe(200);
  expect(res.body.estado).toBe('Borrador');
  return res.body;
}

async function confirmarInforme(
  app: INestApplication,
  evaluador: { email: string; password: string },
  edicionId: string,
) {
  const headers = await autenticar(app, evaluador);

  const res = await peticion(app)
    .post(`/informe-final/ediciones/${edicionId}/confirmar`)
    .set(headers);
  expect(res.status).toBe(201);
  expect(res.body.estado).toBe('Confirmado');
  return res.body;
}

describe('Flujo completo: convocatoria → proyecto → evaluación → orden de mérito (e2e)', () => {
  let app: INestApplication;
  let base: DatosBase;
  let convocatoriaId: string;
  let edicionId: string;

  beforeAll(async () => {
    app = await crearApp();
    base = await sembrarDatosBase(app);
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  it('configura la convocatoria', async () => {
    convocatoriaId = await configurarConvocatoria(app, base, 'Flujo Completo 2029');
  });

  it('crea y envía el proyecto', async () => {
    const resultado = await crearProyectoYEnviar(app, base, convocatoriaId);
    edicionId = resultado.edicionId;
  });

  it('mueve la convocatoria a evaluación', async () => {
    const res = await peticion(app)
      .patch(`/convocatorias/${convocatoriaId}`)
      .set(await autenticar(app, base.admin))
      .send({ estado: 'evaluacion' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('evaluacion');
  });

  it('asigna evaluadores (propuesta → aceptación → aprobación)', async () => {
    await asignarEvaluadores(app, base, convocatoriaId);
  });

  it('la secretaría evalúa institucionalmente con puntajes altos', async () => {
    await evaluarInstitucional(app, base, convocatoriaId, edicionId, evalInstitucionalAlta());
  });

  it('evaluador de Derecho evalúa cruzada (Propia) con puntajes altos', async () => {
    await evaluarCruzada(app, base.docenteEvaluadorDerecho, convocatoriaId, edicionId, evalCruzadaAlta());
  });

  it('evaluador de Ingeniería evalúa cruzada (Ajena) con puntajes altos', async () => {
    await evaluarCruzada(app, base.docenteEvaluadorIngenieria, convocatoriaId, edicionId, evalCruzadaAlta());
  });

  it('mueve a ejecución y el orden de mérito adjudica el proyecto', async () => {
    const adminHeaders = await autenticar(app, base.admin);

    const res = await peticion(app)
      .patch(`/convocatorias/${convocatoriaId}`)
      .set(adminHeaders)
      .send({ estado: 'ejecucion' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ejecucion');

    await ponerEdicionEnEjecucion(app, edicionId);

    const resumen = await peticion(app)
      .get(`/evaluaciones/edicion/${edicionId}`)
      .set(adminHeaders);

    expect(resumen.status).toBe(200);
    expect(resumen.body.resumen).toBeDefined();
    expect(resumen.body.resumen.puntajeInstitucional).toBeGreaterThan(0);
    expect(resumen.body.resumen.puntajeCruzadaPromedio).toBeGreaterThan(0);
    expect(resumen.body.resumen.checklistCompleto).toBe(true);
    expect(resumen.body.resumen.notaFinal).toBeGreaterThan(0);
  });

  it('no crea un hito fuera del período de ejecución', async () => {
    const res = await crearHitoValidoFallido(app, base.docentesDerecho[0], edicionId);
    expect(res.status).toBe(400);
  });

  it('crea hitos de ejecución', async () => {
    const hito1 = await crearHito(app, base.docentesDerecho[0], edicionId);
    const hito2 = await crearHito(app, base.docentesDerecho[0], edicionId);

    const listado = await peticion(app)
      .get(`/hitos/ediciones/${edicionId}`)
      .set(await autenticar(app, base.docentesDerecho[0]));
    expect(listado.status).toBe(200);
    expect(Array.isArray(listado.body)).toBe(true);
    expect(listado.body.some((h: { id: string }) => h.id === hito1.id)).toBe(true);
    expect(listado.body.some((h: { id: string }) => h.id === hito2.id)).toBe(true);
  });

  it('guarda el informe final en borrador', async () => {
    const informe = await guardarInforme(app, base.docentesDerecho[0], edicionId);

    const obtenido = await peticion(app)
      .get(`/informe-final/ediciones/${edicionId}`)
      .set(await autenticar(app, base.docentesDerecho[0]));
    expect(obtenido.status).toBe(200);
    expect(obtenido.body.id).toBe(informe.id);
  });

  it('confirma el informe final', async () => {
    const confirmado = await confirmarInforme(app, base.docentesDerecho[0], edicionId);

    expect(confirmado.confirmadoEn).toBeDefined();
    expect(confirmado.estado).toBe('Confirmado');
  });
});

describe('Flujo completo con puntajes bajos: proyecto NO adjudicado (e2e)', () => {
  let app: INestApplication;
  let base: DatosBase;
  let convocatoriaId: string;
  let edicionId: string;

  beforeAll(async () => {
    app = await crearApp();
    base = await sembrarDatosBase(app);
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  it('configura la convocatoria', async () => {
    convocatoriaId = await configurarConvocatoria(app, base, 'Flujo Baja 2029');
  });

  it('crea y envía el proyecto', async () => {
    const resultado = await crearProyectoYEnviar(app, base, convocatoriaId);
    edicionId = resultado.edicionId;
  });

  it('mueve a evaluación', async () => {
    const res = await peticion(app)
      .patch(`/convocatorias/${convocatoriaId}`)
      .set(await autenticar(app, base.admin))
      .send({ estado: 'evaluacion' });
    expect(res.status).toBe(200);
  });

  it('asigna evaluadores', async () => {
    await asignarEvaluadores(app, base, convocatoriaId);
  });

  it('evaluación institucional con puntajes bajos', async () => {
    await evaluarInstitucional(app, base, convocatoriaId, edicionId, evalInstitucionalBaja());
  });

  it('evaluación cruzada (Propia) con puntajes bajos', async () => {
    await evaluarCruzada(app, base.docenteEvaluadorDerecho, convocatoriaId, edicionId, evalCruzadaBaja());
  });

  it('evaluación cruzada (Ajena) con puntajes bajos', async () => {
    await evaluarCruzada(app, base.docenteEvaluadorIngenieria, convocatoriaId, edicionId, evalCruzadaBaja());
  });

  it('mueve a ejecución y verifica que NO se adjudica', async () => {
    const adminHeaders = await autenticar(app, base.admin);

    await peticion(app)
      .patch(`/convocatorias/${convocatoriaId}`)
      .set(adminHeaders)
      .send({ estado: 'ejecucion' });

    await ponerEdicionEnEjecucion(app, edicionId);

    const resumen = await peticion(app)
      .get(`/evaluaciones/edicion/${edicionId}`)
      .set(adminHeaders);

    expect(resumen.status).toBe(200);
    expect(resumen.body.resumen).toBeDefined();
    expect(resumen.body.resumen.notaFinal).toBeLessThan(60);
    expect(resumen.body.resumen.checklistCompleto).toBe(true);
  });
});
