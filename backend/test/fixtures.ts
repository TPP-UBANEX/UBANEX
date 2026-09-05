import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { UnidadAcademica } from '../src/unidades-academicas/unidad-academica.entity';
import { Carrera } from '../src/carreras/carrera.entity';
import { Proyecto } from '../src/proyectos/proyecto.entity';
import { Edicion } from '../src/proyectos/edicion.entity';
import { Usuario } from '../src/usuarios/usuario.entity';
import { RolUsuario } from '../src/common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../src/common/enums/estado-validacion-docente.enum';
import { EstadoEdicion } from '../src/common/enums/estado-edicion.enum';
import { RolEjecucion } from '../src/common/enums/rol-ejecucion.enum';
import { ParticipacionConvocatoria } from '../src/participaciones-convocatoria/participacion-convocatoria.entity';
import { UAS_NOMBRES } from '../src/seed/seed.data';

export const PASSWORD_TEST = '123456';

const PERFIL_COMPLETO = {
  nombre: 'Evaluador',
  apellido: 'Test',
  telefono: '11 5555 0001',
  cargoDocente: 'ProfesorTitular' as const,
  tipoDesignacionDocente: 'Concursado' as const,
  genero: 'Masculino' as const,
  areaDocente: 'Extensión',
  personaConDiscapacidad: false,
  direccionLocalidad: 'Buenos Aires',
};

export interface DatosBase {
  uaPorNombre: Map<string, UnidadAcademica>;
  uaPorNombreId: Map<string, string>;
  carreraIngenieria: Carrera;
  carreraDerecho: Carrera;
  admin: { email: string; password: string };
  autoridadSecretariaDerecho: { email: string; password: string };
  autoridadSecretariaIngenieria: { email: string; password: string };
  docentesDerecho: Array<{ email: string; password: string }>;
  docentePendienteDerecho: { email: string; password: string };
  docenteDeOtraUa: { email: string; password: string };
  estudianteDerecho: { email: string; password: string };
  docenteEvaluadorDerecho: { email: string; password: string };
  docenteEvaluadorIngenieria: { email: string; password: string };
}

/** Devuelve el id de un usuario por su email (para setear creadoPor/asignadoPor). */
export async function obtenerUsuarioId(app: INestApplication, email: string): Promise<string> {
  const usuario = await app
    .get(DataSource)
    .getRepository(Usuario)
    .findOneByOrFail({ email });
  return usuario.id;
}

/**
 * Siembra datos base para los tests: las 14 unidades académicas, unas carreras
 * (Ingeniería y Derecho) y usuarios de cada rol con contraseña PASSWORD_TEST.
 */
