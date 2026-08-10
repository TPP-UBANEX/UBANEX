import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, In, Repository } from 'typeorm';
import { UsuariosService } from '../usuarios/usuarios.service';
import { UnidadesAcademicasService } from '../unidades-academicas/unidades-academicas.service';
import { CarrerasService } from '../carreras/carreras.service';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { EstadoValidacionDocente } from '../common/enums/estado-validacion-docente.enum';
import { EstadoEdicion } from '../common/enums/estado-edicion.enum';
import { EstadoConvocatoria } from '../common/enums/estado-convocatoria.enum';
import { EstadoPropuestaEvaluador } from '../common/enums/estado-propuesta-evaluador.enum';
import { EstadoEvaluacion } from '../common/enums/estado-evaluacion.enum';
import { TipoEvaluacionCruzada } from '../common/enums/tipo-evaluacion-cruzada.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoCampo } from '../common/enums/tipo-campo.enum';
import { Genero } from '../common/enums/genero.enum';
import { CargoDocente } from '../common/enums/cargo-docente.enum';
import { TipoDesignacionDocente } from '../common/enums/tipo-designacion-docente.enum';
import { Usuario } from '../usuarios/usuario.entity';
import { Formulario } from '../formularios/formulario.entity';
import { CampoFormulario } from '../formularios/campo-formulario.interface';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { EMPAREJAMIENTO_DEFAULT } from '../convocatorias/emparejamiento-default';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import {
  TEMPLATE_INSTITUCIONAL_DEFAULT,
  TEMPLATE_CRUZADA_DEFAULT,
} from '../evaluaciones/templates-default';
import { EvaluacionInstitucional } from '../evaluaciones/evaluacion-institucional.entity';
import { EvaluacionCruzada } from '../evaluaciones/evaluacion-cruzada.entity';
import {
  UAS_NOMBRES,
  CARRERAS_POR_UA,
  FORMULARIOS_SEED,
  NOMBRES,
  APELLIDOS,
  AREAS_DOCENTE,
  TITULO_INICIOS,
  TITULO_TEMAS,
} from './seed.data';
import {
  Rng,
  generarPresupuesto,
  generarEvaluacionInstitucional,
  generarEvaluacionCruzada,
  slugUa,
} from './seed.utils';

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

type PoolUa = {
  secretaria: Usuario;
  directores: Usuario[];
  evaluadores: Usuario[];
  docentes: Usuario[];
  estudiantes: Usuario[];
};

type EdicionMasiva = {
  proyecto: Proyecto;
  uaId: string;
  convocatoriaId: string;
  estado: EstadoEdicion;
  directorId: string;
  presupuesto: object;
  datos: Record<string, unknown>;
};

class Progreso {
  private hecho = 0;
  private ultimoPct = -1;

  constructor(private readonly total: number) {}

  sumar(n: number): void {
    this.hecho += n;
    const pct = Math.floor((this.hecho / this.total) * 100);
    if (pct >= this.ultimoPct + 5) {
      this.ultimoPct = pct;
      console.log(`  [SEED ${pct}%] ${this.hecho.toLocaleString('es-AR')} filas generadas`);
    }
  }
}

const TAMANIO_LOTE = 300;

@Injectable()
export class SeedService {
  private readonly usuarioRepo: Repository<Usuario>;
  private readonly formularioRepo: Repository<Formulario>;
  private readonly convocatoriaRepo: Repository<Convocatoria>;
  private readonly proyectoRepo: Repository<Proyecto>;
  private readonly edicionRepo: Repository<Edicion>;
  private readonly participacionRepo: Repository<ParticipacionConvocatoria>;
  private readonly emparejamientoRepo: Repository<Emparejamiento>;
  private readonly templateInstRepo: Repository<TemplateEvaluacionInstitucional>;
  private readonly templateCruzadaRepo: Repository<TemplateEvaluacionCruzada>;
  private readonly institucionalEvalRepo: Repository<EvaluacionInstitucional>;
  private readonly cruzadaEvalRepo: Repository<EvaluacionCruzada>;

  private readonly rng = new Rng(20260810);
  private readonly uaMap = new Map<string, UnidadAcademica>();
  private readonly uas: UnidadAcademica[] = [];
  private readonly convs = new Map<number, Convocatoria>();
  private readonly usuariosPorUa = new Map<string, PoolUa>();
  private readonly parMap = new Map<string, string>();
  private readonly titulosUsados = new Set<string>();
  private readonly progreso = new Progreso(34_000);

  private camposFormularioEstandar: CampoFormulario[];
  private formularioDefault!: Formulario;
  private templateInst!: TemplateEvaluacionInstitucional;
  private templateCruzada!: TemplateEvaluacionCruzada;
  private passwordHashCache: string | null = null;

  private admin!: Usuario;
  private authDerecho!: Usuario;
  private authIngenieria!: Usuario;
  private authMedicina!: Usuario;
  private garcia!: Usuario;
  private perez!: Usuario;
  private fernandez!: Usuario;
  private diaz!: Usuario;
  private moreno!: Usuario;
  private torres!: Usuario;
  private romero!: Usuario;
  private evaluadorDerecho!: Usuario;
  private evaluadorIngenieria!: Usuario;
  private evaluadorEconomicas!: Usuario;

  private p1!: Edicion;
  private p2!: Edicion;
  private p3!: Edicion;
  private p4!: Edicion;
  private p5!: Edicion;
  private p6!: Edicion;

