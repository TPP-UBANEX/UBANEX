import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { crearApp, cerrarApp, headersConToken } from './crear-app.helper';
import { sembrarDatosBase, DatosBase, PASSWORD_TEST } from './fixtures';
import { peticion, login } from './http';

describe('Auth y roles (e2e)', () => {
  let app: INestApplication;
  let base: DatosBase;

  beforeAll(async () => {
    app = await crearApp();
    base = await sembrarDatosBase(app);
  });

  afterAll(async () => {
    await cerrarApp(app);
  });

  it('responde en la raíz sin autenticación', async () => {
    const res = await peticion(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('rechaza el login con credenciales inválidas', async () => {
    const res = await peticion(app)
      .post('/auth/login')
      .send({ email: 'nadie@uba.ar', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rechaza /convocatorias sin token (401)', async () => {
    const res = await peticion(app).get('/convocatorias');
    expect(res.status).toBe(401);
  });

  it('registra un estudiante y devuelve accessToken', async () => {
    const res = await peticion(app)
      .post('/auth/register')
      .send({
        nombre: 'Nueva',
        apellido: 'Estudiante',
        email: 'nueva-estudiante@uba.ar',
        password: '123456',
        tipo: 'estudiante',
        unidadAcademicaId: base.uaPorNombreId.get('Facultad de Derecho'),
      });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
  });

  it('registra un docente y devuelve accessToken', async () => {
    const res = await peticion(app)
      .post('/auth/register')
      .send({
        nombre: 'Nuevo',
        apellido: 'Docente',
        email: 'nuevo-docente@uba.ar',
        password: '123456',
        tipo: 'docente',
        telefono: '11 1234 5678',
        unidadAcademicaId: base.uaPorNombreId.get('Facultad de Ingeniería'),
        carreraId: base.carreraIngenieria.id,
      });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rechaza el registro con email repetido', async () => {
    const res = await peticion(app)
      .post('/auth/register')
      .send({
        nombre: 'X',
        apellido: 'Y',
        email: base.admin.email,
        password: '123456',
        tipo: 'estudiante',
      });
    expect(res.status).toBe(400);
  });

  it('bloquea al Estudiante que intenta abrir una convocatoria (403)', async () => {
    const token = await login(app, base.estudianteDerecho.email, PASSWORD_TEST);
    const res = await peticion(app)
      .post('/convocatorias')
      .set(headersConToken(token))
      .send({ nombre: 'X', anio: 2027 });
    expect(res.status).toBe(403);
  });

  it('bloquea al Docente que intenta abrir una convocatoria (403)', async () => {
    const token = await login(app, base.docentesDerecho[0].email, PASSWORD_TEST);
    const res = await peticion(app)
      .post('/convocatorias')
      .set(headersConToken(token))
      .send({ nombre: 'X', anio: 2027 });
    expect(res.status).toBe(403);
  });

  it('permite a la autoridad de rectorado crear una convocatoria', async () => {
    const token = await login(app, base.admin.email, base.admin.password);
    const res = await peticion(app)
      .post('/convocatorias')
      .set(headersConToken(token))
      .send({ nombre: 'Convocatoria auth', anio: 2027 });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('configuracion');
  });
});