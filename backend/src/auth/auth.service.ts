import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CarrerasService } from '../carreras/carreras.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly carrerasService: CarrerasService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.obtenerPorEmail(dto.email);
    if (!usuario) {
      throw new UnauthorizedException('Usuario o contraseña incorrecto!');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Usuario o contraseña incorrecto!');
    }

    if (!usuario.habilitado) {
      throw new UnauthorizedException('Usuario deshabilitado');
    }

    if (usuario.roles.includes(RolUsuario.Docente) &&
      usuario.estadoValidacionDocente === EstadoValidacionDocente.Rechazado) {
      throw new UnauthorizedException(
        'Tu cuenta de Docente ha sido rechazada. Contactate con la Secretaría de Extensión de tu facultad.',
      );
    }

    return this.generarToken(usuario);
  }

  async register(dto: RegisterDto) {
    const existente = await this.usuariosService.obtenerPorEmail(dto.email);
    if (existente) {
      throw new BadRequestException('El email ya está registrado');
    }

    if (dto.tipo === 'docente' && !dto.telefono) {
      throw new BadRequestException('El teléfono es obligatorio para docentes');
    }

    if (dto.carreraId) {
      const carrera = await this.carrerasService.obtener(dto.carreraId);
      if (dto.unidadAcademicaId && carrera.unidadAcademicaId !== dto.unidadAcademicaId) {
        const carrerasDeLaUa = await this.carrerasService.listarPorUnidadAcademica(dto.unidadAcademicaId);
        if (carrerasDeLaUa.length > 0) {
          throw new BadRequestException(
            'La carrera elegida no corresponde a la unidad académica seleccionada',
          );
        }
      }
    }

    const roles: RolUsuario[] = dto.tipo === 'docente'
      ? [RolUsuario.Docente]
      : [RolUsuario.Estudiante];

    const usuario = await this.usuariosService.crear({
      ...dto,
      roles,
      unidadAcademicaId: dto.unidadAcademicaId,
      nombreCompleto: `${dto.nombre} ${dto.apellido}`.trim(),
    });

    return this.generarToken(usuario);
  }

  private generarToken(usuario: { id: string; email: string }) {
    const payload: JwtPayload = { sub: usuario.id, email: usuario.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
