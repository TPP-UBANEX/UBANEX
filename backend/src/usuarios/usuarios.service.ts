import {
  Injectable, NotFoundException, BadRequestException,
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

  async crear(dto: CrearUsuarioDto): Promise<Usuario> {
    validarGruposRoles(dto.roles);

    const existente = await this.repo.findOne({ where: { email: dto.email } });
    if (existente) {
      throw new BadRequestException('El email ya está registrado');
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const entity = this.repo.create({ ...dto, password });
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

  async actualizar(id: string, dto: ActualizarUsuarioDto): Promise<Usuario> {
    const entity = await this.obtener(id);
    if (dto.roles) validarGruposRoles(dto.roles);
    Object.assign(entity, dto);
    return this.repo.save(entity);
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
