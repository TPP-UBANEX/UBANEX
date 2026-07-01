import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import { UsuariosService } from './usuarios/usuarios.service';
import { UnidadesAcademicasService } from './unidades-academicas/unidades-academicas.service';
import { RolUsuario } from './common/enums/rol-usuario.enum';

async function seedUnidadAcademica(
  uas: UnidadesAcademicasService,
  nombre: string,
) {
  const existente = await uas.obtenerPorNombre(nombre);
  if (existente) return existente;
  return uas.crear({ nombre });
}

async function seedUsuario(
  usuariosService: UsuariosService,
  data: { nombreCompleto: string; email: string; password: string; roles: RolUsuario[]; unidadAcademicaId?: string },
) {
  const existe = await usuariosService.obtenerPorEmail(data.email);
  if (existe) return;
  await usuariosService.crear(data);
  console.log(`  ${data.email} (${data.roles.join(', ')})`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(morgan('dev'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const usuariosService = app.get(UsuariosService);
  const uas = app.get(UnidadesAcademicasService);

  console.log('Corriendo seeds...');

  const derecho = await seedUnidadAcademica(uas, 'Facultad de Derecho');

  await seedUsuario(usuariosService, {
    nombreCompleto: 'Admin Rectorado',
    email: 'admin@uba.ar',
    password: 'admin',
    roles: [RolUsuario.AutoridadDeRectorado],
  });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Asistente de Rectorado',
    email: 'asistente-rectorado@uba.ar',
    password: '123456',
    roles: [RolUsuario.AsistenteDeRectorado],
  });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Autoridad de Derecho',
    email: 'autoridad-derecho@uba.ar',
    password: '123456',
    roles: [RolUsuario.AutoridadDeSecretaria],
    unidadAcademicaId: derecho.id,
  });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Asistente de Derecho',
    email: 'asistente-derecho@uba.ar',
    password: '123456',
    roles: [RolUsuario.AsistenteDeSecretaria],
    unidadAcademicaId: derecho.id,
  });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Evaluador de Derecho',
    email: 'evaluador@uba.ar',
    password: '123456',
    roles: [RolUsuario.Evaluador],
    unidadAcademicaId: derecho.id,
  });

  console.log('Seed completado.');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
