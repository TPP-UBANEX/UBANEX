import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, In, Not, Repository } from 'typeorm';
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
import { TipoAccionAuditoria } from '../common/enums/tipo-accion-auditoria.enum';
import { TipoEntidadAuditoria } from '../common/enums/tipo-entidad-auditoria.enum';
import { RolEjecucion } from '../common/enums/rol-ejecucion.enum';
import { TipoCampo } from '../common/enums/tipo-campo.enum';
import { Genero } from '../common/enums/genero.enum';
import { CargoDocente } from '../common/enums/cargo-docente.enum';
import { TipoDesignacionDocente } from '../common/enums/tipo-designacion-docente.enum';
import { Usuario } from '../usuarios/usuario.entity';
import { Formulario } from '../formularios/formulario.entity';
import { CampoFormulario, ColumnaTabla } from '../formularios/campo-formulario.interface';
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
import { Notificacion } from '../sugerencias/notificacion.entity';
import { SugerenciaCambio } from '../sugerencias/sugerencia-cambio.entity';
import { EstadoSugerencia } from '../common/enums/estado-sugerencia.enum';
import { Auditoria } from '../auditoria/auditoria.entity';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import {
  UAS_NOMBRES,
  CARRERAS_POR_UA,
  FORMULARIOS_SEED,
  NOMBRES,
  APELLIDOS,
  AREAS_DOCENTE,
  TITULO_INICIOS,
  TITULO_TEMAS,
  RESUMENES_PROYECTO,
  COMENTARIOS_SUGERENCIA,
} from './seed.data';
import {
  Rng,
  generarPresupuesto,
  generarEvaluacionInstitucional,
  generarEvaluacionCruzada,
  slugUa,
  clonarCamposConIdsNuevos,
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

// Piso de Rng.proyectosPorUa(): a partir de esta cantidad de ediciones se
// considera que una unidad académica ya fue sembrada para esa convocatoria.
const PROYECTOS_MASIVOS_MINIMO = 20;

// Nombres de los campos del formulario estándar (ver camposFormularioEstandar más abajo),
// usados por seedDatosFormulario() para ubicar cada campo por nombre en vez de por posición:
// así un campo nuevo o reordenado no desalinea los datos sembrados.
const CAMPOS_ESTANDAR = {
  resumen: 'Resumen del proyecto',
  antecedentes: '¿El proyecto tiene antecedentes en convocatorias anteriores?',
  area: 'Área temática principal',
  poblaciones: 'Poblaciones destinatarias',
  cronograma: 'Cronograma de actividades',
} as const;

const COLUMNAS_CRONOGRAMA = {
  actividad: 'Actividad',
  fecha: 'Fecha',
  responsable: 'Responsable',
} as const;

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
  private readonly notificacionRepo: Repository<Notificacion>;
  private readonly sugerenciaRepo: Repository<SugerenciaCambio>;
  private readonly auditoriaRepo: Repository<Auditoria>;

  private readonly rng = new Rng(20260810);
  private readonly uaMap = new Map<string, UnidadAcademica>();
  private readonly uas: UnidadAcademica[] = [];
  private readonly convs = new Map<number, Convocatoria>();
  private readonly usuariosPorUa = new Map<string, PoolUa>();
  private readonly parMap = new Map<string, string>();
  private readonly titulosUsados = new Set<string>();
  private readonly aprobadosPorConvUa = new Map<string, Map<string, Set<string>>>();
  // Proyectos masivos de 2025 elegibles para consolidarse en 2026 (mismo equipo, esConsolidado).
  private readonly consolidados2025 = new Map<string, Array<{ proyecto: Proyecto; directorId: string }>>();
  private readonly progreso = new Progreso(42_000);

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
  private castro!: Usuario;
  private evaluadorDerecho!: Usuario;
  private evaluadorIngenieria!: Usuario;
  private evaluadorEconomicas!: Usuario;

  private p1!: Edicion;
  private p2!: Edicion;
  private p3!: Edicion;
  private p4!: Edicion;
  private p5!: Edicion;
  private p6!: Edicion;
  private p7!: Edicion;
  private p8!: Edicion;

  private pCerrada!: Edicion;
  private pConsolidada!: Edicion;

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
    this.notificacionRepo = dataSource.getRepository(Notificacion);
    this.sugerenciaRepo = dataSource.getRepository(SugerenciaCambio);
    this.auditoriaRepo = dataSource.getRepository(Auditoria);

    this.camposFormularioEstandar = [
      {
        id: crypto.randomUUID(),
        tipo: TipoCampo.Texto,
        nombre: CAMPOS_ESTANDAR.resumen,
        textoAyuda: 'Describí brevemente el objetivo del proyecto',
        esObligatorio: true,
        orden: 0,
      },
      {
        id: crypto.randomUUID(),
        tipo: TipoCampo.Booleano,
        nombre: CAMPOS_ESTANDAR.antecedentes,
        esObligatorio: true,
        orden: 1,
      },
      {
        id: crypto.randomUUID(),
        tipo: TipoCampo.Select,
        nombre: CAMPOS_ESTANDAR.area,
        esObligatorio: true,
        orden: 2,
        opciones: ['Salud', 'Educación', 'Ambiente', 'Tecnología', 'Cultura'],
      },
      {
        id: crypto.randomUUID(),
        tipo: TipoCampo.Checkbox,
        nombre: CAMPOS_ESTANDAR.poblaciones,
        esObligatorio: false,
        orden: 3,
        opciones: ['Niños y adolescentes', 'Adultos mayores', 'Personas con discapacidad', 'Comunidad general'],
      },
      {
        id: crypto.randomUUID(),
        tipo: TipoCampo.Tabla,
        nombre: CAMPOS_ESTANDAR.cronograma,
        textoAyuda: 'Detallá las actividades previstas para el proyecto',
        esObligatorio: true,
        orden: 4,
        columnas: [
          { id: crypto.randomUUID(), tipo: TipoCampo.Texto, nombre: COLUMNAS_CRONOGRAMA.actividad, esObligatorio: true },
          { id: crypto.randomUUID(), tipo: TipoCampo.Fecha, nombre: COLUMNAS_CRONOGRAMA.fecha, esObligatorio: true },
          { id: crypto.randomUUID(), tipo: TipoCampo.Texto, nombre: COLUMNAS_CRONOGRAMA.responsable, esObligatorio: false },
        ],
        filasMinimas: 1,
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

    console.log('\n=== SEED: Plantillas de evaluación ===');
    await this.seedTemplates();

    console.log('\n=== SEED: Convocatorias ===');
    await this.seedConvocatorias();

    console.log('\n=== SEED: Proyectos y Ediciones ===');
    await this.seedProyectosCanonicos();
    await this.seedProyectosMasivos([2023, 2024, 2025, 2026, 2027]);

    console.log('\n=== SEED: Participaciones ===');
    await this.seedParticipacionesCanonicas();
    await this.seedParticipacionesMasivas([2023, 2024, 2025, 2026, 2027]);

    console.log('\n=== SEED: Emparejamientos ===');
    await this.seedEmparejamientos();

    console.log('\n=== SEED: Evaluaciones ===');
    await this.seedEvaluacionesCanonicas();
    await this.seedEvaluacionesMasivas([2023, 2024, 2025, 2026]);

    console.log('\n=== SEED: Sugerencias ===');
    await this.seedSugerencias();

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

    const directoresSpecs: Array<Partial<Usuario>> = generarEmails('director', 100).map((email) => {
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
    this.castro = await this.seedDocente(
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
    // Se busca por nombre y no por esDefault: la app mueve ese flag a otro
    // formulario cuando se marca uno nuevo como default desde la UI, y el seed
    // igual necesita su formulario estándar para las copias por convocatoria.
    const nombreEstandar = FORMULARIOS_SEED.find((f) => f.esDefault)!.nombre;
    this.formularioDefault = creados.find((f) => f.nombre === nombreEstandar)!;
    if (this.formularioDefault.campos && this.formularioDefault.campos.length > 0) {
      this.camposFormularioEstandar = this.formularioDefault.campos;
    }
  }

  // ─────────────────── Plantillas de evaluación ───────────────────

  private async seedTemplates(): Promise<void> {
    const nombreInst = 'Plantilla institucional UBANEX';
    const existenteInst = await this.templateInstRepo.findOne({ where: { esDefault: true } });
    if (existenteInst && existenteInst.nombre !== nombreInst) {
      existenteInst.nombre = nombreInst;
      await this.templateInstRepo.save(existenteInst);
    }
    this.templateInst =
      existenteInst ??
      (await this.templateInstRepo.save(
        this.templateInstRepo.create({
          nombre: nombreInst,
          esDefault: true,
          esPlantilla: true,
          estructura: TEMPLATE_INSTITUCIONAL_DEFAULT,
        }),
      ));

    const nombreCruzada = 'Plantilla cruzada UBANEX';
    const existenteCruzada = await this.templateCruzadaRepo.findOne({ where: { esDefault: true } });
    if (existenteCruzada && existenteCruzada.nombre !== nombreCruzada) {
      existenteCruzada.nombre = nombreCruzada;
      await this.templateCruzadaRepo.save(existenteCruzada);
    }
    this.templateCruzada =
      existenteCruzada ??
      (await this.templateCruzadaRepo.save(
        this.templateCruzadaRepo.create({
          nombre: nombreCruzada,
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
      let huboCambios = false;
      if (data.estado && existe.estado !== data.estado) {
        existe.estado = data.estado;
        huboCambios = true;
        console.log(`  ${existe.nombre} — estado reconciliado a ${existe.estado}`);
      }
      if (existe.umbralInconsistenciaCruzada == null && data.umbralInconsistenciaCruzada != null) {
        existe.umbralInconsistenciaCruzada = data.umbralInconsistenciaCruzada;
        huboCambios = true;
        console.log(`  ${existe.nombre} — umbral de inconsistencia reconciliado a ${existe.umbralInconsistenciaCruzada}`);
      }
      if (huboCambios) {
        await this.convocatoriaRepo.save(existe);
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
        campos: this.formularioDefault.campos
          ? clonarCamposConIdsNuevos(this.formularioDefault.campos)
          : null,
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
        console.log(`  ${conv.nombre} — formulario institucional congelado (copia privada)`);
      } else {
        conv.templateEvaluacionInstitucionalId = this.templateInst.id;
        conv.templateEvaluacionInstitucional = this.templateInst;
      }
      huboCambios = true;
    } else if (inst.esPlantilla && !inst.esDefault && / \(copia \d{4}\)$/.test(inst.nombre)) {
      if (congelada) {
        inst.esPlantilla = false;
        await this.templateInstRepo.save(inst);
        console.log(`  ${conv.nombre} — formulario institucional tomado como propio (privado)`);
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
      console.log(`  ${conv.nombre} — formulario institucional congelado (copia privada)`);
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
        console.log(`  ${conv.nombre} — formulario cruzada congelado (copia privada)`);
      } else {
        conv.templateEvaluacionCruzadaId = this.templateCruzada.id;
        conv.templateEvaluacionCruzada = this.templateCruzada;
      }
      huboCambios = true;
    } else if (cruzada.esPlantilla && !cruzada.esDefault && / \(copia \d{4}\)$/.test(cruzada.nombre)) {
      if (congelada) {
        cruzada.esPlantilla = false;
        await this.templateCruzadaRepo.save(cruzada);
        console.log(`  ${conv.nombre} — formulario cruzada tomado como propio (privado)`);
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
      console.log(`  ${conv.nombre} — formulario cruzada congelado (copia privada)`);
    }

    if (huboCambios) {
      await this.convocatoriaRepo.save(conv);
    }
    console.log(`  ${conv.nombre} — formularios de evaluación asociados`);
  }

  private async seedConvocatorias(): Promise<void> {
    const especificaciones: Array<{ anio: number; estado: EstadoConvocatoria; umbralInconsistenciaCruzada?: number }> = [
      { anio: 2023, estado: EstadoConvocatoria.Cierre, umbralInconsistenciaCruzada: 20 },
      { anio: 2024, estado: EstadoConvocatoria.Cierre, umbralInconsistenciaCruzada: 20 },
      { anio: 2025, estado: EstadoConvocatoria.Ejecucion, umbralInconsistenciaCruzada: 20 },
      { anio: 2026, estado: EstadoConvocatoria.Evaluacion, umbralInconsistenciaCruzada: 20 },
      { anio: 2027, estado: EstadoConvocatoria.Presentacion, umbralInconsistenciaCruzada: 20 },
      { anio: 2028, estado: EstadoConvocatoria.Configuracion, umbralInconsistenciaCruzada: 20 },
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
        umbralInconsistenciaCruzada: spec.umbralInconsistenciaCruzada,
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
    esInterfacultad = false,
    unidadAcademicaAdicionalId?: string,
    esConsolidado = false,
  ): Promise<Edicion> {
    const existeProyecto = await this.proyectoRepo.findOne({ where: { nombre: nombreProyecto } });
    if (existeProyecto) {
      if (
        existeProyecto.esInterfacultad !== esInterfacultad ||
        existeProyecto.unidadAcademicaAdicionalId !== (unidadAcademicaAdicionalId ?? null) ||
        existeProyecto.esConsolidado !== esConsolidado
      ) {
        existeProyecto.esInterfacultad = esInterfacultad;
        existeProyecto.unidadAcademicaAdicionalId = unidadAcademicaAdicionalId ?? null;
        existeProyecto.esConsolidado = esConsolidado;
        await this.proyectoRepo.save(existeProyecto);
        console.log(`  ${nombreProyecto} — condición de interfacultad reconciliada`);
      }
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
      this.proyectoRepo.create({
        nombre: nombreProyecto,
        creadoPorId: creadoPor.id,
        esInterfacultad,
        unidadAcademicaAdicionalId: unidadAcademicaAdicionalId ?? null,
        esConsolidado,
      }),
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

  /**
   * Busca un campo del formulario de la convocatoria por nombre (no por posición): si alguien agrega
   * o reordena un campo y se olvida de actualizar este método, falla acá en vez de sembrar
   * datosFormulario con valores en los ids equivocados.
   */
  private campoEstandar(campos: CampoFormulario[], nombre: string): CampoFormulario {
    const campo = campos.find((c) => c.nombre === nombre);
    if (!campo) {
      throw new Error(
        `Seed desactualizado: el formulario de la convocatoria no tiene el campo "${nombre}". ` +
          'Actualizá seedDatosFormulario() en backend/src/seed/seed.service.ts.',
      );
    }
    return campo;
  }

  /** Ídem campoEstandar(), para una columna dentro de un campo tabla. */
  private columnaEstandar(campo: CampoFormulario, nombre: string): ColumnaTabla {
    const columna = campo.columnas?.find((c) => c.nombre === nombre);
    if (!columna) {
      throw new Error(
        `Seed desactualizado: "${campo.nombre}" no tiene la columna "${nombre}". ` +
          'Actualizá seedDatosFormulario() en backend/src/seed/seed.service.ts.',
      );
    }
    return columna;
  }

  /**
   * Arma datosFormulario claveado por los ids del formulario real de la convocatoria (no por los de
   * la plantilla): así las respuestas siempre coinciden con los campos que muestra la edición.
   * Si `completo` es false se omiten campos (cronograma, poblaciones, antecedentes) para simular
   * un borrador en preparación.
   */
  private seedDatosFormulario(
    campos: CampoFormulario[],
    opts: {
      resumen: string;
      area: string;
      poblaciones: string[];
      antecedentes?: boolean;
      anio: number;
      completo?: boolean;
    },
  ): Record<string, unknown> {
    const campoResumen = this.campoEstandar(campos, CAMPOS_ESTANDAR.resumen);
    const campoArea = this.campoEstandar(campos, CAMPOS_ESTANDAR.area);
    const completo = opts.completo ?? true;

    const base: Record<string, unknown> = {
      [campoResumen.id]: opts.resumen,
      [campoArea.id]: opts.area,
    };
    if (!completo) return base;

    const campoAntecedentes = this.campoEstandar(campos, CAMPOS_ESTANDAR.antecedentes);
    const campoPoblaciones = this.campoEstandar(campos, CAMPOS_ESTANDAR.poblaciones);
    base[campoAntecedentes.id] = opts.antecedentes ?? false;
    base[campoPoblaciones.id] = opts.poblaciones;

    const campoCronograma = this.campoEstandar(campos, CAMPOS_ESTANDAR.cronograma);
    if (!campoCronograma.columnas) return base;
    const colActividad = this.columnaEstandar(campoCronograma, COLUMNAS_CRONOGRAMA.actividad);
    const colFecha = this.columnaEstandar(campoCronograma, COLUMNAS_CRONOGRAMA.fecha);
    const colResponsable = this.columnaEstandar(campoCronograma, COLUMNAS_CRONOGRAMA.responsable);
    base[campoCronograma.id] = [
      {
        [colActividad.id]: 'Diagnóstico y relevamiento territorial',
        [colFecha.id]: `${opts.anio}-09-15`,
        [colResponsable.id]: 'Dirección',
      },
      {
        [colActividad.id]: 'Desarrollo de actividades con la comunidad',
        [colFecha.id]: `${opts.anio}-11-10`,
        [colResponsable.id]: 'Equipo docente',
      },
      {
        [colActividad.id]: 'Evaluación y devolución de resultados',
        [colFecha.id]: `${opts.anio + 1}-02-20`,
        [colResponsable.id]: 'Dirección',
      },
    ];
    return base;
  }

  private async seedProyectosCanonicos(): Promise<void> {
    const presupuestoEjecucion = (anio: number) => ({
      montoTotal: 500000,
      rubros: [
        {
          tipo: 'ViaticosYSeguros',
          subtotal: 200000,
          partidas: [
            { tipoPersona: 'Docente', descripcion: 'Viáticos para docentes', periodoInicio: `${anio}-08`, periodoFin: `${anio}-12`, monto: 100000 },
            { tipoPersona: 'Estudiante', descripcion: 'Viáticos para estudiantes', periodoInicio: `${anio}-08`, periodoFin: `${anio}-12`, monto: 100000 },
          ],
        },
        { tipo: 'BienesDeConsumo', subtotal: 150000, partidas: [{ descripcion: 'Materiales e insumos', cantidad: 50, precioUnitario: 3000, monto: 150000 }] },
        { tipo: 'BienesDeUso', subtotal: 150000, partidas: [{ descripcion: 'Equipamiento', cantidad: 3, precioUnitario: 50000, monto: 150000 }] },
      ],
    });
    const presupuestoBorrador = (anio: number) => ({
      montoTotal: 600000,
      rubros: [
        {
          tipo: 'ViaticosYSeguros',
          subtotal: 250000,
          partidas: [
            { tipoPersona: 'Docente', descripcion: 'Viáticos', periodoInicio: `${anio}-11`, periodoFin: `${anio + 1}-02`, monto: 150000 },
            { tipoPersona: 'Estudiante', descripcion: 'Viáticos', periodoInicio: `${anio}-11`, periodoFin: `${anio + 1}-02`, monto: 100000 },
          ],
        },
        { tipo: 'BienesDeConsumo', subtotal: 200000, partidas: [{ descripcion: 'Insumos', cantidad: 100, precioUnitario: 2000, monto: 200000 }] },
        { tipo: 'BienesDeUso', subtotal: 150000, partidas: [{ descripcion: 'Equipos', cantidad: 2, precioUnitario: 75000, monto: 150000 }] },
      ],
    });

    const derecho = this.uaMap.get('Facultad de Derecho')!;
    const ingenieria = this.uaMap.get('Facultad de Ingeniería')!;
    const medicina = this.uaMap.get('Facultad de Medicina')!;
    const cbc = this.uaMap.get('Ciclo Básico Común (CBC)')!;
    const conv2025 = this.convs.get(2025)!;
    const conv2026 = this.convs.get(2026)!;
    const campos2025 = await this.camposDeConvocatoria(conv2025);
    const campos2026 = await this.camposDeConvocatoria(conv2026);

    this.p1 = await this.seedProyectoConEdicion(
      'Red de Voluntariado Ambiental',
      this.garcia, derecho, conv2026, EstadoEdicion.Presentado, presupuestoBorrador(2026),
      this.seedDatosFormulario(campos2026, {
        resumen: 'Red de voluntarios para la restauración de humedales y espacios verdes urbanos.',
        area: 'Ambiente',
        poblaciones: ['Comunidad general'],
        anio: 2026,
      }),
    );
    this.p2 = await this.seedProyectoConEdicion(
      'Inclusión Digital en Barrios Populares',
      this.perez, derecho, conv2026, EstadoEdicion.EnEvaluacion, presupuestoBorrador(2026),
      this.seedDatosFormulario(campos2026, {
        resumen: 'Talleres de alfabetización digital y acceso a herramientas tecnológicas en barrios populares.',
        area: 'Tecnología',
        poblaciones: ['Niños y adolescentes', 'Adultos mayores'],
        antecedentes: true,
        anio: 2026,
      }),
      true,
      cbc.id,
    );
    this.p3 = await this.seedProyectoConEdicion(
      'Huerta Comunitaria y Seguridad Alimentaria',
      this.fernandez, ingenieria, conv2026, EstadoEdicion.Adjudicado, presupuestoBorrador(2026),
      this.seedDatosFormulario(campos2026, {
        resumen: 'Huertas comunitarias con técnicas agroecológicas para mejorar la seguridad alimentaria del barrio.',
        area: 'Ambiente',
        poblaciones: ['Comunidad general'],
        anio: 2026,
      }),
      false,
      undefined,
      true,
    );
    this.p4 = await this.seedProyectoConEdicion(
      'Alfabetización Científica en Escuelas',
      this.diaz, ingenieria, conv2026, EstadoEdicion.EnEvaluacion, presupuestoBorrador(2026),
      this.seedDatosFormulario(campos2026, {
        resumen: 'Laboratorios itinerantes de ciencias en escuelas secundarias para fomentar vocaciones científicas.',
        area: 'Educación',
        poblaciones: ['Niños y adolescentes'],
        antecedentes: true,
        anio: 2026,
      }),
      true,
      medicina.id,
    );
    this.p5 = await this.seedProyectoConEdicion(
      'Taller de Oficios para la Inclusión Laboral',
      this.garcia, derecho, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion(2025),
      this.seedDatosFormulario(campos2025, {
        resumen: 'Talleres de oficios orientados a la inserción laboral de personas en situación de vulnerabilidad.',
        area: 'Cultura',
        poblaciones: ['Comunidad general'],
        anio: 2025,
      }),
    );
    this.p6 = await this.seedProyectoConEdicion(
      'Salud Comunitaria en Barrios Vulnerables',
      this.torres, medicina, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion(2025),
      this.seedDatosFormulario(campos2025, {
        resumen: 'Atención primaria de salud y prevención en barrios vulnerables con participación comunitaria.',
        area: 'Salud',
        poblaciones: ['Comunidad general'],
        anio: 2025,
      }),
    );

    const conv2027 = this.convs.get(2027)!;
    const campos2027 = await this.camposDeConvocatoria(conv2027);
    this.p7 = await this.seedProyectoConEdicion(
      'Huerta Agroecológica y Educación Ambiental',
      this.garcia, derecho, conv2027, EstadoEdicion.Presentado, presupuestoBorrador(2027),
      this.seedDatosFormulario(campos2027, {
        resumen: 'Huerta agroecológica escolar con talleres de educación ambiental para niños y adolescentes.',
        area: 'Ambiente',
        poblaciones: ['Niños y adolescentes'],
        antecedentes: true,
        anio: 2027,
      }),
    );
    this.p8 = await this.seedProyectoConEdicion(
      'Cine Comunitario y Memoria Barrial',
      this.fernandez, ingenieria, conv2027, EstadoEdicion.PendienteDeCambios, presupuestoBorrador(2027),
      this.seedDatosFormulario(campos2027, {
        resumen: 'Ciclos de cine comunitario para la recuperación de la memoria barrial y la identidad local.',
        area: 'Cultura',
        poblaciones: ['Comunidad general'],
        anio: 2027,
      }),
    );

    const conv2023 = this.convs.get(2023)!;
    const campos2023 = await this.camposDeConvocatoria(conv2023);
    this.pCerrada = await this.seedProyectoConEdicion(
      'Prevención Comunitaria en Salud Bucal',
      this.torres, medicina, conv2023, EstadoEdicion.Cerrado, presupuestoEjecucion(2023),
      this.seedDatosFormulario(campos2023, {
        resumen: 'Campañas de prevención y hábitos de salud bucal en escuelas y centros comunitarios.',
        area: 'Salud',
        poblaciones: ['Niños y adolescentes'],
        anio: 2023,
      }),
    );

    this.pConsolidada = await this.seedProyectoConEdicion(
      'Oficios Digitales para la Inclusión Laboral',
      this.diaz, ingenieria, conv2025, EstadoEdicion.EnEjecucion, presupuestoEjecucion(2025),
      this.seedDatosFormulario(campos2025, {
        resumen: 'Fortalecimiento de talleres de oficios digitales, consolidando la línea iniciada en ediciones previas.',
        area: 'Tecnología',
        poblaciones: ['Comunidad general'],
        antecedentes: true,
        anio: 2025,
      }),
      false,
      undefined,
      true,
    );
  }

  private tituloUnico(base: string): string {
    let titulo = base;
    let sufijo = 1;
    while (this.titulosUsados.has(titulo)) {
      titulo = `${base} ${++sufijo}`;
    }
    this.titulosUsados.add(titulo);
    return titulo;
  }

  /** Estados de edición coherentes con la etapa en que está la convocatoria. */
  private estadosEdicionPorConvocatoria(estado: EstadoConvocatoria): EstadoEdicion[] {
    switch (estado) {
      case EstadoConvocatoria.Cierre:
        return [EstadoEdicion.Cerrado];
      case EstadoConvocatoria.Ejecucion:
        return [EstadoEdicion.EnEjecucion];
      case EstadoConvocatoria.Evaluacion:
        return [EstadoEdicion.Presentado, EstadoEdicion.EnEvaluacion];
      case EstadoConvocatoria.Presentacion:
        return [EstadoEdicion.Borrador, EstadoEdicion.Presentado, EstadoEdicion.PendienteDeCambios];
      default:
        return [];
    }
  }

  private async camposDeConvocatoria(convocatoria: Convocatoria): Promise<CampoFormulario[]> {
    if (convocatoria.formulario?.campos) return convocatoria.formulario.campos;
    const conv = await this.convocatoriaRepo.findOne({
      where: { id: convocatoria.id },
      relations: { formulario: true },
    });
    return conv?.formulario?.campos ?? [];
  }

  private tomarUsuarioDisponible(participantes: Usuario[], usados: Set<string>): Usuario | undefined {
    if (participantes.length === 0) return undefined;
    for (let i = 0; i < participantes.length; i++) {
      const u = participantes[this.rng.entero(0, participantes.length - 1)];
      if (!usados.has(u.id)) {
        usados.add(u.id);
        return u;
      }
    }
    return undefined;
  }

  /** Codirector de la UA adicional si el proyecto es interfacultad, sino del pool propio. */
  private elegirCodirector(
    pool: PoolUa,
    uaAdicionalId: string | null,
    usadosConv: Set<string>,
  ): Usuario | undefined {
    if (uaAdicionalId) {
      const fuente = this.usuariosPorUa.get(uaAdicionalId);
      const candidato = fuente ? this.tomarUsuarioDisponible(fuente.docentes, usadosConv) : undefined;
      if (candidato) return candidato;
    }
    return this.tomarUsuarioDisponible(pool.docentes, usadosConv);
  }

  /**
   * Inserta en lote todas las ediciones masivas de una convocatoria y sus participaciones de
   * director/codirector. Antes de esto el seed guardaba proyecto + edición + participaciones
   * registro por registro (un round-trip a la DB por cada uno); acá se acumulan y se hacen
   * INSERT múltiples por lote.
   */
  private async flushEdicionesMasivas(
    convocatoriaId: string,
    anio: number,
    edicionesPlan: Array<{
      proyecto: Proyecto;
      uaId: string;
      estado: EstadoEdicion;
      directorId: string;
      codirectorId: string | null;
      presupuesto: object | null;
      datos: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (edicionesPlan.length === 0) return;

    const ediciones: Edicion[] = edicionesPlan.map((plan) => {
      const edicion = this.edicionRepo.create({
        proyectoId: plan.proyecto.id,
        convocatoriaId,
        estado: plan.estado,
        creadoPorId: plan.directorId,
        unidadAcademicaId: plan.uaId,
        anioEdicion: anio,
        presupuesto: plan.presupuesto,
        datosFormulario: plan.datos,
      });
      edicion.id = crypto.randomUUID();
      return edicion;
    });

    for (let i = 0; i < ediciones.length; i += TAMANIO_LOTE) {
      const chunk = ediciones.slice(i, i + TAMANIO_LOTE);
      await this.edicionRepo.insert(chunk);
      this.progreso.sumar(chunk.length);
    }

    const participaciones: ParticipacionConvocatoria[] = [];
    for (let i = 0; i < ediciones.length; i++) {
      const edicion = ediciones[i];
      const plan = edicionesPlan[i];
      const pool = this.usuariosPorUa.get(plan.uaId);
      const secretaria = pool?.secretaria;
      if (!secretaria) continue;

      const filas: ParticipacionConvocatoria[] = [
        this.participacionRepo.create({
          usuarioId: plan.directorId,
          convocatoriaId,
          rol: RolEjecucion.DirectorDeProyecto,
          edicionId: edicion.id,
          esDirectorPrincipal: true,
          asignadoPorId: secretaria.id,
          estado: null,
        }),
      ];
      if (plan.codirectorId) {
        filas.push(
          this.participacionRepo.create({
            usuarioId: plan.codirectorId,
            convocatoriaId,
            rol: RolEjecucion.DirectorDeProyecto,
            edicionId: edicion.id,
            esDirectorPrincipal: false,
            asignadoPorId: secretaria.id,
            estado: null,
          }),
        );
      }
      for (const fila of filas) fila.id = crypto.randomUUID();
      participaciones.push(...filas);
    }

    for (let i = 0; i < participaciones.length; i += TAMANIO_LOTE) {
      const chunk = participaciones.slice(i, i + TAMANIO_LOTE);
      await this.participacionRepo.insert(chunk);
      this.progreso.sumar(chunk.length);
    }
  }

  private async seedProyectosMasivos(anios: number[]): Promise<void> {
    const areas = ['Salud', 'Educación', 'Ambiente', 'Tecnología', 'Cultura'];
    const poblaciones = ['Niños y adolescentes', 'Adultos mayores', 'Personas con discapacidad', 'Comunidad general'];

    for (const anio of anios) {
      const conv = this.convs.get(anio)!;
      const camposConv = await this.camposDeConvocatoria(conv);
      const usadosConv = new Set<string>();
      const estadosPermitidos = this.estadosEdicionPorConvocatoria(conv.estado);
      if (estadosPermitidos.length === 0) continue;

      const edicionesExistentes = await this.edicionRepo.find({
        where: { convocatoriaId: conv.id },
        relations: { proyecto: true },
      });
      const nombresExistentes = new Set(edicionesExistentes.map((e) => e.proyecto.nombre));
      const edicionesPorUa = new Map<string, number>();
      for (const e of edicionesExistentes) {
        edicionesPorUa.set(e.unidadAcademicaId, (edicionesPorUa.get(e.unidadAcademicaId) ?? 0) + 1);
      }

      const seleccionarEstadoMasivo = (): EstadoEdicion => {
        if (estadosPermitidos.length === 1) return estadosPermitidos[0];
        if (estadosPermitidos.length === 2) {
          return this.rng.bool(0.42) ? estadosPermitidos[0] : estadosPermitidos[1];
        }
        const r = this.rng.float();
        if (r < 0.35) return EstadoEdicion.Borrador;
        return r < 0.8 ? EstadoEdicion.Presentado : EstadoEdicion.PendienteDeCambios;
      };

      // Acumuladores de la corrida: se construyen en memoria (decisión determinista por UA) y
      // se persisten al final por lotes, para no pagar un round-trip por registro.
      const proyectosNuevos: Proyecto[] = [];
      const consolidados: Proyecto[] = [];
      const edicionesPlan: Array<{
        proyecto: Proyecto;
        uaId: string;
        estado: EstadoEdicion;
        directorId: string;
        codirectorId: string | null;
        presupuesto: object | null;
        datos: Record<string, unknown>;
      }> = [];

      for (const ua of this.uas) {
        const pool = this.usuariosPorUa.get(ua.id);
        if (!pool) continue;
        if ((edicionesPorUa.get(ua.id) ?? 0) >= PROYECTOS_MASIVOS_MINIMO) continue;

        // 1) Consolidados de 2025 → en 2026 pasan directo a la adjudicación (saltean evaluación).
        if (anio === 2026) {
          const candidatos = this.consolidados2025.get(ua.id) ?? [];
          for (const cand of candidatos) {
            if (nombresExistentes.has(cand.proyecto.nombre)) continue;
            cand.proyecto.esConsolidado = true;
            consolidados.push(cand.proyecto);
            usadosConv.add(cand.directorId);
            const codirector = this.elegirCodirector(
              pool,
              cand.proyecto.esInterfacultad ? cand.proyecto.unidadAcademicaAdicionalId : null,
              usadosConv,
            );
            if (codirector) usadosConv.add(codirector.id);
            nombresExistentes.add(cand.proyecto.nombre);
            edicionesPlan.push({
              proyecto: cand.proyecto,
              uaId: ua.id,
              estado: EstadoEdicion.Adjudicado,
              directorId: cand.directorId,
              codirectorId: codirector?.id ?? null,
              presupuesto: generarPresupuesto(this.rng, anio),
              datos: this.seedDatosFormulario(camposConv, {
                resumen: 'Proyecto consolidado que continúa su línea de trabajo con el mismo equipo directivo.',
                area: this.rng.pick(areas),
                poblaciones: [this.rng.pick(poblaciones)],
                antecedentes: true,
                anio,
              }),
            });
          }
        }

        // 2) Proyectos nuevos.
        const cantidad = this.rng.proyectosPorUa();
        const directoresDisponibles = pool.directores.filter((d) => !usadosConv.has(d.id));
        const consolidablesUa: Array<{ proyecto: Proyecto; directorId: string }> = [];

        for (let i = 0; i < cantidad; i++) {
          const tema = this.rng.pick(TITULO_TEMAS);
          const titulo = this.tituloUnico(`${this.rng.pick(TITULO_INICIOS)} ${tema}`);
          if (nombresExistentes.has(titulo)) continue;

          const esInterfacultad = this.rng.bool(0.28);
          const uaAdicionalId = esInterfacultad
            ? this.rng.pick(this.uas.filter((u) => u.id !== ua.id)).id
            : null;

          let estado = seleccionarEstadoMasivo();
          const director = this.tomarUsuarioDisponible(directoresDisponibles, usadosConv);
          if (!director) break;

          let codirectorId: string | null = null;
          if (estado !== EstadoEdicion.Borrador) {
            const codirector = this.elegirCodirector(pool, uaAdicionalId, usadosConv);
            if (codirector) {
              codirectorId = codirector.id;
            } else {
              estado = EstadoEdicion.Borrador;
            }
          }

          const proyecto = this.proyectoRepo.create({
            nombre: titulo,
            creadoPorId: director.id,
            esConsolidado: false,
            esInterfacultad,
            unidadAcademicaAdicionalId: uaAdicionalId,
          });
          proyecto.id = crypto.randomUUID();
          proyectosNuevos.push(proyecto);

          const datos = this.seedDatosFormulario(camposConv, {
            resumen: this.rng.pick(RESUMENES_PROYECTO).replace('{tema}', tema),
            area: this.rng.pick(areas),
            poblaciones: [this.rng.pick(poblaciones)],
            antecedentes: this.rng.bool(0.5),
            anio,
            completo: estado !== EstadoEdicion.Borrador,
          });
          const presupuesto = estado === EstadoEdicion.Borrador ? null : generarPresupuesto(this.rng, anio);

          edicionesPlan.push({
            proyecto,
            uaId: ua.id,
            estado,
            directorId: director.id,
            codirectorId,
            presupuesto,
            datos,
          });
          nombresExistentes.add(titulo);

          if (anio === 2025 && estado === EstadoEdicion.EnEjecucion && this.rng.bool(0.12)) {
            consolidablesUa.push({ proyecto, directorId: director.id });
          }
        }

        if (anio === 2025) {
          this.consolidados2025.set(ua.id, consolidablesUa);
        }
      }

      // Flush por lotes: consolidados (UPDATE) → proyectos nuevos (INSERT) → ediciones y participaciones.
      if (consolidados.length > 0) {
        for (let i = 0; i < consolidados.length; i += TAMANIO_LOTE) {
          const ids = consolidados.slice(i, i + TAMANIO_LOTE).map((p) => p.id);
          await this.proyectoRepo.update({ id: In(ids) }, { esConsolidado: true });
          this.progreso.sumar(ids.length);
        }
      }
      for (let i = 0; i < proyectosNuevos.length; i += TAMANIO_LOTE) {
        const chunk = proyectosNuevos.slice(i, i + TAMANIO_LOTE);
        await this.proyectoRepo.insert(chunk);
        this.progreso.sumar(chunk.length);
      }
      await this.flushEdicionesMasivas(conv.id, anio, edicionesPlan);
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

  private async seedEvaluadorAprobadoCanonico(
    usuarioId: string,
    convocatoriaId: string,
    convocatoriaNombre: string,
    asignadoPorId: string,
  ): Promise<void> {
    const p = await this.seedParticipacion({
      usuarioId,
      convocatoriaId,
      rol: RolEjecucion.Evaluador,
      estado: EstadoPropuestaEvaluador.Aprobado,
      asignadoPorId,
    });
    const notifExiste = await this.notificacionRepo.findOne({
      where: { participacionId: p.id, tipo: TipoNotificacion.RESULTADO_EVALUADOR },
    });
    if (notifExiste) return;
    await this.notificacionRepo.save(
      this.notificacionRepo.create({
        usuarioId,
        tipo: TipoNotificacion.RESULTADO_EVALUADOR,
        participacionId: p.id,
        mensaje: `Tu propuesta como evaluador en la convocatoria "${convocatoriaNombre}" fue aprobada`,
        leida: false,
      }),
    );
  }

  private async seedParticipacionesCanonicas(): Promise<void> {
    const conv2023 = this.convs.get(2023)!;
    const conv2025 = this.convs.get(2025)!;
    const conv2026 = this.convs.get(2026)!;
    const conv2027 = this.convs.get(2027)!;

    await this.seedParticipacion({ usuarioId: this.garcia.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p1.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.perez.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p2.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.castro.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p2.id, esDirectorPrincipal: false, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.fernandez.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p3.id, esDirectorPrincipal: true, asignadoPorId: this.authIngenieria.id });
    await this.seedParticipacion({ usuarioId: this.diaz.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p4.id, esDirectorPrincipal: true, asignadoPorId: this.authIngenieria.id });
    await this.seedParticipacion({ usuarioId: this.romero.id, convocatoriaId: conv2026.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p4.id, esDirectorPrincipal: false, asignadoPorId: this.authIngenieria.id });
    await this.seedEvaluadorAprobadoCanonico(this.moreno.id, conv2026.id, conv2026.nombre, this.authIngenieria.id);
    await this.seedEvaluadorAprobadoCanonico(this.evaluadorDerecho.id, conv2026.id, conv2026.nombre, this.authDerecho.id);
    await this.seedEvaluadorAprobadoCanonico(this.evaluadorIngenieria.id, conv2026.id, conv2026.nombre, this.authIngenieria.id);

    await this.seedParticipacion({ usuarioId: this.garcia.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p5.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.perez.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p5.id, esDirectorPrincipal: false, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.torres.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p6.id, esDirectorPrincipal: true, asignadoPorId: this.authMedicina.id });
    await this.seedEvaluadorAprobadoCanonico(this.romero.id, conv2025.id, conv2025.nombre, this.authMedicina.id);
    await this.seedEvaluadorAprobadoCanonico(this.evaluadorDerecho.id, conv2025.id, conv2025.nombre, this.authDerecho.id);
    await this.seedEvaluadorAprobadoCanonico(this.evaluadorEconomicas.id, conv2025.id, conv2025.nombre, this.admin.id);
    await this.seedParticipacion({ usuarioId: this.diaz.id, convocatoriaId: conv2025.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.pConsolidada.id, esDirectorPrincipal: true, asignadoPorId: this.authIngenieria.id });

    await this.seedParticipacion({ usuarioId: this.torres.id, convocatoriaId: conv2023.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.pCerrada.id, esDirectorPrincipal: true, asignadoPorId: this.authMedicina.id });

    await this.seedParticipacion({ usuarioId: this.garcia.id, convocatoriaId: conv2027.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p7.id, esDirectorPrincipal: true, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.perez.id, convocatoriaId: conv2027.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p7.id, esDirectorPrincipal: false, asignadoPorId: this.authDerecho.id });
    await this.seedParticipacion({ usuarioId: this.fernandez.id, convocatoriaId: conv2027.id, rol: RolEjecucion.DirectorDeProyecto, edicionId: this.p8.id, esDirectorPrincipal: true, asignadoPorId: this.authIngenieria.id });
  }

  private async seedParticipacionesMasivas(anios: number[]): Promise<void> {
    for (const anio of anios) {
      const conv = this.convs.get(anio)!;
      const existentes = await this.participacionRepo.find({
        where: { convocatoriaId: conv.id },
        relations: { usuario: true },
        select: {
          usuarioId: true,
          estado: true,
          rol: true,
          usuario: { id: true, unidadAcademicaId: true },
        },
      });
      const existSet = new Set(existentes.map((p) => p.usuarioId));
      const evaluadorRows: ParticipacionConvocatoria[] = [];
      const notifMeta: Array<{
        usuarioId: string;
        tipo: TipoNotificacion;
        mensaje: string;
        leida: boolean;
      }> = [];
      const aprobadosUa = new Map<string, Set<string>>();

      for (const ua of this.uas) {
        const pool = this.usuariosPorUa.get(ua.id);
        if (!pool) continue;

        const aprobadosEnUa = existentes.filter(
          (p) =>
            p.rol === RolEjecucion.Evaluador &&
            p.estado === EstadoPropuestaEvaluador.Aprobado &&
            p.usuario?.unidadAcademicaId === ua.id,
        );
        aprobadosUa.set(ua.id, new Set(aprobadosEnUa.map((p) => p.usuarioId)));

        const disponibles = pool.evaluadores.filter((e) => !existSet.has(e.id));
        const tomar = (n: number): Usuario[] => {
          const elegidos: Usuario[] = [];
          for (let i = 0; i < n && disponibles.length > 0; i++) {
            elegidos.push(disponibles.splice(this.rng.entero(0, disponibles.length - 1), 1)[0]);
          }
          return elegidos;
        };

        const cupoRestante = Math.max(0, 3 - aprobadosEnUa.length);
        const aAprobar = tomar(cupoRestante);
        // Igual que el cupo de aprobados: se crea uno por estado sólo si la UA
        // todavía no tiene ninguno, para no sumar una tanda en cada arranque.
        const yaTieneEstado = (estado: EstadoPropuestaEvaluador): boolean =>
          existentes.some(
            (p) =>
              p.rol === RolEjecucion.Evaluador &&
              p.estado === estado &&
              p.usuario?.unidadAcademicaId === ua.id,
          );
        const propuesto = yaTieneEstado(EstadoPropuestaEvaluador.Propuesto)
          ? undefined
          : tomar(1)[0];
        const aceptada = yaTieneEstado(EstadoPropuestaEvaluador.Aceptada) ? undefined : tomar(1)[0];
        const declinada = yaTieneEstado(EstadoPropuestaEvaluador.Declinada)
          ? undefined
          : tomar(1)[0];

        for (const evaluador of aAprobar) {
          evaluadorRows.push(
            this.participacionRepo.create({
              usuarioId: evaluador.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.Evaluador,
              estado: EstadoPropuestaEvaluador.Aprobado,
              asignadoPorId: pool.secretaria.id,
            }),
          );
          notifMeta.push({
            usuarioId: evaluador.id,
            tipo: TipoNotificacion.RESULTADO_EVALUADOR,
            mensaje: `Tu propuesta como evaluador en la convocatoria "${conv.nombre}" fue aprobada`,
            leida: false,
          });
          aprobadosUa.get(ua.id)?.add(evaluador.id);
        }

        if (propuesto) {
          evaluadorRows.push(
            this.participacionRepo.create({
              usuarioId: propuesto.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.Evaluador,
              estado: EstadoPropuestaEvaluador.Propuesto,
              asignadoPorId: pool.secretaria.id,
            }),
          );
          notifMeta.push({
            usuarioId: propuesto.id,
            tipo: TipoNotificacion.PROPUESTA_EVALUADOR,
            mensaje: `Fuiste propuesto como evaluador en la convocatoria "${conv.nombre}"`,
            leida: false,
          });
        }
        if (aceptada) {
          evaluadorRows.push(
            this.participacionRepo.create({
              usuarioId: aceptada.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.Evaluador,
              estado: EstadoPropuestaEvaluador.Aceptada,
              asignadoPorId: pool.secretaria.id,
            }),
          );
          notifMeta.push({
            usuarioId: aceptada.id,
            tipo: TipoNotificacion.PROPUESTA_EVALUADOR,
            mensaje: `Fuiste propuesto como evaluador en la convocatoria "${conv.nombre}"`,
            leida: true,
          });
        }
        if (declinada) {
          evaluadorRows.push(
            this.participacionRepo.create({
              usuarioId: declinada.id,
              convocatoriaId: conv.id,
              rol: RolEjecucion.Evaluador,
              estado: EstadoPropuestaEvaluador.Declinada,
              asignadoPorId: pool.secretaria.id,
            }),
          );
          notifMeta.push({
            usuarioId: declinada.id,
            tipo: TipoNotificacion.PROPUESTA_EVALUADOR,
            mensaje: `Fuiste propuesto como evaluador en la convocatoria "${conv.nombre}"`,
            leida: true,
          });
        }
      }

      for (let i = 0; i < evaluadorRows.length; i += TAMANIO_LOTE) {
        const chunk = evaluadorRows.slice(i, i + TAMANIO_LOTE);
        const guardados = await this.participacionRepo.save(chunk);
        for (let j = 0; j < guardados.length; j++) {
          const meta = notifMeta[i + j];
          if (!meta) continue;
          await this.notificacionRepo.save(
            this.notificacionRepo.create({
              usuarioId: meta.usuarioId,
              tipo: meta.tipo,
              participacionId: guardados[j].id,
              mensaje: meta.mensaje,
              leida: meta.leida,
            }),
          );
        }
        this.progreso.sumar(chunk.length);
      }

      this.aprobadosPorConvUa.set(conv.id, aprobadosUa);
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

  private construirHistorialEvaluacion(opts: {
    evaluacionId: string;
    entidad: TipoEntidadAuditoria;
    usuario: Usuario;
    descripcionGuardado: string;
    descripcionConfirmacion: string;
    confirmada: boolean;
  }): Auditoria[] {
    const filas = [
      {
        usuarioId: opts.usuario.id,
        accion: TipoAccionAuditoria.EVALUACION,
        descripcion: opts.descripcionGuardado,
        responsableId: opts.usuario.id,
        responsableNombre: opts.usuario.nombreCompleto,
        entidad: opts.entidad,
        entidadId: opts.evaluacionId,
        fecha: new Date(Date.now() - 5 * 86_400_000),
      },
    ];
    if (opts.confirmada) {
      filas.push({
        ...filas[0],
        descripcion: opts.descripcionConfirmacion,
        fecha: new Date(Date.now() - 86_400_000),
      });
    }
    return this.auditoriaRepo.create(filas);
  }

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
      const guardada = await this.institucionalEvalRepo.save(
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
      await this.auditoriaRepo.save(this.construirHistorialEvaluacion({
        evaluacionId: guardada.id,
        entidad: TipoEntidadAuditoria.EVALUACION_INSTITUCIONAL,
        usuario: autoridad,
        descripcionGuardado: 'Guardó la evaluación institucional',
        descripcionConfirmacion: 'Confirmó la evaluación institucional',
        confirmada: true,
      }));
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
      const guardada = await this.cruzadaEvalRepo.save(
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
      await this.auditoriaRepo.save(this.construirHistorialEvaluacion({
        evaluacionId: guardada.id,
        entidad: TipoEntidadAuditoria.EVALUACION_CRUZADA,
        usuario: evaluador,
        descripcionGuardado: `Guardó la evaluación cruzada (${tipo})`,
        descripcionConfirmacion: `Confirmó la evaluación cruzada (${tipo})`,
        confirmada: true,
      }));
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
        where: { convocatoriaId: conv.id, estado: Not(EstadoEdicion.Borrador) },
        relations: { proyecto: true },
      });
      const [instExistentes, cruzadaExistentes] = await Promise.all([
        this.institucionalEvalRepo.find({ where: { convocatoriaId: conv.id }, select: { edicionId: true } }),
        this.cruzadaEvalRepo.find({
          where: { convocatoriaId: conv.id },
          select: { edicionId: true, tipo: true },
        }),
      ]);
      const instSet = new Set(instExistentes.map((e) => e.edicionId));
      const cruzadaSet = new Set(cruzadaExistentes.map((e) => `${e.edicionId}::${e.tipo}`));

      const aprobadosPorUa = this.aprobadosPorConvUa.get(conv.id) ?? new Map();
      const aprobadosDe = (uaId: string): Usuario[] => {
        const ids = aprobadosPorUa.get(uaId);
        if (!ids || ids.size === 0) return [];
        const pool = this.usuariosPorUa.get(uaId);
        return (pool?.evaluadores ?? []).filter((e) => ids.has(e.id));
      };

      const instRows: EvaluacionInstitucional[] = [];
      const cruzadaRows: EvaluacionCruzada[] = [];
      const instMeta: Array<{ usuario: Usuario; edicionId: string; confirmada: boolean }> = [];
      const cruzadaMeta: Array<{ usuario: Usuario; edicionId: string; tipo: TipoEvaluacionCruzada }> = [];

      for (const ed of ediciones) {
        const pool = this.usuariosPorUa.get(ed.unidadAcademicaId);
        if (!pool) continue;

        // Consolidados/adjudicados y presentados aún sin evaluar no llevan evaluaciones.
        if (ed.estado === EstadoEdicion.Adjudicado) continue;
        if (anio === 2026 && ed.estado === EstadoEdicion.Presentado) continue;

        // La edición ya fue sembrada en una corrida anterior: se deja como está.
        if (instSet.has(ed.id)) continue;

        let instEstado: EstadoEvaluacion;
        if (anio === 2026) {
          instEstado = this.rng.bool(0.2) ? EstadoEvaluacion.Borrador : EstadoEvaluacion.Confirmada;
        } else {
          instEstado = EstadoEvaluacion.Confirmada;
        }

        const esInterfacultad = ed.proyecto?.esInterfacultad ?? false;
        // Interfacultad: institucional + cruzada propia + ajena. No interfacultad: sólo ajena.
        const tiposCruzadas: TipoEvaluacionCruzada[] = esInterfacultad
          ? [TipoEvaluacionCruzada.Propia, TipoEvaluacionCruzada.Ajena]
          : [TipoEvaluacionCruzada.Ajena];

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
            instMeta.push({
              usuario: pool.secretaria,
              edicionId: ed.id,
              confirmada: instEstado === EstadoEvaluacion.Confirmada,
            });
          }
        }

        if (instEstado !== EstadoEvaluacion.Confirmada) continue;
        if (!estructuraCruzada || !convConTemplates?.templateEvaluacionCruzadaId) continue;

        if (tiposCruzadas.includes(TipoEvaluacionCruzada.Propia)) {
          const candidatosPropia = aprobadosDe(ed.unidadAcademicaId);
          const evaluadorPropia = candidatosPropia.length > 0
            ? candidatosPropia[this.rng.entero(0, candidatosPropia.length - 1)]
            : undefined;
          if (evaluadorPropia && !cruzadaSet.has(`${ed.id}::${TipoEvaluacionCruzada.Propia}`)) {
            const generada = generarEvaluacionCruzada(estructuraCruzada, this.rng);
            cruzadaSet.add(`${ed.id}::${TipoEvaluacionCruzada.Propia}`);
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
            cruzadaMeta.push({ usuario: evaluadorPropia, edicionId: ed.id, tipo: TipoEvaluacionCruzada.Propia });
          }
        }

        const uaPar = this.parMap.get(ed.unidadAcademicaId);
        const candidatosAjena = uaPar ? aprobadosDe(uaPar) : [];
        const evaluadorAjena = candidatosAjena.length > 0
          ? candidatosAjena[this.rng.entero(0, candidatosAjena.length - 1)]
          : undefined;
        if (evaluadorAjena && !cruzadaSet.has(`${ed.id}::${TipoEvaluacionCruzada.Ajena}`)) {
          const generada = generarEvaluacionCruzada(estructuraCruzada, this.rng);
          cruzadaSet.add(`${ed.id}::${TipoEvaluacionCruzada.Ajena}`);
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
          cruzadaMeta.push({ usuario: evaluadorAjena, edicionId: ed.id, tipo: TipoEvaluacionCruzada.Ajena });
        }
      }

      const auditoriaBuffer: Auditoria[] = [];
      const drenarAuditoria = async (): Promise<void> => {
        if (auditoriaBuffer.length === 0) return;
        await this.auditoriaRepo.save(auditoriaBuffer);
        this.progreso.sumar(auditoriaBuffer.length);
        auditoriaBuffer.length = 0;
      };

      for (let i = 0; i < instRows.length; i += TAMANIO_LOTE) {
        const chunk = instRows.slice(i, i + TAMANIO_LOTE);
        const guardados = await this.institucionalEvalRepo.save(chunk);
        for (let j = 0; j < guardados.length; j++) {
          const meta = instMeta[i + j];
          if (!meta) continue;
          auditoriaBuffer.push(
            ...this.construirHistorialEvaluacion({
              evaluacionId: guardados[j].id,
              entidad: TipoEntidadAuditoria.EVALUACION_INSTITUCIONAL,
              usuario: meta.usuario,
              descripcionGuardado: 'Guardó la evaluación institucional',
              descripcionConfirmacion: 'Confirmó la evaluación institucional',
              confirmada: meta.confirmada,
            }),
          );
          if (auditoriaBuffer.length >= TAMANIO_LOTE) await drenarAuditoria();
        }
        this.progreso.sumar(chunk.length);
      }
      for (let i = 0; i < cruzadaRows.length; i += TAMANIO_LOTE) {
        const chunk = cruzadaRows.slice(i, i + TAMANIO_LOTE);
        const guardados = await this.cruzadaEvalRepo.save(chunk);
        for (let j = 0; j < guardados.length; j++) {
          const meta = cruzadaMeta[i + j];
          if (!meta) continue;
          auditoriaBuffer.push(
            ...this.construirHistorialEvaluacion({
              evaluacionId: guardados[j].id,
              entidad: TipoEntidadAuditoria.EVALUACION_CRUZADA,
              usuario: meta.usuario,
              descripcionGuardado: `Guardó la evaluación cruzada (${meta.tipo})`,
              descripcionConfirmacion: `Confirmó la evaluación cruzada (${meta.tipo})`,
              confirmada: true,
            }),
          );
          if (auditoriaBuffer.length >= TAMANIO_LOTE) await drenarAuditoria();
        }
        this.progreso.sumar(chunk.length);
      }
      await drenarAuditoria();
    }
  }

  // ─────────────────── Sugerencias ───────────────────

  /** Sugerencias de Secretaría para ediciones en PendienteDeCambios (sólo 2027). */
  private async seedSugerencias(): Promise<void> {
    const conv = this.convs.get(2027);
    if (!conv) return;
    const campos = await this.camposDeConvocatoria(conv);

    const ediciones = await this.edicionRepo.find({
      where: { convocatoriaId: conv.id, estado: EstadoEdicion.PendienteDeCambios },
      relations: { proyecto: true, creadoPor: true },
    });

    for (const ed of ediciones) {
      const pool = this.usuariosPorUa.get(ed.unidadAcademicaId);
      if (!pool?.secretaria) continue;
      if ((await this.sugerenciaRepo.count({ where: { edicionId: ed.id } })) > 0) continue;

      const cantidad = this.rng.bool(0.5) ? 2 : 1;
      const camposUsados = new Set<string>();

      for (let i = 0; i < cantidad; i++) {
        const sugerida = this.elegirCampoSugerencia(campos, ed, camposUsados);
        if (!sugerida) continue;

        const sugerencia = await this.sugerenciaRepo.save(
          this.sugerenciaRepo.create({
            edicionId: ed.id,
            sugeridoPorId: pool.secretaria.id,
            campo: sugerida.campo,
            valorActual: sugerida.valorActual,
            valorSugerido: sugerida.valorSugerido,
            comentario: this.rng.pick(COMENTARIOS_SUGERENCIA),
            estado: EstadoSugerencia.Pendiente,
          }),
        );
        await this.notificarSugerencia(ed, pool.secretaria, sugerencia, campos);
        this.progreso.sumar(1);
      }
    }
  }

  private elegirCampoSugerencia(
    campos: CampoFormulario[],
    ed: Edicion,
    usados: Set<string>,
  ): { campo: string; valorActual: string | null; valorSugerido: string | null } | undefined {
    const candidatos: Array<{ nombre: string; comentarioSolo: boolean }> = [
      { nombre: 'nombre', comentarioSolo: true },
      { nombre: CAMPOS_ESTANDAR.resumen, comentarioSolo: false },
      { nombre: CAMPOS_ESTANDAR.area, comentarioSolo: true },
      { nombre: CAMPOS_ESTANDAR.poblaciones, comentarioSolo: true },
      { nombre: CAMPOS_ESTANDAR.antecedentes, comentarioSolo: true },
      { nombre: CAMPOS_ESTANDAR.cronograma, comentarioSolo: true },
    ];
    const disponibles = candidatos.filter((c) => !usados.has(c.nombre));
    if (disponibles.length === 0) return undefined;
    const elegido = disponibles[this.rng.entero(0, disponibles.length - 1)];
    usados.add(elegido.nombre);

    if (elegido.nombre === 'nombre') {
      return {
        campo: 'nombre',
        valorActual: ed.proyecto?.nombre ?? null,
        valorSugerido: null,
      };
    }

    let campoForm: CampoFormulario;
    try {
      campoForm = this.campoEstandar(campos, elegido.nombre);
    } catch {
      return undefined;
    }
    const datos = ed.datosFormulario as Record<string, unknown> | null;
    const actual = datos?.[campoForm.id];
    const valorActual =
      actual == null ? null : typeof actual === 'object' ? JSON.stringify(actual) : String(actual);

    let valorSugerido: string | null = null;
    if (!elegido.comentarioSolo && typeof actual === 'string' && actual.length > 0) {
      valorSugerido = `Propuesta: ${actual}`;
    }
    return {
      campo: `datosFormulario.${campoForm.id}`,
      valorActual,
      valorSugerido,
    };
  }

  private async notificarSugerencia(
    ed: Edicion,
    sugeridoPor: Usuario,
    sugerencia: SugerenciaCambio,
    campos: CampoFormulario[],
  ): Promise<void> {
    const destinatarios = new Set<string>([ed.creadoPorId]);
    const directores = await this.participacionRepo.find({
      where: { edicionId: ed.id, rol: RolEjecucion.DirectorDeProyecto },
    });
    directores.forEach((d) => destinatarios.add(d.usuarioId));

    const nombreCampo = this.nombreLegibleSugerencia(sugerencia.campo, campos);
    for (const usuarioId of destinatarios) {
      if (usuarioId === sugeridoPor.id) continue;
      await this.notificacionRepo.save(
        this.notificacionRepo.create({
          usuarioId,
          tipo: TipoNotificacion.NUEVA_SUGERENCIA,
          sugerenciaId: sugerencia.id,
          mensaje: `${sugeridoPor.nombreCompleto} sugirió un cambio en "${nombreCampo}" del proyecto "${ed.proyecto?.nombre ?? ''}"`,
        }),
      );
    }
  }

  private nombreLegibleSugerencia(campo: string, campos: CampoFormulario[]): string {
    if (campo === 'nombre') return 'Nombre del proyecto';
    if (campo.startsWith('datosFormulario.')) {
      const id = campo.replace('datosFormulario.', '');
      return campos.find((c) => c.id === id)?.nombre ?? campo;
    }
    return campo;
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
