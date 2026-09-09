import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RendicionesService } from './rendiciones.service';
import { Rendicion } from './rendicion.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

describe('RendicionesService — acceso de lectura a comprobantes', () => {
  const findOneEdicion = jest.fn<() => Promise<Edicion | null>>();
  const findComprobantes = jest.fn<() => Promise<Rendicion[]>>();
  const findOneByParticipacion = jest.fn<() => Promise<ParticipacionConvocatoria | null>>();

  const repo = { find: findComprobantes } as unknown as Repository<Rendicion>;
  const edicionRepo = { findOne: findOneEdicion } as unknown as Repository<Edicion>;
  const convocatoriaRepo = {} as unknown as Repository<Convocatoria>;
  const participacionRepo = {
    findOneBy: findOneByParticipacion,
  } as unknown as Repository<ParticipacionConvocatoria>;
  const notificacionRepo = {} as unknown as Repository<Notificacion>;
  const usuarioRepo = {} as unknown as Repository<Usuario>;
  const auditoria = { registrar: jest.fn() } as unknown as AuditoriaService;

  const service = new RendicionesService(
    repo, edicionRepo, convocatoriaRepo, participacionRepo, notificacionRepo, usuarioRepo, auditoria,
  );

  function edicion(overrides: Partial<Edicion> = {}): Edicion {
    return {
      id: 'edicion-1',
      proyectoId: 'proyecto-1',
      unidadAcademicaId: 'ua-derecho',
      creadoPorId: 'u-creador',
      proyecto: { esInterfacultad: false, unidadAcademicaAdicionalId: null },
      ...overrides,
    } as unknown as Edicion;
  }

  function usuario(overrides: Partial<Usuario> = {}): Usuario {
    return { id: 'u-x', roles: [], unidadAcademicaId: null, ...overrides } as unknown as Usuario;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    findComprobantes.mockResolvedValue([]);
    findOneByParticipacion.mockResolvedValue(null);
    findOneEdicion.mockResolvedValue(edicion());
  });

  it('el Rectorado ve los comprobantes de cualquier edición', async () => {
    const u = usuario({ roles: [RolUsuario.AutoridadDeRectorado], unidadAcademicaId: 'ua-otra' });
    await expect(service.listarPorEdicion('edicion-1', u)).resolves.toEqual([]);
  });

  it('el creador de la edición ve los comprobantes', async () => {
    const u = usuario({ id: 'u-creador', roles: [RolUsuario.Docente] });
    await expect(service.listarPorEdicion('edicion-1', u)).resolves.toEqual([]);
  });

  it('un director de la edición ve los comprobantes', async () => {
    findOneByParticipacion.mockResolvedValue({ id: 'p-1' } as ParticipacionConvocatoria);
    const u = usuario({ id: 'u-director', roles: [RolUsuario.Docente] });
    await expect(service.listarPorEdicion('edicion-1', u)).resolves.toEqual([]);
  });

  it('la Secretaría de la UA de la edición ve los comprobantes, sin ningún toggle', async () => {
    const u = usuario({ roles: [RolUsuario.AutoridadDeSecretaria], unidadAcademicaId: 'ua-derecho' });
    await expect(service.listarPorEdicion('edicion-1', u)).resolves.toEqual([]);
  });

  it('en interfacultad, la Secretaría de la UA adicional también ve los comprobantes', async () => {
    findOneEdicion.mockResolvedValue(edicion({
      proyecto: { esInterfacultad: true, unidadAcademicaAdicionalId: 'ua-exactas' },
    } as unknown as Partial<Edicion>));
    const u = usuario({ roles: [RolUsuario.AsistenteDeSecretaria], unidadAcademicaId: 'ua-exactas' });
    await expect(service.listarPorEdicion('edicion-1', u)).resolves.toEqual([]);
  });

  it('la Secretaría de otra UA no ve los comprobantes', async () => {
    const u = usuario({ roles: [RolUsuario.AutoridadDeSecretaria], unidadAcademicaId: 'ua-otra' });
    await expect(service.listarPorEdicion('edicion-1', u)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un docente ajeno al proyecto no ve los comprobantes', async () => {
    const u = usuario({ id: 'u-ajeno', roles: [RolUsuario.Docente], unidadAcademicaId: 'ua-derecho' });
    await expect(service.listarPorEdicion('edicion-1', u)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
