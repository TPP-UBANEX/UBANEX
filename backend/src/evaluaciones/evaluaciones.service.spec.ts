/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
import { TipoEvaluacionCruzada } from '../common/enums/tipo-evaluacion-cruzada.enum';
import { MecanismoAdjudicacion } from '../common/enums/mecanismo-adjudicacion.enum';
import { EvaluacionInstitucional } from './evaluacion-institucional.entity';
import { EvaluacionCruzada } from './evaluacion-cruzada.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';

interface Fixture {
  convocatoria: Convocatoria;
  ediciones: Edicion[];
  institucionales: EvaluacionInstitucional[];
  cruzadas: EvaluacionCruzada[];
}

function construirEscenario(ordenCreacion: number[]): Fixture {
  const estructuraInst = {
    categorias: [
      {
        id: 'c1',
        nombre: 'Evaluación',
        subcategorias: [
          {
            id: 'sub1',
            texto: 'Puntaje total',
            tipoValor: 'numerico',
            minimo: 0,
            maximo: 100,
            fundamentacion: null,
          },
        ],
      },
    ],
    checklist: [],
  };
  const estructuraCruz = {
    categorias: [
      {
        id: 'cc1',
        nombre: 'Evaluación',
        puntajeMaximo: 100,
        items: [{ id: 'item1', nombre: 'Puntaje total', puntajeMaximo: 100 }],
      },
    ],
  };

  const convocatoria = {
    id: 'conv1',
    ordenMeritoConfirmado: false,
    presupuestoTotal: 200,
    cuotaFederativa: 1,
    templateEvaluacionInstitucional: { estructura: estructuraInst },
    templateEvaluacionCruzada: { estructura: estructuraCruz },
  } as unknown as Convocatoria;

  // Proyectos con UA fija (no cambia entre fixtures). El orden de creación de
  // los ids simula el orden de inserción de los datos, que es lo que varía en
  // cada reset-seed y, en el código original, definía el orden incidental de
  // las UAs (primera aparición por id ASC).
  const nombres: Record<string, string> = {
    A: 'Facultad A',
    B: 'Facultad B',
    C: 'Facultad C',
  };
  const proyectos = [
    { ua: 'A' },
    { ua: 'A' },
    { ua: 'B' },
    { ua: 'B' },
    { ua: 'C' },
    { ua: 'C' },
  ];

  const ediciones: Edicion[] = [];
  const institucionales: EvaluacionInstitucional[] = [];
  const cruzadas: EvaluacionCruzada[] = [];
  ordenCreacion.forEach((idx, n) => {
    const clave = proyectos[idx].ua;
    const ua = { id: `ua${clave}`, nombre: nombres[clave] };
    const id = `e${n}`;
    ediciones.push({
      id,
      unidadAcademicaId: ua.id,
      unidadAcademica: { id: ua.id, nombre: ua.nombre } as any,
      convocatoria,
      presupuestoSolicitado: { montoTotal: 80 } as any,
      estado: EstadoEdicion.EnEvaluacion,
      proyecto: {} as any,
      ordenMerito: null,
      puntajeMerito: null,
      adjudicacionPropuesta: null,
      mecanismoAdjudicacion: null,
    } as unknown as Edicion);
    institucionales.push({
      id: `i${n}`,
      edicionId: id,
      estado: EstadoEvaluacion.Confirmada,
      categorias: { sub1: { valor: 50, fundamentacion: '' } },
      checklist: {},
    } as unknown as EvaluacionInstitucional);
    cruzadas.push({
      id: `cz${n}p`,
      edicionId: id,
      tipo: TipoEvaluacionCruzada.Propia,
      estado: EstadoEvaluacion.Confirmada,
      items: { item1: 0 },
    } as unknown as EvaluacionCruzada);
    cruzadas.push({
      id: `cz${n}a`,
      edicionId: id,
      tipo: TipoEvaluacionCruzada.Ajena,
      estado: EstadoEvaluacion.Confirmada,
      items: { item1: 0 },
    } as unknown as EvaluacionCruzada);
  });

  return { convocatoria, ediciones, institucionales, cruzadas };
}

function resumen(ediciones: Edicion[], ordenCreacion: number[]): Record<number, unknown> {
  const map: Record<number, unknown> = {};
  // ediciones[n].id === `e${n}` y ordenCreacion[n] es el índice de proyecto
  // lógico, que es estable entre corridas (a diferencia del id, que cambia en
  // cada reset-seed).
  ediciones.forEach((e, n) => {
    map[ordenCreacion[n]] = {
      adjudicacionPropuesta: e.adjudicacionPropuesta,
      mecanismoAdjudicacion: e.mecanismoAdjudicacion,
    };
  });
  return map;
}