  constructor(
    private readonly dataSource: DataSource,
    private readonly usuariosService: UsuariosService,
    private readonly uasService: UnidadesAcademicasService,
    private readonly carrerasService: CarrerasService,
  ) {
    this.usuarioRepo = dataSource.getRepository(Usuario);
    this.formularioRepo = dataSource.getRepository(Formulario);
    this.convocatoriaRepo = dataSource.getRepository(Convocatoria);
    this.proyectoRepo = dataSource.getRepository(Proyecto);
    this.edicionRepo = dataSource.getRepository(Edicion);
    this.participacionRepo = dataSource.getRepository(ParticipacionConvocatoria);
    this.emparejamientoRepo = dataSource.getRepository(Emparejamiento);
    this.templateInstRepo = dataSource.getRepository(TemplateEvaluacionInstitucional);
    this.templateCruzadaRepo = dataSource.getRepository(TemplateEvaluacionCruzada);
    this.institucionalEvalRepo = dataSource.getRepository(EvaluacionInstitucional);
    this.cruzadaEvalRepo = dataSource.getRepository(EvaluacionCruzada);

    this.camposFormularioEstandar = [
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
  }

  // ─────────────────── Orquestador ───────────────────

  async ejecutarSeed(): Promise<void> {
    console.log('\n=== SEED: Unidades Académicas y Carreras ===');
    await this.seedUnidadesAcademicaYCarreras();

    console.log('\n=== SEED: Usuarios ===');
    await this.seedUsuarios();

    console.log('\n=== SEED: Formularios ===');
    await this.seedFormularios();

    console.log('\n=== SEED: Templates de evaluación ===');
    await this.seedTemplates();

    console.log('\n=== SEED: Convocatorias ===');
    await this.seedConvocatorias();

    console.log('\n=== SEED: Proyectos y Ediciones ===');
    await this.seedProyectosCanonicos();
    await this.seedProyectosMasivos([2023, 2024, 2025, 2026]);

    console.log('\n=== SEED: Participaciones ===');
    await this.seedParticipacionesCanonicas();
    await this.seedParticipacionesMasivas([2023, 2024, 2025, 2026]);

    console.log('\n=== SEED: Emparejamientos ===');
    await this.seedEmparejamientos();

    console.log('\n=== SEED: Evaluaciones ===');
    await this.seedEvaluacionesCanonicas();
    await this.seedEvaluacionesMasivas([2023, 2024, 2025, 2026]);

    console.log('\n=== SEED COMPLETADO ===\n');
    await this.mostrarResumen();
  }

  // ─────────────────── Unidades Académicas y Carreras ───────────────────

  private async seedUnidadesAcademicaYCarreras(): Promise<void> {
    for (const nombre of UAS_NOMBRES) {
      const existente = await this.uasService.obtenerPorNombre(nombre);
      const ua = existente ?? (await this.uasService.crear({ nombre }));
      this.uaMap.set(ua.nombre, ua);
      this.uas.push(ua);
    }

    for (const [nombreUa, carreras] of Object.entries(CARRERAS_POR_UA)) {
      const ua = this.uaMap.get(nombreUa);
      if (!ua) {
        console.warn(`  Carreras no seedeadas: unidad académica no encontrada: ${nombreUa}`);
        continue;
      }
      for (const nombreCarrera of carreras) {
        const existentes = await this.carrerasService.listarPorUnidadAcademica(ua.id);
        if (existentes.some((c) => c.nombre === nombreCarrera)) continue;
        await this.carrerasService.crear({ nombre: nombreCarrera, unidadAcademicaId: ua.id });
      }
    }
    const totalCarreras = Object.values(CARRERAS_POR_UA).reduce((acc, arr) => acc + arr.length, 0);
    console.log(`  ${totalCarreras} carreras en ${this.uas.length} unidades académicas`);
  }

  // ─────────────────── Usuarios ───────────────────

  private async seedUsuario(
    data: DatosSeedUsuario,
    opts?: { habilitado?: boolean },
  ): Promise<Usuario> {
    const existe = await this.usuariosService.obtenerPorEmail(data.email);
    if (existe) {
      const rolesValidos = Object.values(RolUsuario) as string[];
      const desactualizado =
        existe.roles.some((r) => !rolesValidos.includes(r)) ||
        existe.roles.join(',') !== data.roles.join(',');
      if (desactualizado) {
        await this.usuarioRepo.update(existe.id, { roles: data.roles });
        console.log(`  ${data.email} — roles actualizados: ${existe.roles.join(', ')} → ${data.roles.join(', ')}`);
        existe.roles = data.roles;
      }
      return existe;
    }
    const user = await this.usuariosService.crear(data);
    if (opts?.habilitado === false) {
      await this.usuarioRepo.update(user.id, { habilitado: false });
    }
    console.log(`  ${data.email} (${data.roles.join(', ')})`);
    return user;
  }

  private async seedDocente(
    data: DatosSeedUsuario,
    estadoValidacion: EstadoValidacionDocente,
    opts?: { habilitado?: boolean },
  ): Promise<Usuario> {
    const user = await this.seedUsuario(data, opts);
    await this.usuarioRepo.update(user.id, { estadoValidacionDocente: estadoValidacion });

    const campos: Array<keyof DatosSeedUsuario> = [
      'telefono',
      'genero',
      'personaConDiscapacidad',
      'cargoDocente',
      'tipoDesignacionDocente',
      'areaDocente',
      'direccionLocalidad',
    ];
    const cambiosPerfil: Record<string, unknown> = {};
    for (const campo of campos) {
      const valor = data[campo];
      if (valor !== undefined && (user as unknown as Record<string, unknown>)[campo] == null) {
        cambiosPerfil[campo] = valor;
      }
    }
    if (Object.keys(cambiosPerfil).length > 0) {
      await this.usuarioRepo.update(user.id, cambiosPerfil as Partial<Usuario>);
    }
    return user;
  }

  private async obtenerPasswordHash(): Promise<string> {
    if (!this.passwordHashCache) {
      this.passwordHashCache = await bcrypt.hash('123456', 4);
    }
    return this.passwordHashCache;
  }

  private async crearUsuariosMasivos(
    specs: Array<Partial<Usuario>>,
    emailsExistentes: Set<string>,
  ): Promise<Usuario[]> {
    const password = await this.obtenerPasswordHash();
    const aCrear = specs.filter((s) => s.email && !emailsExistentes.has(s.email));
    for (const s of aCrear) {
      emailsExistentes.add(s.email!);
      s.password = password;
    }
    const creados: Usuario[] = [];
    for (let i = 0; i < aCrear.length; i += TAMANIO_LOTE) {
      const chunk = aCrear.slice(i, i + TAMANIO_LOTE);
      const guardados = await this.usuarioRepo.save(chunk.map((s) => this.usuarioRepo.create(s as Usuario)));
      creados.push(...guardados);
      this.progreso.sumar(chunk.length);
    }
    return creados;
  }

  private generarPerfilDocente(): {
    genero?: Genero;
    cargoDocente?: CargoDocente;
    tipoDesignacionDocente?: TipoDesignacionDocente;
    personaConDiscapacidad?: boolean;
    telefono?: string;
  } {
    const cargoes = [
      CargoDocente.ProfesorTitular,
      CargoDocente.ProfesorAsociado,
      CargoDocente.ProfesorAdjunto,
      CargoDocente.JefeDeTrabajosPracticos,
      CargoDocente.AyudanteDePrimera,
    ];
    const designaciones = [
      TipoDesignacionDocente.Regular,
      TipoDesignacionDocente.Concursado,
      TipoDesignacionDocente.Interino,
      TipoDesignacionDocente.Suplente,
    ];
    const generos = [Genero.Masculino, Genero.Femenino, Genero.Otro, Genero.PrefieroNoResponder];
    return {
      genero: this.rng.pick(generos),
      cargoDocente: this.rng.pick(cargoes),
      tipoDesignacionDocente: this.rng.pick(designaciones),
      personaConDiscapacidad: this.rng.bool(0.05),
      telefono: `11 ${String(this.rng.entero(1000, 9999))} ${String(this.rng.entero(1000, 9999))}`,
    };
  }

  private async seedPoolsUa(
    ua: UnidadAcademica,
    emailsExistentes: Set<string>,
    areas: string[],
  ): Promise<PoolUa> {
    const slug = slugUa(ua.nombre);

    const generarEmails = (prefijo: string, cantidad: number): string[] =>
      Array.from({ length: cantidad }, (_, i) => `${prefijo}-${String(i + 1).padStart(3, '0')}-${slug}@uba.ar`);

    const directoresSpecs: Array<Partial<Usuario>> = generarEmails('director', 18).map((email) => {
      const nombre = this.rng.pick(NOMBRES);
      const apellido = this.rng.pick(APELLIDOS);
      return {
        nombreCompleto: `${nombre} ${apellido}`,
        nombre,
        apellido,
        email,
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ua.id,
        areaDocente: this.rng.pick(areas),
        estadoValidacionDocente: EstadoValidacionDocente.Validado,
        ...this.generarPerfilDocente(),
      };
    });

    const evaluadoresSpecs: Array<Partial<Usuario>> = generarEmails('evaluador', 30).map((email) => {
      const nombre = this.rng.pick(NOMBRES);
      const apellido = this.rng.pick(APELLIDOS);
      return {
        nombreCompleto: `${nombre} ${apellido}`,
        nombre,
        apellido,
        email,
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ua.id,
        areaDocente: this.rng.pick(areas),
        estadoValidacionDocente: EstadoValidacionDocente.Validado,
        ...this.generarPerfilDocente(),
      };
    });

    const docentesSpecs: Array<Partial<Usuario>> = generarEmails('docente', 170).map((email) => {
      const nombre = this.rng.pick(NOMBRES);
      const apellido = this.rng.pick(APELLIDOS);
      const estado = this.rng.bool(0.8)
        ? EstadoValidacionDocente.Validado
        : this.rng.bool(0.75)
          ? EstadoValidacionDocente.PendienteDeValidacion
          : EstadoValidacionDocente.Rechazado;
      return {
        nombreCompleto: `${nombre} ${apellido}`,
        nombre,
        apellido,
        email,
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ua.id,
        areaDocente: this.rng.pick(areas),
        estadoValidacionDocente: estado,
        ...(estado === EstadoValidacionDocente.Validado ? this.generarPerfilDocente() : {}),
      };
    });

    const estudiantesSpecs: Array<Partial<Usuario>> = generarEmails('estudiante', 80).map((email) => {
      const nombre = this.rng.pick(NOMBRES);
      const apellido = this.rng.pick(APELLIDOS);
      return {
        nombreCompleto: `${nombre} ${apellido}`,
        nombre,
        apellido,
        email,
        roles: [RolUsuario.Estudiante],
        unidadAcademicaId: ua.id,
      };
    });

    const directores = await this.crearUsuariosMasivos(directoresSpecs, emailsExistentes);
    const evaluadores = await this.crearUsuariosMasivos(evaluadoresSpecs, emailsExistentes);
    const docentes = await this.crearUsuariosMasivos(docentesSpecs, emailsExistentes);
    const estudiantes = await this.crearUsuariosMasivos(estudiantesSpecs, emailsExistentes);

    const secretaria = await this.seedUsuario({
      nombreCompleto: `Autoridad de ${ua.nombre}`,
      email: `autoridad-${ua.nombre === 'Ciclo Básico Común (CBC)' ? 'cbc' : slug}@uba.ar`,
      password: '123456',
      roles: [RolUsuario.AutoridadDeSecretaria],
      unidadAcademicaId: ua.id,
    });

    await this.seedUsuario({
      nombreCompleto: `Asistente de ${ua.nombre}`,
      email: `asistente-${ua.nombre === 'Ciclo Básico Común (CBC)' ? 'cbc' : slug}@uba.ar`,
      password: '123456',
      roles: [RolUsuario.AsistenteDeSecretaria],
      unidadAcademicaId: ua.id,
    });

    // Si los pools ya existían de una corrida anterior, recuperarlos por email.
    const recuperar = async (emails: string[]): Promise<Usuario[]> => {
      const encontrados = await this.usuarioRepo.find({ where: { email: In(emails) } });
      return emails.map((email) => encontrados.find((u) => u.email === email)!).filter(Boolean);
    };

    const pool: PoolUa = {
      secretaria,
      directores:
        directores.length === directoresSpecs.length
          ? directores
          : await recuperar(directoresSpecs.map((s) => s.email!)),
      evaluadores:
        evaluadores.length === evaluadoresSpecs.length
          ? evaluadores
          : await recuperar(evaluadoresSpecs.map((s) => s.email!)),
      docentes:
        docentes.length === docentesSpecs.length
          ? docentes
          : await recuperar(docentesSpecs.map((s) => s.email!)),
      estudiantes:
        estudiantes.length === estudiantesSpecs.length
          ? estudiantes
          : await recuperar(estudiantesSpecs.map((s) => s.email!)),
    };
    return pool;
  }

  private async seedUsuarios(): Promise<void> {
    this.admin = await this.seedUsuario({
      nombreCompleto: 'Admin Rectorado',
      email: 'admin@uba.ar',
      password: 'admin',
      roles: [RolUsuario.AutoridadDeRectorado],
    });

    await this.seedUsuario(
      {
        nombreCompleto: 'Asistente de Rectorado',
        email: 'asistente-rectorado@uba.ar',
        password: '123456',
        roles: [RolUsuario.AsistenteDeRectorado],
      },
      { habilitado: false },
    );

    const derecho = this.uaMap.get('Facultad de Derecho')!;
    const ingenieria = this.uaMap.get('Facultad de Ingeniería')!;
    const medicina = this.uaMap.get('Facultad de Medicina')!;

    this.authDerecho = await this.seedUsuario({
      nombreCompleto: 'Autoridad de Derecho',
      email: 'autoridad-derecho@uba.ar',
      password: '123456',
      roles: [RolUsuario.AutoridadDeSecretaria],
      unidadAcademicaId: derecho.id,
    });
    this.authIngenieria = await this.seedUsuario({
      nombreCompleto: 'Autoridad de Ingeniería',
      email: 'autoridad-ingenieria@uba.ar',
      password: '123456',
      roles: [RolUsuario.AutoridadDeSecretaria],
      unidadAcademicaId: ingenieria.id,
    });
    this.authMedicina = await this.seedUsuario({
      nombreCompleto: 'Autoridad de Medicina',
      email: 'autoridad-medicina@uba.ar',
      password: '123456',
      roles: [RolUsuario.AutoridadDeSecretaria],
      unidadAcademicaId: medicina.id,
    });

    this.garcia = await this.seedDocente(
      {
        nombreCompleto: 'Dr. García',
        email: 'garcia@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: derecho.id,
        telefono: '11 1111 1111',
        genero: Genero.Masculino,
        cargoDocente: CargoDocente.ProfesorTitular,
        areaDocente: 'Derecho Constitucional',
      },
      EstadoValidacionDocente.Validado,
    );
    this.perez = await this.seedDocente(
      {
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
      },
      EstadoValidacionDocente.Validado,
    );

    await this.seedDocente(
      {
        nombreCompleto: 'Lic. López',
        email: 'lopez@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: derecho.id,
      },
      EstadoValidacionDocente.PendienteDeValidacion,
    );
    await this.seedDocente(
      {
        nombreCompleto: 'Lic. Martínez',
        email: 'martinez@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: derecho.id,
        genero: Genero.Masculino,
      },
      EstadoValidacionDocente.Rechazado,
    );
    await this.seedUsuario({
      nombreCompleto: 'Rodríguez Estudiante',
      email: 'rodriguez@uba.ar',
      password: '123456',
      roles: [RolUsuario.Estudiante],
      unidadAcademicaId: derecho.id,
    });
    await this.seedUsuario({
      nombreCompleto: 'González Estudiante',
      email: 'gonzalez@uba.ar',
      password: '123456',
      roles: [RolUsuario.Estudiante],
      unidadAcademicaId: derecho.id,
    });
    this.evaluadorDerecho = await this.seedDocente(
      {
        nombreCompleto: 'Evaluador de Derecho',
        email: 'evaluador@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: derecho.id,
        telefono: '11 3333 3333',
        genero: Genero.PrefieroNoResponder,
        direccionLocalidad: 'Av. de Mayo 900, CABA',
      },
      EstadoValidacionDocente.Validado,
    );

    this.fernandez = await this.seedDocente(
      {
        nombreCompleto: 'Ing. Fernández',
        email: 'fernandez@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ingenieria.id,
        genero: Genero.Masculino,
        cargoDocente: CargoDocente.ProfesorAsociado,
        tipoDesignacionDocente: TipoDesignacionDocente.Concursado,
        areaDocente: 'Ingeniería Civil',
      },
      EstadoValidacionDocente.Validado,
    );
    this.diaz = await this.seedDocente(
      {
        nombreCompleto: 'Ing. Díaz',
        email: 'diaz@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ingenieria.id,
        telefono: '11 4444 4444',
        genero: Genero.Femenino,
        personaConDiscapacidad: false,
        direccionLocalidad: 'Av. Paseo Colón 850, CABA',
      },
      EstadoValidacionDocente.Validado,
    );
    this.moreno = await this.seedDocente(
      {
        nombreCompleto: 'Dr. Moreno',
        email: 'moreno@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ingenieria.id,
        genero: Genero.Masculino,
        cargoDocente: CargoDocente.ProfesorAdjunto,
        tipoDesignacionDocente: TipoDesignacionDocente.Regular,
      },
      EstadoValidacionDocente.Validado,
    );
    await this.seedDocente(
      {
        nombreCompleto: 'Lic. Álvarez',
        email: 'alvarez@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ingenieria.id,
        telefono: '11 5555 5555',
      },
      EstadoValidacionDocente.PendienteDeValidacion,
    );
    await this.seedUsuario({
      nombreCompleto: 'Ramirez Estudiante',
      email: 'ramirez@uba.ar',
      password: '123456',
      roles: [RolUsuario.Estudiante],
      unidadAcademicaId: ingenieria.id,
    });
    this.evaluadorIngenieria = await this.seedDocente(
      {
        nombreCompleto: 'Evaluador de Ingeniería',
        email: 'evaluador-ingenieria@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ingenieria.id,
        genero: Genero.Otro,
        personaConDiscapacidad: false,
        areaDocente: 'Ingeniería Industrial',
      },
      EstadoValidacionDocente.Validado,
    );
    this.evaluadorEconomicas = await this.seedDocente(
      {
        nombreCompleto: 'Evaluador de Ciencias Económicas',
        email: 'evaluador-economicas@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: this.uaMap.get('Facultad de Ciencias Económicas')!.id,
        telefono: '11 6666 6666',
        genero: Genero.Femenino,
        cargoDocente: CargoDocente.ProfesorAdjunto,
        areaDocente: 'Economía Aplicada',
      },
      EstadoValidacionDocente.Validado,
    );
    await this.seedDocente(
      {
        nombreCompleto: 'Director Deshabilitado',
        email: 'director-deshabilitado@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: ingenieria.id,
      },
      EstadoValidacionDocente.Validado,
      { habilitado: false },
    );

    this.torres = await this.seedDocente(
      {
        nombreCompleto: 'Dr. Torres',
        email: 'torres@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: medicina.id,
        telefono: '11 6666 6666',
        genero: Genero.Masculino,
        cargoDocente: CargoDocente.ProfesorTitular,
        tipoDesignacionDocente: TipoDesignacionDocente.Regular,
      },
      EstadoValidacionDocente.Validado,
    );
    await this.seedDocente(
      {
        nombreCompleto: 'Dra. Sánchez',
        email: 'sanchez@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: medicina.id,
        genero: Genero.Femenino,
        areaDocente: 'Cardiología',
      },
      EstadoValidacionDocente.PendienteDeValidacion,
    );
    this.romero = await this.seedDocente(
      {
        nombreCompleto: 'Dr. Romero',
        email: 'romero@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: medicina.id,
        telefono: '11 7777 7777',
        genero: Genero.Masculino,
        personaConDiscapacidad: false,
        direccionLocalidad: 'Belgrano, CABA',
      },
      EstadoValidacionDocente.Validado,
    );

    await this.seedUsuario({
      nombreCompleto: 'Autoridad de CBC',
      email: 'autoridad-cbc@uba.ar',
      password: '123456',
      roles: [RolUsuario.AutoridadDeSecretaria],
      unidadAcademicaId: this.uaMap.get('Ciclo Básico Común (CBC)')!.id,
    });
    await this.seedDocente(
      {
        nombreCompleto: 'Prof. Castro',
        email: 'castro@uba.ar',
        password: '123456',
        roles: [RolUsuario.Docente],
        unidadAcademicaId: this.uaMap.get('Ciclo Básico Común (CBC)')!.id,
        telefono: '11 8888 8888',
        cargoDocente: CargoDocente.ProfesorAdjunto,
        tipoDesignacionDocente: TipoDesignacionDocente.Interino,
        areaDocente: 'Matemática CBC',
      },
      EstadoValidacionDocente.Validado,
    );

    await this.seedDocentesAdicionales();

    // Pools masivos por Unidad Académica.
    const emailsExistentes = new Set((await this.usuarioRepo.find({ select: { email: true } })).map((u) => u.email));
    for (const ua of this.uas) {
      const areas = AREAS_DOCENTE[ua.nombre] ?? ['General'];
      const pool = await this.seedPoolsUa(ua, emailsExistentes, areas);
      this.usuariosPorUa.set(ua.id, pool);
    }

    await this.backfillNombreApellido();
  }

  private async seedDocentesAdicionales(): Promise<void> {
    const derecho = this.uaMap.get('Facultad de Derecho')!;
    const ingenieria = this.uaMap.get('Facultad de Ingeniería')!;
    const medicina = this.uaMap.get('Facultad de Medicina')!;
    const exactas = this.uaMap.get('Facultad de Ciencias Exactas y Naturales')!;
    const sociales = this.uaMap.get('Facultad de Ciencias Sociales')!;

    const docentes: Array<{ data: DatosSeedUsuario; validacion: EstadoValidacionDocente }> = [
      {
        data: {
          nombreCompleto: 'Dr. Sosa', email: 'sosa@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: derecho.id, genero: Genero.Masculino, cargoDocente: CargoDocente.ProfesorAdjunto,
          tipoDesignacionDocente: TipoDesignacionDocente.Regular, areaDocente: 'Derecho Penal',
          direccionLocalidad: 'Av. Figueroa Alcorta 2263, CABA',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Dra. Ferreyra', email: 'ferreyra@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: derecho.id, telefono: '11 4567 8901', genero: Genero.Femenino,
          personaConDiscapacidad: false, direccionLocalidad: 'Palermo, CABA',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Lic. Aguirre', email: 'aguirre@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: derecho.id, telefono: '11 5678 9012', genero: Genero.Masculino,
        },
        validacion: EstadoValidacionDocente.PendienteDeValidacion,
      },
      {
        data: {
          nombreCompleto: 'Prof. Roldán', email: 'roldan@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: derecho.id, direccionLocalidad: 'La Plata, Buenos Aires',
        },
        validacion: EstadoValidacionDocente.Rechazado,
      },
      {
        data: {
          nombreCompleto: 'Ing. Benítez', email: 'benitez@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: ingenieria.id, telefono: '11 2345 6789', cargoDocente: CargoDocente.ProfesorAsociado,
          tipoDesignacionDocente: TipoDesignacionDocente.Concursado, areaDocente: 'Ingeniería Electrónica',
          direccionLocalidad: 'Av. Paseo Colón 850, CABA',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Ing. Villalba', email: 'villalba@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: ingenieria.id, genero: Genero.Masculino, personaConDiscapacidad: false,
          cargoDocente: CargoDocente.AyudanteDePrimera, tipoDesignacionDocente: TipoDesignacionDocente.Interino,
          areaDocente: 'Ingeniería en Informática',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Lic. Cabrera', email: 'cabrera@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: ingenieria.id, telefono: '11 3456 7890', genero: Genero.Otro,
          personaConDiscapacidad: true,
        },
        validacion: EstadoValidacionDocente.PendienteDeValidacion,
      },
      {
        data: {
          nombreCompleto: 'Dra. Giménez', email: 'gimenez@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: ingenieria.id, telefono: '11 4567 8901',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Dr. Acosta', email: 'acosta@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: medicina.id, genero: Genero.Masculino, personaConDiscapacidad: false,
          cargoDocente: CargoDocente.ProfesorTitular, tipoDesignacionDocente: TipoDesignacionDocente.Regular,
          areaDocente: 'Clínica Médica',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Dra. Navarro', email: 'navarro@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: medicina.id, telefono: '11 5678 9012', genero: Genero.Femenino,
          personaConDiscapacidad: false, direccionLocalidad: 'Av. Córdoba 2100, CABA',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Lic. Paredes', email: 'paredes@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: medicina.id, genero: Genero.PrefieroNoResponder, areaDocente: 'Enfermería Comunitaria',
        },
        validacion: EstadoValidacionDocente.PendienteDeValidacion,
      },
      {
        data: {
          nombreCompleto: 'Prof. Corvalán', email: 'corvalan@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: medicina.id, telefono: '11 6789 0123',
        },
        validacion: EstadoValidacionDocente.Rechazado,
      },
      {
        data: {
          nombreCompleto: 'Dr. Vega', email: 'vega@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: exactas.id, telefono: '11 7890 1234', genero: Genero.Masculino,
          personaConDiscapacidad: false, cargoDocente: CargoDocente.ProfesorAdjunto,
          tipoDesignacionDocente: TipoDesignacionDocente.Concursado, direccionLocalidad: 'Ciudad Universitaria, CABA',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Dra. Ledesma', email: 'ledesma@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: exactas.id, genero: Genero.Femenino, personaConDiscapacidad: false,
          cargoDocente: CargoDocente.JefeDeTrabajosPracticos, tipoDesignacionDocente: TipoDesignacionDocente.Suplente,
          areaDocente: 'Matemática', direccionLocalidad: 'Ciudad Universitaria, CABA',
        },
        validacion: EstadoValidacionDocente.Validado,
      },
      {
        data: {
          nombreCompleto: 'Lic. Funes', email: 'funes@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: exactas.id, telefono: '11 8901 2345',
        },
        validacion: EstadoValidacionDocente.PendienteDeValidacion,
      },
      {
        data: {
          nombreCompleto: 'Lic. Montero', email: 'montero@uba.ar', password: '123456', roles: [RolUsuario.Docente],
          unidadAcademicaId: sociales.id, genero: Genero.Femenino, areaDocente: 'Comunicación',
        },
        validacion: EstadoValidacionDocente.Rechazado,
      },
    ];

    for (const d of docentes) {
      await this.seedDocente(d.data, d.validacion);
    }
  }

  private async backfillNombreApellido(): Promise<void> {
    const todos = await this.usuarioRepo.find();
    let backfilled = 0;
    for (const usuario of todos) {
      if (usuario.nombre || usuario.apellido) continue;
      const partes = (usuario.nombreCompleto || '').trim().split(/\s+/);
      const nombre = partes[0] || '';
      const apellido = partes.slice(1).join(' ') || '';
      await this.usuarioRepo.update(usuario.id, { nombre, apellido });
      backfilled++;
    }
    if (backfilled > 0) {
      console.log(`  ${backfilled} usuarios con nombre/apellido derivados de nombreCompleto`);
    }
  }

  // ─────────────────── Formularios ───────────────────

  private async seedFormularios(): Promise<void> {
    const creados: Formulario[] = [];
    for (const f of FORMULARIOS_SEED) {
      const existe = await this.formularioRepo.findOne({ where: { nombre: f.nombre } });
      if (!existe) {
        const creado = await this.formularioRepo.save(
          this.formularioRepo.create({
            ...f,
            esPlantilla: true,
            campos: f.esDefault ? this.camposFormularioEstandar : null,
          }),
        );
        creados.push(creado);
        console.log(`  ${f.nombre}`);
      } else {
        if (!existe.esPlantilla) {
          existe.esPlantilla = true;
          await this.formularioRepo.save(existe);
          console.log(`  ${f.nombre} — marcado como plantilla`);
        }
        creados.push(existe);
      }
    }
    this.formularioDefault = creados.find((f) => f.esDefault)!;
    if (this.formularioDefault.campos && this.formularioDefault.campos.length > 0) {
      this.camposFormularioEstandar = this.formularioDefault.campos;
    }
  }

  // ─────────────────── Templates de evaluación ───────────────────

  private async seedTemplates(): Promise<void> {
    const existenteInst = await this.templateInstRepo.findOne({ where: { esDefault: true } });
    this.templateInst =
      existenteInst ??
      (await this.templateInstRepo.save(
        this.templateInstRepo.create({
          nombre: 'Template institucional UBANEX',
          esDefault: true,
          esPlantilla: true,
          estructura: TEMPLATE_INSTITUCIONAL_DEFAULT,
        }),
      ));

    const existenteCruzada = await this.templateCruzadaRepo.findOne({ where: { esDefault: true } });
    this.templateCruzada =
      existenteCruzada ??
      (await this.templateCruzadaRepo.save(
        this.templateCruzadaRepo.create({
          nombre: 'Template cruzada UBANEX',
          esDefault: true,
          esPlantilla: true,
          estructura: TEMPLATE_CRUZADA_DEFAULT,
        }),
      ));
  }

  // ─────────────────── Convocatorias ───────────────────

  private crearFecha(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  private async seedConvocatoria(data: Partial<Convocatoria>): Promise<Convocatoria> {
    const existe = await this.convocatoriaRepo.findOne({ where: { nombre: data.nombre } });
    if (existe) {
      if (data.estado && existe.estado !== data.estado) {
        existe.estado = data.estado;
        await this.convocatoriaRepo.save(existe);
        console.log(`  ${existe.nombre} — estado reconciliado a ${existe.estado}`);
      }
      return existe;
    }
    const conv = this.convocatoriaRepo.create(data as Convocatoria);
    const saved = await this.convocatoriaRepo.save(conv);
    console.log(`  ${saved.nombre} (${saved.estado})`);
    return saved;
  }

  private async formularioParaConvocatoria(nombreConvocatoria: string, anio: number): Promise<string> {
    const conv = await this.convocatoriaRepo.findOne({ where: { nombre: nombreConvocatoria } });
    if (conv?.formularioId) return conv.formularioId;

    const nombreCopia = `${this.formularioDefault.nombre} (copia ${anio})`;
    const existente = await this.formularioRepo.findOne({ where: { nombre: nombreCopia } });
    if (existente) return existente.id;

    const copia = await this.formularioRepo.save(
      this.formularioRepo.create({
        nombre: nombreCopia,
        esDefault: false,
        esPlantilla: false,
        campos: this.formularioDefault.campos ? this.formularioDefault.campos.map((c) => ({ ...c })) : null,
      }),
    );
    return copia.id;
  }

  private async asegurarTemplatesConvocatoria(convocatoria: Convocatoria): Promise<void> {
    const conv = await this.convocatoriaRepo.findOne({
      where: { id: convocatoria.id },
      relations: { templateEvaluacionInstitucional: true, templateEvaluacionCruzada: true },
    });
    if (!conv) return;

    const congelada = conv.estado !== EstadoConvocatoria.Configuracion;
    let huboCambios = false;

    const inst = conv.templateEvaluacionInstitucional;
    if (!inst) {
      if (congelada) {
        const copia = await this.templateInstRepo.save(
          this.templateInstRepo.create({
            nombre: `Evaluación institucional ${conv.nombre}`,
            esDefault: false,
            esPlantilla: false,
            estructura: this.templateInst.estructura,
          }),
        );
        conv.templateEvaluacionInstitucionalId = copia.id;
        conv.templateEvaluacionInstitucional = copia;
        console.log(`  ${conv.nombre} — template institucional congelado (copia privada)`);
      } else {
        conv.templateEvaluacionInstitucionalId = this.templateInst.id;
        conv.templateEvaluacionInstitucional = this.templateInst;
      }
      huboCambios = true;
    } else if (inst.esPlantilla && !inst.esDefault && / \(copia \d{4}\)$/.test(inst.nombre)) {
      if (congelada) {
        inst.esPlantilla = false;
        await this.templateInstRepo.save(inst);
        console.log(`  ${conv.nombre} — template institucional tomado como propio (privado)`);
      } else {
        const enUso = await this.institucionalEvalRepo.count({ where: { templateId: inst.id } });
        if (enUso === 0) {
          await this.templateInstRepo.delete(inst.id);
          console.log(`  ${conv.nombre} — copia institucional removida`);
        }
        conv.templateEvaluacionInstitucionalId = this.templateInst.id;
        conv.templateEvaluacionInstitucional = this.templateInst;
        huboCambios = true;
      }
    } else if (congelada && inst.esPlantilla) {
      const copia = await this.templateInstRepo.save(
        this.templateInstRepo.create({
          nombre: `Evaluación institucional ${conv.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: inst.estructura,
        }),
      );
      conv.templateEvaluacionInstitucionalId = copia.id;
      conv.templateEvaluacionInstitucional = copia;
      huboCambios = true;
      console.log(`  ${conv.nombre} — template institucional congelado (copia privada)`);
    }

    const cruzada = conv.templateEvaluacionCruzada;
    if (!cruzada) {
      if (congelada) {
        const copia = await this.templateCruzadaRepo.save(
          this.templateCruzadaRepo.create({
            nombre: `Evaluación cruzada ${conv.nombre}`,
            esDefault: false,
            esPlantilla: false,
            estructura: this.templateCruzada.estructura,
          }),
        );
        conv.templateEvaluacionCruzadaId = copia.id;
        conv.templateEvaluacionCruzada = copia;
        console.log(`  ${conv.nombre} — template cruzada congelado (copia privada)`);
      } else {
        conv.templateEvaluacionCruzadaId = this.templateCruzada.id;
        conv.templateEvaluacionCruzada = this.templateCruzada;
      }
      huboCambios = true;
    } else if (cruzada.esPlantilla && !cruzada.esDefault && / \(copia \d{4}\)$/.test(cruzada.nombre)) {
      if (congelada) {
        cruzada.esPlantilla = false;
        await this.templateCruzadaRepo.save(cruzada);
        console.log(`  ${conv.nombre} — template cruzada tomado como propio (privado)`);
      } else {
        const enUso = await this.cruzadaEvalRepo.count({ where: { templateId: cruzada.id } });
        if (enUso === 0) {
          await this.templateCruzadaRepo.delete(cruzada.id);
          console.log(`  ${conv.nombre} — copia cruzada removida`);
        }
        conv.templateEvaluacionCruzadaId = this.templateCruzada.id;
        conv.templateEvaluacionCruzada = this.templateCruzada;
        huboCambios = true;
      }
    } else if (congelada && cruzada.esPlantilla) {
      const copia = await this.templateCruzadaRepo.save(
        this.templateCruzadaRepo.create({
          nombre: `Evaluación cruzada ${conv.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: cruzada.estructura,
        }),
      );
      conv.templateEvaluacionCruzadaId = copia.id;
      conv.templateEvaluacionCruzada = copia;
      huboCambios = true;
      console.log(`  ${conv.nombre} — template cruzada congelado (copia privada)`);
    }

    if (huboCambios) {
      await this.convocatoriaRepo.save(conv);
    }
    console.log(`  ${conv.nombre} — templates de evaluación asociados`);
  }

  private async seedConvocatorias(): Promise<void> {
    const especificaciones: Array<{ anio: number; estado: EstadoConvocatoria }> = [
      { anio: 2023, estado: EstadoConvocatoria.Cierre },
      { anio: 2024, estado: EstadoConvocatoria.Cierre },
      { anio: 2025, estado: EstadoConvocatoria.Ejecucion },
      { anio: 2026, estado: EstadoConvocatoria.Evaluacion },
      { anio: 2027, estado: EstadoConvocatoria.Configuracion },
      { anio: 2028, estado: EstadoConvocatoria.Configuracion },
    ];

    for (const spec of especificaciones) {
      const anio = spec.anio;
      const nombre = `UBANEX ${anio}`;
      const formularioId = await this.formularioParaConvocatoria(nombre, anio);
      const conv = await this.seedConvocatoria({
        nombre,
        descripcion: `Convocatoria UBANEX del año ${anio}`,
        anio,
        estado: spec.estado,
        fechaInicioPresentacion: this.crearFecha(anio, 3, 1),
        fechaFinPresentacion: this.crearFecha(anio, 4, 30),
        fechaInicioEvaluacion: this.crearFecha(anio, 5, 15),
        fechaFinEvaluacion: this.crearFecha(anio, 7, 15),
        fechaInicioEjecucion: this.crearFecha(anio, 8, 1),
        fechaFinEjecucion: this.crearFecha(anio + 1, 2, 28),
        formularioId,
      });
      await this.asegurarTemplatesConvocatoria(conv);
      this.convs.set(anio, conv);
    }
  }

  // ─────────────────── Proyectos y Ediciones ───────────────────

  private async seedProyectoConEdicion(
    nombreProyecto: string,
    creadoPor: Usuario,
    unidadAcademica: UnidadAcademica,
    convocatoria: Convocatoria,
    estado: EstadoEdicion,
    presupuesto?: object,
    datosFormulario?: object,
  ): Promise<Edicion> {
    const existeProyecto = await this.proyectoRepo.findOne({ where: { nombre: nombreProyecto } });
    if (existeProyecto) {
      const ed = await this.edicionRepo.findOne({
        where: { proyectoId: existeProyecto.id, convocatoriaId: convocatoria.id },
      });
      if (ed) {
        if (
          estado === EstadoEdicion.EnEvaluacion &&
          (ed.estado === EstadoEdicion.Presentado || ed.estado === EstadoEdicion.PendienteDeCambios)
        ) {
          ed.estado = EstadoEdicion.EnEvaluacion;
          await this.edicionRepo.save(ed);
          console.log(`  ${nombreProyecto} — estado reconciliado a ${ed.estado}`);
        }
        if (datosFormulario && ed.datosFormulario == null) {
          ed.datosFormulario = datosFormulario;
          await this.edicionRepo.save(ed);
          console.log(`  ${nombreProyecto} — formulario de presentación completado`);
        }
        return ed;
      }
    }

    const proyecto = await this.proyectoRepo.save(
      this.proyectoRepo.create({ nombre: nombreProyecto, creadoPorId: creadoPor.id }),
    );
    const edicion = await this.edicionRepo.save(
      this.edicionRepo.create({
        proyectoId: proyecto.id,
        convocatoriaId: convocatoria.id,
        estado,
        creadoPorId: creadoPor.id,
        unidadAcademicaId: unidadAcademica.id,
        anioEdicion: convocatoria.anio,
        presupuesto: presupuesto || null,
        datosFormulario: datosFormulario ?? null,
      }),
    );
    console.log(`  ${nombreProyecto} (${estado})`);
    return edicion;
  }

  private seedDatosFormulario(opts: {
    resumen: string;
    area: string;
    poblaciones: string[];
    antecedentes?: boolean;
  }): Record<string, unknown> {
    const [campoResumen, campoAntecedentes, campoArea, campoPoblaciones] = this.camposFormularioEstandar;
    return {
      [campoResumen.id]: opts.resumen,
      [campoAntecedentes.id]: opts.antecedentes ?? false,
      [campoArea.id]: opts.area,
      [campoPoblaciones.id]: opts.poblaciones,
    };
  }

  private async seedProyectosCanonicos(): Promise<void> {
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
        { tipo: 'BienesDeConsumo', subtotal: 150000, partidas: [{ descripcion: 'Materiales e insumos', cantidad: 50, precioUnitario: 3000, monto: 150000 }] },
        { tipo: 'BienesDeUso', subtotal: 150000, partidas: [{ descripcion: 'Equipamiento', cantidad: 3, precioUnitario: 50000, monto: 150000 }] },
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
        { tipo: 'BienesDeConsumo', subtotal: 200000, partidas: [{ descripcion: 'Insumos', cantidad: 100, precioUnitario: 2000, monto: 200000 }] },
        { tipo: 'BienesDeUso', subtotal: 150000, partidas: [{ descripcion: 'Equipos', cantidad: 2, precioUnitario: 75000, monto: 150000 }] },
      ],
    };

    const derecho = this.uaMap.get('Facultad de Derecho')!;
    const ingenieria = this.uaMap.get('Facultad de Ingeniería')!;
    const medicina = this.uaMap.get('Facultad de Medicina')!;
    const conv2025 = this.convs.get(2025)!;
    const conv2026 = this.convs.get(2026)!;

    this.p1 = await this.seedProyectoConEdicion(
      'Red de Voluntariado Ambiental',
      this.garcia, derecho, conv2026, EstadoEdicion.Borrador, presupuestoBorrador,
      this.seedDatosFormulario({
        resumen: 'Red de voluntarios para la restauración de humedales y espacios verdes urbanos.',
        area: 'Ambiente',
        poblaciones: ['Comunidad general'],
      }),
    );
    this.p2 = await this.seedProyectoConEdicion(
      'Inclusión Digital en Barrios Populares',
      this.perez, derecho, conv2026, EstadoEdicion.EnEvaluacion, presupuestoBorrador,
      this.seedDatosFormulario({
        resumen: 'Talleres de alfabetización digital y acceso a herramientas tecnológicas en barrios populares.',
        area: 'Tecnología',
        poblaciones: ['Niños y adolescentes', 'Adultos mayores'],
        antecedentes: true,
      }),
    );
    this.p3 = await this.seedProyectoConEdicion(
      'Huerta Comunitaria y Seguridad Alimentaria',
      this.fernandez, ingenieria, conv2026, EstadoEdicion.Borrador, presupuestoBorrador,
      this.seedDatosFormulario({
        resumen: 'Huertas comunitarias con técnicas agroecológicas para mejorar la seguridad alimentaria del barrio.',
        area: 'Ambiente',
        poblaciones: ['Comunidad general'],
      }),
    );
    this.p4 = await this.seedProyectoConEdicion(
      'Alfabetización Científica en Escuelas',
      this.diaz, ingenieria, conv2026, EstadoEdicion.EnEvaluacion, presupuestoBorrador,
      this.seedDatosFormulario({
        resumen: 'Laboratorios itinerantes de ciencias en escuelas secundarias para fomentar vocaciones científicas.',
        area: 'Educación',
        poblaciones: ['Niños y adolescentes'],
        antecedentes: true,
      }),
    );
    this.p5 = await this.seedProyectoConEdicion(
      'Taller de Oficios para la Inclusión Laboral',
      this.garcia, derecho, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion,
      this.seedDatosFormulario({
        resumen: 'Talleres de oficios orientados a la inserción laboral de personas en situación de vulnerabilidad.',
        area: 'Cultura',
        poblaciones: ['Comunidad general'],
      }),
    );
    this.p6 = await this.seedProyectoConEdicion(
      'Salud Comunitaria en Barrios Vulnerables',
      this.torres, medicina, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion,
      this.seedDatosFormulario({
        resumen: 'Atención primaria de salud y prevención en barrios vulnerables con participación comunitaria.',
        area: 'Salud',
        poblaciones: ['Comunidad general'],
      }),
    );
  }

  private generarTituloUnico(): string {
    const base = `${this.rng.pick(TITULO_INICIOS)} ${this.rng.pick(TITULO_TEMAS)}`;
    let titulo = base;
    let sufijo = 1;
    while (this.titulosUsados.has(titulo)) {
      titulo = `${base} ${++sufijo}`;
    }
    this.titulosUsados.add(titulo);
    return titulo;
  }

  private async seedProyectosMasivos(anios: number[]): Promise<void> {
    const areas = ['Salud', 'Educación', 'Ambiente', 'Tecnología', 'Cultura'];
    const poblaciones = ['Niños y adolescentes', 'Adultos mayores', 'Personas con discapacidad', 'Comunidad general'];

    for (const anio of anios) {
      const conv = this.convs.get(anio)!;
      const estadoEdicion = anio === 2026 ? EstadoEdicion.EnEvaluacion : EstadoEdicion.EnEjecucion;

      const edicionesExistentes = await this.edicionRepo.find({
        where: { convocatoriaId: conv.id },
        relations: { proyecto: true },
      });
      const nombresExistentes = new Set(edicionesExistentes.map((e) => e.proyecto.nombre));

      for (const ua of this.uas) {
        const pool = this.usuariosPorUa.get(ua.id);
        if (!pool) continue;
        const cantidad = this.rng.proyectosPorUa();

        const specs: EdicionMasiva[] = [];
        const proyectoEnts: Proyecto[] = [];

        for (let i = 0; i < cantidad; i++) {
          const titulo = this.generarTituloUnico();
          const director = pool.directores[this.rng.entero(0, pool.directores.length - 1)];
          const presupuesto = generarPresupuesto(this.rng, anio);
          const datos = this.seedDatosFormulario({
            resumen: `Propuesta de ${titulo.toLowerCase()} con trabajo articulado con organizaciones de la zona.`,
            area: this.rng.pick(areas),
            poblaciones: [this.rng.pick(poblaciones)],
            antecedentes: this.rng.bool(0.5),
          });

          if (nombresExistentes.has(titulo)) continue;

          const proyecto = this.proyectoRepo.create({ nombre: titulo, creadoPorId: director.id });
          proyectoEnts.push(proyecto);
          specs.push({
            proyecto,
            uaId: ua.id,
            convocatoriaId: conv.id,
            estado: estadoEdicion,
            directorId: director.id,
            presupuesto,
            datos,
          });
        }

        const proyectosGuardados: Proyecto[] = [];
        for (let i = 0; i < proyectoEnts.length; i += TAMANIO_LOTE) {
          const chunk = proyectoEnts.slice(i, i + TAMANIO_LOTE);
          proyectosGuardados.push(...(await this.proyectoRepo.save(chunk)));
          this.progreso.sumar(chunk.length);
        }

        const ediciones = specs.map((s, i) =>
          this.edicionRepo.create({
            proyectoId: proyectosGuardados[i].id,
            convocatoriaId: s.convocatoriaId,
            estado: s.estado,
            creadoPorId: s.directorId,
            unidadAcademicaId: s.uaId,
            anioEdicion: conv.anio,
            presupuesto: s.presupuesto,
            datosFormulario: s.datos,
          }),
        );
        for (let i = 0; i < ediciones.length; i += TAMANIO_LOTE) {
          const chunk = ediciones.slice(i, i + TAMANIO_LOTE);
          await this.edicionRepo.save(chunk);
          this.progreso.sumar(chunk.length);
        }
      }
    }
  }

  // ─────────────────── Participaciones ───────────────────

  private async seedParticipacion(data: {
    usuarioId: string;
    convocatoriaId: string;
    rol: RolEjecucion;
    edicionId?: string;
    esDirectorPrincipal?: boolean;
    asignadoPorId: string;
    estado?: EstadoPropuestaEvaluador | null;
  }): Promise<ParticipacionConvocatoria> {
    const existe = await this.participacionRepo.findOne({
      where: { usuarioId: data.usuarioId, convocatoriaId: data.convocatoriaId },
    });
    if (existe) {
      if (data.estado && existe.estado !== data.estado) {
        existe.estado = data.estado;
        await this.participacionRepo.save(existe);
        console.log(`  ${data.rol} — ${data.usuarioId.slice(0, 8)}... estado reconciliado a ${data.estado}`);
      }
      return existe;
    }
    const p = this.participacionRepo.create({
      usuarioId: data.usuarioId,
      convocatoriaId: data.convocatoriaId,
      rol: data.rol,
      edicionId: data.edicionId ?? null,
      esDirectorPrincipal: data.esDirectorPrincipal ?? null,
      asignadoPorId: data.asignadoPorId,
      estado: data.estado ?? null,
    });
    const saved = await this.participacionRepo.save(p);
    console.log(`  ${data.rol} — ${data.usuarioId.slice(0, 8)}... en convocatoria ${data.convocatoriaId.slice(0, 8)}...`);
    return saved;
  }

  private async seedParticipacionesCanonicas(): Promise<void> {
    const conv2025 = this.convs.get(2025)!;
    const conv2026 = this.convs.get(2026)!;

    await this.seedParticipacion({ usuarioId: this.garcia.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p1.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.perez.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p2.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.fernandez.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p3.id, esDirectorPrincipal: true, asignadoPorId: this.authIngenieria.id });
    await this.seedParticipacion({ usuarioId: this.diaz.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p4.id, esDirectorPrincipal: true, asignadoPorId: this.authIngenieria.id });
    await this.seedParticipacion({ usuarioId: this.moreno.id, convocatoriaId: conv2026.id, rol: RolEjecucion.Evaluador, estado: EstadoPropuestaEvaluador.Aprobado, asignadoPorId: this.authIngenieria.id });
    await this.seedParticipacion({ usuarioId: this.evaluadorDerecho.id, convocatoriaId: conv2026.id, rol: RolEjecucion.Evaluador, estado: EstadoPropuestaEvaluador.Aprobado, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.evaluadorIngenieria.id, convocatoriaId: conv2026.id, rol: RolEjecucion.Evaluador, estado: EstadoPropuestaEvaluador.Aprobado, asignadoPorId: this.authIngenieria.id });

    await this.seedParticipacion({ usuarioId: this.garcia.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p5.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.perez.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p5.id, esDirectorPrincipal: false, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.torres.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p6.id, esDirectorPrincipal: true, asignadoPorId: this.authMedicina.id });
    await this.seedParticipacion({ usuarioId: this.romero.id, convocatoriaId: conv2025.id, rol: RolEjecucion.Evaluador, estado: EstadoPropuestaEvaluador.Aprobado, asignadoPorId: this.authMedicina.id });
    await this.seedParticipacion({ usuarioId: this.evaluadorDerecho.id, convocatoriaId: conv2025.id, rol: RolEjecucion.Evaluador, estado: EstadoPropuestaEvaluador.Aprobado, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.evaluadorEconomicas.id, convocatoriaId: conv2025.id, rol: RolEjecucion.Evaluador, estado: EstadoPropuestaEvaluador.Aprobado, asignadoPorId: this.admin.id });
  }

  private async seedParticipacionesMasivas(anios: number[]): Promise<void> {
    for (const anio of anios) {
      const conv = this.convs.get(anio)!;
      const ediciones = await this.edicionRepo.find({
        where: { convocatoriaId: conv.id },
        relations: { creadoPor: true },
      });
      const existentes = await this.participacionRepo.find({
        where: { convocatoriaId: conv.id },
        select: { usuarioId: true },
      });
      const existSet = new Set(existentes.map((p) => p.usuarioId));
      const rows: ParticipacionConvocatoria[] = [];

      for (const ed of ediciones) {
        const pool = this.usuariosPorUa.get(ed.unidadAcademicaId);
        const secretaria = pool?.secretaria;
        const director = ed.creadoPor;
        if (!secretaria || !director) continue;

        if (!existSet.has(director.id)) {
          rows.push(
            this.participacionRepo.create({
              usuarioId: director.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.DirectorDeProyecto,
              edicionId: ed.id,
              esDirectorPrincipal: true,
              asignadoPorId: secretaria.id,
              estado: null,
            }),
          );
          existSet.add(director.id);
        }

        const integrante = pool.docentes[this.rng.entero(0, pool.docentes.length - 1)];
        if (!existSet.has(integrante.id)) {
          rows.push(
            this.participacionRepo.create({
              usuarioId: integrante.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.DirectorDeProyecto,
              esDirectorPrincipal: false,
              asignadoPorId: secretaria.id,
              estado: null,
            }),
          );
          existSet.add(integrante.id);
        }
      }

      for (const ua of this.uas) {
        const pool = this.usuariosPorUa.get(ua.id);
        if (!pool) continue;
        for (const evaluador of pool.evaluadores) {
          if (existSet.has(evaluador.id)) continue;
          rows.push(
            this.participacionRepo.create({
              usuarioId: evaluador.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.Evaluador,
              estado: EstadoPropuestaEvaluador.Aprobado,
              asignadoPorId: pool.secretaria.id,
            }),
          );
          existSet.add(evaluador.id);
        }
      }

      for (let i = 0; i < rows.length; i += TAMANIO_LOTE) {
        const chunk = rows.slice(i, i + TAMANIO_LOTE);
        await this.participacionRepo.save(chunk);
        this.progreso.sumar(chunk.length);
      }
    }
  }

  // ─────────────────── Emparejamientos ───────────────────

  private async seedEmparejamientos(): Promise<void> {
    for (const conv of this.convs.values()) {
      const existentes = await this.emparejamientoRepo.find({ where: { convocatoriaId: conv.id } });
      if (existentes.length > 0) continue;

      for (const [nombreA, nombreB] of EMPAREJAMIENTO_DEFAULT) {
        const uaA = this.uaMap.get(nombreA);
        const uaB = this.uaMap.get(nombreB);
        if (!uaA || !uaB) {
          console.warn(`  Emparejamiento no encontrado: ${nombreA} / ${nombreB}`);
          continue;
        }
        await this.emparejamientoRepo.save(
          this.emparejamientoRepo.create({
            convocatoriaId: conv.id,
            unidadAId: uaA.id,
            unidadBId: uaB.id,
          }),
        );
        this.parMap.set(uaA.id, uaB.id);
        this.parMap.set(uaB.id, uaA.id);
      }
      console.log(`  ${EMPAREJAMIENTO_DEFAULT.length} pares para convocatoria ${conv.nombre}`);
    }
  }

  // ─────────────────── Evaluaciones ───────────────────

  private async seedEvaluacionesCanonicas(): Promise<void> {
    const conv2025 = this.convs.get(2025)!;
    const conv = await this.convocatoriaRepo.findOne({
      where: { id: conv2025.id },
      relations: { templateEvaluacionInstitucional: true, templateEvaluacionCruzada: true },
    });
    if (!conv) return;

    const institucional = async (edicionId: string, autoridad: Usuario, categorias: Record<string, unknown>, observaciones: string): Promise<void> => {
      const existente = await this.institucionalEvalRepo.findOne({ where: { edicionId } });
      if (existente) return;
      if (!conv.templateEvaluacionInstitucionalId) return;
      await this.institucionalEvalRepo.save(
        this.institucionalEvalRepo.create({
          convocatoriaId: conv.id,
          edicionId,
          templateId: conv.templateEvaluacionInstitucionalId,
          estado: EstadoEvaluacion.Confirmada,
          realizadoPorId: autoridad.id,
          confirmadoPorId: autoridad.id,
          categorias,
          checklist: { 'check-superposicion': true, 'check-presupuesto': true, 'check-documentacion': true },
          observaciones,
        }),
      );
    };

    const cruzada = async (
      edicionId: string,
      evaluador: Usuario,
      tipo: TipoEvaluacionCruzada,
      items: Record<string, number>,
      observaciones: string,
    ): Promise<void> => {
      const existente = await this.cruzadaEvalRepo.findOne({ where: { edicionId, evaluadorId: evaluador.id } });
      if (existente) return;
      if (!conv.templateEvaluacionCruzadaId) return;
      await this.cruzadaEvalRepo.save(
        this.cruzadaEvalRepo.create({
          convocatoriaId: conv.id,
          edicionId,
          evaluadorId: evaluador.id,
          tipo,
          templateId: conv.templateEvaluacionCruzadaId,
          estado: EstadoEvaluacion.Confirmada,
          items,
          observaciones,
        }),
      );
    };

    await institucional(
      this.p5.id,
      this.authDerecho,
      {
        'sub-trayectoria-equipo': { valor: 9, fundamentacion: 'El equipo acumula tres ediciones en extensión universitaria.' },
        'sub-antecedentes': { valor: 8, fundamentacion: 'Proyectos previos en la misma línea de oficios.' },
        'sub-complementariedad-equipo': { valor: true },
        'sub-estudiantes-activos': { valor: true },
        'sub-vinculacion-territorio': { valor: 9, fundamentacion: 'Acuerdos con parroquias, cooperativas y el Centro de Formación Laboral.' },
        'sub-coherencia': { valor: 8, fundamentacion: 'Objetivos y actividades alineados con el itinerario de oficios.' },
        'sub-politicas-publicas': { valor: true },
        'sub-devolucion': { valor: true },
      },
      'El proyecto está muy bien articulado con el territorio y su equipo tiene una trayectoria sólida.',
    );
    await cruzada(this.p5.id, this.evaluadorDerecho, TipoEvaluacionCruzada.Propia, {
      'item-problema': 9, 'item-objetivos': 7, 'item-metodologia': 6, 'item-participacion-diseno': 7,
      'item-formacion-alumnos': 6, 'item-roles-alumnos': 4, 'item-viabilidad': 4, 'item-presupuesto': 4,
      'item-comunidad': 5, 'item-articulacion': 5, 'item-impacto-esperado': 7, 'item-sostenibilidad': 6,
    }, 'Problema claramente relevante y metodología adecuada al territorio.');
    await cruzada(this.p5.id, this.evaluadorEconomicas, TipoEvaluacionCruzada.Ajena, {
      'item-problema': 9, 'item-objetivos': 7, 'item-metodologia': 6, 'item-participacion-diseno': 7,
      'item-formacion-alumnos': 6, 'item-roles-alumnos': 5, 'item-viabilidad': 4, 'item-presupuesto': 4,
      'item-comunidad': 5, 'item-articulacion': 5, 'item-impacto-esperado': 5, 'item-sostenibilidad': 5,
    }, 'Evaluación desde la Unidad Académica emparejada: buena viabilidad y fuerte articulación comunitaria.');

    await institucional(
      this.p6.id,
      this.authMedicina,
      {
        'sub-trayectoria-equipo': { valor: 8, fundamentacion: 'El equipo médico tiene experiencia en atención primaria.' },
        'sub-antecedentes': { valor: 7, fundamentacion: 'Dispositivos de salud previos en la misma zona.' },
        'sub-complementariedad-equipo': { valor: true },
        'sub-estudiantes-activos': { valor: true },
        'sub-vinculacion-territorio': { valor: 8, fundamentacion: 'Trabajo conjunto con el hospital zonal y las sociedades de fomento.' },
        'sub-coherencia': { valor: 7, fundamentacion: 'Actividades consistentes con los objetivos sanitarios.' },
        'sub-politicas-publicas': { valor: true },
        'sub-devolucion': { valor: true },
      },
      'Intervención oportuna de salud comunitaria con fuerte participación del equipo docente.',
    );
    await cruzada(this.p6.id, this.romero, TipoEvaluacionCruzada.Propia, {
      'item-problema': 8, 'item-objetivos': 7, 'item-metodologia': 6, 'item-participacion-diseno': 7,
      'item-formacion-alumnos': 6, 'item-roles-alumnos': 4, 'item-viabilidad': 4, 'item-presupuesto': 4,
      'item-comunidad': 5, 'item-articulacion': 5, 'item-impacto-esperado': 6, 'item-sostenibilidad': 6,
    }, 'Buena articulación con el sistema de salud local y metodología factible.');
  }

  private async seedEvaluacionesMasivas(anios: number[]): Promise<void> {
    for (const anio of anios) {
      const conv = this.convs.get(anio)!;
      const convConTemplates = await this.convocatoriaRepo.findOne({
        where: { id: conv.id },
        relations: { templateEvaluacionInstitucional: true, templateEvaluacionCruzada: true },
      });
      const estructuraInst = convConTemplates?.templateEvaluacionInstitucional?.estructura;
      const estructuraCruzada = convConTemplates?.templateEvaluacionCruzada?.estructura;

      const ediciones = await this.edicionRepo.find({
        where: { convocatoriaId: conv.id },
      });
      const [instExistentes, cruzadaExistentes] = await Promise.all([
        this.institucionalEvalRepo.find({ where: { convocatoriaId: conv.id }, select: { edicionId: true } }),
        this.cruzadaEvalRepo.find({
          where: { convocatoriaId: conv.id },
          select: { edicionId: true, evaluadorId: true },
        }),
      ]);
      const instSet = new Set(instExistentes.map((e) => e.edicionId));
      const cruzadaSet = new Set(cruzadaExistentes.map((e) => `${e.edicionId}::${e.evaluadorId}`));

      const instRows: EvaluacionInstitucional[] = [];
      const cruzadaRows: EvaluacionCruzada[] = [];

      for (const ed of ediciones) {
        const pool = this.usuariosPorUa.get(ed.unidadAcademicaId);
        if (!pool) continue;

        let instEstado: EstadoEvaluacion;
        let conCruzadas: boolean;
        if (anio === 2026) {
          if (this.rng.bool(0.2)) {
            instEstado = EstadoEvaluacion.Borrador;
            conCruzadas = false;
          } else {
            instEstado = EstadoEvaluacion.Confirmada;
            conCruzadas = true;
          }
        } else if (anio === 2025) {
          instEstado = EstadoEvaluacion.Confirmada;
          conCruzadas = this.rng.bool(0.8);
        } else {
          instEstado = EstadoEvaluacion.Confirmada;
          conCruzadas = true;
        }

        if (estructuraInst && convConTemplates?.templateEvaluacionInstitucionalId) {
          const generada = generarEvaluacionInstitucional(estructuraInst, this.rng, instEstado === EstadoEvaluacion.Confirmada);
          if (!instSet.has(ed.id)) {
            instRows.push(
              this.institucionalEvalRepo.create({
                convocatoriaId: conv.id,
                edicionId: ed.id,
                templateId: convConTemplates.templateEvaluacionInstitucionalId,
                estado: instEstado,
                realizadoPorId: pool.secretaria.id,
                confirmadoPorId: instEstado === EstadoEvaluacion.Confirmada ? pool.secretaria.id : null,
                categorias: generada.categorias,
                checklist: generada.checklist,
                observaciones: generada.observaciones,
              }),
            );
          }
        }

        if (!conCruzadas || !estructuraCruzada || !convConTemplates?.templateEvaluacionCruzadaId) continue;

        const evaluadorPropia = pool.evaluadores[this.rng.entero(0, pool.evaluadores.length - 1)];
        if (evaluadorPropia && !cruzadaSet.has(`${ed.id}::${evaluadorPropia.id}`)) {
          const generada = generarEvaluacionCruzada(estructuraCruzada, this.rng);
          cruzadaRows.push(
            this.cruzadaEvalRepo.create({
              convocatoriaId: conv.id,
              edicionId: ed.id,
              evaluadorId: evaluadorPropia.id,
              tipo: TipoEvaluacionCruzada.Propia,
              templateId: convConTemplates.templateEvaluacionCruzadaId,
              estado: EstadoEvaluacion.Confirmada,
              items: generada.items,
              observaciones: generada.observaciones,
            }),
          );
        }

        const uaPar = this.parMap.get(ed.unidadAcademicaId);
        const poolPar = uaPar ? this.usuariosPorUa.get(uaPar) : undefined;
        if (poolPar && poolPar.evaluadores.length > 0) {
          const evaluadorAjena = poolPar.evaluadores[this.rng.entero(0, poolPar.evaluadores.length - 1)];
          if (!cruzadaSet.has(`${ed.id}::${evaluadorAjena.id}`)) {
            const generada = generarEvaluacionCruzada(estructuraCruzada, this.rng);
            cruzadaRows.push(
              this.cruzadaEvalRepo.create({
                convocatoriaId: conv.id,
                edicionId: ed.id,
                evaluadorId: evaluadorAjena.id,
                tipo: TipoEvaluacionCruzada.Ajena,
                templateId: convConTemplates.templateEvaluacionCruzadaId,
                estado: EstadoEvaluacion.Confirmada,
                items: generada.items,
                observaciones: generada.observaciones,
              }),
            );
          }
        }
      }

      for (let i = 0; i < instRows.length; i += TAMANIO_LOTE) {
        const chunk = instRows.slice(i, i + TAMANIO_LOTE);
        await this.institucionalEvalRepo.save(chunk);
        this.progreso.sumar(chunk.length);
      }
      for (let i = 0; i < cruzadaRows.length; i += TAMANIO_LOTE) {
        const chunk = cruzadaRows.slice(i, i + TAMANIO_LOTE);
        await this.cruzadaEvalRepo.save(chunk);
        this.progreso.sumar(chunk.length);
      }
    }
  }

  // ─────────────────── Resumen ───────────────────

  private async mostrarResumen(): Promise<void> {
    const contar = async (nombre: string, repo: { count(): Promise<number> }): Promise<void> => {
      console.log(`  ${nombre}: ${(await repo.count()).toLocaleString('es-AR')}`);
    };
    await contar('Usuarios', this.usuarioRepo);
    await contar('Proyectos', this.proyectoRepo);
    await contar('Ediciones', this.edicionRepo);
    await contar('Participaciones', this.participacionRepo);
    await contar('Emparejamientos', this.emparejamientoRepo);
    await contar('Evaluaciones institucionales', this.institucionalEvalRepo);
    await contar('Evaluaciones cruzadas', this.cruzadaEvalRepo);
  }
}
