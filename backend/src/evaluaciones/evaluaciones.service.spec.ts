/* eslint-disable @typescript-eslint/no-explicit-any */
import { EvaluacionesService } from './evaluaciones.service';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
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
    cupoMinimoPorUnidadAcademica: 1,
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
      presupuesto: { montoTotal: 80 } as any,
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
      id: `cz${n}`,
      edicionId: id,
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
  cupo: number,
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
    cupoMinimoPorUnidadAcademica: cupo,
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
        presupuesto: { montoTotal: 80 } as any,
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
        id: `cz${n}`,
        edicionId: id,
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
): Record<string, { cupo: number; merito: number; financiados: number }> {
  const r: Record<string, { cupo: number; merito: number; financiados: number }> = {};
  for (const e of ediciones) {
    const ua = e.unidadAcademicaId;
    if (!r[ua]) r[ua] = { cupo: 0, merito: 0, financiados: 0 };
    if (e.adjudicacionPropuesta) r[ua].financiados++;
    if (e.mecanismoAdjudicacion === 'CUPO') r[ua].cupo++;
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

  it('con presupuesto holgado cada UA recibe su cuota (min(cupo, n)) y las chicas todas', async () => {
    const usuario = { id: 'u1' } as any;
    // A:3, B:2 (n < cupo), C:4 proyectos; cupo 2; presupuesto holgado.
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

    expect(c['uaA'].cupo).toBe(2);
    expect(c['uaB'].cupo).toBe(2);
    expect(c['uaC'].cupo).toBe(2);
    // UA B presentó menos que el cupo: todos sus proyectos son CUPO, 0 mérito.
    expect(c['uaB'].merito).toBe(0);
    expect(c['uaB'].financiados).toBe(2);
    // Presupuesto holgado: todo financiado.
    expect(c['uaA'].financiados).toBe(3);
    expect(c['uaC'].financiados).toBe(4);
  });

  it('con presupuesto ajustado el orden GLOBAL por puntaje decide la cuota (no el alfabético)', async () => {
    const usuario = { id: 'u1' } as any;
    // 3 UAs, 2 proyectos cada una, cupo 2. Costo 80 c/u -> 4 proyectos = 320
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

    expect(c['uaC'].cupo).toBe(2); // gana por puntaje global
    expect(c['uaA'].cupo).toBe(2); // le alcanza el presupuesto
    expect(c['uaB'].cupo).toBe(0); // se queda sin cuota (orden global, no alfabético)
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
    const dummy = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
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
      mecanismoAdjudicacion: 'CUPO',
      presupuesto: { montoTotal: 80 },
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
      presupuesto: { montoTotal: 90 },
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
