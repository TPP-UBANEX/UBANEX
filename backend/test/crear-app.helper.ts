import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/common/mail/mail.service';

export const DB_TEST = 'ubanex_test';

/** Devuelve la URL apuntando a la base de pruebas, derivando host/credenciales
 *  de la URL de desarrollo (backend/.env). */
export async function urlBaseDePruebas(): Promise<string> {
  const { config } = await import('dotenv');
  config({ path: join(__dirname, '..', '.env') });
  const base = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ubanex';
  const url = new URL(base);
  url.pathname = `/${DB_TEST}`;
  return url.toString();
}

/**
 * Levanta la app real (AppModule) apuntando a la base ubanex_test con el schema
 * limpio. El mail queda stubeado para no hacer envíos reales en tests.
 */
export async function crearApp(): Promise<INestApplication> {
  const databaseUrl = await urlBaseDePruebas();

  process.env.DATABASE_URL = databaseUrl;
  process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? 'test-key';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
  process.env.RENDER = 'false';

  const mailStub = {
    enviarPasswordTemporal: jest.fn(),
    enviarEstadoValidacionDocente: jest.fn(),
    enviarPropuestaEvaluador: jest.fn(),
    enviarEstadoEvaluador: jest.fn(),
    enviarRespuestaDocente: jest.fn(),
    enviarResultadoPropuestaEvaluador: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mailStub)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.getHttpAdapter().getInstance().disable('etag');

  await app.init();

  // Schema vacío y sincronizado con las entidades (fuerza drop para arrancar limpio).
  const dataSource = app.get(DataSource);
  await dataSource.synchronize(true);

  return app;
}

export async function cerrarApp(app: INestApplication): Promise<void> {
  await app.close();
}

export function headersConToken(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}