function construirEscenarioFlex(
  uaProyectos: Array<{ clave: string; cantidad: number; puntaje?: number }>,
  cuota: number,
  presupuestoTotal: number,
): Fixture {
  const estructuraInst = {
    categorias: [
      {
        id: 'c1',
        nombre: 'Evaluación',
        subcategorias: [
          {
            id: 'sub1',
            texto: 'Puntaje total',
            tipoValor: 'numerico',
            minimo: 0,
            maximo: 100,
            fundamentacion: null,
          },
        ],
      },
    ],
    checklist: [],
  };
  const estructuraCruz = {
    categorias: [
      {
        id: 'cc1',
        nombre: 'Evaluación',
        puntajeMaximo: 100,
        items: [{ id: 'item1', nombre: 'Puntaje total', puntajeMaximo: 100 }],
      },
    ],
  };
  const convocatoria = {
    id: 'conv1',
    ordenMeritoConfirmado: false,
    presupuestoTotal,
    cuotaFederativa: cuota,
    templateEvaluacionInstitucional: { estructura: estructuraInst },
    templateEvaluacionCruzada: { estructura: estructuraCruz },
  } as unknown as Convocatoria;

  const nombres: Record<string, string> = {
    A: 'Facultad A',
    B: 'Facultad B',
    C: 'Facultad C',
  };
  const ediciones: Edicion[] = [];
  const institucionales: EvaluacionInstitucional[] = [];
  const cruzadas: EvaluacionCruzada[] = [];
  let n = 0;
  for (const { clave, cantidad, puntaje = 50 } of uaProyectos) {
    const ua = { id: `ua${clave}`, nombre: nombres[clave] ?? `Facultad ${clave}` };
    for (let k = 0; k < cantidad; k++) {
      const id = `e${n}`;
      ediciones.push({
        id,
        unidadAcademicaId: ua.id,
        unidadAcademica: { id: ua.id, nombre: ua.nombre } as any,
        convocatoria,
        presupuestoSolicitado: { montoTotal: 80 } as any,
        estado: EstadoEdicion.EnEvaluacion,
        proyecto: {} as any,
        ordenMerito: null,
        puntajeMerito: null,
        adjudicacionPropuesta: null,
        mecanismoAdjudicacion: null,
      } as unknown as Edicion);
      institucionales.push({
        id: `i${n}`,
        edicionId: id,
        estado: EstadoEvaluacion.Confirmada,
        categorias: { sub1: { valor: puntaje, fundamentacion: '' } },
        checklist: {},
      } as unknown as EvaluacionInstitucional);
      cruzadas.push({
        id: `cz${n}p`,
        edicionId: id,
        tipo: TipoEvaluacionCruzada.Propia,
        estado: EstadoEvaluacion.Confirmada,
        items: { item1: 0 },
      } as unknown as EvaluacionCruzada);
      cruzadas.push({
        id: `cz${n}a`,
        edicionId: id,
        tipo: TipoEvaluacionCruzada.Ajena,
        estado: EstadoEvaluacion.Confirmada,
        items: { item1: 0 },
      } as unknown as EvaluacionCruzada);
      n++;
    }
  }
  return { convocatoria, ediciones, institucionales, cruzadas };
}

function conteoPorUa(
  ediciones: Edicion[],
): Record<string, { cuotaFederativa: number; merito: number; financiados: number }> {
  const r: Record<string, { cuotaFederativa: number; merito: number; financiados: number }> = {};
  for (const e of ediciones) {
    const ua = e.unidadAcademicaId;
    if (!r[ua]) r[ua] = { cuotaFederativa: 0, merito: 0, financiados: 0 };
    if (e.adjudicacionPropuesta) r[ua].financiados++;
    if (e.mecanismoAdjudicacion === 'CUOTA_FEDERATIVA') r[ua].cuotaFederativa++;
    if (e.mecanismoAdjudicacion === 'MERITO') r[ua].merito++;
  }
  return r;
}

