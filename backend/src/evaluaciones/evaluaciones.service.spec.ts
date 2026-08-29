/* eslint-disable @typescript-eslint/no-explicit-any */
import { EvaluacionesService } from './evaluaciones.service';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
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
