import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './proyecto.entity';
import { Edicion } from './edicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

describe('ProyectosService', () => {
  const updateProyecto = jest.fn<(id: unknown, data: unknown) => Promise<unknown>>();
  const softDeleteEdicion = jest.fn<(id: unknown) => Promise<unknown>>();
  const findOneEdicion = jest.fn<() => Promise<Edicion | null>>();
  const findOneParticipacion = jest.fn<(options: unknown) => Promise<ParticipacionConvocatoria | null>>();
  const deleteParticipaciones = jest.fn<(criteria: unknown) => Promise<unknown>>();

  const proyectoRepo = {
    update: updateProyecto,
  } as unknown as Repository<Proyecto>;

  const edicionRepo = {
    findOne: findOneEdicion,
    softDelete: softDeleteEdicion,
  } as unknown as Repository<Edicion>;

  const participacionRepo = {
    findOne: findOneParticipacion,
    delete: deleteParticipaciones,
  } as unknown as Repository<ParticipacionConvocatoria>;

  const service = new ProyectosService(proyectoRepo, edicionRepo, participacionRepo);

  function edicion(overrides: Partial<Edicion> = {}): Edicion {
    return {
      id: 'edicion-1',
      proyectoId: 'proyecto-1',
      convocatoriaId: 'convocatoria-1',
      estado: EstadoEdicion.Borrador,
      creadoPorId: 'u-creador',
      unidadAcademicaId: 'ua-derecho',
      eliminadoEn: null,
      ...overrides,
    } as unknown as Edicion;
  }

  const creador = {
    id: 'u-creador',
    roles: [RolUsuario.Docente],
  } as unknown as Usuario;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('eliminarEdicion', () => {
    it('elimina la edicion y hace hard-delete de sus participaciones', async () => {
      findOneEdicion.mockResolvedValue(edicion());

      const result = await service.eliminarEdicion('proyecto-1', 'edicion-1', creador);

      expect(softDeleteEdicion).toHaveBeenCalledWith('edicion-1');
      expect(deleteParticipaciones).toHaveBeenCalledWith({ edicionId: 'edicion-1' });
      expect(result).toEqual({ message: 'Edición eliminada' });
    });

    it('lanza NotFound si la edicion no existe', async () => {
      findOneEdicion.mockResolvedValue(null);
      await expect(
        service.eliminarEdicion('proyecto-1', 'edicion-1', creador),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(softDeleteEdicion).not.toHaveBeenCalled();
      expect(deleteParticipaciones).not.toHaveBeenCalled();
    });

    it('lanza Forbidden si el usuario no es creador ni director', async () => {
      findOneEdicion.mockResolvedValue(edicion({ creadoPorId: 'otro' }));
      findOneParticipacion.mockResolvedValue(null);
      await expect(
        service.eliminarEdicion('proyecto-1', 'edicion-1', creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(softDeleteEdicion).not.toHaveBeenCalled();
    });

    it('permite eliminar si el usuario es director de la edicion', async () => {
      findOneEdicion.mockResolvedValue(edicion({ creadoPorId: 'otro' }));
      findOneParticipacion.mockResolvedValue({
        id: 'p-1',
        usuarioId: 'u-creador',
        edicionId: 'edicion-1',
        rol: RolEjecucion.DirectorDeProyecto,
      } as unknown as ParticipacionConvocatoria);

      await service.eliminarEdicion('proyecto-1', 'edicion-1', creador);

      expect(findOneParticipacion).toHaveBeenCalledWith({
        where: {
          usuarioId: 'u-creador',
          edicionId: 'edicion-1',
          rol: RolEjecucion.DirectorDeProyecto,
        },
      });
      expect(softDeleteEdicion).toHaveBeenCalledWith('edicion-1');
      expect(deleteParticipaciones).toHaveBeenCalledWith({ edicionId: 'edicion-1' });
    });

    it('lanza BadRequest si la edicion no esta en Borrador', async () => {
      findOneEdicion.mockResolvedValue(edicion({ estado: EstadoEdicion.Presentado }));
      await expect(
        service.eliminarEdicion('proyecto-1', 'edicion-1', creador),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(softDeleteEdicion).not.toHaveBeenCalled();
      expect(deleteParticipaciones).not.toHaveBeenCalled();
    });
  });
});
