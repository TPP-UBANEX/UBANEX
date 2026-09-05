import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ParticipacionConvocatoriaService } from './participacion-convocatoria.service';
import { ParticipacionConvocatoria } from './participacion-convocatoria.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/mail/mail.service';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { CrearParticipacionDto } from './dto/crear-participacion.dto';

describe('ParticipacionConvocatoriaService', () => {
  const findParticipaciones = jest.fn<() => Promise<ParticipacionConvocatoria[]>>();
  const findOneParticipacion = jest.fn<() => Promise<ParticipacionConvocatoria | null>>();
  const createParticipacion = jest.fn<(data: Partial<ParticipacionConvocatoria>) => ParticipacionConvocatoria>();
  const saveParticipacion = jest.fn<(entity: ParticipacionConvocatoria) => Promise<ParticipacionConvocatoria>>();
  const removeParticipaciones = jest.fn<(entities: ParticipacionConvocatoria | ParticipacionConvocatoria[]) => Promise<ParticipacionConvocatoria | ParticipacionConvocatoria[]>>();

  const findUsuarios = jest.fn<(options: unknown) => Promise<Usuario[]>>();
  const findOneUsuario = jest.fn<() => Promise<Usuario | null>>();
  const saveUsuario = jest.fn<(usuario: Usuario) => Promise<Usuario>>();

  const findOneConvocatoria = jest.fn<() => Promise<Convocatoria | null>>();

  const findEdiciones = jest.fn<() => Promise<Edicion[]>>();
  const findOneEdicion = jest.fn<() => Promise<Edicion | null>>();

  const registrarAuditoria = jest.fn<(params: unknown) => Promise<unknown>>();
  const createNotificacion = jest.fn();
  const saveNotificacion = jest.fn();
  const deleteNotificacion = jest.fn();

  const participacionRepo = {
    find: findParticipaciones,
    findOne: findOneParticipacion,
    create: createParticipacion,
    save: saveParticipacion,
    remove: removeParticipaciones,
  } as unknown as Repository<ParticipacionConvocatoria>;

  const usuarioRepo = {
    find: findUsuarios,
    findOne: findOneUsuario,
    save: saveUsuario,
  } as unknown as Repository<Usuario>;

  const convocatoriaRepo = {
    findOne: findOneConvocatoria,
  } as unknown as Repository<Convocatoria>;

  const edicionRepo = {
    find: findEdiciones,
    findOne: findOneEdicion,
  } as unknown as Repository<Edicion>;

  const auditoria = {
    registrar: registrarAuditoria,
  } as unknown as AuditoriaService;

  const notificacionRepo = {
    create: createNotificacion,
    save: saveNotificacion,
    delete: deleteNotificacion,
  } as unknown as Repository<Notificacion>;
  const mail = {} as unknown as MailService;

  const service = new ParticipacionConvocatoriaService(
    participacionRepo,
    usuarioRepo,
    convocatoriaRepo,
    edicionRepo,
    notificacionRepo,
    auditoria,
    mail,
  );

  function docente(overrides: Partial<Usuario> = {}): Usuario {
    return {
      id: 'u-docente',
      nombre: 'Ana',
      apellido: 'García',
      nombreCompleto: 'Ana García',
      email: 'ana@uba.ar',
      telefono: '11 5555 1234',
      genero: 'Femenino',
      personaConDiscapacidad: false,
      cargoDocente: 'Profesora Titular',
      tipoDesignacionDocente: 'Regular',
      areaDocente: 'Análisis Matemático',
      direccionLocalidad: 'CABA',
      roles: [RolUsuario.Docente],
      estadoValidacionDocente: EstadoValidacionDocente.Validado,
      unidadAcademicaId: 'ua-derecho',
      habilitado: true,
      ...overrides,
    } as unknown as Usuario;
  }

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

  function convocatoria(): Convocatoria {
    return { id: 'convocatoria-1' } as unknown as Convocatoria;
  }

  function participacion(overrides: Partial<ParticipacionConvocatoria> = {}): ParticipacionConvocatoria {
    return {
      id: 'p-1',
      usuarioId: 'u-docente',
      convocatoriaId: 'convocatoria-1',
      rol: RolEjecucion.DirectorDeProyecto,
      edicionId: 'edicion-1',
      esDirectorPrincipal: true,
      asignadoPorId: 'u-creador',
      ...overrides,
    } as unknown as ParticipacionConvocatoria;
  }

  const dto = (overrides: Partial<CrearParticipacionDto> = {}): CrearParticipacionDto => ({
    usuarioId: 'u-docente',
    convocatoriaId: 'convocatoria-1',
    rol: RolEjecucion.DirectorDeProyecto,
    edicionId: 'edicion-1',
    esDirectorPrincipal: true,
    ...overrides,
  });

  const autoridad = {
    id: 'u-autoridad',
    roles: [RolUsuario.AutoridadDeRectorado],
    nombreCompleto: 'Autoridad',
  } as unknown as Usuario;

  const creador = {
    id: 'u-creador',
    roles: [RolUsuario.Docente],
    nombreCompleto: 'Dr. Creador',
  } as unknown as Usuario;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarCandidatos', () => {
    it('lanza BadRequest si falta unidadAcademicaId', async () => {
      await expect(
        service.listarCandidatos('', 'convocatoria-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('consulta por una sola UA cuando no se pasa adicional', async () => {
      findUsuarios.mockResolvedValue([]);
      findParticipaciones.mockResolvedValue([]);
      await service.listarCandidatos('ua-derecho', 'convocatoria-1');

      const options = findUsuarios.mock.calls[0][0] as {
        where: { unidadAcademicaId: { value: string[] } };
      };
      expect(options.where.unidadAcademicaId.value).toEqual(['ua-derecho']);
    });

    it('consulta la union de UAs cuando hay adicional (interfacultad)', async () => {
      findUsuarios.mockResolvedValue([]);
      findParticipaciones.mockResolvedValue([]);
      await service.listarCandidatos(
        'ua-derecho',
        'convocatoria-1',
        'edicion-1',
        'ua-medicina',
      );

      const options = findUsuarios.mock.calls[0][0] as {
        where: { unidadAcademicaId: { value: string[] } };
      };
      expect(options.where.unidadAcademicaId.value).toEqual([
        'ua-derecho',
        'ua-medicina',
      ]);
    });

    it('solo devuelve docentes Validado', async () => {
      findUsuarios.mockResolvedValue([
        docente(),
        docente({ id: 'u-pendiente', estadoValidacionDocente: EstadoValidacionDocente.PendienteDeValidacion }),
        docente({ id: 'u-rechazado', estadoValidacionDocente: EstadoValidacionDocente.Rechazado }),
        docente({ id: 'u-estudiante', roles: [RolUsuario.Estudiante] }),
      ]);
      findParticipaciones.mockResolvedValue([]);

      const result = await service.listarCandidatos('ua-derecho', 'convocatoria-1');
      expect(result.map(u => u.id)).toEqual(['u-docente']);
    });

    it('filtra habilitados por defecto y los incluye si se pide incluirBloqueados', async () => {
      findUsuarios.mockResolvedValue([]);
      findParticipaciones.mockResolvedValue([]);

      await service.listarCandidatos('ua-derecho', 'convocatoria-1');
      const opcionesDefault = findUsuarios.mock.calls[0][0] as {
        where: { habilitado: boolean };
      };
      expect(opcionesDefault.where.habilitado).toBe(true);

      await service.listarCandidatos(
        'ua-derecho',
        'convocatoria-1',
        undefined,
        undefined,
        true,
      );
      const opcionesConBloqueados = findUsuarios.mock.calls[1][0] as {
        where: { habilitado?: boolean };
      };
      expect(opcionesConBloqueados.where.habilitado).toBeUndefined();
    });

    it('con incluirBloqueados devuelve no validados, deshabilitados y ocupados con el flag ocupado', async () => {
      findUsuarios.mockResolvedValue([
        docente({ id: 'u-validado' }),
        docente({ id: 'u-pendiente', estadoValidacionDocente: EstadoValidacionDocente.PendienteDeValidacion }),
        docente({ id: 'u-ocupado' }),
        docente({ id: 'u-deshabilitado', habilitado: false }),
        docente({ id: 'u-estudiante', roles: [RolUsuario.Estudiante] }),
      ]);
      findParticipaciones.mockResolvedValue([
        participacion({ id: 'p-ocupado', usuarioId: 'u-ocupado', edicionId: 'e-otra' }),
      ]);
      findEdiciones.mockResolvedValue([
        { id: 'e-otra', eliminadoEn: null },
      ] as Edicion[]);

      const result = await service.listarCandidatos(
        'ua-derecho',
        'convocatoria-1',
        'edicion-1',
        undefined,
        true,
      );

      expect(result.map(u => u.id)).toEqual([
        'u-validado',
        'u-pendiente',
        'u-ocupado',
        'u-deshabilitado',
      ]);
      expect(result.find(u => u.id === 'u-ocupado')?.ocupado).toBe(true);
      expect(result.find(u => u.id === 'u-validado')?.ocupado).toBe(false);
    });

    it('excluye ocupados pero no a los de la edicion actual ni los de ediciones eliminadas', async () => {
      findUsuarios.mockResolvedValue([
        docente({ id: 'u-ocupado' }),
        docente({ id: 'u-edicion-eliminada' }),
        docente({ id: 'u-director-actual' }),
        docente({ id: 'u-evaluador' }),
        docente({ id: 'u-libre' }),
      ]);
      findParticipaciones.mockResolvedValue([
        participacion({ id: 'p-ocupado', usuarioId: 'u-ocupado', edicionId: 'e-activa' }),
        participacion({ id: 'p-elim', usuarioId: 'u-edicion-eliminada', edicionId: 'e-eliminada' }),
        participacion({ id: 'p-actual', usuarioId: 'u-director-actual', edicionId: 'edicion-1' }),
        participacion({ id: 'p-eval', usuarioId: 'u-evaluador', edicionId: null }),
      ]);
      findEdiciones.mockResolvedValue([
        { id: 'e-activa', eliminadoEn: null },
        { id: 'e-eliminada', eliminadoEn: new Date() },
      ] as Edicion[]);

      const result = await service.listarCandidatos(
        'ua-derecho',
        'convocatoria-1',
        'edicion-1',
      );

      expect(result.map(u => u.id)).toEqual([
        'u-edicion-eliminada',
        'u-director-actual',
        'u-libre',
      ]);
    });
  });

  describe('asignar', () => {
    it('asigna correctamente cuando el creador de la edicion lo autoriza', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findOneEdicion.mockResolvedValue(edicion());
      findParticipaciones.mockResolvedValue([]);
      const entity = participacion();
      createParticipacion.mockReturnValue(entity);
      saveParticipacion.mockResolvedValue(entity);

      const result = await service.asignar(dto(), creador);

      expect(result).toBe(entity);
      expect(createParticipacion).toHaveBeenCalledWith({
        usuarioId: 'u-docente',
        convocatoriaId: 'convocatoria-1',
        rol: RolEjecucion.DirectorDeProyecto,
        edicionId: 'edicion-1',
        esDirectorPrincipal: true,
        asignadoPorId: 'u-creador',
        estado: null,
      });
      expect(saveParticipacion).toHaveBeenCalledWith(entity);
    });

    it('lanza Forbidden si un no-autoridad asigna un rol que no es DirectorDeProyecto', async () => {
      await expect(
        service.asignar(dto({ rol: RolEjecucion.Evaluador }), creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(findOneUsuario).not.toHaveBeenCalled();
    });

    it('lanza Forbidden si un no-autoridad asigna sin edicionId', async () => {
      await expect(
        service.asignar(dto({ edicionId: undefined }), creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza Forbidden si el creador no es duenio de la edicion', async () => {
      findOneEdicion.mockResolvedValue(edicion({ creadoPorId: 'otro' }));
      await expect(
        service.asignar(dto(), creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza Forbidden si la edicion no esta en Borrador', async () => {
      findOneEdicion.mockResolvedValue(edicion({ estado: EstadoEdicion.Presentado }));
      await expect(
        service.asignar(dto(), creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza NotFound si el usuario no existe', async () => {
      findOneUsuario.mockResolvedValue(null);
      findOneEdicion.mockResolvedValue(edicion());
      await expect(
        service.asignar(dto(), creador),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequest si el usuario no es Docente', async () => {
      findOneUsuario.mockResolvedValue(docente({ roles: [RolUsuario.Estudiante] }));
      findOneEdicion.mockResolvedValue(edicion());
      await expect(
        service.asignar(dto(), creador),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequest si el docente no esta Validado', async () => {
      findOneUsuario.mockResolvedValue(docente({ estadoValidacionDocente: EstadoValidacionDocente.PendienteDeValidacion }));
      findOneEdicion.mockResolvedValue(edicion());
      await expect(
        service.asignar(dto(), creador),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFound si la convocatoria no existe', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(null);
      findOneEdicion.mockResolvedValue(edicion());
      await expect(
        service.asignar(dto(), creador),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('elimina participaciones estancadas (edicion eliminada) antes de asignar', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findOneEdicion.mockResolvedValue(edicion());
      const estancada = participacion({ id: 'p-estancada', edicionId: 'e-eliminada' });
      findParticipaciones.mockResolvedValue([estancada]);
      findEdiciones.mockResolvedValue([
        { id: 'e-eliminada', eliminadoEn: new Date() },
      ] as Edicion[]);
      const entity = participacion({ id: 'p-nueva' });
      createParticipacion.mockReturnValue(entity);
      saveParticipacion.mockResolvedValue(entity);

      const result = await service.asignar(dto(), autoridad);

      expect(result).toBe(entity);
      expect(removeParticipaciones).toHaveBeenCalledWith([estancada]);
    });

    it('lanza BadRequest si el usuario ya tiene una participacion activa en la convocatoria', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findOneEdicion.mockResolvedValue(edicion());
      findParticipaciones.mockResolvedValue([
        participacion({ id: 'p-existente', edicionId: 'e-activa' }),
      ]);
      findEdiciones.mockResolvedValue([
        { id: 'e-activa', eliminadoEn: null },
      ] as Edicion[]);

      await expect(
        service.asignar(dto(), autoridad),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequest si el DirectorDeProyecto no trae edicionId', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findParticipaciones.mockResolvedValue([]);
      await expect(
        service.asignar(dto({ edicionId: undefined }), autoridad),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFound si la edicion no existe', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findParticipaciones.mockResolvedValue([]);
      findOneEdicion.mockResolvedValue(null);
      await expect(
        service.asignar(dto(), autoridad),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequest si el usuario alcanzo el limite de 2 direcciones', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findOneEdicion.mockResolvedValue(edicion());
      findParticipaciones.mockResolvedValue([
        participacion({ id: 'p-1', edicionId: 'e-1', rol: RolEjecucion.DirectorDeProyecto }),
        participacion({ id: 'p-2', edicionId: 'e-2', rol: RolEjecucion.DirectorDeProyecto }),
      ]);
      findEdiciones.mockResolvedValue([
        { id: 'e-1', eliminadoEn: null },
        { id: 'e-2', eliminadoEn: null },
      ] as Edicion[]);

      await expect(
        service.asignar(dto(), autoridad),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequest si un Evaluador trae edicionId o esDirectorPrincipal', async () => {
      findOneUsuario.mockResolvedValue(docente());
      findOneConvocatoria.mockResolvedValue(convocatoria());
      findParticipaciones.mockResolvedValue([]);
      await expect(
        service.asignar(dto({ rol: RolEjecucion.Evaluador, edicionId: 'edicion-1' }), autoridad),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('desasignar', () => {
    it('lanza NotFound si la participacion no existe', async () => {
      findOneParticipacion.mockResolvedValue(null);
      await expect(
        service.desasignar('p-1', autoridad),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('una autoridad puede desasignar cualquier participacion', async () => {
      findOneParticipacion.mockResolvedValue(participacion());
      await service.desasignar('p-1', autoridad);
      expect(removeParticipaciones).toHaveBeenCalledWith(participacion());
    });

    it('el creador puede desasignar en estado Borrador', async () => {
      findOneParticipacion.mockResolvedValue(participacion());
      findOneEdicion.mockResolvedValue(edicion());
      await service.desasignar('p-1', creador);
      expect(removeParticipaciones).toHaveBeenCalledWith(participacion());
    });

    it('lanza Forbidden si un no-autoridad no es el creador', async () => {
      findOneParticipacion.mockResolvedValue(participacion());
      findOneEdicion.mockResolvedValue(edicion({ creadoPorId: 'otro' }));
      await expect(
        service.desasignar('p-1', creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza Forbidden si la edicion no esta en Borrador', async () => {
      findOneParticipacion.mockResolvedValue(participacion());
      findOneEdicion.mockResolvedValue(edicion({ estado: EstadoEdicion.Presentado }));
      await expect(
        service.desasignar('p-1', creador),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
