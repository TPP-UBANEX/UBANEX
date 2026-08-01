import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as morgan from 'morgan';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { UsuariosService } from './usuarios/usuarios.service';
import { UnidadesAcademicasService } from './unidades-academicas/unidades-academicas.service';
import { CarrerasService } from './carreras/carreras.service';
import { RolUsuario } from './common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from './common/enums/estado-validacion-docente.enum';
import { EstadoEdicion } from './common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from './common/enums/estado-convocatoria.enum';
import { RolEjecucion } from './common/enums/rol-ejecucion.enum';
import { TipoCampo } from './common/enums/tipo-campo.enum';
import { Genero } from './common/enums/genero.enum';
import { CargoDocente } from './common/enums/cargo-docente.enum';
import { TipoDesignacionDocente } from './common/enums/tipo-designacion-docente.enum';
import { Usuario } from './usuarios/usuario.entity';
import { Formulario } from './formularios/formulario.entity';
import { Convocatoria } from './convocatorias/convocatoria.entity';
import { Proyecto } from './proyectos/proyecto.entity';
import { Edicion } from './proyectos/edicion.entity';
import { ParticipacionConvocatoria } from './participaciones-convocatoria/participacion-convocatoria.entity';
import { Emparejamiento } from './convocatorias/emparejamiento.entity';
import { UnidadAcademica } from './unidades-academicas/unidad-academica.entity';
import { EMPAREJAMIENTO_DEFAULT } from './convocatorias/emparejamiento-default';

// ───────────────── Helpers ─────────────────

async function seedUnidadAcademica(
  uas: UnidadesAcademicasService,
  nombre: string,
) {
  const existente = await uas.obtenerPorNombre(nombre);
  if (existente) return existente;
  return uas.crear({ nombre });
}

async function seedCarrera(
  carrerasService: CarrerasService,
  nombre: string,
  unidadAcademicaId: string,
) {
  const existente = await carrerasService.listarPorUnidadAcademica(unidadAcademicaId);
  if (existente.some((c) => c.nombre === nombre)) return;
  await carrerasService.crear({ nombre, unidadAcademicaId });
}

type DatosSeedUsuario = {
  nombreCompleto: string;
  email: string;
  password: string;
  roles: RolUsuario[];
  unidadAcademicaId?: string;
  telefono?: string;
  genero?: Genero;
  personaConDiscapacidad?: boolean;
  cargoDocente?: CargoDocente;
  tipoDesignacionDocente?: TipoDesignacionDocente;
  areaDocente?: string;
  direccionLocalidad?: string;
};

async function seedUsuario(
  usuariosService: UsuariosService,
  data: DatosSeedUsuario,
  opts?: { habilitado?: boolean },
) {
  const existe = await usuariosService.obtenerPorEmail(data.email);
  if (existe) {
    // Reconcilia roles de bases creadas antes de un cambio de enum (ej: DirectorDeProyecto
    // y Evaluador pasaron a ser RolEjecucion y dejaron de existir en RolUsuario).
    const rolesValidos = Object.values(RolUsuario) as string[];
    const desactualizado =
      existe.roles.some((r) => !rolesValidos.includes(r)) ||
      existe.roles.join(',') !== data.roles.join(',');
    if (desactualizado) {
      await usuariosService['repo'].update(existe.id, { roles: data.roles });
      console.log(`  ${data.email} — roles actualizados: ${existe.roles.join(', ')} → ${data.roles.join(', ')}`);
      existe.roles = data.roles;
    }
    return existe;
  }
  const user = await usuariosService.crear(data);
  if (opts?.habilitado === false) {
    await usuariosService['repo'].update(user.id, { habilitado: false });
  }
  console.log(`  ${data.email} (${data.roles.join(', ')})`);
  return user;
}

const CAMPOS_PERFIL_DOCENTE = [
  'telefono',
  'genero',
  'personaConDiscapacidad',
  'cargoDocente',
  'tipoDesignacionDocente',
  'areaDocente',
  'direccionLocalidad',
] as const;

