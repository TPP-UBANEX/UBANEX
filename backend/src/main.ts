import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import { DataSource } from 'typeorm';
import { UsuariosService } from './usuarios/usuarios.service';
import { UnidadesAcademicasService } from './unidades-academicas/unidades-academicas.service';
import { RolUsuario } from './common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from './common/enums/estado-validacion-docente.enum';
import { Formulario } from './formularios/formulario.entity';

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
  opts?: { validado?: boolean; habilitado?: boolean },
) {
  const existe = await usuariosService.obtenerPorEmail(data.email);
  if (existe) return existe;
  const user = await usuariosService.crear(data);
  if (opts?.habilitado === false) {
    user.habilitado = false;
    await usuariosService['repo'].update(user.id, { habilitado: false });
  }
  console.log(`  ${data.email} (${data.roles.join(', ')})`);
  return user;
}

function seedDirectores(
  usuariosService: UsuariosService,
  data: { nombreCompleto: string; email: string; password: string; roles: RolUsuario[]; unidadAcademicaId?: string },
  estadoValidacionDocente: EstadoValidacionDocente,
  opts?: { habilitado?: boolean },
) {
  return seedUsuario(usuariosService, data, opts).then(user => {
    return usuariosService['repo'].update(user.id, { estadoValidacionDocente });
  });
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

  const uasNombres = [
    'Facultad de Derecho',
    'Facultad de Ciencias Económicas',
    'Facultad de Ciencias Sociales',
    'Facultad de Filosofía y Letras',
    'Facultad de Ingeniería',
    'Facultad de Medicina',
    'Facultad de Ciencias Exactas y Naturales',
    'Facultad de Arquitectura, Diseño y Urbanismo',
    'Facultad de Agronomía',
    'Facultad de Farmacia y Bioquímica',
    'Facultad de Odontología',
    'Facultad de Psicología',
    'Facultad de Ciencias Veterinarias',
    'Ciclo Básico Común (CBC)',
  ];

  const [derecho, , , , ingenieria, medicina, , , , , , , , cbc] = await Promise.all(
    uasNombres.map((nombre) => seedUnidadAcademica(uas, nombre)),
  );

  // --- Rectorado ---
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
  }, { habilitado: false });

  // --- Facultad de Derecho ---
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
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director Validado',
    email: 'director-validado@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
  }, EstadoValidacionDocente.Validado);
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director Pendiente',
    email: 'director-pendiente@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
  }, EstadoValidacionDocente.PendienteDeValidacion);
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director Rechazado',
    email: 'director-rechazado@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
  }, EstadoValidacionDocente.Rechazado);
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Evaluador de Derecho',
    email: 'evaluador@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
  });

  // --- Facultad de Ingeniería ---
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Autoridad de Ingeniería',
    email: 'autoridad-ingenieria@uba.ar',
    password: '123456',
    roles: [RolUsuario.AutoridadDeSecretaria],
    unidadAcademicaId: ingenieria.id,
  });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Asistente de Ingeniería',
    email: 'asistente-ingenieria@uba.ar',
    password: '123456',
    roles: [RolUsuario.AsistenteDeSecretaria],
    unidadAcademicaId: ingenieria.id,
  });
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Directora López',
    email: 'directora-lopez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
  }, EstadoValidacionDocente.Validado);
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director García',
    email: 'director-garcia@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
  }, EstadoValidacionDocente.Validado);
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director Deshabilitado',
    email: 'director-deshabilitado@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
  }, EstadoValidacionDocente.Validado, { habilitado: false });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Evaluador de Ingeniería',
    email: 'evaluador-ingenieria@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
  });

  // --- Facultad de Medicina ---
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Autoridad de Medicina',
    email: 'autoridad-medicina@uba.ar',
    password: '123456',
    roles: [RolUsuario.AutoridadDeSecretaria],
    unidadAcademicaId: medicina.id,
  });
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Asistente de Medicina',
    email: 'asistente-medicina@uba.ar',
    password: '123456',
    roles: [RolUsuario.AsistenteDeSecretaria],
    unidadAcademicaId: medicina.id,
  });
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director Fernández',
    email: 'director-fernandez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
  }, EstadoValidacionDocente.Validado);
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Directora Martínez',
    email: 'directora-martinez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
  }, EstadoValidacionDocente.PendienteDeValidacion);
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Evaluador de Medicina',
    email: 'evaluador-medicina@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
  }, { habilitado: false });

  // --- CBC ---
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Autoridad de CBC',
    email: 'autoridad-cbc@uba.ar',
    password: '123456',
    roles: [RolUsuario.AutoridadDeSecretaria],
    unidadAcademicaId: cbc.id,
  });
  await seedDirectores(usuariosService, {
    nombreCompleto: 'Director del CBC',
    email: 'director-cbc@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: cbc.id,
  }, EstadoValidacionDocente.Validado);

  const dataSource = app.get(DataSource);
  const formularioRepo = dataSource.getRepository(Formulario);
  const seedFormularios = [
    { nombre: 'Formulario estándar UBANEX', esDefault: true },
    { nombre: 'Formulario proyectos de investigación', esDefault: false },
    { nombre: 'Formulario proyectos de extensión', esDefault: false },
    { nombre: 'Formulario desarrollo tecnológico', esDefault: false },
    { nombre: 'Formulario voluntariado universitario', esDefault: false },
    { nombre: 'Formulario prácticas socioeducativas', esDefault: false },
    { nombre: 'Formulario cooperación internacional', esDefault: false },
    { nombre: 'Formulario emprendimientos universitarios', esDefault: false },
    { nombre: 'Formulario arte y cultura', esDefault: false },
  ];
  for (const f of seedFormularios) {
    const existe = await formularioRepo.findOne({ where: { nombre: f.nombre } });
    if (!existe) {
      await formularioRepo.save(formularioRepo.create(f));
      console.log(`  ${f.nombre}`);
    }
  }

  console.log('Seed completado.');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
