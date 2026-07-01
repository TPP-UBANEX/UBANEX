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
import { RolUsuario } from '../common/enums/rol-usuario.enum';

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
    return this.repo.save(entity);
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({
      relations: { unidadAcademica: true, creadoPor: true },
      order: { nombreCompleto: 'ASC' },
    });
  }

  async obtener(id: string): Promise<Usuario> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: { unidadAcademica: true, creadoPor: true },
    });
    if (!entity) throw new NotFoundException(`Usuario ${id} no encontrado`);
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

    if (esAutoEdicion) {
      if (dto.nombreCompleto !== undefined) entity.nombreCompleto = dto.nombreCompleto;
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      return this.repo.save(entity);
    }

    if (esRectorado) {
      if (dto.roles) validarGruposRoles(dto.roles);
      if (dto.nombreCompleto !== undefined) entity.nombreCompleto = dto.nombreCompleto;
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.roles !== undefined) entity.roles = dto.roles;
      if (dto.unidadAcademicaId !== undefined) entity.unidadAcademicaId = dto.unidadAcademicaId;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      return this.repo.save(entity);
    }

    if (esSecretaria && mismaUA) {
      if (dto.nombreCompleto !== undefined) entity.nombreCompleto = dto.nombreCompleto;
      if (dto.email !== undefined) entity.email = dto.email;
      if (dto.password) entity.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
      return this.repo.save(entity);
    }

    throw new ForbiddenException('No tiene permisos para editar este usuario');
  }

  async actualizarEstadoDirector(
    id: string, dto: ActualizarEstadoDirectorDto,
  ): Promise<Usuario> {
    const entity = await this.obtener(id);
    entity.estadoDirector = dto.estadoDirector;
    return this.repo.save(entity);
  }

  async eliminar(id: string): Promise<void> {
    const entity = await this.obtener(id);
    entity.habilitado = false;
    await this.repo.save(entity);
  }
}