async function seedDocente(
  usuariosService: UsuariosService,
  data: DatosSeedUsuario,
  estadoValidacion: EstadoValidacionDocente,
  opts?: { habilitado?: boolean },
) {
  const user = await seedUsuario(usuariosService, data, opts);
  await usuariosService['repo'].update(user.id, { estadoValidacionDocente: estadoValidacion });

  // Rellena solo campos de perfil faltantes (no pisa datos cargados por la UI).
  const cambiosPerfil: Record<string, unknown> = {};
  for (const campo of CAMPOS_PERFIL_DOCENTE) {
    const valor = data[campo];
    if (valor !== undefined && user[campo] == null) {
      cambiosPerfil[campo] = valor;
    }
  }
  if (Object.keys(cambiosPerfil).length > 0) {
    await usuariosService['repo'].update(user.id, cambiosPerfil as Partial<Usuario>);
  }
  return user;
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
  const carrerasService = app.get(CarrerasService);
  const dataSource = app.get(DataSource);

  console.log('\n=== SEED: Unidades Académicas ===');
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

  const [derecho, econ, sociales, filo, ingenieria, medicina, exactas, arquitetc, agronomia, farmacia, odonto, psicologia, veterinaria, cbc] = await Promise.all(
    uasNombres.map((nombre) => seedUnidadAcademica(uas, nombre)),
  );

  const uaMap = new Map<string, UnidadAcademica>();
  for (const ua of [derecho, econ, sociales, filo, ingenieria, medicina, exactas, arquitetc, agronomia, farmacia, odonto, psicologia, veterinaria, cbc]) {
    uaMap.set(ua.nombre, ua);
  }

  // ─────────────── CARRERAS ───────────────

  console.log('\n=== SEED: Carreras ===');
  const carrerasPorUa: Record<string, string[]> = {
    'Facultad de Derecho': ['Abogacía', 'Traductorado Público', 'Calígrafo Público'],
    'Facultad de Ciencias Económicas': [
      'Contador Público',
      'Licenciatura en Administración',
      'Licenciatura en Economía',
      'Actuario',
      'Licenciatura en Sistemas de Información de las Organizaciones',
    ],
    'Facultad de Ciencias Sociales': [
      'Licenciatura en Sociología',
      'Licenciatura en Trabajo Social',
      'Licenciatura en Relaciones del Trabajo',
      'Licenciatura en Ciencias de la Comunicación',
      'Licenciatura en Ciencia Política',
    ],
    'Facultad de Filosofía y Letras': [
      'Licenciatura en Artes',
      'Licenciatura en Ciencias Antropológicas',
      'Licenciatura en Ciencias de la Educación',
      'Licenciatura en Filosofía',
      'Licenciatura en Geografía',
      'Licenciatura en Historia',
      'Licenciatura en Letras',
      'Licenciatura en Bibliotecología y Ciencia de la Información',
      'Edición',
    ],
    'Facultad de Ingeniería': [
      'Ingeniería Civil',
      'Ingeniería en Alimentos',
      'Ingeniería en Energía Eléctrica',
      'Ingeniería Electrónica',
      'Ingeniería en Agrimensura',
      'Ingeniería en Informática',
      'Ingeniería en Petróleo',
      'Ingeniería Industrial',
      'Ingeniería Mecánica',
      'Ingeniería Naval',
      'Ingeniería Química',
      'Licenciatura en Análisis de Sistemas',
      'Bioingeniería',
    ],
    'Facultad de Medicina': [
      'Medicina',
      'Licenciatura en Enfermería',
      'Licenciatura en Fonoaudiología',
      'Licenciatura en Kinesiología y Fisiatría',
      'Licenciatura en Nutrición',
      'Licenciatura en Obstetricia',
    ],
    'Facultad de Ciencias Exactas y Naturales': [
      'Licenciatura en Ciencias Biológicas',
      'Licenciatura en Ciencias de Datos',
      'Licenciatura en Ciencias de la Atmósfera',
      'Licenciatura en Ciencias de la Computación',
      'Licenciatura en Ciencias Físicas',
      'Licenciatura en Ciencias Geológicas',
      'Licenciatura en Ciencias Matemáticas',
      'Licenciatura en Ciencias Químicas',
      'Licenciatura en Oceanografía',
      'Licenciatura en Paleontología',
      'Licenciatura en Ciencia y Tecnología de los Alimentos',
      'Licenciatura en Biotecnología',
    ],
    'Facultad de Arquitectura, Diseño y Urbanismo': [
      'Arquitectura',
      'Diseño Gráfico',
      'Diseño Industrial',
      'Diseño de Imagen y Sonido',
      'Diseño de Indumentaria',
      'Diseño Textil',
    ],
    'Facultad de Agronomía': [
      'Agronomía',
      'Licenciatura en Ciencias Ambientales',
      'Licenciatura en Economía y Administración Agrarias',
      'Licenciatura en Gestión de Agroalimentos',
    ],
    'Facultad de Farmacia y Bioquímica': [
      'Bioquímica',
      'Farmacia',
      'Licenciatura en Ciencia y Tecnología de los Alimentos',
      'Licenciatura en Biotecnología',
    ],
    'Facultad de Odontología': ['Odontología'],
    'Facultad de Psicología': ['Licenciatura en Psicología', 'Musicoterapia', 'Terapia Ocupacional'],
    'Facultad de Ciencias Veterinarias': ['Veterinaria', 'Licenciatura en Gestión de Agroalimentos'],
  };

  for (const [nombreUa, carreras] of Object.entries(carrerasPorUa)) {
    const ua = uaMap.get(nombreUa);
    if (!ua) {
      console.warn(`  Carreras no seedeadas: unidad académica no encontrada: ${nombreUa}`);
      continue;
    }
    for (const nombreCarrera of carreras) {
      await seedCarrera(carrerasService, nombreCarrera, ua.id);
    }
  }
  console.log(`  ${Object.values(carrerasPorUa).reduce((acc, arr) => acc + arr.length, 0)} carreras`);

  // ─────────────── USUARIOS ───────────────

  console.log('\n=== SEED: Usuarios ===');

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

  // --- Derecho ---
  const authDerecho = await seedUsuario(usuariosService, {
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

  const garcia = await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. García',
    email: 'garcia@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    telefono: '11 1111 1111',
    genero: Genero.Masculino,
    cargoDocente: CargoDocente.ProfesorTitular,
    areaDocente: 'Derecho Constitucional',
  }, EstadoValidacionDocente.Validado);

  const perez = await seedDocente(usuariosService, {
    nombreCompleto: 'Dra. Pérez',
    email: 'perez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    telefono: '11 2222 2222',
    genero: Genero.Femenino,
    personaConDiscapacidad: false,
    tipoDesignacionDocente: TipoDesignacionDocente.Regular,
    direccionLocalidad: 'Caballito, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. López',
    email: 'lopez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
  }, EstadoValidacionDocente.PendienteDeValidacion);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Martínez',
    email: 'martinez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    genero: Genero.Masculino,
  }, EstadoValidacionDocente.Rechazado);

  await seedUsuario(usuariosService, {
    nombreCompleto: 'Rodríguez Estudiante',
    email: 'rodriguez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Estudiante],
    unidadAcademicaId: derecho.id,
  });

  await seedUsuario(usuariosService, {
    nombreCompleto: 'González Estudiante',
    email: 'gonzalez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Estudiante],
    unidadAcademicaId: derecho.id,
  });

  const evaluadorDerecho = await seedDocente(usuariosService, {
    nombreCompleto: 'Evaluador de Derecho',
    email: 'evaluador@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    telefono: '11 3333 3333',
    genero: Genero.PrefieroNoResponder,
    direccionLocalidad: 'Av. de Mayo 900, CABA',
  }, EstadoValidacionDocente.Validado);

  // --- Ingeniería ---
  const authIngenieria = await seedUsuario(usuariosService, {
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

  const fernandez = await seedDocente(usuariosService, {
    nombreCompleto: 'Ing. Fernández',
    email: 'fernandez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    genero: Genero.Masculino,
    cargoDocente: CargoDocente.ProfesorAsociado,
    tipoDesignacionDocente: TipoDesignacionDocente.Concursado,
    areaDocente: 'Ingeniería Civil',
  }, EstadoValidacionDocente.Validado);

  const diaz = await seedDocente(usuariosService, {
    nombreCompleto: 'Ing. Díaz',
    email: 'diaz@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    telefono: '11 4444 4444',
    genero: Genero.Femenino,
    personaConDiscapacidad: false,
    direccionLocalidad: 'Av. Paseo Colón 850, CABA',
  }, EstadoValidacionDocente.Validado);

  const moreno = await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. Moreno',
    email: 'moreno@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    genero: Genero.Masculino,
    cargoDocente: CargoDocente.ProfesorAdjunto,
    tipoDesignacionDocente: TipoDesignacionDocente.Regular,
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Álvarez',
    email: 'alvarez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    telefono: '11 5555 5555',
  }, EstadoValidacionDocente.PendienteDeValidacion);

  await seedUsuario(usuariosService, {
    nombreCompleto: 'Ramirez Estudiante',
    email: 'ramirez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Estudiante],
    unidadAcademicaId: ingenieria.id,
  });

  const evaluadorIngenieria = await seedDocente(usuariosService, {
    nombreCompleto: 'Evaluador de Ingeniería',
    email: 'evaluador-ingenieria@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    genero: Genero.Otro,
    personaConDiscapacidad: false,
    areaDocente: 'Ingeniería Industrial',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Director Deshabilitado',
    email: 'director-deshabilitado@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
  }, EstadoValidacionDocente.Validado, { habilitado: false });

  // --- Medicina ---
  const authMedicina = await seedUsuario(usuariosService, {
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

  const torres = await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. Torres',
    email: 'torres@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    telefono: '11 6666 6666',
    genero: Genero.Masculino,
    cargoDocente: CargoDocente.ProfesorTitular,
    tipoDesignacionDocente: TipoDesignacionDocente.Regular,
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Dra. Sánchez',
    email: 'sanchez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    genero: Genero.Femenino,
    areaDocente: 'Cardiología',
  }, EstadoValidacionDocente.PendienteDeValidacion);

  const romero = await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. Romero',
    email: 'romero@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    telefono: '11 7777 7777',
    genero: Genero.Masculino,
    personaConDiscapacidad: false,
    direccionLocalidad: 'Belgrano, CABA',
  }, EstadoValidacionDocente.Validado);

  // --- CBC ---
  await seedUsuario(usuariosService, {
    nombreCompleto: 'Autoridad de CBC',
    email: 'autoridad-cbc@uba.ar',
    password: '123456',
    roles: [RolUsuario.AutoridadDeSecretaria],
    unidadAcademicaId: cbc.id,
  });

  await seedDocente(usuariosService, {
    nombreCompleto: 'Prof. Castro',
    email: 'castro@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: cbc.id,
    telefono: '11 8888 8888',
    cargoDocente: CargoDocente.ProfesorAdjunto,
    tipoDesignacionDocente: TipoDesignacionDocente.Interino,
    areaDocente: 'Matemática CBC',
  }, EstadoValidacionDocente.Validado);

  // ─────────────── DOCENTES ADICIONALES (PERFILES VARIADOS) ───────────────

  console.log('\n=== SEED: Docentes adicionales (perfiles variados) ===');

  // Facultad de Derecho
  await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. Sosa',
    email: 'sosa@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    genero: Genero.Masculino,
    cargoDocente: CargoDocente.ProfesorAdjunto,
    tipoDesignacionDocente: TipoDesignacionDocente.Regular,
    areaDocente: 'Derecho Penal',
    direccionLocalidad: 'Av. Figueroa Alcorta 2263, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Dra. Ferreyra',
    email: 'ferreyra@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    telefono: '11 4567 8901',
    genero: Genero.Femenino,
    personaConDiscapacidad: false,
    direccionLocalidad: 'Palermo, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Aguirre',
    email: 'aguirre@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    telefono: '11 5678 9012',
    genero: Genero.Masculino,
  }, EstadoValidacionDocente.PendienteDeValidacion);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Prof. Roldán',
    email: 'roldan@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: derecho.id,
    direccionLocalidad: 'La Plata, Buenos Aires',
  }, EstadoValidacionDocente.Rechazado);

  // Facultad de Ingeniería
  await seedDocente(usuariosService, {
    nombreCompleto: 'Ing. Benítez',
    email: 'benitez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    telefono: '11 2345 6789',
    cargoDocente: CargoDocente.ProfesorAsociado,
    tipoDesignacionDocente: TipoDesignacionDocente.Concursado,
    areaDocente: 'Ingeniería Electrónica',
    direccionLocalidad: 'Av. Paseo Colón 850, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Ing. Villalba',
    email: 'villalba@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    genero: Genero.Masculino,
    personaConDiscapacidad: false,
    cargoDocente: CargoDocente.AyudanteDePrimera,
    tipoDesignacionDocente: TipoDesignacionDocente.Interino,
    areaDocente: 'Ingeniería en Informática',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Cabrera',
    email: 'cabrera@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    telefono: '11 3456 7890',
    genero: Genero.Otro,
    personaConDiscapacidad: true,
  }, EstadoValidacionDocente.PendienteDeValidacion);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Dra. Giménez',
    email: 'gimenez@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: ingenieria.id,
    telefono: '11 4567 8901',
  }, EstadoValidacionDocente.Validado);

  // Facultad de Medicina
  await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. Acosta',
    email: 'acosta@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    genero: Genero.Masculino,
    personaConDiscapacidad: false,
    cargoDocente: CargoDocente.ProfesorTitular,
    tipoDesignacionDocente: TipoDesignacionDocente.Regular,
    areaDocente: 'Clínica Médica',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Dra. Navarro',
    email: 'navarro@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    telefono: '11 5678 9012',
    genero: Genero.Femenino,
    personaConDiscapacidad: false,
    direccionLocalidad: 'Av. Córdoba 2100, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Paredes',
    email: 'paredes@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    genero: Genero.PrefieroNoResponder,
    areaDocente: 'Enfermería Comunitaria',
  }, EstadoValidacionDocente.PendienteDeValidacion);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Prof. Corvalán',
    email: 'corvalan@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: medicina.id,
    telefono: '11 6789 0123',
  }, EstadoValidacionDocente.Rechazado);

  // Facultad de Ciencias Exactas y Naturales
  await seedDocente(usuariosService, {
    nombreCompleto: 'Dr. Vega',
    email: 'vega@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: exactas.id,
    telefono: '11 7890 1234',
    genero: Genero.Masculino,
    personaConDiscapacidad: false,
    cargoDocente: CargoDocente.ProfesorAdjunto,
    tipoDesignacionDocente: TipoDesignacionDocente.Concursado,
    direccionLocalidad: 'Ciudad Universitaria, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Dra. Ledesma',
    email: 'ledesma@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: exactas.id,
    genero: Genero.Femenino,
    personaConDiscapacidad: false,
    cargoDocente: CargoDocente.JefeDeTrabajosPracticos,
    tipoDesignacionDocente: TipoDesignacionDocente.Suplente,
    areaDocente: 'Matemática',
    direccionLocalidad: 'Ciudad Universitaria, CABA',
  }, EstadoValidacionDocente.Validado);

  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Funes',
    email: 'funes@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: exactas.id,
    telefono: '11 8901 2345',
  }, EstadoValidacionDocente.PendienteDeValidacion);

  // Facultad de Ciencias Sociales
  await seedDocente(usuariosService, {
    nombreCompleto: 'Lic. Montero',
    email: 'montero@uba.ar',
    password: '123456',
    roles: [RolUsuario.Docente],
    unidadAcademicaId: sociales.id,
    genero: Genero.Femenino,
    areaDocente: 'Comunicación',
  }, EstadoValidacionDocente.Rechazado);

  // ─────────────── BACKFILL NOMBRE/APELLIDO ───────────────

  console.log('\n=== SEED: Backfill nombre/apellido ===');
  const todosLosUsuarios = await dataSource.getRepository(Usuario).find();
  let usuariosBackfilled = 0;
  for (const usuario of todosLosUsuarios) {
    if (usuario.nombre || usuario.apellido) continue;
    const partes = (usuario.nombreCompleto || '').trim().split(/\s+/);
    const nombre = partes[0] || '';
    const apellido = partes.slice(1).join(' ') || '';
    await usuariosService['repo'].update(usuario.id, { nombre, apellido });
    usuariosBackfilled++;
  }
  if (usuariosBackfilled > 0) {
    console.log(`  ${usuariosBackfilled} usuarios con nombre/apellido derivados de nombreCompleto`);
  }

  // ─────────────── FORMULARIOS ───────────────

  console.log('\n=== SEED: Formularios ===');
  const formularioRepo = dataSource.getRepository(Formulario);
  const camposFormularioEstandar = [
    {
      id: crypto.randomUUID(),
      tipo: TipoCampo.Texto,
      nombre: 'Resumen del proyecto',
      textoAyuda: 'Describí brevemente el objetivo del proyecto',
      esObligatorio: true,
      orden: 0,
    },
    {
      id: crypto.randomUUID(),
      tipo: TipoCampo.Booleano,
      nombre: '¿El proyecto tiene antecedentes en convocatorias anteriores?',
      esObligatorio: true,
      orden: 1,
    },
    {
      id: crypto.randomUUID(),
      tipo: TipoCampo.Select,
      nombre: 'Área temática principal',
      esObligatorio: true,
      orden: 2,
      opciones: ['Salud', 'Educación', 'Ambiente', 'Tecnología', 'Cultura'],
    },
    {
      id: crypto.randomUUID(),
      tipo: TipoCampo.Checkbox,
      nombre: 'Poblaciones destinatarias',
      esObligatorio: false,
      orden: 3,
      opciones: ['Niños y adolescentes', 'Adultos mayores', 'Personas con discapacidad', 'Comunidad general'],
    },
  ];

  const seedFormularios = [
    { nombre: 'Formulario estándar UBANEX', esDefault: true, campos: camposFormularioEstandar },
    { nombre: 'Formulario proyectos de investigación', esDefault: false },
    { nombre: 'Formulario proyectos de extensión', esDefault: false },
    { nombre: 'Formulario desarrollo tecnológico', esDefault: false },
    { nombre: 'Formulario voluntariado universitario', esDefault: false },
    { nombre: 'Formulario prácticas socioeducativas', esDefault: false },
    { nombre: 'Formulario cooperación internacional', esDefault: false },
    { nombre: 'Formulario emprendimientos universitarios', esDefault: false },
    { nombre: 'Formulario arte y cultura', esDefault: false },
  ];
  const formulariosCreados: Formulario[] = [];
  for (const f of seedFormularios) {
    const existe = await formularioRepo.findOne({ where: { nombre: f.nombre } });
    if (!existe) {
      const creado = await formularioRepo.save(formularioRepo.create(f));
      formulariosCreados.push(creado);
      console.log(`  ${f.nombre}`);
    } else {
      formulariosCreados.push(existe);
    }
  }

  const formularioDefault = formulariosCreados.find(f => f.esDefault)!;

  // ─────────────── CONVOCATORIAS ───────────────

  console.log('\n=== SEED: Convocatorias ===');
  const convocatoriaRepo = dataSource.getRepository(Convocatoria);

  function crearFecha(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  async function seedConvocatoria(data: Partial<Convocatoria>): Promise<Convocatoria> {
    const existe = await convocatoriaRepo.findOne({ where: { nombre: data.nombre } });
    if (existe) return existe;
    const conv = convocatoriaRepo.create(data as Convocatoria);
    const saved = await convocatoriaRepo.save(conv);
    console.log(`  ${saved.nombre} (${saved.estado})`);
    return saved;
  }

  // Devuelve el formulario de la convocatoria si ya existe; si no, clona el default una sola vez
  // por año. Idempotente: sin esto cada reinicio del backend insertaba 3 formularios huérfanos.
  async function formularioParaConvocatoria(nombreConvocatoria: string, anio: number): Promise<string> {
    const conv = await convocatoriaRepo.findOne({ where: { nombre: nombreConvocatoria } });
    if (conv?.formularioId) return conv.formularioId;

    const nombreCopia = `${formularioDefault.nombre} (copia ${anio})`;
    const existente = await formularioRepo.findOne({ where: { nombre: nombreCopia } });
    if (existente) return existente.id;

    const copia = await formularioRepo.save(
      formularioRepo.create({ nombre: nombreCopia, esDefault: false }),
    );
    return copia.id;
  }

  const f2025 = await formularioParaConvocatoria('UBANEX 2025', 2025);
  const f2026 = await formularioParaConvocatoria('UBANEX 2026', 2026);
  const f2027 = await formularioParaConvocatoria('UBANEX 2027', 2027);

  const conv2025 = await seedConvocatoria({
    nombre: 'UBANEX 2025',
    descripcion: 'Convocatoria UBANEX del año 2025',
    anio: 2025,
    estado: EstadoConvocatoria.Ejecucion,
    fechaInicioPresentacion: crearFecha(2025, 3, 1),
    fechaFinPresentacion: crearFecha(2025, 5, 1),
    fechaInicioEvaluacion: crearFecha(2025, 5, 15),
    fechaFinEvaluacion: crearFecha(2025, 7, 15),
    fechaInicioEjecucion: crearFecha(2025, 8, 1),
    fechaFinEjecucion: crearFecha(2026, 2, 28),
    formularioId: f2025,
  });

  const conv2026 = await seedConvocatoria({
    nombre: 'UBANEX 2026',
    descripcion: 'Convocatoria UBANEX del año 2026',
    anio: 2026,
    estado: EstadoConvocatoria.Presentacion,
    fechaInicioPresentacion: crearFecha(2026, 3, 1),
    fechaFinPresentacion: crearFecha(2026, 7, 31),
    fechaInicioEvaluacion: crearFecha(2026, 8, 15),
    fechaFinEvaluacion: crearFecha(2026, 10, 15),
    fechaInicioEjecucion: crearFecha(2026, 11, 1),
    fechaFinEjecucion: crearFecha(2027, 2, 28),
    formularioId: f2026,
  });

  const conv2027 = await seedConvocatoria({
    nombre: 'UBANEX 2027',
    descripcion: 'Convocatoria UBANEX del año 2027',
    anio: 2027,
    estado: EstadoConvocatoria.Configuracion,
    fechaInicioPresentacion: crearFecha(2027, 3, 1),
    fechaFinPresentacion: crearFecha(2027, 5, 31),
    fechaInicioEvaluacion: crearFecha(2027, 6, 15),
    fechaFinEvaluacion: crearFecha(2027, 8, 15),
    fechaInicioEjecucion: crearFecha(2027, 9, 1),
    fechaFinEjecucion: crearFecha(2028, 2, 28),
    formularioId: f2027,
  });

  // ─────────────── PROYECTOS Y EDICIONES ───────────────

  console.log('\n=== SEED: Proyectos y Ediciones ===');
  const proyectoRepo = dataSource.getRepository(Proyecto);
  const edicionRepo = dataSource.getRepository(Edicion);

  const presupuestoEjecucion = {
    montoTotal: 500000,
    rubros: [
      {
        tipo: 'ViaticosYSeguros',
        subtotal: 200000,
        partidas: [
          { tipoPersona: 'Docente', descripcion: 'Viáticos para docentes', periodoInicio: '2025-08', periodoFin: '2025-12', monto: 100000 },
          { tipoPersona: 'Estudiante', descripcion: 'Viáticos para estudiantes', periodoInicio: '2025-08', periodoFin: '2025-12', monto: 100000 },
        ],
      },
      {
        tipo: 'BienesDeConsumo',
        subtotal: 150000,
        partidas: [
          { descripcion: 'Materiales e insumos', cantidad: 50, precioUnitario: 3000, monto: 150000 },
        ],
      },
      {
        tipo: 'BienesDeUso',
        subtotal: 150000,
        partidas: [
          { descripcion: 'Equipamiento', cantidad: 3, precioUnitario: 50000, monto: 150000 },
        ],
      },
    ],
  };

  const presupuestoBorrador = {
    montoTotal: 600000,
    rubros: [
      {
        tipo: 'ViaticosYSeguros',
        subtotal: 250000,
        partidas: [
          { tipoPersona: 'Docente', descripcion: 'Viáticos', periodoInicio: '2026-11', periodoFin: '2027-02', monto: 150000 },
          { tipoPersona: 'Estudiante', descripcion: 'Viáticos', periodoInicio: '2026-11', periodoFin: '2027-02', monto: 100000 },
        ],
      },
      {
        tipo: 'BienesDeConsumo',
        subtotal: 200000,
        partidas: [
          { descripcion: 'Insumos', cantidad: 100, precioUnitario: 2000, monto: 200000 },
        ],
      },
      {
        tipo: 'BienesDeUso',
        subtotal: 150000,
        partidas: [
          { descripcion: 'Equipos', cantidad: 2, precioUnitario: 75000, monto: 150000 },
        ],
      },
    ],
  };

  async function seedProyectoConEdicion(
    nombreProyecto: string,
    creadoPor: Usuario,
    unidadAcademica: UnidadAcademica,
    convocatoria: Convocatoria,
    estado: EstadoEdicion,
    presupuesto?: object,
  ): Promise<{ proyecto: Proyecto; edicion: Edicion }> {
    const existeProyecto = await proyectoRepo.findOne({ where: { nombre: nombreProyecto } });
    if (existeProyecto) {
      const ed = await edicionRepo.findOne({ where: { proyectoId: existeProyecto.id, convocatoriaId: convocatoria.id } });
      if (ed) return { proyecto: existeProyecto, edicion: ed };
    }

    const proyecto = await proyectoRepo.save(
      proyectoRepo.create({
        nombre: nombreProyecto,
        creadoPorId: creadoPor.id,
      }),
    );

    const edicion = await edicionRepo.save(
      edicionRepo.create({
        proyectoId: proyecto.id,
        convocatoriaId: convocatoria.id,
        estado,
        creadoPorId: creadoPor.id,
        unidadAcademicaId: unidadAcademica.id,
        anioEdicion: convocatoria.anio,
        presupuesto: presupuesto || null,
      }),
    );

    console.log(`  ${nombreProyecto} (${estado})`);
    return { proyecto, edicion };
  }

  // UBANEX 2026 — en Presentacion
  const p1 = await seedProyectoConEdicion(
    'Red de Voluntariado Ambiental',
    garcia, derecho, conv2026, EstadoEdicion.Borrador, presupuestoBorrador,
  );
  const p2 = await seedProyectoConEdicion(
    'Inclusión Digital en Barrios Populares',
    perez, derecho, conv2026, EstadoEdicion.Presentado, presupuestoBorrador,
  );
  const p3 = await seedProyectoConEdicion(
    'Huerta Comunitaria y Seguridad Alimentaria',
    fernandez, ingenieria, conv2026, EstadoEdicion.Borrador, presupuestoBorrador,
  );
  const p4 = await seedProyectoConEdicion(
    'Alfabetización Científica en Escuelas',
    diaz, ingenieria, conv2026, EstadoEdicion.Presentado, presupuestoBorrador,
  );

  // UBANEX 2025 — en Ejecucion
  const p5 = await seedProyectoConEdicion(
    'Taller de Oficios para la Inclusión Laboral',
    garcia, derecho, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion,
  );
  const p6 = await seedProyectoConEdicion(
    'Salud Comunitaria en Barrios Vulnerables',
    torres, medicina, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion,
  );

  // ─────────────── PARTICIPACIONES ───────────────

  console.log('\n=== SEED: Participaciones por Convocatoria ===');
  const participacionRepo = dataSource.getRepository(ParticipacionConvocatoria);

  async function seedParticipacion(data: {
    usuarioId: string;
    convocatoriaId: string;
    rol: RolEjecucion;
    edicionId?: string;
    esDirectorPrincipal?: boolean;
    asignadoPorId: string;
  }) {
    const existe = await participacionRepo.findOne({
      where: { usuarioId: data.usuarioId, convocatoriaId: data.convocatoriaId },
    });
    if (existe) return existe;

    const p = participacionRepo.create({
      usuarioId: data.usuarioId,
      convocatoriaId: data.convocatoriaId,
      rol: data.rol,
      edicionId: data.edicionId ?? null,
      esDirectorPrincipal: data.esDirectorPrincipal ?? null,
      asignadoPorId: data.asignadoPorId,
    });
    const saved = await participacionRepo.save(p);
    console.log(`  ${data.rol} — ${data.usuarioId.slice(0, 8)}... en convocatoria ${data.convocatoriaId.slice(0, 8)}...`);
    return saved;
  }

  // UBANEX 2026
  await seedParticipacion({ usuarioId: garcia.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p1.edicion.id, esDirectorPrincipal: true, asignadoPorId: authDerecho.id });
  await seedParticipacion({ usuarioId: perez.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p2.edicion.id, esDirectorPrincipal: true, asignadoPorId: authDerecho.id });
  await seedParticipacion({ usuarioId: fernandez.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p3.edicion.id, esDirectorPrincipal: true, asignadoPorId: authIngenieria.id });
  await seedParticipacion({ usuarioId: diaz.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p4.edicion.id, esDirectorPrincipal: true, asignadoPorId: authIngenieria.id });
  await seedParticipacion({ usuarioId: moreno.id, convocatoriaId: conv2026.id, rol: RolEjecucion.Evaluador, asignadoPorId: authIngenieria.id });
  await seedParticipacion({ usuarioId: evaluadorDerecho.id, convocatoriaId: conv2026.id, rol: RolEjecucion.Evaluador, asignadoPorId: authDerecho.id });
  await seedParticipacion({ usuarioId: evaluadorIngenieria.id, convocatoriaId: conv2026.id, rol: RolEjecucion.Evaluador, asignadoPorId: authIngenieria.id });

  // UBANEX 2025
  await seedParticipacion({ usuarioId: garcia.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p5.edicion.id, esDirectorPrincipal: true, asignadoPorId: authDerecho.id });
  await seedParticipacion({ usuarioId: perez.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p5.edicion.id, esDirectorPrincipal: false, asignadoPorId: authDerecho.id });
  await seedParticipacion({ usuarioId: torres.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: p6.edicion.id, esDirectorPrincipal: true, asignadoPorId: authMedicina.id });
  await seedParticipacion({ usuarioId: romero.id, convocatoriaId: conv2025.id, rol: RolEjecucion.Evaluador, asignadoPorId: authMedicina.id });

  // ─────────────── EMPAREJAMIENTOS ───────────────

  console.log('\n=== SEED: Emparejamientos ===');
  const emparejamientoRepo = dataSource.getRepository(Emparejamiento);

  async function seedEmparejamientos(convocatoriaId: string) {
    const existentes = await emparejamientoRepo.find({ where: { convocatoriaId } });
    if (existentes.length > 0) return;

    for (const [nombreA, nombreB] of EMPAREJAMIENTO_DEFAULT) {
      const uaA = uaMap.get(nombreA);
      const uaB = uaMap.get(nombreB);
      if (!uaA || !uaB) {
        console.warn(`  Emparejamiento no encontrado: ${nombreA} / ${nombreB}`);
        continue;
      }
      await emparejamientoRepo.save(
        emparejamientoRepo.create({
          convocatoriaId,
          unidadAId: uaA.id,
          unidadBId: uaB.id,
        }),
      );
    }
    console.log(`  ${EMPAREJAMIENTO_DEFAULT.length} pares para convocatoria ${convocatoriaId.slice(0, 8)}...`);
  }

  await seedEmparejamientos(conv2026.id);
  await seedEmparejamientos(conv2027.id);

  console.log('\n=== SEED COMPLETADO ===\n');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
