import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SugerenciasService } from './sugerencias.service';
import { SugerenciaCambio } from './sugerencia-cambio.entity';
import { Notificacion } from './notificacion.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { Presupuesto } from '../proyectos/presupuesto.interface';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoSugerencia } from '../common/enums/estado-sugerencia.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';

function presupuestoDePrueba(): Presupuesto {
  return {
    montoTotal: 1000,
    rubros: [
      {
        tipo: TipoRubro.ViaticosYSeguros,
        subtotal: 1000,
        partidas: [
          {
            tipoPersona: TipoPersona.Docente,
            descripcion: 'Viáticos docentes',
            periodoInicio: '2027-08-01',
            periodoFin: '2027-09-01',
            monto: 1000,
          },
        ],
      },
      {
        tipo: TipoRubro.BienesDeConsumo,
        subtotal: 5000,
        partidas: [
          { descripcion: 'Resmas de papel', cantidad: 10, precioUnitario: 500, monto: 5000 },
        ],
      },
      { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
    ],
  };
}

describe('SugerenciasService', () => {
  const findOneSugerencia = jest.fn<() => Promise<SugerenciaCambio | null>>();
  const saveSugerencia = jest.fn<(s: unknown) => Promise<unknown>>();
  const createSugerencia = jest.fn((data: unknown) => data as SugerenciaCambio);
  const saveNotificacion = jest.fn<(n: unknown) => Promise<unknown>>();
  const createNotificacion = jest.fn((data: unknown) => data);
  const findOneEdicion = jest.fn<() => Promise<Edicion | null>>();
  const saveEdicion = jest.fn<(e: unknown) => Promise<unknown>>();
  const findOneByProyecto = jest.fn<() => Promise<Proyecto | null>>();
  const findParticipaciones = jest.fn<() => Promise<ParticipacionConvocatoria[]>>();
  const findOneConvocatoria = jest.fn<() => Promise<Convocatoria | null>>();

  const sugerenciaRepo = {
    findOne: findOneSugerencia,
    save: saveSugerencia,
    create: createSugerencia,
  } as unknown as Repository<SugerenciaCambio>;

  const notificacionRepo = {
    save: saveNotificacion,
    create: createNotificacion,
  } as unknown as Repository<Notificacion>;

  const edicionRepo = {
    findOne: findOneEdicion,
    save: saveEdicion,
  } as unknown as Repository<Edicion>;

  const proyectoRepo = {
    findOneBy: findOneByProyecto,
  } as unknown as Repository<Proyecto>;

  const participacionRepo = {
    find: findParticipaciones,
    findOneBy: jest.fn<() => Promise<ParticipacionConvocatoria | null>>().mockResolvedValue(null),
  } as unknown as Repository<ParticipacionConvocatoria>;

  const convocatoriaRepo = {
    findOne: findOneConvocatoria,
  } as unknown as Repository<Convocatoria>;

  const service = new SugerenciasService(
    sugerenciaRepo, notificacionRepo, edicionRepo, proyectoRepo, participacionRepo, convocatoriaRepo,
  );

  const rectorado = { id: 'u-rectorado', roles: [RolUsuario.AutoridadDeRectorado] } as unknown as Usuario;

  function edicion(overrides: Partial<Edicion> = {}): Edicion {
    return {
      id: 'edicion-1',
      proyectoId: 'proyecto-1',
      convocatoriaId: 'convocatoria-1',
      unidadAcademicaId: 'ua-derecho',
      creadoPorId: 'u-creador',
      estado: EstadoEdicion.Presentado,
      presupuesto: presupuestoDePrueba(),
      ...overrides,
    } as unknown as Edicion;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    findParticipaciones.mockResolvedValue([]);
    findOneConvocatoria.mockResolvedValue(null);
    findOneByProyecto.mockResolvedValue({ id: 'proyecto-1', nombre: 'Proyecto de prueba' } as unknown as Proyecto);
    findOneSugerencia.mockResolvedValue(null);
    saveSugerencia.mockImplementation(async (s) => s);
  });

  describe('crear — validación de rutas de presupuesto', () => {
    it('rechaza una ruta de presupuesto que no matchea ningún patrón conocido', async () => {
      findOneEdicion.mockResolvedValue(edicion());

      await expect(
        service.crear('edicion-1', {
          campo: 'presupuesto.rubros[0].subtotal',
          comentario: 'esto no debería aceptarse',
        }, rectorado),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saveSugerencia).not.toHaveBeenCalled();
    });

    it('rechaza una sugerencia sobre una partida que no existe', async () => {
      findOneEdicion.mockResolvedValue(edicion());

      await expect(
        service.crear('edicion-1', {
          campo: 'presupuesto.rubros[0].partidas[5].monto',
          valorSugerido: '500',
          comentario: 'la partida 5 no existe',
        }, rectorado),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saveSugerencia).not.toHaveBeenCalled();
    });

    it('rechaza sugerir el monto de un bien: es derivado de cantidad * precioUnitario', async () => {
      findOneEdicion.mockResolvedValue(edicion());

      await expect(
        service.crear('edicion-1', {
          campo: 'presupuesto.rubros[1].partidas[0].monto',
          valorSugerido: '9999',
          comentario: 'intento de mentir el monto de un bien',
        }, rectorado),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saveSugerencia).not.toHaveBeenCalled();
    });

    it('acepta un comentario sobre un rubro completo, sin valor sugerido', async () => {
      findOneEdicion.mockResolvedValue(edicion());

      await expect(
        service.crear('edicion-1', {
          campo: 'presupuesto.rubros[0]',
          comentario: 'faltaría una partida de seguros acá',
        }, rectorado),
      ).resolves.not.toThrow();
      expect(saveSugerencia).toHaveBeenCalledTimes(1);
    });
  });

  describe('responder — aceptar una sugerencia de monto', () => {
    it('recalcula subtotal y montoTotal al aplicar el cambio', async () => {
      const ed = edicion();
      const sugerencia = {
        id: 'sugerencia-1',
        edicionId: ed.id,
        edicion: ed,
        sugeridoPorId: 'u-secretaria',
        campo: 'presupuesto.rubros[0].partidas[0].monto',
        valorActual: '1000',
        valorSugerido: '2000',
        comentario: 'ajustar el monto',
        estado: EstadoSugerencia.Pendiente,
      } as unknown as SugerenciaCambio;
      findOneSugerencia.mockResolvedValue(sugerencia);

      await service.responder('sugerencia-1', { estado: EstadoSugerencia.Aceptada }, rectorado);

      expect(saveEdicion).toHaveBeenCalledTimes(1);
      const guardada = (saveEdicion.mock.calls[0] as unknown as [Edicion])[0];
      const presupuesto = guardada.presupuesto as Presupuesto;
      expect(presupuesto.rubros[0].subtotal).toBe(2000);
      expect(presupuesto.montoTotal).toBe(7000);
      expect(saveSugerencia).toHaveBeenCalledWith(
        expect.objectContaining({ estado: EstadoSugerencia.Aceptada }),
      );
    });
  });
});
