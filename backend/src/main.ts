import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import { UsuariosService } from './usuarios/usuarios.service';
import { RolUsuario } from './common/enums/rol-usuario.enum';

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
  const adminExiste = await usuariosService.obtenerPorEmail('admin@uba.ar');
  if (!adminExiste) {
    await usuariosService.crear({
      nombreCompleto: 'Admin',
      email: 'admin@uba.ar',
      password: 'admin',
      roles: [RolUsuario.AutoridadDeRectorado],
    });
    console.log('Usuario admin creado: admin@uba.ar / admin');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
