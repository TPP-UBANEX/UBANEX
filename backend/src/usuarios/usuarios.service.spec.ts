import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './usuario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/mail/mail.service';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';

describe('UsuariosService', () => {
  const findOne = jest.fn<() => Promise<Usuario | null>>();
  const create = jest.fn<(data: unknown) => Usuario>();
  const save = jest.fn<(entity: unknown) => Promise<Usuario>>();
  const update = jest.fn<() => Promise<unknown>>();
  const count = jest.fn<() => Promise<number>>();

  const repo = {
    findOne,
    create,
    save,
    update,
    count,
  } as unknown as Repository<Usuario>;

  const auditoria = {
    registrar: jest.fn<() => Promise<unknown>>(),
  } as unknown as AuditoriaService;

  const mail = {} as unknown as MailService;

  const service = new UsuariosService(repo, auditoria, mail);

  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
