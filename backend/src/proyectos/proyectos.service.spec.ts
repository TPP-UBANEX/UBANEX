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
import { Presupuesto } from './presupuesto.interface';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { TipoPersona } from '../common/enums/tipo-persona.enum';

describe('ProyectosService', () => {
  const updateProyecto = jest.fn<(id: unknown, data: unknown) => Promise<unknown>>();
  const findOneProyecto = jest.fn<() => Promise<Proyecto | null>>();
  const softDeleteEdicion = jest.fn<(id: unknown) => Promise<unknown>>();
  const findOneEdicion = jest.fn<() => Promise<Edicion | null>>();
  const findEdiciones = jest.fn<() => Promise<Edicion[]>>();
  const saveEdicion = jest.fn<(edicion: unknown) => Promise<unknown>>();
  const findOneParticipacion = jest.fn<(options: unknown) => Promise<ParticipacionConvocatoria | null>>();
  const findParticipaciones = jest.fn<() => Promise<ParticipacionConvocatoria[]>>();
  const deleteParticipaciones = jest.fn<(criteria: unknown) => Promise<unknown>>();
  const findOneManager = jest.fn<() => Promise<unknown>>();

  const proyectoRepo = {
    update: updateProyecto,
    findOne: findOneProyecto,
  } as unknown as Repository<Proyecto>;

  const edicionRepo = {
    findOne: findOneEdicion,
    find: findEdiciones,
    save: saveEdicion,
    softDelete: softDeleteEdicion,
    manager: { findOne: findOneManager },
  } as unknown as Repository<Edicion>;

  const participacionRepo = {
    findOne: findOneParticipacion,
    find: findParticipaciones,
    delete: deleteParticipaciones,
  } as unknown as Repository<ParticipacionConvocatoria>;

  const emparejamientoRepo = {} as unknown as Repository<Emparejamiento>;

  const service = new ProyectosService(proyectoRepo, edicionRepo, participacionRepo, emparejamientoRepo);

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

  describe('actualizarEdicion — presupuesto', () => {
    const convocatoria = { id: 'convocatoria-1', formulario: null } as unknown as Convocatoria;
    const proyecto = { id: 'proyecto-1' } as unknown as Proyecto;

    beforeEach(() => {
      findOneManager.mockResolvedValue(convocatoria);
      findOneProyecto.mockResolvedValue(proyecto);
      findEdiciones.mockResolvedValue([]);
      saveEdicion.mockResolvedValue(undefined);
    });

    it('rechaza un presupuesto mal formado y no lo persiste', async () => {
      findOneEdicion.mockResolvedValue(edicion({ convocatoria } as unknown as Partial<Edicion>));
      const dto = {
        presupuesto: {
          montoTotal: 1,
          rubros: [{ tipo: 'Sueldos', subtotal: -5, partidas: [] }],
        },
      } as unknown as Parameters<typeof service.actualizarEdicion>[2];

      await expect(
        service.actualizarEdicion('proyecto-1', 'edicion-1', dto, creador),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saveEdicion).not.toHaveBeenCalled();
    });

    it('persiste el presupuesto normalizado en vez del que llegó mentido', async () => {
      findOneEdicion.mockResolvedValue(edicion({ convocatoria } as unknown as Partial<Edicion>));
      const dto = {
        presupuesto: {
          montoTotal: 1,
          rubros: [
            { tipo: TipoRubro.ViaticosYSeguros, subtotal: 999, partidas: [] },
            {
              tipo: TipoRubro.BienesDeConsumo,
              subtotal: 999,
              partidas: [{ descripcion: 'Papel', cantidad: 10, precioUnitario: 100, monto: 1 }],
            },
            { tipo: TipoRubro.BienesDeUso, subtotal: 0, partidas: [] },
          ],
        },
      } as unknown as Parameters<typeof service.actualizarEdicion>[2];

      await service.actualizarEdicion('proyecto-1', 'edicion-1', dto, creador);

      expect(saveEdicion).toHaveBeenCalledTimes(1);
      const guardada = (saveEdicion.mock.calls[0] as unknown as [Edicion])[0];
      const presupuesto = guardada.presupuesto as Presupuesto;
      expect(presupuesto.montoTotal).toBe(1000);
      expect(presupuesto.rubros[1].subtotal).toBe(1000);
    });
  });

  describe('enviarEdicion — presupuesto', () => {
    const convocatoriaConEjecucion = {
      id: 'convocatoria-1',
      formulario: null,
      fechaInicioEjecucion: '2027-08-01',
      fechaFinEjecucion: '2028-02-28',
    } as unknown as Convocatoria;
    const proyecto = { id: 'proyecto-1' } as unknown as Proyecto;
    const docenteValidado = {
      id: 'u-creador',
      roles: [RolUsuario.Docente],
      estadoValidacionDocente: EstadoValidacionDocente.Validado,
    } as unknown as Usuario;
    const dosDirectores = [
      {
        id: 'p-1', usuarioId: 'u-creador', edicionId: 'edicion-1',
        rol: RolEjecucion.DirectorDeProyecto, esDirectorPrincipal: true,
      },
      {
        id: 'p-2', usuarioId: 'u-otro', edicionId: 'edicion-1',
        rol: RolEjecucion.DirectorDeProyecto, esDirectorPrincipal: false,
      },
    ] as unknown as ParticipacionConvocatoria[];

    beforeEach(() => {
      findOneManager.mockResolvedValue(convocatoriaConEjecucion);
      findParticipaciones.mockResolvedValue(dosDirectores);
      findOneProyecto.mockResolvedValue(proyecto);
      findEdiciones.mockResolvedValue([]);
      saveEdicion.mockResolvedValue(undefined);
    });

    it('rechaza el envío si el presupuesto está vacío', async () => {
      findOneEdicion.mockResolvedValue(
        edicion({ convocatoria: convocatoriaConEjecucion, presupuesto: null } as unknown as Partial<Edicion>),
      );

      await expect(
        service.enviarEdicion('proyecto-1', 'edicion-1', docenteValidado),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saveEdicion).not.toHaveBeenCalled();
    });

    it('permite el envío con un presupuesto completo', async () => {
      const presupuestoCompleto: Presupuesto = {
        montoTotal: 6100,
        rubros: [
          {
            tipo: TipoRubro.ViaticosYSeguros,
            subtotal: 1000,
            partidas: [{
              tipoPersona: TipoPersona.Docente,
              descripcion: 'Viáticos',
              periodoInicio: '2027-08-01',
              periodoFin: '2027-09-01',
              monto: 1000,
            }],
          },
          {
            tipo: TipoRubro.BienesDeConsumo,
            subtotal: 5000,
            partidas: [{ descripcion: 'Papel', cantidad: 10, precioUnitario: 500, monto: 5000 }],
          },
          {
            tipo: TipoRubro.BienesDeUso,
            subtotal: 100,
            partidas: [{ descripcion: 'Equipo', cantidad: 1, precioUnitario: 100, monto: 100 }],
          },
        ],
      };
      findOneEdicion.mockResolvedValue(
        edicion({
          convocatoria: convocatoriaConEjecucion, presupuesto: presupuestoCompleto,
        } as unknown as Partial<Edicion>),
      );

      await service.enviarEdicion('proyecto-1', 'edicion-1', docenteValidado);

      expect(saveEdicion).toHaveBeenCalledTimes(1);
      const guardada = (saveEdicion.mock.calls[0] as unknown as [Edicion])[0];
      expect(guardada.estado).toBe(EstadoEdicion.Presentado);
    });
  });

  describe('actualizarEdicion — permisos de autoridad', () => {
    const convocatoria = { id: 'convocatoria-1', formulario: null } as unknown as Convocatoria;
    const proyecto = { id: 'proyecto-1' } as unknown as Proyecto;
    const secretaria = {
      id: 'u-secretaria',
      roles: [RolUsuario.AutoridadDeSecretaria],
    } as unknown as Usuario;

    beforeEach(() => {
      findOneManager.mockResolvedValue(convocatoria);
      findOneProyecto.mockResolvedValue(proyecto);
      findEdiciones.mockResolvedValue([]);
      saveEdicion.mockResolvedValue(undefined);
      updateProyecto.mockResolvedValue(undefined);
      findOneParticipacion.mockResolvedValue(null);
    });

    it('permite a una autoridad modificar esInterfacultad y unidadAcademicaAdicionalId en Presentado', async () => {
      findOneEdicion.mockResolvedValue(
        edicion({ convocatoria, estado: EstadoEdicion.Presentado } as unknown as Partial<Edicion>),
      );

      await service.actualizarEdicion('proyecto-1', 'edicion-1', {
        esInterfacultad: true,
        unidadAcademicaAdicionalId: 'ua-otra',
      } as unknown as Parameters<typeof service.actualizarEdicion>[2], secretaria);

      expect(saveEdicion).toHaveBeenCalledTimes(1);
    });

    it('rechaza a una autoridad que intenta modificar otros campos', async () => {
      findOneEdicion.mockResolvedValue(
        edicion({ convocatoria, estado: EstadoEdicion.Presentado } as unknown as Partial<Edicion>),
      );

      await expect(
        service.actualizarEdicion('proyecto-1', 'edicion-1', {
          nombre: 'Otro nombre',
        } as unknown as Parameters<typeof service.actualizarEdicion>[2], secretaria),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(saveEdicion).not.toHaveBeenCalled();
    });

    it('rechaza a una autoridad si la edición está en un estado no editable', async () => {
      findOneEdicion.mockResolvedValue(
        edicion({ convocatoria, estado: EstadoEdicion.EnEvaluacion } as unknown as Partial<Edicion>),
      );

      await expect(
        service.actualizarEdicion('proyecto-1', 'edicion-1', {
          esInterfacultad: true,
        } as unknown as Parameters<typeof service.actualizarEdicion>[2], secretaria),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saveEdicion).not.toHaveBeenCalled();
    });

    it('sigue permitiendo al creador actualizar todos los campos en Borrador', async () => {
      findOneEdicion.mockResolvedValue(
        edicion({ convocatoria, estado: EstadoEdicion.Borrador } as unknown as Partial<Edicion>),
      );

      await service.actualizarEdicion('proyecto-1', 'edicion-1', {
        nombre: 'Nuevo nombre',
        esInterfacultad: true,
      } as unknown as Parameters<typeof service.actualizarEdicion>[2], creador);

      expect(saveEdicion).toHaveBeenCalledTimes(1);
      expect(updateProyecto).toHaveBeenCalledWith('proyecto-1', { nombre: 'Nuevo nombre' });
    });
  });
});
