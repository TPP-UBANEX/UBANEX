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
  const seedHabilitado = (process.env.UBANEX_SEED ?? 'false') === 'true';
  if (seedHabilitado) {
    const seedService = app.get(SeedService);
    await seedService.ejecutarSeed();
  } else {
    console.log('\n[SEED] deshabilitado (UBANEX_SEED=false)');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
