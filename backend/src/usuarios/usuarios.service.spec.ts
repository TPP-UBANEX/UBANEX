import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './usuario.entity';
import { Carrera } from '../carreras/carrera.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/mail/mail.service';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

describe('UsuariosService', () => {
  const findOne = jest.fn<() => Promise<Usuario | null>>();
  const create = jest.fn<(data: unknown) => Usuario>();
  const save = jest.fn<(entity: unknown) => Promise<Usuario>>();
  const update = jest.fn<() => Promise<unknown>>();
  const count = jest.fn<() => Promise<number>>();
  const getMany = jest.fn<() => Promise<Usuario[]>>();
  const andWhere = jest.fn<(condition: string, params?: unknown) => unknown>();
  const qb = {
    select: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn((condition: string, params?: unknown) => {
      andWhere(condition, params)
      return qb
    }),
    orderBy: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getCount: jest.fn(() => count()),
    getMany: jest.fn(() => getMany()),
  };
  const createQueryBuilder = jest.fn(() => qb);

  const repo = {
    findOne,
    create,
    save,
    update,
    count,
    createQueryBuilder,
  } as unknown as Repository<Usuario>;

  const carreraRepo = {} as unknown as Repository<Carrera>;
  const unidadAcademicaRepo = {} as unknown as Repository<UnidadAcademica>;

  const auditoria = {
    registrar: jest.fn<() => Promise<unknown>>(),
  } as unknown as AuditoriaService;

  const mail = {} as unknown as MailService;

  const service = new UsuariosService(repo, carreraRepo, unidadAcademicaRepo, auditoria, mail);

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockImplementation((data: unknown) => ({ ...(data as object) }) as Usuario);
    save.mockImplementation(async (entity: unknown) => entity as Usuario);
    count.mockResolvedValue(0);
    getMany.mockResolvedValue([]);
  });

  describe('crear', () => {
    it('rechaza crear un usuario con más de un rol', async () => {
      const dto = {
        email: 'multi-rol@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente, RolUsuario.Estudiante],
      } as CrearUsuarioDto;

      await expect(service.crear(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(findOne).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('rechaza crear un usuario sin roles', async () => {
      const dto = {
        email: 'sin-rol@uba.ar',
        password: '123456',
        roles: [],
      } as CrearUsuarioDto;

      await expect(service.crear(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });

    it('permite a Secretaría crear una autoridad de Secretaría con su misma UA', async () => {
      findOne.mockResolvedValue(null);
      const creador = {
        id: 'secretaria-1',
        nombreCompleto: 'Autoridad de Derecho',
        roles: [RolUsuario.AutoridadDeSecretaria],
        unidadAcademicaId: 'ua-derecho',
      } as unknown as Usuario;

      const dto = {
        email: 'nueva-autoridad@uba.ar',
        password: '123456',
        nombre: 'Nueva',
        apellido: 'Autoridad',
        roles: [RolUsuario.AutoridadDeSecretaria],
      } as CrearUsuarioDto;

      const resultado = await service.crear(dto, creador);

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          unidadAcademicaId: 'ua-derecho',
          creadoPorId: 'secretaria-1',
        }),
      );
      expect(resultado.unidadAcademicaId).toBe('ua-derecho');
    });

    it('rechaza crear una 4ta autoridad de Secretaría en la misma UA', async () => {
      findOne.mockResolvedValue(null);
      count.mockResolvedValue(3);
      const creador = {
        id: 'secretaria-1',
        nombreCompleto: 'Autoridad de Derecho',
        roles: [RolUsuario.AutoridadDeSecretaria],
        unidadAcademicaId: 'ua-derecho',
      } as unknown as Usuario;

      const dto = {
        email: 'cuarta-autoridad@uba.ar',
        password: '123456',
        nombre: 'Cuarta',
        apellido: 'Autoridad',
        roles: [RolUsuario.AutoridadDeSecretaria],
      } as CrearUsuarioDto;

      await expect(service.crear(dto, creador)).rejects.toBeInstanceOf(BadRequestException);
      expect(andWhere).toHaveBeenCalledWith('u.unidadAcademicaId = :uaId', { uaId: 'ua-derecho' });
      expect(save).not.toHaveBeenCalled();
    });

    it('permite a Secretaría crear una autoridad cuando el cupo de su UA no está completo', async () => {
      findOne.mockResolvedValue(null);
      count.mockResolvedValue(1);
      const creador = {
        id: 'secretaria-1',
        nombreCompleto: 'Autoridad de Derecho',
        roles: [RolUsuario.AutoridadDeSecretaria],
        unidadAcademicaId: 'ua-derecho',
      } as unknown as Usuario;

      const dto = {
        email: 'autoridad-2@uba.ar',
        password: '123456',
        nombre: 'Otra',
        apellido: 'Autoridad',
        roles: [RolUsuario.AutoridadDeSecretaria],
      } as CrearUsuarioDto;

      await expect(service.crear(dto, creador)).resolves.toBeDefined();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('rechaza a Rectorado crear una 4ta autoridad de Rectorado', async () => {
      findOne.mockResolvedValue(null);
      count.mockResolvedValue(3);
      const creador = {
        id: 'rectorado-1',
        nombreCompleto: 'Admin Rectorado',
        roles: [RolUsuario.AutoridadDeRectorado],
      } as unknown as Usuario;

      const dto = {
        email: 'cuarta-autoridad-rectorado@uba.ar',
        password: '123456',
        nombre: 'Cuarta',
        apellido: 'Autoridad',
        roles: [RolUsuario.AutoridadDeRectorado],
      } as CrearUsuarioDto;

      await expect(service.crear(dto, creador)).rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('rechaza a Rectorado otorgar una autoridad cuando el cupo está completo', async () => {
      const target = {
        id: 'docente-1',
        email: 'docente@uba.ar',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: 'ua-derecho',
        nombreCompleto: 'Docente',
        estadoValidacionDocente: null,
      } as unknown as Usuario;
      findOne.mockResolvedValue(target);
      count.mockResolvedValue(3);

      const rectorado = {
        id: 'rectorado-1',
        nombreCompleto: 'Admin Rectorado',
        roles: [RolUsuario.AutoridadDeRectorado],
      } as unknown as Usuario;

      const dto = {
        roles: [RolUsuario.AutoridadDeRectorado],
      } as ActualizarUsuarioDto;

      await expect(service.actualizar('docente-1', dto, rectorado))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('buscarParaFormulario', () => {
    const docente = {
      id: 'docente-1',
      roles: [RolUsuario.Docente],
      unidadAcademicaId: 'ua-derecho',
    } as unknown as Usuario;

    const rectorado = {
      id: 'rectorado-1',
      roles: [RolUsuario.AutoridadDeRectorado],
    } as unknown as Usuario;

    it('devuelve vacío sin tocar el repo si el texto es muy corto', async () => {
      const resultado = await service.buscarParaFormulario({ q: 'pe' }, docente);

      expect(resultado).toEqual([]);
      expect(createQueryBuilder).not.toHaveBeenCalled();
    });

    it('filtra por la unidad académica de un docente', async () => {
      await service.buscarParaFormulario({ q: 'perez' }, docente);

      expect(andWhere).toHaveBeenCalledWith('usuario.unidadAcademicaId = :uaId', { uaId: 'ua-derecho' });
    });

    it('no filtra por unidad académica cuando busca Rectorado', async () => {
      await service.buscarParaFormulario({ q: 'perez' }, rectorado);

      expect(andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('unidadAcademicaId'),
        expect.anything(),
      );
    });

    it('exige todos los términos del texto buscado (soporta orden invertido)', async () => {
      await service.buscarParaFormulario({ q: 'perez juan' }, rectorado);

      expect(andWhere).toHaveBeenCalledWith('usuario.nombreCompleto ILIKE :termino0', { termino0: '%perez%' });
      expect(andWhere).toHaveBeenCalledWith('usuario.nombreCompleto ILIKE :termino1', { termino1: '%juan%' });
    });

    it('no incluye el password en el resultado', async () => {
      getMany.mockResolvedValue([
        { id: 'u1', nombreCompleto: 'Juan Perez', email: 'juan@uba.ar', password: 'hash-secreto' } as Usuario,
      ]);

      const resultado = await service.buscarParaFormulario({ q: 'perez' }, rectorado);

      expect(resultado).toEqual([{ id: 'u1', nombre: 'Juan Perez', email: 'juan@uba.ar' }]);
      expect(JSON.stringify(resultado)).not.toContain('hash-secreto');
    });
  });
});
