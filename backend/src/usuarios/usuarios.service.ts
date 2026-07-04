import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ActualizarEstadoDirectorDto } from './dto/actualizar-estado-director.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';

const SALT_ROUNDS = 10;

const GRUPO_GESTION: RolUsuario[] = [
  RolUsuario.AutoridadDeRectorado,
  RolUsuario.AsistenteDeRectorado,
  RolUsuario.AutoridadDeSecretaria,
  RolUsuario.AsistenteDeSecretaria,
];

const GRUPO_EJECUCION: RolUsuario[] = [
  RolUsuario.DirectorDeProyecto,
  RolUsuario.Evaluador,
];

function validarGruposRoles(roles: RolUsuario[]): void {
  if (roles.length === 0) return;
  const enGestion = roles.some((r) => GRUPO_GESTION.includes(r));
  const enEjecucion = roles.some((r) => GRUPO_EJECUCION.includes(r));
  if (enGestion && enEjecucion) {
    throw new BadRequestException(
      'Un usuario no puede tener roles de Gestión y Ejecución simultáneamente',
    );
  }
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
    private readonly auditoria: AuditoriaService,
  ) {}

  async crear(dto: CrearUsuarioDto, creador?: Usuario): Promise<Usuario> {
    validarGruposRoles(dto.roles);

    const existente = await this.repo.findOne({ where: { email: dto.email } });
    if (existente) {
      throw new BadRequestException('El email ya está registrado');
    }

    // Validaciones según el rol del creador
    if (creador) {
      const esSecretaria = creador.roles.includes(RolUsuario.AutoridadDeSecretaria);
      if (esSecretaria) {
        const rolesPermitidos = [RolUsuario.Evaluador, RolUsuario.AsistenteDeSecretaria];
        const todosPermitidos = dto.roles.every((r) => rolesPermitidos.includes(r));
        if (!todosPermitidos) {
          throw new BadRequestException(
            'Autoridad de Secretaría solo puede crear Evaluadores y Asistentes de Secretaría',
          );
        }
        if (!dto.unidadAcademicaId) {
          dto.unidadAcademicaId = creador.unidadAcademicaId;
        }
      }
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const entity = this.repo.create({
      ...dto,
      password,
      creadoPorId: creador?.id,
    });
    const saved = await this.repo.save(entity);

    if (creador) {
      await this.auditoria.registrar({
        usuarioId: saved.id,
        accion: TipoAccionAuditoria.CREACION,
        descripcion: `Usuario creado con roles: ${dto.roles.join(', ')}`,
        responsableId: creador.id,
        responsableNombre: creador.nombreCompleto,
      });
    }

    return saved;
  }

  async listar(dto: PaginationDto, usuarioLogueado: Usuario): Promise<PaginatedResponse<Usuario>> {
    const { page = 1, limit = 10, search, rol, unidadAcademicaId } = dto;

    const query = this.repo.createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.unidadAcademica', 'unidadAcademica')
      .leftJoinAndSelect('usuario.creadoPor', 'creadoPor');

    const esSecretaria = usuarioLogueado.roles.includes(RolUsuario.AutoridadDeSecretaria);

    if (esSecretaria) {
      query.andWhere('usuario.unidadAcademicaId = :uaId', { uaId: usuarioLogueado.unidadAcademicaId });
    } else if (unidadAcademicaId) {
      query.andWhere('usuario.unidadAcademicaId = :uaId', { uaId: unidadAcademicaId });
    }

    if (search) {
      query.andWhere('usuario.nombreCompleto ILIKE :search', { search: `%${search}%` });
    }
    if (rol) {
      query.andWhere('usuario.roles LIKE :rol', { rol: `%${rol}%` });
    }

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);
    query.orderBy('usuario.nombreCompleto', 'ASC');

    const [data, total] = await query.getManyAndCount();

    const stats = {
      rectorado: await this.repo.createQueryBuilder('u')
        .where('u.roles LIKE :rol', { rol: '%Rectorado%' })
        .getCount(),
      secretarias: await this.repo.createQueryBuilder('u')
        .where('u.roles LIKE :rol', { rol: '%Secretaria%' })
        .getCount(),
      evaluadores: await this.repo.createQueryBuilder('u')
        .where('u.roles LIKE :rol', { rol: '%Evaluador%' })
        .getCount(),
      directores: await this.repo.createQueryBuilder('u')
        .where('u.roles LIKE :rol', { rol: '%Director%' })
        .getCount(),
    };

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  async obtener(id: string, usuarioLogueado?: Usuario): Promise<Usuario> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: { unidadAcademica: true, creadoPor: true },
    });
    if (!entity) throw new NotFoundException(`Usuario ${id} no encontrado`);

    if (usuarioLogueado) {
      await this.repo.update(usuarioLogueado.id, { ultimaActividad: new Date() });
    }

    return entity;
  }

  async obtenerPorEmail(email: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { email } });
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto, usuarioLogueado?: Usuario): Promise<Usuario> {
    const entity = await this.obtener(id);

    const esAutoEdicion = usuarioLogueado && usuarioLogueado.id === id;
    const esRectorado = usuarioLogueado?.roles.includes(RolUsuario.AutoridadDeRectorado);
    const esSecretaria = usuarioLogueado?.roles.includes(RolUsuario.AutoridadDeSecretaria);
    const mismaUA = esSecretaria && usuarioLogueado?.unidadAcademicaId === entity.unidadAcademicaId;

    const rolesAnteriores = [...entity.roles];
    let huboCambioRol = false;

    if (esAutoEdicion) {
      if (dto.nombreCompleto !== undefined) entity.nombreCompleto = dto.nombreCompleto;
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const saved = await this.repo.save(entity);
      await this.auditoria.registrar({
        usuarioId: id, accion: TipoAccionAuditoria.EDICION,
        descripcion: 'El usuario editó su propio perfil',
        responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
      });
      return saved;
    }

    if (esRectorado) {
      if (dto.roles) validarGruposRoles(dto.roles);
      if (dto.nombreCompleto !== undefined) entity.nombreCompleto = dto.nombreCompleto;
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.roles !== undefined) { entity.roles = dto.roles; huboCambioRol = true; }
      if (dto.unidadAcademicaId !== undefined) entity.unidadAcademicaId = dto.unidadAcademicaId;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const saved = await this.repo.save(entity);
      if (huboCambioRol) {
        await this.auditoria.registrar({
          usuarioId: id, accion: TipoAccionAuditoria.CAMBIO_ROL,
          descripcion: `Roles cambiados: [${rolesAnteriores.join(', ')}] → [${dto.roles!.join(', ')}]`,
          responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
        });
      } else {
        await this.auditoria.registrar({
          usuarioId: id, accion: TipoAccionAuditoria.EDICION,
          descripcion: 'Datos personales actualizados',
          responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
        });
      }
      return saved;
    }

    if (esSecretaria && mismaUA) {
      if (dto.nombreCompleto !== undefined) entity.nombreCompleto = dto.nombreCompleto;
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const saved = await this.repo.save(entity);
      await this.auditoria.registrar({
        usuarioId: id, accion: TipoAccionAuditoria.EDICION,
        descripcion: 'Datos actualizados por Secretaría',
        responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
      });
      return saved;
    }

    throw new ForbiddenException('No tiene permisos para editar este usuario');
  }

  async actualizarEstadoDirector(
    id: string, dto: ActualizarEstadoDirectorDto, usuarioLogueado?: Usuario,
  ): Promise<Usuario> {
    const entity = await this.obtener(id);
    const estadoAnterior = entity.estadoDirector;
    entity.estadoDirector = dto.estadoDirector;
    const saved = await this.repo.save(entity);
    if (usuarioLogueado) {
      await this.auditoria.registrar({
        usuarioId: id, accion: TipoAccionAuditoria.VALIDACION_DIRECTOR,
        descripcion: `Estado director: ${estadoAnterior || 'PendienteDeValidacion'} → ${dto.estadoDirector}`,
        responsableId: usuarioLogueado.id, responsableNombre: usuarioLogueado.nombreCompleto,
      });
    }
    return saved;
  }

  async eliminar(id: string, usuarioLogueado?: Usuario): Promise<void> {
    const entity = await this.obtener(id);
    entity.habilitado = false;
    await this.repo.save(entity);
    if (usuarioLogueado) {
      await this.auditoria.registrar({
        usuarioId: id, accion: TipoAccionAuditoria.INACTIVACION,
        descripcion: 'Usuario deshabilitado',
        responsableId: usuarioLogueado.id, responsableNombre: usuarioLogueado.nombreCompleto,
      });
    }
  }
}
