import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { crearApp, cerrarApp } from './crear-app.helper';
import { sembrarDatosBase, DatosBase, PASSWORD_TEST } from './fixtures';
import { peticion, login, autenticar } from './http';

describe('Ciclo de convocatoria y presentación de proyectos (e2e)', () => {
  let app: INestApplication;
  let base: DatosBase;
  let convocatoriaId: string;

  beforeAll(async () => {
    app = await crearApp();
    base = await sembrarDatosBase(app);
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  it('crea la convocatoria en estado configuracion', async () => {
    const res = await peticion(app)
      .post('/convocatorias')
      .set(await autenticar(app, base.admin))
      .send({
        nombre: 'Convocatoria 2027',
        anio: 2027,
        fechaInicioPresentacion: '2027-02-01',
        fechaFinPresentacion: '2027-06-30',
        fechaInicioEvaluacion: '2027-07-01',
        fechaFinEvaluacion: '2027-08-31',
        fechaInicioEjecucion: '2027-10-01',
        fechaFinEjecucion: '2028-03-31',
      });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('configuracion');
    convocatoriaId = res.body.id as string;
    expect(convocatoriaId).toBeDefined();
  });

  it('rechaza la convocatoria con fechas que no son consecutivas', async () => {
    const res = await peticion(app)
      .post('/convocatorias')
      .set(await autenticar(app, base.admin))
      .send({
        nombre: 'Convocatoria fechas inválidas',
        anio: 2027,
        fechaInicioPresentacion: '2027-06-01',
        fechaFinPresentacion: '2027-04-01',
      });
    expect(res.status).toBe(400);
  });

  it('oculta la convocatoria a docentes mientras está en configuracion', async () => {
    const res = await peticion(app)
      .get('/convocatorias')
      .set(await autenticar(app, base.docentesDerecho[0]));
    expect(res.status).toBe(200);
    const ids = (res.body.data as Array<{ id: string }>).map((c) => c.id);
    expect(ids).not.toContain(convocatoriaId);
  });

  it('bloquea crear un proyecto con la convocatoria en configuracion (400)', async () => {
    const res = await peticion(app)
      .post('/proyectos')
      .set(await autenticar(app, base.docentesDerecho[0]))
      .send({ nombre: 'Proyecto temprano', convocatoriaId });
    expect(res.status).toBe(400);
  });

  it('mueve la convocatoria a presentacion', async () => {
    const res = await peticion(app)
      .patch(`/convocatorias/${convocatoriaId}`)
      .set(await autenticar(app, base.admin))
      .send({ estado: 'presentacion' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('presentacion');
  });

  it('el docente ahora ve la convocatoria', async () => {
    const res = await peticion(app)
      .get('/convocatorias')
      .set(await autenticar(app, base.docentesDerecho[0]));
    expect(res.status).toBe(200);
    const ids = (res.body.data as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain(convocatoriaId);
  });

  it('crea proyecto y edición en la convocatoria', async () => {
    const res = await peticion(app)
      .post('/proyectos')
      .set(await autenticar(app, base.docentesDerecho[0]))
      .send({ nombre: 'Proyecto de extensión', convocatoriaId });
    expect(res.status).toBe(201);
    expect(res.body.ediciones).toHaveLength(1);
    expect(res.body.ediciones[0].estado).toBe('Borrador');
    expect(res.body.ediciones[0].convocatoriaId).toBe(convocatoriaId);
  });

  it('rechaza un presupuesto mal formado', async () => {
    const token = await login(app, base.docentesDerecho[0].email, PASSWORD_TEST);
    const creado = await peticion(app)
      .post('/proyectos')
      .set({ Authorization: `Bearer ${token}` })
      .send({ nombre: 'Proyecto presupuesto inválido', convocatoriaId });
    const proyectoId = creado.body.id as string;
    const edicionId = creado.body.ediciones[0].id as string;

    const res = await peticion(app)
      .patch(`/proyectos/${proyectoId}/ediciones/${edicionId}`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        presupuestoSolicitado: {
          montoTotal: 1,
          rubros: [{ tipo: 'Sueldos', subtotal: -5, partidas: [] }],
        },
      });
    expect(res.status).toBe(400);
  });

  it('completa el presupuesto de una edición y lo normaliza', async () => {
    const token = await login(app, base.docentesDerecho[0].email, PASSWORD_TEST);
    const creado = await peticion(app)
      .post('/proyectos')
      .set({ Authorization: `Bearer ${token}` })
      .send({ nombre: 'Proyecto con presupuesto', convocatoriaId });
    const proyectoId = creado.body.id as string;
    const edicionId = creado.body.ediciones[0].id as string;

    const res = await peticion(app)
      .patch(`/proyectos/${proyectoId}/ediciones/${edicionId}`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        presupuestoSolicitado: {
          montoTotal: 1,
          rubros: [
            {
              tipo: 'ViaticosYSeguros',
              subtotal: 999,
              partidas: [
                {
                  tipoPersona: 'Docente',
                  descripcion: 'Viáticos',
                  periodoInicio: '2027-10-15',
                  periodoFin: '2027-11-15',
                  monto: 1000,
                },
              ],
            },
            {
              tipo: 'BienesDeConsumo',
              subtotal: 999,
              partidas: [{ descripcion: 'Papelería', cantidad: 10, precioUnitario: 100, monto: 1 }],
            },
            {
              tipo: 'BienesDeUso',
              subtotal: 0,
              partidas: [{ descripcion: 'Notebook', cantidad: 1, precioUnitario: 200, monto: 1 }],
            },
          ],
        },
      });
    expect(res.status).toBe(200);
    const presupuesto = res.body.ediciones[0].presupuestoSolicitado as {
      montoTotal: number;
      rubros: Array<{ subtotal: number }>;
    };
    expect(presupuesto.montoTotal).toBe(2200);
    expect(presupuesto.rubros[0].subtotal).toBe(1000);
    expect(presupuesto.rubros[1].subtotal).toBe(1000);
  });

  it('rechaza el envío de una edición sin directores asignados', async () => {
    const token = await login(app, base.docentesDerecho[0].email, PASSWORD_TEST);
    const creado = await peticion(app)
      .post('/proyectos')
      .set({ Authorization: `Bearer ${token}` })
      .send({ nombre: 'Proyecto sin directores', convocatoriaId });
    const proyectoId = creado.body.id as string;
    const edicionId = creado.body.ediciones[0].id as string;

    const res = await peticion(app)
      .post(`/proyectos/${proyectoId}/ediciones/${edicionId}/enviar`)
      .set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(400);
  });

  it('asigna directores, completa presupuesto y logra enviar la edición', async () => {
    const authHeaders = await autenticar(app, base.docentesDerecho[0]);
    const creado = await peticion(app)
      .post('/proyectos')
      .set(authHeaders)
      .send({ nombre: 'Proyecto completo', convocatoriaId });
    const proyectoId = creado.body.id as string;
    const edicionId = creado.body.ediciones[0].id as string;

    await peticion(app)
      .patch(`/proyectos/${proyectoId}/ediciones/${edicionId}`)
      .set(authHeaders)
      .send({
        presupuestoSolicitado: {
          montoTotal: 1,
          rubros: [
            {
              tipo: 'ViaticosYSeguros',
              subtotal: 999,
              partidas: [
                {
                  tipoPersona: 'Docente',
                  descripcion: 'Viáticos',
                  periodoInicio: '2027-10-15',
                  periodoFin: '2027-11-15',
                  monto: 1000,
                },
              ],
            },
            {
              tipo: 'BienesDeConsumo',
              subtotal: 999,
              partidas: [{ descripcion: 'Papelería', cantidad: 10, precioUnitario: 100, monto: 1 }],
            },
            {
              tipo: 'BienesDeUso',
              subtotal: 0,
              partidas: [{ descripcion: 'Notebook', cantidad: 1, precioUnitario: 200, monto: 1 }],
            },
          ],
        },
      });

    const { asignarDirectores, obtenerUsuarioId } = await import('./fixtures');
    const principalId = await obtenerUsuarioId(app, base.docentesDerecho[0].email);
    const codirectorId = await obtenerUsuarioId(app, base.docentesDerecho[1].email);
    const secretariaId = await obtenerUsuarioId(app, base.autoridadSecretariaDerecho.email);
    await asignarDirectores(app, {
      edicionId,
      convocatoriaId,
      principalId,
      codirectorId,
      asignadoPorId: secretariaId,
    });

    const res = await peticion(app)
      .post(`/proyectos/${proyectoId}/ediciones/${edicionId}/enviar`)
      .set(authHeaders);
    expect(res.status).toBe(201);
    expect(res.body.ediciones[0].estado).toBe('Presentado');
  });
});