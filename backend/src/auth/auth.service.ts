import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.obtenerPorEmail(dto.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.habilitado) {
      throw new UnauthorizedException('Usuario deshabilitado');
    }

    return this.generarToken(usuario);
  }

  async register(dto: RegisterDto) {
    const existente = await this.usuariosService.obtenerPorEmail(dto.email);
    if (existente) {
      throw new BadRequestException('El email ya está registrado');
    }

    const usuario = await this.usuariosService.crear({
      ...dto,
      roles: [RolUsuario.DirectorDeProyecto],
      unidadAcademicaId: dto.unidadAcademicaId,
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
