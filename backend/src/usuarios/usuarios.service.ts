import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Usuario } from './usuario.entity';
import { Carrera } from '../carreras/carrera.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ActualizarEstadoValidacionDocenteDto } from './dto/actualizar-estado-validacion-docente.dto';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/mail/mail.service';

const SALT_ROUNDS = 10;

const GRUPO_GESTION: RolUsuario[] = [
  RolUsuario.AutoridadDeRectorado,
  RolUsuario.AsistenteDeRectorado,
  RolUsuario.AutoridadDeSecretaria,
  RolUsuario.AsistenteDeSecretaria,
];

const GRUPO_EJECUCION: RolUsuario[] = [
  RolUsuario.Estudiante,
  RolUsuario.Docente,
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
    @InjectRepository(Carrera)
    private readonly carreraRepo: Repository<Carrera>,
    @InjectRepository(UnidadAcademica)
    private readonly unidadAcademicaRepo: Repository<UnidadAcademica>,
    private readonly auditoria: AuditoriaService,
    private readonly mail: MailService,
  ) {}

  async crear(dto: CrearUsuarioDto, creador?: Usuario): Promise<Usuario> {
    validarGruposRoles(dto.roles);

    if ((dto.nombre && !dto.apellido) || (!dto.nombre && dto.apellido)) {
      throw new BadRequestException('Deben completarse nombre y apellido');
    }
    if (dto.nombre && dto.apellido) {
      dto.nombreCompleto = `${dto.nombre} ${dto.apellido}`.trim();
    }

    const existente = await this.repo.findOne({ where: { email: dto.email } });
    if (existente) {
      throw new BadRequestException('El email ya está registrado');
    }

    // Validaciones según el rol del creador
    if (creador) {
      const esSecretaria = creador.roles.includes(RolUsuario.AutoridadDeSecretaria) ||
        creador.roles.includes(RolUsuario.AsistenteDeSecretaria);
      if (esSecretaria) {
        const rolesPermitidos = [RolUsuario.Docente, RolUsuario.AsistenteDeSecretaria, RolUsuario.Estudiante];
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
      estadoValidacionDocente: dto.roles.includes(RolUsuario.Docente)
        ? EstadoValidacionDocente.PendienteDeValidacion
        : null,
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
      .leftJoinAndSelect('usuario.carrera', 'carrera')
      .leftJoinAndSelect('usuario.creadoPor', 'creadoPor');

    const esSecretaria = usuarioLogueado.roles.includes(RolUsuario.AutoridadDeSecretaria) ||
      usuarioLogueado.roles.includes(RolUsuario.AsistenteDeSecretaria);

    const esEjecucion = usuarioLogueado.roles.includes(RolUsuario.Estudiante) ||
      usuarioLogueado.roles.includes(RolUsuario.Docente);

    if (esSecretaria) {
      query.andWhere('usuario.unidadAcademicaId = :uaId', { uaId: usuarioLogueado.unidadAcademicaId });
    } else if (esEjecucion) {
      query.andWhere('usuario.unidadAcademicaId = :uaId', { uaId: usuarioLogueado.unidadAcademicaId });
      query.andWhere('(usuario.roles LIKE :rolEst OR usuario.roles LIKE :rolDoc)', {
        rolEst: '%Estudiante%',
        rolDoc: '%Docente%',
      });
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

    const stats = esSecretaria
      ? {
          secretarias: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Secretaria%' })
            .andWhere('u.unidadAcademicaId = :uaId', { uaId: usuarioLogueado.unidadAcademicaId })
            .getCount(),
          estudiantes: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Estudiante%' })
            .andWhere('u.unidadAcademicaId = :uaId', { uaId: usuarioLogueado.unidadAcademicaId })
            .getCount(),
          docentes: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Docente%' })
            .andWhere('u.unidadAcademicaId = :uaId', { uaId: usuarioLogueado.unidadAcademicaId })
            .getCount(),
        }
      : {
          rectorado: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Rectorado%' })
            .getCount(),
          secretarias: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Secretaria%' })
            .getCount(),
          estudiantes: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Estudiante%' })
            .getCount(),
          docentes: await this.repo.createQueryBuilder('u')
            .where('u.roles LIKE :rol', { rol: '%Docente%' })
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
      relations: { unidadAcademica: true, carrera: true, creadoPor: true },
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
    const esSecretaria = usuarioLogueado?.roles.includes(RolUsuario.AutoridadDeSecretaria) ||
      usuarioLogueado?.roles.includes(RolUsuario.AsistenteDeSecretaria);
    const mismaUA = esSecretaria && usuarioLogueado?.unidadAcademicaId === entity.unidadAcademicaId;

    const rolesAnteriores = [...entity.roles];
    let huboCambioRol = false;

    if (esAutoEdicion) {
      if (dto.habilitado !== undefined) {
        throw new ForbiddenException('No puedes cambiar tu propio estado');
      }
      const hayNombreApellido = dto.nombre !== undefined || dto.apellido !== undefined;
      if (hayNombreApellido) {
        if (!dto.nombre || !dto.apellido) {
          throw new BadRequestException('Deben completarse nombre y apellido');
        }
        entity.nombre = dto.nombre;
        entity.apellido = dto.apellido;
        entity.nombreCompleto = `${dto.nombre} ${dto.apellido}`.trim();
      } else if (dto.nombreCompleto !== undefined) {
        entity.nombreCompleto = dto.nombreCompleto;
      }
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.telefono !== undefined) entity.telefono = dto.telefono;
      if (dto.genero !== undefined) entity.genero = dto.genero;
      if (dto.personaConDiscapacidad !== undefined) entity.personaConDiscapacidad = dto.personaConDiscapacidad;
      if (dto.cargoDocente !== undefined) entity.cargoDocente = dto.cargoDocente;
      if (dto.tipoDesignacionDocente !== undefined) entity.tipoDesignacionDocente = dto.tipoDesignacionDocente;
      if (dto.areaDocente !== undefined) entity.areaDocente = dto.areaDocente;
      if (dto.direccionLocalidad !== undefined) entity.direccionLocalidad = dto.direccionLocalidad;
      if (dto.porcentajeCarrera !== undefined) entity.porcentajeCarrera = dto.porcentajeCarrera;
      if (dto.carreraId !== undefined) {
        entity.carreraId = dto.carreraId;
        entity.carrera = dto.carreraId
          ? (await this.carreraRepo.findOne({ where: { id: dto.carreraId } })) ?? null
          : null;
      }
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
      if (dto.roles !== undefined) {
        entity.roles = dto.roles;
        huboCambioRol = true;
        if (
          dto.roles.includes(RolUsuario.Docente) &&
          !rolesAnteriores.includes(RolUsuario.Docente) &&
          !entity.estadoValidacionDocente
        ) {
          entity.estadoValidacionDocente = EstadoValidacionDocente.PendienteDeValidacion;
        }
      }
      if (dto.unidadAcademicaId !== undefined) {
        entity.unidadAcademicaId = dto.unidadAcademicaId;
        entity.unidadAcademica = dto.unidadAcademicaId
          ? (await this.unidadAcademicaRepo.findOne({ where: { id: dto.unidadAcademicaId } })) ?? null
          : null;
      }
      if (dto.habilitado !== undefined) entity.habilitado = dto.habilitado;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const saved = await this.repo.save(entity);
      if (dto.habilitado !== undefined) {
        await this.auditoria.registrar({
          usuarioId: id, accion: dto.habilitado ? TipoAccionAuditoria.REACTIVACION : TipoAccionAuditoria.INACTIVACION,
          descripcion: dto.habilitado ? 'Usuario habilitado' : 'Usuario deshabilitado',
          responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
        });
      } else if (huboCambioRol) {
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
      if (dto.roles !== undefined) {
        const rolesPermitidos = [RolUsuario.Estudiante, RolUsuario.Docente];
        const todosPermitidos = dto.roles.every(r => rolesPermitidos.includes(r));
        if (!todosPermitidos) {
          throw new BadRequestException('Solo puedes asignar roles de Estudiante y Docente');
        }
        const nuevosRoles = [
          ...entity.roles.filter(r => !rolesPermitidos.includes(r)),
          ...dto.roles,
        ];
        validarGruposRoles(nuevosRoles);
        entity.roles = nuevosRoles;
        huboCambioRol = true;
        if (
          nuevosRoles.includes(RolUsuario.Docente) &&
          !rolesAnteriores.includes(RolUsuario.Docente) &&
          !entity.estadoValidacionDocente
        ) {
          entity.estadoValidacionDocente = EstadoValidacionDocente.PendienteDeValidacion;
        }
      }
      if (dto.habilitado !== undefined) {
        const gestionRoles = [
          RolUsuario.AutoridadDeRectorado, RolUsuario.AsistenteDeRectorado,
          RolUsuario.AutoridadDeSecretaria, RolUsuario.AsistenteDeSecretaria,
        ]
        const tieneRolGestion = entity.roles.some(r => gestionRoles.includes(r))
        if (tieneRolGestion) {
          throw new ForbiddenException('No puedes cambiar el estado de usuarios de Gestión')
        }
        entity.habilitado = dto.habilitado
      }
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const saved = await this.repo.save(entity);
      if (dto.habilitado !== undefined) {
        await this.auditoria.registrar({
          usuarioId: id, accion: dto.habilitado ? TipoAccionAuditoria.REACTIVACION : TipoAccionAuditoria.INACTIVACION,
          descripcion: dto.habilitado ? 'Usuario habilitado' : 'Usuario deshabilitado',
          responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
        });
      } else if (huboCambioRol) {
        await this.auditoria.registrar({
          usuarioId: id, accion: TipoAccionAuditoria.CAMBIO_ROL,
          descripcion: `Roles cambiados: [${rolesAnteriores.join(', ')}] → [${entity.roles.join(', ')}]`,
          responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
        });
      } else {
        await this.auditoria.registrar({
          usuarioId: id, accion: TipoAccionAuditoria.EDICION,
          descripcion: 'Datos actualizados por Secretaría',
          responsableId: usuarioLogueado!.id, responsableNombre: usuarioLogueado!.nombreCompleto,
        });
      }
      return saved;
    }

    throw new ForbiddenException('No tiene permisos para editar este usuario');
  }

  async actualizarEstadoValidacionDocente(
    id: string, dto: ActualizarEstadoValidacionDocenteDto, usuarioLogueado?: Usuario,
  ): Promise<Usuario> {
    const entity = await this.obtener(id);
    const estadoAnterior = entity.estadoValidacionDocente;
    entity.estadoValidacionDocente = dto.estadoValidacionDocente;
    const saved = await this.repo.save(entity);
    if (
      estadoAnterior !== dto.estadoValidacionDocente &&
      (dto.estadoValidacionDocente === EstadoValidacionDocente.Validado ||
        dto.estadoValidacionDocente === EstadoValidacionDocente.Rechazado)
    ) {
      await this.mail.enviarEstadoValidacionDocente(entity.email, entity.nombreCompleto, dto.estadoValidacionDocente);
    }
    if (usuarioLogueado) {
      await this.auditoria.registrar({
        usuarioId: id, accion: TipoAccionAuditoria.VALIDACION_DOCENTE,
        descripcion: `Estado director: ${estadoAnterior || 'PendienteDeValidacion'} → ${dto.estadoValidacionDocente}`,
        responsableId: usuarioLogueado.id, responsableNombre: usuarioLogueado.nombreCompleto,
      });
    }
    return saved;
  }

  async resetPassword(id: string, usuarioLogueado: Usuario): Promise<{ message: string }> {
    const entity = await this.obtener(id);

    const esRectorado = usuarioLogueado.roles.includes(RolUsuario.AutoridadDeRectorado) ||
      usuarioLogueado.roles.includes(RolUsuario.AsistenteDeRectorado);
    const esSecretariaMismaUA = (usuarioLogueado.roles.includes(RolUsuario.AutoridadDeSecretaria) ||
      usuarioLogueado.roles.includes(RolUsuario.AsistenteDeSecretaria)) &&
      usuarioLogueado.unidadAcademicaId === entity.unidadAcademicaId;

    if (!esRectorado && !esSecretariaMismaUA) {
      throw new ForbiddenException('No tiene permisos para resetear la contraseña de este usuario');
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    entity.password = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await this.repo.save(entity);
    await this.mail.enviarPasswordTemporal(entity.email, entity.nombreCompleto, tempPassword);
    await this.auditoria.registrar({
      usuarioId: id, accion: TipoAccionAuditoria.RESET_PASSWORD,
      descripcion: 'Contraseña reseteada',
      responsableId: usuarioLogueado.id, responsableNombre: usuarioLogueado.nombreCompleto,
    });
    return { message: 'Contraseña temporal enviada al email del usuario' };
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