describe('EvaluacionesService.generarOrdenMerito - reproducibilidad', () => {
  function armarService(fixture: Fixture): EvaluacionesService {
    const institucionalRepo = {
      find: jest.fn().mockResolvedValue(fixture.institucionales),
    };
    const cruzadaRepo = { find: jest.fn().mockResolvedValue(fixture.cruzadas) };
    const convocatoriaRepo = {
      findOne: jest.fn().mockResolvedValue(fixture.convocatoria),
    };
    const edicionRepo = {
      find: jest.fn().mockResolvedValue(fixture.ediciones),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dummy = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
    const svc = new EvaluacionesService(
      institucionalRepo as any,
      cruzadaRepo as any,
      convocatoriaRepo as any,
      edicionRepo as any,
      dummy as any,
      dummy as any,
      dummy as any,
      { send: jest.fn() } as any,
      { registrar: jest.fn() } as any,
    );
    jest.spyOn(svc as any, 'validarEsRectorado').mockImplementation(() => undefined);
    return svc;
  }

  it('produce la misma adjudicación aunque cambie el orden de creación de los datos (ids)', async () => {
    const usuario = { id: 'u1' } as any;

    const fixtureBase = construirEscenario([0, 1, 2, 3, 4, 5]);
    const servicioBase = armarService(fixtureBase);
    const base = resumen(
      await servicioBase.generarOrdenMerito('conv1', usuario),
      [0, 1, 2, 3, 4, 5],
    );

    // Mismo contenido (mismos proyectos y UAs) pero los ids se asignan en otro
    // orden de creación (simula un reset-seed con distinto orden de inserción).
    // Con el orden incidental de UAs del código original esto daba una
    // adjudicación distinta.
    const fixtureOtro = construirEscenario([4, 5, 2, 3, 0, 1]);
    const servicioOtro = armarService(fixtureOtro);
    const cambiado = resumen(
      await servicioOtro.generarOrdenMerito('conv1', usuario),
      [4, 5, 2, 3, 0, 1],
    );

    expect(cambiado).toEqual(base);
  });

  it('produce la misma adjudicación en dos corridas sobre los mismos datos', async () => {
    const usuario = { id: 'u1' } as any;
    const fixture = construirEscenario([0, 1, 2, 3, 4, 5]);
    const servicio = armarService(fixture);
    const a = resumen(await servicio.generarOrdenMerito('conv1', usuario), [0, 1, 2, 3, 4, 5]);
    const b = resumen(await servicio.generarOrdenMerito('conv1', usuario), [0, 1, 2, 3, 4, 5]);
    expect(b).toEqual(a);
  });
});

describe('EvaluacionesService.generarOrdenMerito - Fase 2 global por puntaje', () => {
  function armarService(fixture: Fixture): EvaluacionesService {
    const institucionalRepo = { find: jest.fn().mockResolvedValue(fixture.institucionales) };
    const cruzadaRepo = { find: jest.fn().mockResolvedValue(fixture.cruzadas) };
    const convocatoriaRepo = { findOne: jest.fn().mockResolvedValue(fixture.convocatoria) };
    const edicionRepo = {
      find: jest.fn().mockResolvedValue(fixture.ediciones),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dummy = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
    const svc = new EvaluacionesService(
      institucionalRepo as any,
      cruzadaRepo as any,
      convocatoriaRepo as any,
      edicionRepo as any,
      dummy as any,
      dummy as any,
      dummy as any,
      { send: jest.fn() } as any,
      { registrar: jest.fn() } as any,
    );
    jest.spyOn(svc as any, 'validarEsRectorado').mockImplementation(() => undefined);
    return svc;
  }

  it('con presupuesto holgado cada UA recibe su cuota (min(cuota, n)) y las chicas todas', async () => {
    const usuario = { id: 'u1' } as any;
    // A:3, B:2 (n < cuota), C:4 proyectos; cuota federativa 2; presupuesto holgado.
    const fixture = construirEscenarioFlex(
      [
        { clave: 'A', cantidad: 3 },
        { clave: 'B', cantidad: 2 },
        { clave: 'C', cantidad: 4 },
      ],
      2,
      1000,
    );
    const c = conteoPorUa(await armarService(fixture).generarOrdenMerito('conv1', usuario));

    expect(c['uaA'].cuotaFederativa).toBe(2);
    expect(c['uaB'].cuotaFederativa).toBe(2);
    expect(c['uaC'].cuotaFederativa).toBe(2);
    // UA B presentó menos que la cuota: todos sus proyectos son cuota federativa, 0 mérito.
    expect(c['uaB'].merito).toBe(0);
    expect(c['uaB'].financiados).toBe(2);
    // Presupuesto holgado: todo financiado.
    expect(c['uaA'].financiados).toBe(3);
    expect(c['uaC'].financiados).toBe(4);
  });

  it('con presupuesto ajustado el orden GLOBAL por puntaje decide la cuota (no el alfabético)', async () => {
    const usuario = { id: 'u1' } as any;
    // 3 UAs, 2 proyectos cada una, cuota federativa 2. Costo 80 c/u -> 4 proyectos = 320
    // cubren solo 2 UAs. UA C tiene puntaje alto: con orden global debe llevarse
    // su cuota pese a ser alfabéticamente la última.
    const fixture = construirEscenarioFlex(
      [
        { clave: 'A', cantidad: 2, puntaje: 50 },
        { clave: 'B', cantidad: 2, puntaje: 50 },
        { clave: 'C', cantidad: 2, puntaje: 90 },
      ],
      2,
      320,
    );
    const c = conteoPorUa(await armarService(fixture).generarOrdenMerito('conv1', usuario));

    expect(c['uaC'].cuotaFederativa).toBe(2); // gana por puntaje global
    expect(c['uaA'].cuotaFederativa).toBe(2); // le alcanza el presupuesto
    expect(c['uaB'].cuotaFederativa).toBe(0); // se queda sin cuota (orden global, no alfabético)
    expect(c['uaB'].financiados).toBe(0);
  });
});

describe('EvaluacionesService.actualizarPropuestaAdjudicacion - presupuesto', () => {
  function armarService(edicion: any, presupuestoTotal: number) {
    const convocatoria = {
      id: 'conv1',
      presupuestoTotal,
      ordenMeritoConfirmado: false,
    };
    const edicionRepo = {
      findOne: jest.fn().mockResolvedValue(edicion),
      find: jest.fn().mockResolvedValue([edicion]),
      save: jest.fn(async (e: any) => e),
    };
    const convocatoriaRepo = { findOne: jest.fn().mockResolvedValue(convocatoria) };
    const dummy = { find: jest.fn().mockResolvedValue([]), save: jest.fn(), findOne: jest.fn() };
    const svc = new EvaluacionesService(
      dummy as any,
      dummy as any,
      convocatoriaRepo as any,
      edicionRepo as any,
      dummy as any,
      dummy as any,
      dummy as any,
      { send: jest.fn() } as any,
      { registrar: jest.fn() } as any,
    );
    jest.spyOn(svc as any, 'validarEsRectorado').mockImplementation(() => undefined);
    return svc;
  }

  it('cambia el método de un proyecto ya adjudicado aunque no haya presupuesto para sumar uno nuevo', async () => {
    const edicion = {
      id: 'e1',
      convocatoriaId: 'conv1',
      adjudicacionPropuesta: true,
      mecanismoAdjudicacion: 'CUOTA_FEDERATIVA',
      presupuestoSolicitado: { montoTotal: 80 },
      proyecto: {},
      unidadAcademica: {},
      estado: EstadoEdicion.EnEvaluacion,
    } as any;
    const svc = armarService(edicion, 80);
    const actualizada = await svc.actualizarPropuestaAdjudicacion('e1', true, MecanismoAdjudicacion.Merito, {
      id: 'u1',
    } as any);
    expect(actualizada.mecanismoAdjudicacion).toBe('MERITO');
    expect(actualizada.adjudicacionPropuesta).toBe(true);
  });

  it('bloquea adjudicar un proyecto nuevo si no alcanza el presupuesto', async () => {
    const edicion = {
      id: 'e1',
      convocatoriaId: 'conv1',
      adjudicacionPropuesta: false,
      mecanismoAdjudicacion: null,
      presupuestoSolicitado: { montoTotal: 90 },
      proyecto: {},
      unidadAcademica: {},
      estado: EstadoEdicion.EnEvaluacion,
    } as any;
    const svc = armarService(edicion, 80);
    await expect(
      svc.actualizarPropuestaAdjudicacion('e1', true, MecanismoAdjudicacion.Merito, { id: 'u1' } as any),
    ).rejects.toThrow(/No hay presupuesto disponible/);
  });
});

describe('EvaluacionesService - resolución de adjudicación', () => {
  function construir(overrides: Partial<any> = {}) {
    const convocatoria = {
      id: 'conv1',
      estado: EstadoConvocatoria.Evaluacion,
      ordenMeritoConfirmado: true,
      adjudicacionEmitida: false,
      resolucionUrl: null,
      fechaResolucion: null,
      adjudicacionEmitidaPorId: null,
      porcentajeExtraInsumos: 0,
      porcentajeExtraPse: 0,
      umbralInsumos: 40,
      ...overrides,
    } as any;

    const ediciones: any[] = [
      {
        id: 'e1',
        convocatoriaId: 'conv1',
        estado: EstadoEdicion.EnEvaluacion,
        adjudicacionPropuesta: true,
        avalUrl: 'https://drive/e1',
        montoAdjudicado: null,
        presupuestoSolicitado: { montoTotal: 100 },
        proyecto: { nombre: 'Proyecto 1' },
        unidadAcademica: { id: 'uaA', nombre: 'Facultad A' },
      },
      {
        id: 'e2',
        convocatoriaId: 'conv1',
        estado: EstadoEdicion.EnEvaluacion,
        adjudicacionPropuesta: true,
        avalUrl: 'https://drive/e2',
        montoAdjudicado: null,
        presupuestoSolicitado: { montoTotal: 200 },
        proyecto: { nombre: 'Proyecto 2' },
        unidadAcademica: { id: 'uaB', nombre: 'Facultad B' },
      },
      {
        id: 'e3',
        convocatoriaId: 'conv1',
        estado: EstadoEdicion.EnEvaluacion,
        adjudicacionPropuesta: false,
        avalUrl: null,
        montoAdjudicado: null,
        presupuestoSolicitado: { montoTotal: 150 },
        proyecto: { nombre: 'Proyecto 3' },
        unidadAcademica: { id: 'uaA', nombre: 'Facultad A' },
      },
    ];

    const convocatoriaRepo = {
      findOne: jest.fn().mockResolvedValue(convocatoria),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    const edicionRepo = {
      find: jest.fn().mockResolvedValue(ediciones),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      manager: { transaction: jest.fn().mockImplementation((cb) => cb({ save: jest.fn() })) },
    };
    const institucionalRepo = { find: jest.fn().mockResolvedValue([]) };
    const dummy = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
    const auditoria = { registrar: jest.fn() };
    const svc = new EvaluacionesService(
      institucionalRepo as any,
      dummy as any,
      convocatoriaRepo as any,
      edicionRepo as any,
      dummy as any,
      dummy as any,
      dummy as any,
      { send: jest.fn() } as any,
      auditoria as any,
    );
    jest.spyOn(svc as any, 'validarEsRectorado').mockImplementation(() => undefined);
    jest.spyOn(svc as any, 'validarEsAutoridadRectorado').mockImplementation(() => undefined);
    return { svc, convocatoria, ediciones, convocatoriaRepo, auditoria };
  }

  const usuario = { id: 'u1', nombreCompleto: 'Auth Rectorado' } as any;

  it('rechaza emitir si el orden de mérito no está confirmado', async () => {
    const { svc } = construir({ ordenMeritoConfirmado: false });
    await expect(
      svc.emitirAdjudicacion('conv1', {
        resolucionUrl: 'https://res',
        fechaResolucion: '2026-07-20',
      } as any, usuario),
    ).rejects.toThrow(/orden de mérito/i);
  });

  it('rechaza emitir si una edición adjudicada no tiene aval, sin tocar estados', async () => {
    const { svc, ediciones, convocatoria } = construir();
    ediciones[1].avalUrl = null;
    await expect(
      svc.emitirAdjudicacion('conv1', {
        resolucionUrl: 'https://res',
        fechaResolucion: '2026-07-20',
      } as any, usuario),
    ).rejects.toThrow(/aval/i);
    expect(ediciones.map((e) => e.estado)).toEqual([
      EstadoEdicion.EnEvaluacion,
      EstadoEdicion.EnEvaluacion,
      EstadoEdicion.EnEvaluacion,
    ]);
    expect(convocatoria.adjudicacionEmitida).toBe(false);
  });

  it('emite: adjudicadas → Adjudicado con el monto de la fórmula, resto → NoAdjudicado, convocatoria sigue en Evaluación', async () => {
    const { svc, ediciones, convocatoria, auditoria } = construir();
    const res = await svc.emitirAdjudicacion('conv1', {
      resolucionUrl: '  https://res/RESCS-1  ',
      fechaResolucion: '2026-07-20',
    } as any, usuario);

    // Monto fijo = presupuesto a adjudicar (sin extras en el fixture → = solicitado).
    expect(ediciones.find((e) => e.id === 'e1').estado).toBe(EstadoEdicion.Adjudicado);
    expect(ediciones.find((e) => e.id === 'e1').montoAdjudicado).toBe(100);
    expect(ediciones.find((e) => e.id === 'e2').montoAdjudicado).toBe(200);
    expect(ediciones.find((e) => e.id === 'e3').estado).toBe(EstadoEdicion.NoAdjudicado);
    expect(convocatoria.adjudicacionEmitida).toBe(true);
    expect(convocatoria.resolucionUrl).toBe('https://res/RESCS-1');
    expect(convocatoria.fechaResolucion).toBe('2026-07-20');
    expect(convocatoria.adjudicacionEmitidaPorId).toBe('u1');
    expect(convocatoria.estado).toBe(EstadoConvocatoria.Evaluacion);
    expect(auditoria.registrar).toHaveBeenCalled();
    expect(res.convocatoria.adjudicacionEmitida).toBe(true);
  });

  it('rechaza una segunda emisión (inmutable)', async () => {
    const { svc } = construir({ adjudicacionEmitida: true });
    await expect(
      svc.emitirAdjudicacion('conv1', {
        resolucionUrl: 'https://res',
        fechaResolucion: '2026-07-20',
      } as any, usuario),
    ).rejects.toThrow(/ya fue emitida/i);
  });

  it('guardar borrador solo persiste la resolución, sin tocar estados', async () => {
    const { svc, ediciones, convocatoria } = construir();
    await svc.guardarBorradorAdjudicacion('conv1', {
      resolucionUrl: 'https://res/borrador',
      fechaResolucion: '2026-07-19',
    } as any, usuario);
    expect(ediciones.every((e) => e.estado === EstadoEdicion.EnEvaluacion)).toBe(true);
    expect(ediciones.every((e) => e.montoAdjudicado == null)).toBe(true);
    expect(convocatoria.resolucionUrl).toBe('https://res/borrador');
    expect(convocatoria.fechaResolucion).toBe('2026-07-19');
    expect(convocatoria.adjudicacionEmitida).toBe(false);
  });

  it('le antepone https:// al link de la resolución si no trae esquema', async () => {
    const { svc, convocatoria } = construir();
    await svc.guardarBorradorAdjudicacion('conv1', {
      resolucionUrl: 'drive.google.com/file/d/x',
    } as any, usuario);
    expect(convocatoria.resolucionUrl).toBe('https://drive.google.com/file/d/x');

    await svc.emitirAdjudicacion('conv1', {
      resolucionUrl: 'intranet.uba.ar/RESCS-2026-1',
      fechaResolucion: '2026-07-20',
    } as any, usuario);
    expect(convocatoria.resolucionUrl).toBe('https://intranet.uba.ar/RESCS-2026-1');
  });
});

describe('EvaluacionesService.generarOrdenMerito - subcategorías booleanas', () => {
  it('las subcategorías booleanas no suman al puntaje de mérito', async () => {
    const estructuraInst = {
      categorias: [
        {
          id: 'c1',
          nombre: 'Institucional',
          subcategorias: [
            { id: 'n1', texto: 'Numérica', tipoValor: 'numerico', minimo: 0, maximo: 10 },
            { id: 'b1', texto: 'Booleana', tipoValor: 'booleano', minimo: null, maximo: null },
          ],
        },
      ],
      checklist: [],
    };
    const estructuraCruz = {
      categorias: [
        { id: 'cc1', nombre: 'Cruzada', puntajeMaximo: 20, items: [{ id: 'it1', nombre: 'Item', puntajeMaximo: 20 }] },
      ],
    };
    const convocatoria = {
      id: 'conv1',
      ordenMeritoConfirmado: false,
      presupuestoTotal: null,
      cuotaFederativa: 0,
      templateEvaluacionInstitucional: { estructura: estructuraInst },
      templateEvaluacionCruzada: { estructura: estructuraCruz },
    } as unknown as Convocatoria;

    const edicion = {
      id: 'e1',
      convocatoriaId: 'conv1',
      unidadAcademicaId: 'uaA',
      unidadAcademica: { id: 'uaA', nombre: 'Facultad A' },
      convocatoria,
      presupuestoSolicitado: { montoTotal: 100 },
      estado: EstadoEdicion.EnEvaluacion,
      proyecto: { nombre: 'P1' },
      ordenMerito: null,
      puntajeMerito: null,
      adjudicacionPropuesta: null,
      mecanismoAdjudicacion: null,
    } as unknown as Edicion;

    const institucional = {
      id: 'i1',
      edicionId: 'e1',
      estado: EstadoEvaluacion.Confirmada,
      categorias: { n1: { valor: 7, fundamentacion: '' }, b1: { valor: true, fundamentacion: '' } },
      checklist: {},
    } as unknown as EvaluacionInstitucional;
    const cruzadaPropia = {
      id: 'cz1p',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Propia,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 15 },
    } as unknown as EvaluacionCruzada;
    const cruzadaAjena = {
      id: 'cz1a',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Ajena,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 15 },
    } as unknown as EvaluacionCruzada;

    const edicionRepo = {
      find: jest.fn().mockResolvedValue([edicion]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dummy = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
    const svc = new EvaluacionesService(
      { find: jest.fn().mockResolvedValue([institucional]) } as any,
      { find: jest.fn().mockResolvedValue([cruzadaPropia, cruzadaAjena]) } as any,
      { findOne: jest.fn().mockResolvedValue(convocatoria) } as any,
      edicionRepo as any,
      dummy as any,
      dummy as any,
      dummy as any,
      { send: jest.fn() } as any,
      { registrar: jest.fn() } as any,
    );
    jest.spyOn(svc as any, 'validarEsRectorado').mockImplementation(() => undefined);

    const [actualizada] = await svc.generarOrdenMerito('conv1', { id: 'u1' } as any);
    // 7 (numérica) + 15 (promedio cruzada) = 22. Si la booleana sumara serían 32.
    expect(actualizada.puntajeMerito).toBe(22);
  });
});

describe('EvaluacionesService - completitud de cruzadas para el orden de mérito', () => {
  const estructuraInst = {
    categorias: [
      {
        id: 'c1',
        nombre: 'Institucional',
        subcategorias: [{ id: 'n1', texto: 'Numérica', tipoValor: 'numerico', minimo: 0, maximo: 10 }],
      },
    ],
    checklist: [],
  };
  const estructuraCruz = {
    categorias: [
      { id: 'cc1', nombre: 'Cruzada', puntajeMaximo: 100, items: [{ id: 'it1', nombre: 'Item', puntajeMaximo: 100 }] },
    ],
  };

  function construirConvocatoria(overrides: Partial<any> = {}) {
    return {
      id: 'conv1',
      estado: EstadoConvocatoria.Evaluacion,
      ordenMeritoConfirmado: false,
      presupuestoTotal: null,
      cuotaFederativa: 0,
      umbralInconsistenciaCruzada: null,
      templateEvaluacionInstitucional: { estructura: estructuraInst },
      templateEvaluacionCruzada: { estructura: estructuraCruz },
      ...overrides,
    } as unknown as Convocatoria;
  }

  function construirEdicion(overrides: Partial<any> = {}) {
    return {
      id: 'e1',
      convocatoriaId: 'conv1',
      unidadAcademicaId: 'uaA',
      unidadAcademica: { id: 'uaA', nombre: 'Facultad A' },
      presupuestoSolicitado: { montoTotal: 100 },
      estado: EstadoEdicion.EnEvaluacion,
      proyecto: { nombre: 'P1' },
      ordenMerito: null,
      puntajeMerito: null,
      adjudicacionPropuesta: null,
      mecanismoAdjudicacion: null,
      ...overrides,
    } as unknown as Edicion;
  }

  function construirInstitucional(overrides: Partial<any> = {}) {
    return {
      id: 'i1',
      edicionId: 'e1',
      estado: EstadoEvaluacion.Confirmada,
      categorias: { n1: { valor: 7, fundamentacion: '' } },
      checklist: {},
      ...overrides,
    } as unknown as EvaluacionInstitucional;
  }

  function armar(
    convocatoria: Convocatoria,
    ediciones: Edicion[],
    institucionales: EvaluacionInstitucional[],
    cruzadas: EvaluacionCruzada[],
  ): EvaluacionesService {
    const edicionConConvocatoria = ediciones.map((ed) => ({ ...ed, convocatoria } as unknown as Edicion));
    const edicionRepo = {
      find: jest.fn().mockResolvedValue(edicionConConvocatoria),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dummy = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
    const svc = new EvaluacionesService(
      { find: jest.fn().mockResolvedValue(institucionales) } as any,
      { find: jest.fn().mockResolvedValue(cruzadas) } as any,
      { findOne: jest.fn().mockResolvedValue(convocatoria), save: jest.fn().mockImplementation((c) => c) } as any,
      edicionRepo as any,
      dummy as any,
      dummy as any,
      dummy as any,
      { send: jest.fn() } as any,
      { registrar: jest.fn() } as any,
    );
    jest.spyOn(svc as any, 'validarEsRectorado').mockImplementation(() => undefined);
    jest.spyOn(svc as any, 'validarEsAutoridadRectorado').mockImplementation(() => undefined);
    return svc;
  }

  it('generarOrdenMerito bloquea si a una edición le falta la Ajena y nombra el proyecto', async () => {
    const convocatoria = construirConvocatoria();
    const edicion = construirEdicion();
    const institucional = construirInstitucional();
    const propia = {
      id: 'cz1p',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Propia,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 50 },
    } as unknown as EvaluacionCruzada;

    const svc = armar(convocatoria, [edicion], [institucional], [propia]);
    await expect(svc.generarOrdenMerito('conv1', { id: 'u1' } as any)).rejects.toThrow(
      /Faltan las evaluaciones cruzadas propia y ajena completas en: P1/,
    );
  });

  it('confirmarOrdenMerito bloquea si la diferencia entre propia y ajena llega al umbral (40) y no hay tercera confirmada', async () => {
    const convocatoria = construirConvocatoria();
    const edicion = construirEdicion({ ordenMerito: 1, puntajeMerito: 50 });
    const institucional = construirInstitucional();
    const propia = {
      id: 'cz1p',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Propia,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 90 },
    } as unknown as EvaluacionCruzada;
    const ajena = {
      id: 'cz1a',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Ajena,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 50 },
    } as unknown as EvaluacionCruzada;

    const svc = armar(convocatoria, [edicion], [institucional], [propia, ajena]);
    await expect(svc.confirmarOrdenMerito('conv1', { id: 'u1' } as any)).rejects.toThrow(
      /Diferencia de 40 o más puntos.*P1.*tercera/,
    );
  });

  it('una TerceraUa en Borrador no desbloquea la inconsistencia', async () => {
    const convocatoria = construirConvocatoria();
    const edicion = construirEdicion({ ordenMerito: 1, puntajeMerito: 50 });
    const institucional = construirInstitucional();
    const propia = {
      id: 'cz1p',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Propia,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 90 },
    } as unknown as EvaluacionCruzada;
    const ajena = {
      id: 'cz1a',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Ajena,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 50 },
    } as unknown as EvaluacionCruzada;
    const tercera = {
      id: 'cz1t',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.TerceraUa,
      estado: EstadoEvaluacion.Borrador,
      items: { it1: 70 },
    } as unknown as EvaluacionCruzada;

    const svc = armar(convocatoria, [edicion], [institucional], [propia, ajena, tercera]);
    await expect(svc.confirmarOrdenMerito('conv1', { id: 'u1' } as any)).rejects.toThrow(
      /Diferencia de 40 o más puntos/,
    );
  });

  it('con TerceraUa confirmada, generar y confirmar el orden de mérito pasan y el puntaje usa solo la tercera', async () => {
    const convocatoria = construirConvocatoria();
    const edicion = construirEdicion();
    const institucional = construirInstitucional();
    const propia = {
      id: 'cz1p',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Propia,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 90 },
    } as unknown as EvaluacionCruzada;
    const ajena = {
      id: 'cz1a',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.Ajena,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 50 },
    } as unknown as EvaluacionCruzada;
    const tercera = {
      id: 'cz1t',
      edicionId: 'e1',
      tipo: TipoEvaluacionCruzada.TerceraUa,
      estado: EstadoEvaluacion.Confirmada,
      items: { it1: 70 },
    } as unknown as EvaluacionCruzada;

    const svcGenerar = armar(convocatoria, [edicion], [institucional], [propia, ajena, tercera]);
    const [actualizada] = await svcGenerar.generarOrdenMerito('conv1', { id: 'u1' } as any);
    // 7 (institucional) + 70 (solo la tercera, no el promedio de las tres) = 77.
    expect(actualizada.puntajeMerito).toBe(77);

    const svcConfirmar = armar(convocatoria, [edicion], [institucional], [propia, ajena, tercera]);
    await expect(svcConfirmar.confirmarOrdenMerito('conv1', { id: 'u1' } as any)).resolves.toBeTruthy();
  });

  it('no bloquea ediciones que no están EnEvaluacion', async () => {
    const convocatoria = construirConvocatoria();
    const edicion = construirEdicion({ estado: EstadoEdicion.PendienteDeCambios });

    const svc = armar(convocatoria, [edicion], [], []);
    await expect(svc.generarOrdenMerito('conv1', { id: 'u1' } as any)).resolves.toBeTruthy();
  });

  it('con muchas ediciones sin institucional, el mensaje se acota a 5 nombres y el detalle trae la lista completa', async () => {
    const convocatoria = construirConvocatoria();
    const nombres = Array.from({ length: 8 }, (_, i) => `P${i + 1}`);
    const ediciones = nombres.map((nombre, i) =>
      construirEdicion({ id: `e${i + 1}`, proyecto: { nombre } }),
    );

    const svc = armar(convocatoria, ediciones, [], []);
    let error: BadRequestException | undefined;
    try {
      await svc.generarOrdenMerito('conv1', { id: 'u1' } as any);
    } catch (e) {
      error = e as BadRequestException;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    const response = error!.getResponse() as {
      message: string;
      detalle: { sinInstitucional: string[] };
    };
    expect(response.message).toContain('P1, P2, P3, P4, P5 y 3 más');
    expect(response.message).not.toContain('P8');
    expect(response.detalle.sinInstitucional).toEqual(nombres);
  });
});
