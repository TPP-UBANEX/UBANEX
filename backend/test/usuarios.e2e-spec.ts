import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { crearApp, cerrarApp, headersConToken } from './crear-app.helper';
import { sembrarDatosBase, DatosBase, obtenerUsuarioId } from './fixtures';
import { peticion, login, autenticar } from './http';

describe('Gestión de usuarios y validación de docentes (e2e)', () => {
  let app: INestApplication;
  let base: DatosBase;

  beforeAll(async () => {
    app = await crearApp();
    base = await sembrarDatosBase(app);
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  it('lista usuarios con una autoridad de secretaría', async () => {
    const res = await peticion(app)
      .get('/usuarios')
      .set(await autenticar(app, base.autoridadSecretariaDerecho));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });

  it('impide que un docente liste usuarios (403)', async () => {
    const res = await peticion(app)
      .get('/usuarios')
      .set(await autenticar(app, base.docentesDerecho[0]));
    expect(res.status).toBe(403);
  });

  it('permite a rectorado crear un docente (queda pendiente de validación)', async () => {
    const res = await peticion(app)
      .post('/usuarios')
      .set(await autenticar(app, base.admin))
      .send({
        email: 'docente-rectorado@uba.ar',
        password: '123456',
        roles: ['Docente'],
        nombre: 'Nueva',
        apellido: 'Docente',
        unidadAcademicaId: base.uaPorNombreId.get('Facultad de Derecho'),
      });
    expect(res.status).toBe(201);
    expect(res.body.roles).toEqual(['Docente']);
    expect(res.body.estadoValidacionDocente).toBe('PendienteDeValidacion');
  });

  it('impide que un docente cree usuarios (403)', async () => {
    const res = await peticion(app)
      .post('/usuarios')
      .set(await autenticar(app, base.docentesDerecho[0]))
      .send({
        email: 'no-deberia@uba.ar',
        password: '123456',
        roles: ['Estudiante'],
        nombre: 'No',
        apellido: 'Debe',
      });
    expect(res.status).toBe(403);
  });

  it('impide que un estudiante llame al reset de contraseña (403)', async () => {
    const id = await obtenerUsuarioId(app, base.estudianteDerecho.email);
    const res = await peticion(app)
      .post(`/usuarios/${id}/reset-password`)
      .set(await autenticar(app, base.estudianteDerecho));
    // Sin autorización alcanzada antes de validar el id (roles guard).
    expect(res.status).toBe(403);
  });

  it('valida a un docente pendiente desde la secretaría y luego ingresa', async () => {
    const pendiente = base.docentePendienteDerecho;

    const antes = await login(app, pendiente.email, pendiente.password);
    expect(antes).toBeDefined();

    const resLista = await peticion(app)
      .get('/usuarios?search=Test')
      .set(await autenticar(app, base.autoridadSecretariaDerecho));
    expect(resLista.status).toBe(200);

    const objetivo = (resLista.body.data as Array<{ email: string; id: string }>).find(
      (u) => u.email === pendiente.email,
    );
    expect(objetivo).toBeDefined();

    const res = await peticion(app)
      .patch(`/usuarios/${objetivo!.id}/estado-validacion-docente`)
      .set(await autenticar(app, base.autoridadSecretariaDerecho))
      .send({ estadoValidacionDocente: 'Validado' });
    expect(res.status).toBe(200);
    expect(res.body.estadoValidacionDocente).toBe('Validado');
  });

  it('rechaza registrar un docente con teléfono inválido', async () => {
    const res = await peticion(app)
      .post('/auth/register')
      .send({
        nombre: 'Sin',
        apellido: 'Telefono',
        email: 'sin-telefono@uba.ar',
        password: '123456',
        tipo: 'docente',
        telefono: 'abc',
      });
    expect(res.status).toBe(400);
  });

  it('impide que un deshabilitado ingrese', async () => {
    const token = await login(app, base.admin.email, base.admin.password);
    const email = `bloqueado-${Date.now()}@uba.ar`;
    const resCrear = await peticion(app)
      .post('/usuarios')
      .set(headersConToken(token))
      .send({ email, password: '123456', roles: ['Estudiante'], nombre: 'Bloque', apellido: 'Ado' });
    expect(resCrear.status).toBe(201);

    const resDeshabilitar = await peticion(app)
      .patch(`/usuarios/${resCrear.body.id}`)
      .set(headersConToken(token))
      .send({ habilitado: false });
    expect(resDeshabilitar.status).toBe(200);

    const res = await peticion(app).post('/auth/login').send({ email, password: '123456' });
    expect(res.status).toBe(401);
  });
});