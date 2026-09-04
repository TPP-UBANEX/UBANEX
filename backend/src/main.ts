import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.getHttpAdapter().getInstance().disable('etag');
  app.use(morgan('dev'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // El seed corre al iniciar el backend solo si se pide explícitamente:
  // UBANEX_SEED=true lo habilita; por defecto queda desactivado.
  // En Render nunca se corre (RENDER=true), aunque la variable quede activa:
  // relee tablas completas y materializa miles de entidades en memoria, lo que
  // agota el heap del proceso durante el arranque.
  const seedHabilitado =
    (process.env.UBANEX_SEED ?? 'true') === 'true'
    && process.env.RENDER !== 'true';
  if (seedHabilitado) {
    const seedService = app.get(SeedService);
    await seedService.ejecutarSeed();
  } else {
    const motivo = process.env.UBANEX_SEED === 'true'
      ? 'deshabilitado en Render (RENDER=true)'
      : 'deshabilitado (UBANEX_SEED=false)';
    console.log(`\n[SEED] ${motivo}`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