export async function sembrarDatosBase(app: INestApplication): Promise<DatosBase> {
  const dataSource = app.get(DataSource);
  const uaRepo = dataSource.getRepository(UnidadAcademica);
  const carreraRepo = dataSource.getRepository(Carrera);
  const usuarioRepo = dataSource.getRepository(Usuario);

  const uas: UnidadAcademica[] = [];
  for (const nombre of UAS_NOMBRES) {
    uas.push(await uaRepo.save(uaRepo.create({ nombre })));
  }
  const uaPorNombre = new Map(uas.map((u) => [u.nombre, u]));
  const uaPorNombreId = new Map(uas.map((u) => [u.nombre, u.id]));

  async function carrera(nombre: string, uaNombre: string): Promise<Carrera> {
    return carreraRepo.save(
      carreraRepo.create({ nombre, unidadAcademicaId: uaPorNombre.get(uaNombre)!.id }),
    );
  }
  const carreraIngenieria = await carrera('Ingeniería en Informática', 'Facultad de Ingeniería');
  const carreraDerecho = await carrera('Abogacía', 'Facultad de Derecho');

  const password = await bcrypt.hash(PASSWORD_TEST, 4);

  async function usuario(
    email: string,
    roles: RolUsuario[],
    opts: { ua?: string; validacion?: EstadoValidacionDocente; perfil?: Record<string, unknown> } = {},
  ): Promise<void> {
    await usuarioRepo.save(
      usuarioRepo.create({
        nombreCompleto: opts.perfil
          ? `${(opts.perfil as Record<string, string>).nombre} ${(opts.perfil as Record<string, string>).apellido}`
          : 'Test',
        nombre: opts.perfil ? (opts.perfil as Record<string, string>).nombre : 'Test',
        apellido: opts.perfil ? (opts.perfil as Record<string, string>).apellido : 'Test',
        email,
        password,
        roles,
        unidadAcademicaId: opts.ua ? uaPorNombre.get(opts.ua)!.id : undefined,
        estadoValidacionDocente: opts.validacion ?? null,
        habilitado: true,
        ...(opts.perfil ?? {}),
      }),
    );
  }

  const derecho = 'Facultad de Derecho';
  const ingenieria = 'Facultad de Ingeniería';

  await usuario('autoridad-rectorado@uba.ar', [RolUsuario.AutoridadDeRectorado]);
  await usuario('asistente-rectorado@uba.ar', [RolUsuario.AsistenteDeRectorado]);
  await usuario('autoridad-secretaria-derecho@uba.ar', [RolUsuario.AutoridadDeSecretaria], { ua: derecho });
  await usuario('autoridad-secretaria-ingenieria@uba.ar', [RolUsuario.AutoridadDeSecretaria], { ua: ingenieria });
  await usuario('asistente-secretaria-derecho@uba.ar', [RolUsuario.AsistenteDeSecretaria], { ua: derecho });
  await usuario('docente-derecho@uba.ar', [RolUsuario.Docente], {
    ua: derecho,
    validacion: EstadoValidacionDocente.Validado,
  });
  await usuario('docente2-derecho@uba.ar', [RolUsuario.Docente], {
    ua: derecho,
    validacion: EstadoValidacionDocente.Validado,
  });
  await usuario('docente-pendiente@uba.ar', [RolUsuario.Docente], {
    ua: derecho,
    validacion: EstadoValidacionDocente.PendienteDeValidacion,
  });
  await usuario('docente-ing-validado@uba.ar', [RolUsuario.Docente], {
    ua: ingenieria,
    validacion: EstadoValidacionDocente.Validado,
  });
  await usuario('estudiante-derecho@uba.ar', [RolUsuario.Estudiante], { ua: derecho });

  await usuario('evaluador-derecho@uba.ar', [RolUsuario.Docente], {
    ua: derecho,
    validacion: EstadoValidacionDocente.Validado,
    perfil: PERFIL_COMPLETO,
  });
  await usuario('evaluador-ingenieria@uba.ar', [RolUsuario.Docente], {
    ua: ingenieria,
    validacion: EstadoValidacionDocente.Validado,
    perfil: PERFIL_COMPLETO,
  });

  return {
    uaPorNombre,
    uaPorNombreId,
    carreraIngenieria,
    carreraDerecho,
    admin: { email: 'autoridad-rectorado@uba.ar', password: PASSWORD_TEST },
    autoridadSecretariaDerecho: { email: 'autoridad-secretaria-derecho@uba.ar', password: PASSWORD_TEST },
    autoridadSecretariaIngenieria: { email: 'autoridad-secretaria-ingenieria@uba.ar', password: PASSWORD_TEST },
    docentesDerecho: [
      { email: 'docente-derecho@uba.ar', password: PASSWORD_TEST },
      { email: 'docente2-derecho@uba.ar', password: PASSWORD_TEST },
    ],
    docentePendienteDerecho: { email: 'docente-pendiente@uba.ar', password: PASSWORD_TEST },
    docenteDeOtraUa: { email: 'docente-ing-validado@uba.ar', password: PASSWORD_TEST },
    estudianteDerecho: { email: 'estudiante-derecho@uba.ar', password: PASSWORD_TEST },
    docenteEvaluadorDerecho: { email: 'evaluador-derecho@uba.ar', password: PASSWORD_TEST },
    docenteEvaluadorIngenieria: { email: 'evaluador-ingenieria@uba.ar', password: PASSWORD_TEST },
  };
}

/** Crea un proyecto + edición (estado Borrador) de forma directa en la DB. */
export async function crearEdicionDirecta(
  app: INestApplication,
  datos: {
    convocatoriaId: string;
    creadoPorId: string;
    uaNombre: string;
    nombreProyecto?: string;
  },
): Promise<{ proyectoId: string; edicionId: string }> {
  const dataSource = app.get(DataSource);
  const proyectoRepo = dataSource.getRepository(Proyecto);
  const edicionRepo = dataSource.getRepository(Edicion);
  const uaId = (await dataSource.getRepository(UnidadAcademica).findOneByOrFail({
    nombre: datos.uaNombre,
  })).id;

  const proyecto = await proyectoRepo.save(
    proyectoRepo.create({ nombre: datos.nombreProyecto ?? 'Proyecto de test', creadoPorId: datos.creadoPorId }),
  );
  const edicion = await edicionRepo.save(
    edicionRepo.create({
      proyectoId: proyecto.id,
      convocatoriaId: datos.convocatoriaId,
      estado: EstadoEdicion.Borrador,
      creadoPorId: datos.creadoPorId,
      unidadAcademicaId: uaId,
      anioEdicion: 2027,
    }),
  );
  return { proyectoId: proyecto.id, edicionId: edicion.id };
}

/** Asigna dos directores (principal + codirector) a una edición. */
export async function asignarDirectores(
  app: INestApplication,
  datos: {
    edicionId: string;
    convocatoriaId: string;
    principalId: string;
    codirectorId: string;
    asignadoPorId: string;
  },
): Promise<void> {
  const repo = app.get(DataSource).getRepository(ParticipacionConvocatoria);
  const participaciones = [
    { usuarioId: datos.principalId, esDirectorPrincipal: true },
    { usuarioId: datos.codirectorId, esDirectorPrincipal: false },
  ];
  for (const p of participaciones) {
    await repo.save(
      repo.create({
        usuarioId: p.usuarioId,
        convocatoriaId: datos.convocatoriaId,
        rol: RolEjecucion.DirectorDeProyecto,
        edicionId: datos.edicionId,
        esDirectorPrincipal: p.esDirectorPrincipal,
        asignadoPorId: datos.asignadoPorId,
      }),
    );
  }
}

/** Transiciona una edición al estado EnEjecucion de forma directa (como hace el seed). */
export async function ponerEdicionEnEjecucion(
  app: INestApplication,
  edicionId: string,
): Promise<void> {
  await app
    .get(DataSource)
    .getRepository(Edicion)
    .update(edicionId, { estado: EstadoEdicion.EnEjecucion });
}