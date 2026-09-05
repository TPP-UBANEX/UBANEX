import { INestApplication } from '@nestjs/common';
import { expect } from '@jest/globals';
import request from 'supertest';
import { headersConToken } from './crear-app.helper';

export function peticion(app: INestApplication) {
  return request(app.getHttpServer());
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await peticion(app).post('/auth/login').send({ email, password });
  expect(res.status).toBe(201);
  const token = res.body.accessToken as string;
  expect(token).toBeDefined();
  return token;
}

export async function autenticar(
  app: INestApplication,
  cuenta: { email: string; password: string },
): Promise<Record<string, string>> {
  return headersConToken(await login(app, cuenta.email, cuenta.password));
}