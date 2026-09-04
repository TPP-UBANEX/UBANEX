import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
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
import { MecanismoAdjudicacion } from '../common/enums/mecanismo-adjudicacion.enum';
import { CategoriaHito } from '../common/enums/categoria-hito.enum';
import { EstadoComprobante } from '../common/enums/estado-comprobante.enum';
import { EstadoInforme } from '../common/enums/estado-informe.enum';
import { EstadoAutoevaluacion } from '../common/enums/estado-autoevaluacion.enum';
import { EstadoSugerencia } from '../common/enums/estado-sugerencia.enum';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import { TipoRubro } from '../common/enums/tipo-rubro.enum';
import { Usuario } from '../usuarios/usuario.entity';
import { Formulario } from '../formularios/formulario.entity';
import { CampoFormulario } from '../formularios/campo-formulario.interface';
import { Convocatoria } from '../convocatorias/convocatoria.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { Edicion } from '../proyectos/edicion.entity';
import { Presupuesto } from '../proyectos/presupuesto.interface';
import { Rendicion } from '../rendiciones/rendicion.entity';
import { ParticipacionConvocatoria } from '../participaciones-convocatoria/participacion-convocatoria.entity';
import { Emparejamiento } from '../convocatorias/emparejamiento.entity';
import { UnidadAcademica } from '../unidades-academicas/unidad-academica.entity';
import { EMPAREJAMIENTO_DEFAULT } from '../convocatorias/emparejamiento-default';
import { TemplateEvaluacionInstitucional } from '../templates-evaluacion/template-evaluacion-institucional.entity';
import { TemplateEvaluacionCruzada } from '../templates-evaluacion/template-evaluacion-cruzada.entity';
import {
  TEMPLATE_INSTITUCIONAL_DEFAULT,
  TEMPLATE_CRUZADA_DEFAULT,
  TEMPLATE_AUTOEVALUACION_DEFAULT,
} from '../evaluaciones/templates-default';
import { EvaluacionInstitucional } from '../evaluaciones/evaluacion-institucional.entity';
import { EvaluacionCruzada } from '../evaluaciones/evaluacion-cruzada.entity';
import { Notificacion } from '../sugerencias/notificacion.entity';
import { SugerenciaCambio } from '../sugerencias/sugerencia-cambio.entity';
import { Hito } from '../ejecucion/hito.entity';
import { AutoevaluacionImpacto } from '../ejecucion/autoevaluacion-impacto.entity';
import { InformeFinal } from '../ejecucion/informe-final.entity';
import { TemplateAutoevaluacionImpacto } from '../ejecucion/template-autoevaluacion.entity';
import { UAS_NOMBRES, CARRERAS_POR_UA, AREAS_DOCENTE } from './seed.data';
import { clonarCamposConIdsNuevos, crearPresupuesto } from './seed.utils';

/** Password única para todos los usuarios sembrados (incluido el admin). */
const PASSWORD_SEED = 'admin';

/** Nombres (para nombreCompleto/nombre/apellido) de los campos del formulario estándar. */
const CAMPOS_ESTANDAR = {
  resumen: 'Resumen del proyecto',
  fundamentacion: 'Fundamentación del proyecto',
  destinatariosEstimados: 'Cantidad estimada de destinatarios',
  antecedentes: '¿El proyecto tiene antecedentes en convocatorias anteriores?',
  area: 'Área temática principal',
  poblaciones: 'Poblaciones destinatarias',
  localidad: 'Localidad de ejecución',
  referente: 'Referente institucional del proyecto',
  cronograma: 'Cronograma de actividades',
} as const;

const COLUMNAS_CRONOGRAMA = {
  actividad: 'Actividad',
  fecha: 'Fecha',
  responsable: 'Responsable',
} as const;

/** Las 4 unidades académicas con usuarios y proyectos de demo (ya emparejadas por default). */
const UA_INGENIERIA = 'Facultad de Ingeniería';
const UA_MEDICINA = 'Facultad de Medicina';
const UA_SOCIALES = 'Facultad de Ciencias Sociales';
const UA_FILOSOFIA = 'Facultad de Filosofía y Letras';

type UsuariosUa = {
  ua: UnidadAcademica;
  autoridad: Usuario;
  asistente: Usuario;
  docentes: Usuario[]; // 5 docentes validados, con perfil completo
  incompleto: Usuario; // docente validado con perfil incompleto
  pendiente: Usuario; // docente pendiente de validación
  estudiantes: Usuario[]; // 2 estudiantes
};

const GENEROS = [Genero.Masculino, Genero.Femenino, Genero.Otro, Genero.PrefieroNoResponder];
const CARGOS_DOCENTE = [
  CargoDocente.ProfesorTitular,
  CargoDocente.ProfesorAsociado,
  CargoDocente.ProfesorAdjunto,
  CargoDocente.JefeDeTrabajosPracticos,
  CargoDocente.AyudanteDePrimera,
];
const DESIGNACIONES_DOCENTE = [
  TipoDesignacionDocente.Regular,
  TipoDesignacionDocente.Concursado,
  TipoDesignacionDocente.Interino,
  TipoDesignacionDocente.Suplente,
];
const LOCALIDADES = [
  'Caballito, CABA',
  'La Plata, Buenos Aires',
  'Morón, Buenos Aires',
  'Quilmes, Buenos Aires',
  'Rosario, Santa Fe',
  'Córdoba Capital',
  'Vicente López, Buenos Aires',
  'San Isidro, Buenos Aires',
];

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
  private readonly hitoRepo: Repository<Hito>;
  private readonly autoevaluacionRepo: Repository<AutoevaluacionImpacto>;
  private readonly informeRepo: Repository<InformeFinal>;
  private readonly templateAutoevalRepo: Repository<TemplateAutoevaluacionImpacto>;
  private readonly rendicionRepo: Repository<Rendicion>;

  private readonly uaMap = new Map<string, UnidadAcademica>();
  private readonly carrerasPorUa = new Map<string, string[]>(); // uaId -> [carreraId,...]
  private readonly convs = new Map<number, Convocatoria>();
  private readonly uaUsuarios = new Map<string, UsuariosUa>(); // 'ING' | 'MED' | 'SOC' | 'FIL'

  private camposFormularioEstandar: CampoFormulario[] = [];
  private formularioDefault!: Formulario;
  private templateInst!: TemplateEvaluacionInstitucional;
  private templateCruzada!: TemplateEvaluacionCruzada;
  private templateAutoeval!: TemplateAutoevaluacionImpacto;

  private admin!: Usuario;

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
    this.hitoRepo = dataSource.getRepository(Hito);
    this.autoevaluacionRepo = dataSource.getRepository(AutoevaluacionImpacto);
    this.informeRepo = dataSource.getRepository(InformeFinal);
    this.templateAutoevalRepo = dataSource.getRepository(TemplateAutoevaluacionImpacto);
    this.rendicionRepo = dataSource.getRepository(Rendicion);
  }

  // ─────────────────── Orquestador ───────────────────

  async ejecutarSeed(): Promise<void> {
    console.log('\n=== SEED: Unidades Académicas y Carreras ===');
    await this.seedUnidadesAcademicaYCarreras();

    console.log('\n=== SEED: Usuarios ===');
    await this.seedUsuarios();

    console.log('\n=== SEED: Formulario y plantillas de evaluación ===');
    await this.seedFormulario();
    await this.seedTemplates();

    console.log('\n=== SEED: Convocatorias ===');
    await this.seedConvocatorias();

    console.log('\n=== SEED: Emparejamientos ===');
    await this.seedEmparejamientos();

    console.log('\n=== SEED: Convocatoria 2023 (Cierre) ===');
    await this.seedConvocatoria2023();

    console.log('\n=== SEED: Convocatoria 2024 (Ejecución) ===');
    await this.seedConvocatoria2024();

    console.log('\n=== SEED: Convocatoria 2025 (Evaluación) ===');
    await this.seedConvocatoria2025();

    console.log('\n=== SEED: Convocatoria 2026 (Presentación) ===');
    await this.seedConvocatoria2026();

    console.log('\n=== SEED COMPLETADO ===\n');
    await this.mostrarResumen();
  }

  // ─────────────────── Unidades Académicas y Carreras ───────────────────

  private async seedUnidadesAcademicaYCarreras(): Promise<void> {
    for (const nombre of UAS_NOMBRES) {
      const existente = await this.uasService.obtenerPorNombre(nombre);
      const ua = existente ?? (await this.uasService.crear({ nombre }));
      this.uaMap.set(ua.nombre, ua);
    }

    for (const [nombreUa, carreras] of Object.entries(CARRERAS_POR_UA)) {
      const ua = this.uaMap.get(nombreUa);
      if (!ua) {
        console.warn(`  Carreras no seedeadas: unidad académica no encontrada: ${nombreUa}`);
        continue;
      }
      const existentes = await this.carrerasService.listarPorUnidadAcademica(ua.id);
      const idsPorNombre = new Map(existentes.map((c) => [c.nombre, c.id]));
      for (const nombreCarrera of carreras) {
        if (!idsPorNombre.has(nombreCarrera)) {
          const creada = await this.carrerasService.crear({ nombre: nombreCarrera, unidadAcademicaId: ua.id });
          idsPorNombre.set(nombreCarrera, creada.id);
        }
      }
      this.carrerasPorUa.set(ua.id, [...idsPorNombre.values()]);
    }
    const totalCarreras = Object.values(CARRERAS_POR_UA).reduce((acc, arr) => acc + arr.length, 0);
    console.log(`  14 unidades académicas, ${totalCarreras} carreras`);
  }

  // ─────────────────── Usuarios ───────────────────

  private async seedUsuario(data: {
    nombreCompleto: string;
    nombre?: string;
    apellido?: string;
    email: string;
    roles: RolUsuario[];
    unidadAcademicaId?: string;
    telefono?: string;
    genero?: Genero;
    personaConDiscapacidad?: boolean;
    cargoDocente?: CargoDocente;
    tipoDesignacionDocente?: TipoDesignacionDocente;
    areaDocente?: string;
    direccionLocalidad?: string;
    porcentajeCarrera?: number;
    carreraId?: string;
  }): Promise<Usuario> {
    const existe = await this.usuariosService.obtenerPorEmail(data.email);
    if (existe) return existe;
    const user = await this.usuariosService.crear({ ...data, password: PASSWORD_SEED });
    console.log(`  ${data.email} (${data.roles.join(', ')})`);
    return user;
  }

  private async seedDocenteValidado(opts: {
    nombre: string;
    apellido: string;
    email: string;
    ua: UnidadAcademica;
    indice: number;
  }): Promise<Usuario> {
    const areas = AREAS_DOCENTE[opts.ua.nombre] ?? ['Extensión Universitaria'];
    const i = opts.indice;
    const usuario = await this.seedUsuario({
      nombreCompleto: `${opts.nombre} ${opts.apellido}`,
      nombre: opts.nombre,
      apellido: opts.apellido,
      email: opts.email,
      roles: [RolUsuario.Docente],
      unidadAcademicaId: opts.ua.id,
      genero: GENEROS[i % GENEROS.length],
      cargoDocente: CARGOS_DOCENTE[i % CARGOS_DOCENTE.length],
      tipoDesignacionDocente: DESIGNACIONES_DOCENTE[i % DESIGNACIONES_DOCENTE.length],
      areaDocente: areas[i % areas.length],
      personaConDiscapacidad: i % 7 === 0,
      telefono: `11 4${String(1000 + i * 37).padStart(4, '0')} ${String(2000 + i * 53).padStart(4, '0')}`,
      direccionLocalidad: LOCALIDADES[i % LOCALIDADES.length],
    });
    await this.usuarioRepo.update(usuario.id, { estadoValidacionDocente: EstadoValidacionDocente.Validado });
    return usuario;
  }

  private async seedDocenteIncompleto(opts: {
    nombre: string;
    apellido: string;
    email: string;
    ua: UnidadAcademica;
  }): Promise<Usuario> {
    // Perfil deliberadamente incompleto: sin teléfono, localidad, área ni cargo docente.
    const usuario = await this.seedUsuario({
      nombreCompleto: `${opts.nombre} ${opts.apellido}`,
      nombre: opts.nombre,
      apellido: opts.apellido,
      email: opts.email,
      roles: [RolUsuario.Docente],
      unidadAcademicaId: opts.ua.id,
    });
    await this.usuarioRepo.update(usuario.id, { estadoValidacionDocente: EstadoValidacionDocente.Validado });
    return usuario;
  }

  private async seedDocentePendiente(opts: {
    nombre: string;
    apellido: string;
    email: string;
    ua: UnidadAcademica;
  }): Promise<Usuario> {
    const usuario = await this.seedUsuario({
      nombreCompleto: `${opts.nombre} ${opts.apellido}`,
      nombre: opts.nombre,
      apellido: opts.apellido,
      email: opts.email,
      roles: [RolUsuario.Docente],
      unidadAcademicaId: opts.ua.id,
      genero: GENEROS[1],
    });
    await this.usuarioRepo.update(usuario.id, { estadoValidacionDocente: EstadoValidacionDocente.PendienteDeValidacion });
    return usuario;
  }

  private async seedEstudiante(opts: {
    nombre: string;
    apellido: string;
    email: string;
    ua: UnidadAcademica;
    indice: number;
  }): Promise<Usuario> {
    const carreras = this.carrerasPorUa.get(opts.ua.id) ?? [];
    const carreraId = carreras.length > 0 ? carreras[opts.indice % carreras.length] : undefined;
    return this.seedUsuario({
      nombreCompleto: `${opts.nombre} ${opts.apellido}`,
      nombre: opts.nombre,
      apellido: opts.apellido,
      email: opts.email,
      roles: [RolUsuario.Estudiante],
      unidadAcademicaId: opts.ua.id,
      genero: GENEROS[opts.indice % GENEROS.length],
      direccionLocalidad: LOCALIDADES[(opts.indice + 3) % LOCALIDADES.length],
      porcentajeCarrera: 40 + opts.indice * 20,
      carreraId,
    });
  }

  private async seedUsuariosUa(opts: {
    clave: string;
    nombreUa: string;
    slug: string;
    autoridad: [string, string];
    asistente: [string, string];
    docentes: Array<[string, string]>; // 5 nombres/apellidos
    incompleto: [string, string];
    pendiente: [string, string];
    estudiantes: Array<[string, string]>; // 2 nombres/apellidos
  }): Promise<void> {
    const ua = this.uaMap.get(opts.nombreUa)!;

    const autoridad = await this.seedUsuario({
      nombreCompleto: `${opts.autoridad[0]} ${opts.autoridad[1]}`,
      nombre: opts.autoridad[0],
      apellido: opts.autoridad[1],
      email: `autoridad-${opts.slug}@uba.ar`,
      roles: [RolUsuario.AutoridadDeSecretaria],
      unidadAcademicaId: ua.id,
    });
    const asistente = await this.seedUsuario({
      nombreCompleto: `${opts.asistente[0]} ${opts.asistente[1]}`,
      nombre: opts.asistente[0],
      apellido: opts.asistente[1],
      email: `asistente-${opts.slug}@uba.ar`,
      roles: [RolUsuario.AsistenteDeSecretaria],
      unidadAcademicaId: ua.id,
    });

    const docentes: Usuario[] = [];
    for (let i = 0; i < opts.docentes.length; i++) {
      const [nombre, apellido] = opts.docentes[i];
      docentes.push(
        await this.seedDocenteValidado({
          nombre,
          apellido,
          email: `docente-${i + 1}-${opts.slug}@uba.ar`,
          ua,
          indice: i,
        }),
      );
    }

    const incompleto = await this.seedDocenteIncompleto({
      nombre: opts.incompleto[0],
      apellido: opts.incompleto[1],
      email: `docente-incompleto-${opts.slug}@uba.ar`,
      ua,
    });
    const pendiente = await this.seedDocentePendiente({
      nombre: opts.pendiente[0],
      apellido: opts.pendiente[1],
      email: `docente-pendiente-${opts.slug}@uba.ar`,
      ua,
    });

    const estudiantes: Usuario[] = [];
    for (let i = 0; i < opts.estudiantes.length; i++) {
      const [nombre, apellido] = opts.estudiantes[i];
      estudiantes.push(
        await this.seedEstudiante({
          nombre,
          apellido,
          email: `estudiante-${i + 1}-${opts.slug}@uba.ar`,
          ua,
          indice: i,
        }),
      );
    }

    this.uaUsuarios.set(opts.clave, { ua, autoridad, asistente, docentes, incompleto, pendiente, estudiantes });
  }

  private async seedUsuarios(): Promise<void> {
    this.admin = await this.seedUsuario({
      nombreCompleto: 'Admin Rectorado',
      email: 'admin@uba.ar',
      roles: [RolUsuario.AutoridadDeRectorado],
    });
    await this.seedUsuario({
      nombreCompleto: 'Asistente de Rectorado',
      email: 'asistente-rectorado@uba.ar',
      roles: [RolUsuario.AsistenteDeRectorado],
    });

    await this.seedUsuariosUa({
      clave: 'ING',
      nombreUa: UA_INGENIERIA,
      slug: 'ingenieria',
      autoridad: ['Bruno', 'Aguirre'],
      asistente: ['Carla', 'Benítez'],
      docentes: [
        ['Diego', 'Domínguez'],
        ['Elena', 'Ferreyra'],
        ['Facundo', 'Giménez'],
        ['Gabriela', 'Herrera'],
        ['Hernán', 'Ibarra'],
      ],
      incompleto: ['Inés', 'Juárez'],
      pendiente: ['Julián', 'Ledesma'],
      estudiantes: [
        ['Karina', 'Molina'],
        ['Leandro', 'Navarro'],
      ],
    });

    await this.seedUsuariosUa({
      clave: 'MED',
      nombreUa: UA_MEDICINA,
      slug: 'medicina',
      autoridad: ['Marta', 'Ortega'],
      asistente: ['Nicolás', 'Paredes'],
      docentes: [
        ['Olga', 'Quinteros'],
        ['Pablo', 'Roldán'],
        ['Romina', 'Sosa'],
        ['Santiago', 'Villalba'],
        ['Valeria', 'Álvarez'],
      ],
      incompleto: ['Walter', 'Méndez'],
      pendiente: ['Cecilia', 'Acosta'],
      estudiantes: [
        ['Marcos', 'Vega'],
        ['Lucía', 'Luna'],
      ],
    });

    await this.seedUsuariosUa({
      clave: 'SOC',
      nombreUa: UA_SOCIALES,
      slug: 'sociales',
      autoridad: ['Federico', 'Peralta'],
      asistente: ['Paula', 'Cáceres'],
      docentes: [
        ['Ramiro', 'Ríos'],
        ['Silvina', 'Barrionuevo'],
        ['Tomás', 'Carrizo'],
        ['Verónica', 'Aguirre'],
        ['Andrés', 'Benítez'],
      ],
      incompleto: ['Ana', 'Cabrera'],
      pendiente: ['Bruno', 'Espinoza'],
      estudiantes: [
        ['Carla', 'Ferreyra'],
        ['Diego', 'Giménez'],
      ],
    });

    await this.seedUsuariosUa({
      clave: 'FIL',
      nombreUa: UA_FILOSOFIA,
      slug: 'filosofia',
      autoridad: ['Elena', 'Herrera'],
      asistente: ['Facundo', 'Ibarra'],
      docentes: [
        ['Gabriela', 'Juárez'],
        ['Hernán', 'Ledesma'],
        ['Inés', 'Molina'],
        ['Julián', 'Navarro'],
        ['Karina', 'Ortega'],
      ],
      incompleto: ['Leandro', 'Paredes'],
      pendiente: ['Marta', 'Quinteros'],
      estudiantes: [
        ['Nicolás', 'Roldán'],
        ['Olga', 'Sosa'],
      ],
    });
  }

  // ─────────────────── Formulario y plantillas de evaluación ───────────────────

  private async seedFormulario(): Promise<void> {
    const nombre = 'Formulario estándar UBANEX';
    const existente = await this.formularioRepo.findOne({ where: { nombre } });
    if (existente) {
      this.formularioDefault = existente;
      this.camposFormularioEstandar = existente.campos ?? [];
      return;
    }

    this.camposFormularioEstandar = [
      { id: crypto.randomUUID(), tipo: TipoCampo.Texto, nombre: CAMPOS_ESTANDAR.resumen, textoAyuda: 'Describí brevemente el objetivo del proyecto', esObligatorio: true, orden: 0 },
      { id: crypto.randomUUID(), tipo: TipoCampo.TextoLargo, nombre: CAMPOS_ESTANDAR.fundamentacion, textoAyuda: 'Justificá la relevancia del proyecto para la comunidad destinataria', esObligatorio: true, orden: 1 },
      { id: crypto.randomUUID(), tipo: TipoCampo.Numero, nombre: CAMPOS_ESTANDAR.destinatariosEstimados, esObligatorio: false, orden: 2, minimo: 0, maximo: 5000 },
      { id: crypto.randomUUID(), tipo: TipoCampo.Booleano, nombre: CAMPOS_ESTANDAR.antecedentes, esObligatorio: true, orden: 3 },
      { id: crypto.randomUUID(), tipo: TipoCampo.Select, nombre: CAMPOS_ESTANDAR.area, esObligatorio: true, orden: 4, opciones: ['Salud', 'Educación', 'Ambiente', 'Tecnología', 'Cultura'] },
      { id: crypto.randomUUID(), tipo: TipoCampo.Checkbox, nombre: CAMPOS_ESTANDAR.poblaciones, esObligatorio: false, orden: 5, opciones: ['Niños y adolescentes', 'Adultos mayores', 'Personas con discapacidad', 'Comunidad general'] },
      { id: crypto.randomUUID(), tipo: TipoCampo.Geolocalizacion, nombre: CAMPOS_ESTANDAR.localidad, esObligatorio: false, orden: 6 },
      { id: crypto.randomUUID(), tipo: TipoCampo.Usuario, nombre: CAMPOS_ESTANDAR.referente, esObligatorio: false, orden: 7, rolesUsuario: [RolUsuario.Docente] },
      {
        id: crypto.randomUUID(),
        tipo: TipoCampo.Tabla,
        nombre: CAMPOS_ESTANDAR.cronograma,
        textoAyuda: 'Detallá las actividades previstas para el proyecto',
        esObligatorio: true,
        orden: 8,
        columnas: [
          { id: crypto.randomUUID(), tipo: TipoCampo.Texto, nombre: COLUMNAS_CRONOGRAMA.actividad, esObligatorio: true },
          { id: crypto.randomUUID(), tipo: TipoCampo.Fecha, nombre: COLUMNAS_CRONOGRAMA.fecha, esObligatorio: true },
          { id: crypto.randomUUID(), tipo: TipoCampo.Texto, nombre: COLUMNAS_CRONOGRAMA.responsable, esObligatorio: false },
        ],
        filasMinimas: 1,
      },
    ];

    this.formularioDefault = await this.formularioRepo.save(
      this.formularioRepo.create({
        nombre,
        esDefault: true,
        esPlantilla: true,
        campos: this.camposFormularioEstandar,
      }),
    );
  }

  private async seedTemplates(): Promise<void> {
    this.templateInst =
      (await this.templateInstRepo.findOne({ where: { esDefault: true } })) ??
      (await this.templateInstRepo.save(
        this.templateInstRepo.create({
          nombre: 'Plantilla institucional UBANEX',
          esDefault: true,
          esPlantilla: true,
          estructura: TEMPLATE_INSTITUCIONAL_DEFAULT,
        }),
      ));

    this.templateCruzada =
      (await this.templateCruzadaRepo.findOne({ where: { esDefault: true } })) ??
      (await this.templateCruzadaRepo.save(
        this.templateCruzadaRepo.create({
          nombre: 'Plantilla cruzada UBANEX',
          esDefault: true,
          esPlantilla: true,
          estructura: TEMPLATE_CRUZADA_DEFAULT,
        }),
      ));

    this.templateAutoeval =
      (await this.templateAutoevalRepo.findOne({ where: { esDefault: true } })) ??
      (await this.templateAutoevalRepo.save(
        this.templateAutoevalRepo.create({
          nombre: 'Plantilla de autoevaluación UBANEX',
          esDefault: true,
          esPlantilla: true,
          estructura: TEMPLATE_AUTOEVALUACION_DEFAULT,
        }),
      ));
  }

  // ─────────────────── Convocatorias ───────────────────

  private async formularioParaConvocatoria(anio: number): Promise<string> {
    const nombreCopia = `${this.formularioDefault.nombre} (copia ${anio})`;
    const existente = await this.formularioRepo.findOne({ where: { nombre: nombreCopia } });
    if (existente) return existente.id;
    const copia = await this.formularioRepo.save(
      this.formularioRepo.create({
        nombre: nombreCopia,
        esDefault: false,
        esPlantilla: false,
        campos: clonarCamposConIdsNuevos(this.formularioDefault.campos ?? []),
      }),
    );
    return copia.id;
  }

  private async seedConvocatoria(data: Partial<Convocatoria> & { nombre: string }): Promise<Convocatoria> {
    const existe = await this.convocatoriaRepo.findOne({ where: { nombre: data.nombre } });
    if (existe) return existe;
    const conv = await this.convocatoriaRepo.save(this.convocatoriaRepo.create(data as Convocatoria));
    console.log(`  ${conv.nombre} (${conv.estado})`);
    return conv;
  }

  /**
   * Los templates de evaluación de una convocatoria son siempre propios: mientras está en
   * Configuración pueden compartir la plantilla default (se siguen editando ahí), pero al
   * congelarse (cualquier otro estado) necesitan una copia privada.
   */
  private async asegurarTemplatesConvocatoria(conv: Convocatoria): Promise<void> {
    if (conv.templateEvaluacionInstitucionalId) return;
    const congelada = conv.estado !== EstadoConvocatoria.Configuracion;

    if (!congelada) {
      conv.templateEvaluacionInstitucionalId = this.templateInst.id;
      conv.templateEvaluacionCruzadaId = this.templateCruzada.id;
      conv.templateAutoevaluacionImpactoId = this.templateAutoeval.id;
    } else {
      const copiaInst = await this.templateInstRepo.save(
        this.templateInstRepo.create({
          nombre: `Evaluación institucional ${conv.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: this.templateInst.estructura,
        }),
      );
      const copiaCruzada = await this.templateCruzadaRepo.save(
        this.templateCruzadaRepo.create({
          nombre: `Evaluación cruzada ${conv.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: this.templateCruzada.estructura,
        }),
      );
      const copiaAutoeval = await this.templateAutoevalRepo.save(
        this.templateAutoevalRepo.create({
          nombre: `Autoevaluación de impacto ${conv.nombre}`,
          esDefault: false,
          esPlantilla: false,
          estructura: this.templateAutoeval.estructura,
        }),
      );
      conv.templateEvaluacionInstitucionalId = copiaInst.id;
      conv.templateEvaluacionCruzadaId = copiaCruzada.id;
      conv.templateAutoevaluacionImpactoId = copiaAutoeval.id;
    }
    await this.convocatoriaRepo.save(conv);
  }

  private async seedConvocatorias(): Promise<void> {
    const especificaciones: Array<{
      anio: number;
      estado: EstadoConvocatoria;
      fechas: [string, string, string, string, string, string]; // presentInicio, presentFin, evalInicio, evalFin, ejecInicio, ejecFin
    }> = [
      // 2023 — Cierre: ciclo completo, todo en el pasado.
      { anio: 2023, estado: EstadoConvocatoria.Cierre, fechas: ['2023-03-01', '2023-04-30', '2023-05-15', '2023-07-15', '2023-08-01', '2024-02-28'] },
      // 2024 — Ejecución: ya adjudicada, ejecución en curso (el rango incluye "hoy" 2026-09-04).
      { anio: 2024, estado: EstadoConvocatoria.Ejecucion, fechas: ['2024-03-01', '2024-04-30', '2024-05-15', '2024-07-15', '2025-09-01', '2027-02-28'] },
      // 2025 — Evaluación: presentación cerrada, evaluación en curso (incluye "hoy").
      { anio: 2025, estado: EstadoConvocatoria.Evaluacion, fechas: ['2025-03-01', '2025-04-30', '2026-06-01', '2026-11-30', '2026-12-01', '2027-06-30'] },
      // 2026 — Presentación: ventana de presentación abierta ahora (incluye "hoy").
      { anio: 2026, estado: EstadoConvocatoria.Presentacion, fechas: ['2026-08-01', '2026-10-15', '2026-10-20', '2026-12-15', '2027-01-01', '2027-07-31'] },
      // 2028 — Configuración: recién creada, todo a futuro.
      { anio: 2028, estado: EstadoConvocatoria.Configuracion, fechas: ['2028-03-01', '2028-04-30', '2028-05-15', '2028-07-15', '2028-08-01', '2029-02-28'] },
    ];

    for (const spec of especificaciones) {
      const nombre = `UBANEX ${spec.anio}`;
      const formularioId = await this.formularioParaConvocatoria(spec.anio);
      const [presentInicio, presentFin, evalInicio, evalFin, ejecInicio, ejecFin] = spec.fechas;
      const conv = await this.seedConvocatoria({
        nombre,
        descripcion: `Convocatoria UBANEX del año ${spec.anio}`,
        anio: spec.anio,
        estado: spec.estado,
        fechaInicioPresentacion: presentInicio,
        fechaFinPresentacion: presentFin,
        fechaInicioEvaluacion: evalInicio,
        fechaFinEvaluacion: evalFin,
        fechaInicioEjecucion: ejecInicio,
        fechaFinEjecucion: ejecFin,
        formularioId,
        cuotaFederativa: 1,
        umbralInconsistenciaCruzada: 40,
        // Holgados respecto de lo que generan los presupuestos de demo (~$350.000 en el peor caso).
        topePresupuestoNoConsolidado: 1_200_000,
        topePresupuestoConsolidado: 2_500_000,
      });
      await this.asegurarTemplatesConvocatoria(conv);
      this.convs.set(spec.anio, conv);
    }

    // 2023 y 2024 ya pasaron por la adjudicación: quedan confirmadas y con la resolución emitida.
    for (const anio of [2023, 2024]) {
      const conv = this.convs.get(anio)!;
      if (conv.ordenMeritoConfirmado) continue;
      conv.ordenMeritoConfirmado = true;
      conv.adjudicacionEmitida = true;
      conv.resolucionUrl = 'https://drive.google.com/file/d/resolucion-adjudicacion-seed/view';
      conv.fechaResolucion = `${anio}-08-01`;
      conv.adjudicacionEmitidaPorId = this.admin.id;
      await this.convocatoriaRepo.save(conv);
    }
  }

  // ─────────────────── Emparejamientos ───────────────────

  private async seedEmparejamientos(): Promise<void> {
    // Solo entre las UAs activas de la demo (ya vienen emparejadas por default):
    // Ingeniería↔Medicina y Ciencias Sociales↔Filosofía y Letras.
    const paresActivos = EMPAREJAMIENTO_DEFAULT.filter(
      ([a, b]) =>
        [UA_INGENIERIA, UA_MEDICINA, UA_SOCIALES, UA_FILOSOFIA].includes(a) &&
        [UA_INGENIERIA, UA_MEDICINA, UA_SOCIALES, UA_FILOSOFIA].includes(b),
    );
    for (const conv of [this.convs.get(2023)!, this.convs.get(2024)!, this.convs.get(2025)!, this.convs.get(2026)!]) {
      const existentes = await this.emparejamientoRepo.count({ where: { convocatoriaId: conv.id } });
      if (existentes > 0) continue;
      for (const [nombreA, nombreB] of paresActivos) {
        const uaA = this.uaMap.get(nombreA)!;
        const uaB = this.uaMap.get(nombreB)!;
        await this.emparejamientoRepo.save(
          this.emparejamientoRepo.create({ convocatoriaId: conv.id, unidadAId: uaA.id, unidadBId: uaB.id }),
        );
      }
    }
  }

  // ─────────────────── Helpers de Proyecto/Edición ───────────────────

  private async seedProyectoConEdicion(opts: {
    nombreProyecto: string;
    creadoPor: Usuario;
    unidadAcademica: UnidadAcademica;
    convocatoria: Convocatoria;
    estado: EstadoEdicion;
    presupuesto?: Presupuesto;
    datosFormulario?: object;
    esConsolidado?: boolean | null;
    avalUrl?: string;
    uaPuedeVerComprobantes?: boolean;
  }): Promise<Edicion> {
    let proyecto = await this.proyectoRepo.findOne({ where: { nombre: opts.nombreProyecto } });
    if (proyecto) {
      if (opts.esConsolidado !== undefined && proyecto.esConsolidado !== opts.esConsolidado) {
        proyecto.esConsolidado = opts.esConsolidado;
        await this.proyectoRepo.save(proyecto);
      }
      const existente = await this.edicionRepo.findOne({
        where: { proyectoId: proyecto.id, convocatoriaId: opts.convocatoria.id },
      });
      if (existente) return existente;
    } else {
      proyecto = await this.proyectoRepo.save(
        this.proyectoRepo.create({
          nombre: opts.nombreProyecto,
          creadoPorId: opts.creadoPor.id,
          esConsolidado: opts.esConsolidado ?? null,
        }),
      );
    }

    const edicion = await this.edicionRepo.save(
      this.edicionRepo.create({
        proyectoId: proyecto.id,
        convocatoriaId: opts.convocatoria.id,
        estado: opts.estado,
        creadoPorId: opts.creadoPor.id,
        unidadAcademicaId: opts.unidadAcademica.id,
        anioEdicion: opts.convocatoria.anio,
        presupuestoSolicitado: opts.presupuesto ?? null,
        datosFormulario: opts.datosFormulario ?? null,
        avalUrl: opts.avalUrl ?? null,
        uaPuedeVerComprobantes: opts.uaPuedeVerComprobantes ?? false,
      }),
    );
    console.log(`  ${opts.nombreProyecto} (${opts.estado})`);
    return edicion;
  }

  private async marcarAdjudicada(edicionId: string, opts: {
    ordenMerito: number;
    puntajeMerito: number;
    mecanismoAdjudicacion: MecanismoAdjudicacion;
    montoAdjudicado: number;
  }): Promise<void> {
    const edicion = await this.edicionRepo.findOneBy({ id: edicionId });
    if (!edicion || edicion.ordenMerito != null) return;
    edicion.ordenMerito = opts.ordenMerito;
    edicion.puntajeMerito = opts.puntajeMerito;
    edicion.adjudicacionPropuesta = true;
    edicion.mecanismoAdjudicacion = opts.mecanismoAdjudicacion;
    edicion.montoAdjudicado = opts.montoAdjudicado;
    await this.edicionRepo.save(edicion);
  }

  /** Campos de un formulario dinámico, buscados por nombre (no por posición). */
  private campo(campos: CampoFormulario[], nombre: string): CampoFormulario {
    const campo = campos.find((c) => c.nombre === nombre);
    if (!campo) {
      throw new Error(`Seed desactualizado: el formulario no tiene el campo "${nombre}".`);
    }
    return campo;
  }

  private async camposDeConvocatoria(convocatoria: Convocatoria): Promise<CampoFormulario[]> {
    if (!convocatoria.formularioId) return [];
    const formulario = await this.formularioRepo.findOne({ where: { id: convocatoria.formularioId } });
    return formulario?.campos ?? [];
  }

  private datosFormulario(
    campos: CampoFormulario[],
    opts: {
      resumen: string;
      fundamentacion: string;
      area: string;
      poblaciones: string[];
      destinatariosEstimados?: number;
      antecedentes?: boolean;
      localidad?: { id: string; nombre: string; provincia: string; lat?: number; lon?: number };
      referente?: Usuario;
      anio: number;
    },
  ): Record<string, unknown> {
    const datos: Record<string, unknown> = {
      [this.campo(campos, CAMPOS_ESTANDAR.resumen).id]: opts.resumen,
      [this.campo(campos, CAMPOS_ESTANDAR.fundamentacion).id]: opts.fundamentacion,
      [this.campo(campos, CAMPOS_ESTANDAR.antecedentes).id]: opts.antecedentes ?? false,
      [this.campo(campos, CAMPOS_ESTANDAR.area).id]: opts.area,
      [this.campo(campos, CAMPOS_ESTANDAR.poblaciones).id]: opts.poblaciones,
    };
    if (opts.destinatariosEstimados !== undefined) {
      datos[this.campo(campos, CAMPOS_ESTANDAR.destinatariosEstimados).id] = opts.destinatariosEstimados;
    }
    if (opts.localidad) {
      datos[this.campo(campos, CAMPOS_ESTANDAR.localidad).id] = opts.localidad;
    }
    if (opts.referente) {
      datos[this.campo(campos, CAMPOS_ESTANDAR.referente).id] = {
        id: opts.referente.id,
        nombre: opts.referente.nombreCompleto,
        email: opts.referente.email,
      };
    }

    const cronograma = this.campo(campos, CAMPOS_ESTANDAR.cronograma);
    const colActividad = cronograma.columnas!.find((c) => c.nombre === COLUMNAS_CRONOGRAMA.actividad)!;
    const colFecha = cronograma.columnas!.find((c) => c.nombre === COLUMNAS_CRONOGRAMA.fecha)!;
    const colResponsable = cronograma.columnas!.find((c) => c.nombre === COLUMNAS_CRONOGRAMA.responsable)!;
    datos[cronograma.id] = [
      { [colActividad.id]: 'Diagnóstico y relevamiento territorial', [colFecha.id]: `${opts.anio}-09-15`, [colResponsable.id]: 'Dirección' },
      { [colActividad.id]: 'Desarrollo de actividades con la comunidad', [colFecha.id]: `${opts.anio}-11-10`, [colResponsable.id]: 'Equipo docente' },
      { [colActividad.id]: 'Evaluación y devolución de resultados', [colFecha.id]: `${opts.anio + 1}-02-20`, [colResponsable.id]: 'Dirección' },
    ];
    return datos;
  }

  private presupuestoPequeno(periodoInicio: string, periodoFin: string): Presupuesto {
    return crearPresupuesto({
      periodoInicio, periodoFin,
      viaticoDocente: 40_000, viaticoEstudiante: 30_000,
      consumoCantidad: 30, consumoPrecioUnitario: 1_500,
      usoCantidad: 2, usoPrecioUnitario: 20_000,
    });
  }

  private presupuestoMediano(periodoInicio: string, periodoFin: string): Presupuesto {
    return crearPresupuesto({
      periodoInicio, periodoFin,
      viaticoDocente: 70_000, viaticoEstudiante: 50_000,
      consumoCantidad: 60, consumoPrecioUnitario: 2_000,
      usoCantidad: 3, usoPrecioUnitario: 35_000,
    });
  }

  private presupuestoGrande(periodoInicio: string, periodoFin: string): Presupuesto {
    return crearPresupuesto({
      periodoInicio, periodoFin,
      viaticoDocente: 100_000, viaticoEstudiante: 70_000,
      consumoCantidad: 90, consumoPrecioUnitario: 2_500,
      usoCantidad: 4, usoPrecioUnitario: 50_000,
    });
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
    if (existe) return existe;
    return this.participacionRepo.save(
      this.participacionRepo.create({
        usuarioId: data.usuarioId,
        convocatoriaId: data.convocatoriaId,
        rol: data.rol,
        edicionId: data.edicionId ?? null,
        esDirectorPrincipal: data.esDirectorPrincipal ?? null,
        asignadoPorId: data.asignadoPorId,
        estado: data.estado ?? null,
      }),
    );
  }

  private async seedDirector(usuario: Usuario, edicion: Edicion, convocatoria: Convocatoria, asignadoPorId: string, esDirectorPrincipal = true): Promise<void> {
    await this.seedParticipacion({
      usuarioId: usuario.id,
      convocatoriaId: convocatoria.id,
      rol: RolEjecucion.DirectorDeProyecto,
      edicionId: edicion.id,
      esDirectorPrincipal,
      asignadoPorId,
    });
  }

  private async seedEvaluadorAprobado(usuario: Usuario, convocatoria: Convocatoria): Promise<void> {
    const p = await this.seedParticipacion({
      usuarioId: usuario.id,
      convocatoriaId: convocatoria.id,
      rol: RolEjecucion.Evaluador,
      estado: EstadoPropuestaEvaluador.Aprobado,
      asignadoPorId: this.admin.id,
    });
    const notifExiste = await this.notificacionRepo.findOne({
      where: { participacionId: p.id, tipo: TipoNotificacion.RESULTADO_EVALUADOR },
    });
    if (notifExiste) return;
    await this.notificacionRepo.save(
      this.notificacionRepo.create({
        usuarioId: usuario.id,
        tipo: TipoNotificacion.RESULTADO_EVALUADOR,
        participacionId: p.id,
        mensaje: `Fuiste dado de alta como evaluador en la convocatoria "${convocatoria.nombre}"`,
        leida: false,
      }),
    );
  }

  // ─────────────────── Evaluaciones ───────────────────

  private readonly CHECKLIST_INSTITUCIONAL_OK = {
    'check-superposicion': true,
    'check-presupuesto': true,
    'check-documentacion': true,
  };

  private categoriasInstitucional(v: {
    trayectoria: number;
    antecedentes: number;
    vinculacion: number;
    coherencia: number;
    fundamentacionTrayectoria: string;
    fundamentacionVinculacion: string;
    complementariedad?: boolean;
    estudiantesActivos?: boolean;
    politicasPublicas?: boolean;
    devolucion?: boolean;
  }): Record<string, unknown> {
    return {
      'sub-trayectoria-equipo': { valor: v.trayectoria, fundamentacion: v.fundamentacionTrayectoria },
      'sub-antecedentes': { valor: v.antecedentes, fundamentacion: '' },
      'sub-complementariedad-equipo': { valor: v.complementariedad ?? true },
      'sub-estudiantes-activos': { valor: v.estudiantesActivos ?? true },
      'sub-vinculacion-territorio': { valor: v.vinculacion, fundamentacion: v.fundamentacionVinculacion },
      'sub-coherencia': { valor: v.coherencia, fundamentacion: '' },
      'sub-politicas-publicas': { valor: v.politicasPublicas ?? true },
      'sub-devolucion': { valor: v.devolucion ?? true },
    };
  }

  private itemsCruzada(v: {
    problema: number; objetivos: number; metodologia: number;
    participacionDiseno: number; formacionAlumnos: number; rolesAlumnos: number;
    viabilidad: number; presupuesto: number;
    comunidad: number; articulacion: number;
    impactoEsperado: number; sostenibilidad: number;
  }): Record<string, number> {
    return {
      'item-problema': v.problema, 'item-objetivos': v.objetivos, 'item-metodologia': v.metodologia,
      'item-participacion-diseno': v.participacionDiseno, 'item-formacion-alumnos': v.formacionAlumnos, 'item-roles-alumnos': v.rolesAlumnos,
      'item-viabilidad': v.viabilidad, 'item-presupuesto': v.presupuesto,
      'item-comunidad': v.comunidad, 'item-articulacion': v.articulacion,
      'item-impacto-esperado': v.impactoEsperado, 'item-sostenibilidad': v.sostenibilidad,
    };
  }

  private async guardarInstitucional(opts: {
    convocatoria: Convocatoria;
    edicionId: string;
    autoridad: Usuario;
    categorias: Record<string, unknown>;
    observaciones: string;
    esPse?: boolean;
  }): Promise<void> {
    const existente = await this.institucionalEvalRepo.findOne({ where: { edicionId: opts.edicionId } });
    if (existente || !opts.convocatoria.templateEvaluacionInstitucionalId) return;
    await this.institucionalEvalRepo.save(
      this.institucionalEvalRepo.create({
        convocatoriaId: opts.convocatoria.id,
        edicionId: opts.edicionId,
        templateId: opts.convocatoria.templateEvaluacionInstitucionalId,
        estado: EstadoEvaluacion.Confirmada,
        realizadoPorId: opts.autoridad.id,
        confirmadoPorId: opts.autoridad.id,
        categorias: opts.categorias,
        checklist: this.CHECKLIST_INSTITUCIONAL_OK,
        observaciones: opts.observaciones,
        esPse: opts.esPse ?? false,
      }),
    );
  }

  private async guardarCruzada(opts: {
    convocatoria: Convocatoria;
    edicionId: string;
    evaluador: Usuario;
    tipo: TipoEvaluacionCruzada;
    items: Record<string, number>;
    observaciones: string;
    confirmada?: boolean;
  }): Promise<void> {
    const existente = await this.cruzadaEvalRepo.findOne({ where: { edicionId: opts.edicionId, evaluadorId: opts.evaluador.id } });
    if (existente || !opts.convocatoria.templateEvaluacionCruzadaId) return;
    const confirmada = opts.confirmada ?? true;
    await this.cruzadaEvalRepo.save(
      this.cruzadaEvalRepo.create({
        convocatoriaId: opts.convocatoria.id,
        edicionId: opts.edicionId,
        evaluadorId: opts.evaluador.id,
        tipo: opts.tipo,
        templateId: opts.convocatoria.templateEvaluacionCruzadaId,
        estado: confirmada ? EstadoEvaluacion.Confirmada : EstadoEvaluacion.Borrador,
        items: opts.items,
        observaciones: opts.observaciones,
      }),
    );
  }

  // ─────────────────── Ejecución (hitos, rendiciones, autoevaluación, informe) ───────────────────

  private static readonly TITULOS_HITOS: Array<{
    categoria: CategoriaHito; titulo: string; descripcion: string; integrantes: string;
  }> = [
    { categoria: CategoriaHito.Organizacion, titulo: 'Constitución del equipo y plan de trabajo', descripcion: 'Reuniones iniciales y definición del cronograma.', integrantes: 'Dirección y docentes' },
    { categoria: CategoriaHito.ActividadConLaComunidad, titulo: 'Actividad con la comunidad destinataria', descripcion: 'Jornadas de trabajo en el territorio.', integrantes: 'Equipo completo y estudiantes' },
    { categoria: CategoriaHito.Capacitacion, titulo: 'Taller de capacitación para participantes', descripcion: 'Formación práctica para el equipo y beneficiarios.', integrantes: 'Docentes y estudiantes' },
    { categoria: CategoriaHito.Articulacion, titulo: 'Jornada de articulación institucional', descripcion: 'Acuerdos con organizaciones del territorio.', integrantes: 'Dirección' },
    { categoria: CategoriaHito.Difusion, titulo: 'Difusión de resultados parciales', descripcion: 'Presentación de avances a la comunidad.', integrantes: 'Dirección y equipo' },
  ];

  private async seedHitos(edicion: Edicion, fechas: string[]): Promise<Hito[]> {
    const existentes = await this.hitoRepo.find({ where: { edicionId: edicion.id } });
    if (existentes.length > 0) return existentes;
    const filas = fechas.map((fechaInicio, i) => {
      const plantilla = SeedService.TITULOS_HITOS[i % SeedService.TITULOS_HITOS.length];
      return this.hitoRepo.create({
        edicionId: edicion.id,
        titulo: plantilla.titulo,
        descripcion: plantilla.descripcion,
        fechaInicio,
        fechaFin: this.sumarDias(fechaInicio, 30),
        integrantes: plantilla.integrantes,
        categoria: plantilla.categoria,
        creadoPorId: edicion.creadoPorId,
      });
    });
    return this.hitoRepo.save(filas);
  }

  private sumarDias(fecha: string, dias: number): string {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  }

  private async seedRendicion(edicion: Edicion, spec: {
    rubro: TipoRubro;
    monto: number;
    fecha: string;
    estado: EstadoComprobante;
    motivoRechazo?: string;
  }): Promise<void> {
    const existe = await this.rendicionRepo.findOne({ where: { edicionId: edicion.id, monto: spec.monto, fecha: spec.fecha } });
    if (existe) return;
    await this.rendicionRepo.save(
      this.rendicionRepo.create({
        edicionId: edicion.id,
        rubro: spec.rubro,
        monto: spec.monto,
        descripcion: 'Gasto documentado de ejecución',
        fecha: spec.fecha,
        comprobanteUrl: 'https://drive.google.com/file/d/comprobante-seed/view',
        estado: spec.estado,
        motivoRechazo: spec.motivoRechazo ?? null,
        creadoPorId: edicion.creadoPorId,
      }),
    );
  }

  private async seedAutoevaluacion(edicion: Edicion, convocatoria: Convocatoria, estado: EstadoAutoevaluacion): Promise<void> {
    const existe = await this.autoevaluacionRepo.findOne({ where: { edicionId: edicion.id } });
    if (existe || !convocatoria.templateAutoevaluacionImpactoId) return;
    const completada = estado === EstadoAutoevaluacion.Completada;
    const respuestas: Record<string, unknown> = completada
      ? {
          'preg-objetivos': 'Se cumplieron los objetivos centrales del proyecto, con resultados positivos en la comunidad destinataria.',
          'preg-impacto': 8,
          'preg-participacion': true,
          'preg-continuidad': 'Sí',
          'preg-aprendizajes': ['Formación en extensión', 'Articulación con la comunidad'],
        }
      : {};
    await this.autoevaluacionRepo.save(
      this.autoevaluacionRepo.create({
        edicionId: edicion.id,
        convocatoriaId: convocatoria.id,
        templateId: convocatoria.templateAutoevaluacionImpactoId,
        estado,
        realizadoPorId: edicion.creadoPorId,
        confirmadoPorId: completada ? edicion.creadoPorId : null,
        respuestas,
      }),
    );
  }

  private async seedInformeFinal(edicion: Edicion, convocatoria: Convocatoria, estado: EstadoInforme, hitos: Hito[]): Promise<void> {
    const existe = await this.informeRepo.findOne({ where: { edicionId: edicion.id } });
    if (existe) return;
    const confirmado = estado === EstadoInforme.Confirmado;
    const contenido =
      'Informe final de la edición.\n\nActividades ejecutadas:\n\n' +
      hitos.map((h, i) => `${i + 1}. ${h.titulo} (${h.categoria}) — ${h.fechaInicio} a ${h.fechaFin}\n${h.descripcion}`).join('\n\n');
    await this.informeRepo.save(
      this.informeRepo.create({
        edicionId: edicion.id,
        convocatoriaId: convocatoria.id,
        estado,
        contenido,
        actualizadoPorId: edicion.creadoPorId,
        confirmadoPorId: confirmado ? edicion.creadoPorId : null,
        confirmadoEn: confirmado ? new Date() : null,
      }),
    );
  }

  // ─────────────────── Convocatoria 2023 (Cierre) ───────────────────

  private async seedConvocatoria2023(): Promise<void> {
    const conv = this.convs.get(2023)!;
    const campos = await this.camposDeConvocatoria(conv);
    const ing = this.uaUsuarios.get('ING')!;
    const med = this.uaUsuarios.get('MED')!;
    const soc = this.uaUsuarios.get('SOC')!;
    const fil = this.uaUsuarios.get('FIL')!;

    // Evaluadores cruzados: docentes[3] de cada UA, dados de alta directamente por Rectorado.
    for (const pool of [ing, med, soc, fil]) {
      await this.seedEvaluadorAprobado(pool.docentes[3], conv);
    }

    const proyectos: Array<{ ua: UsuariosUa; nombre: string; director: Usuario; resumen: string; area: string }> = [
      { ua: ing, nombre: 'Puente Comunitario UBANEX', director: ing.docentes[0], resumen: 'Talleres de oficios digitales para jóvenes de barrios populares.', area: 'Tecnología' },
      { ua: med, nombre: 'Salud en Territorio', director: med.docentes[0], resumen: 'Jornadas de salud comunitaria en el barrio.', area: 'Salud' },
      { ua: soc, nombre: 'Voces del Barrio', director: soc.docentes[0], resumen: 'Radio comunitaria hecha por y para el barrio.', area: 'Cultura' },
      { ua: fil, nombre: 'Letras en la Comunidad', director: fil.docentes[0], resumen: 'Talleres de lectura y escritura en bibliotecas populares.', area: 'Educación' },
    ];

    let orden = 1;
    for (const p of proyectos) {
      const datos = this.datosFormulario(campos, {
        resumen: p.resumen,
        fundamentacion: 'El equipo acumula experiencia previa en el territorio y articula con organizaciones locales.',
        area: p.area,
        poblaciones: ['Comunidad general'],
        antecedentes: false,
        anio: 2023,
      });
      const edicion = await this.seedProyectoConEdicion({
        nombreProyecto: p.nombre,
        creadoPor: p.director,
        unidadAcademica: p.ua.ua,
        convocatoria: conv,
        estado: EstadoEdicion.Cerrado,
        presupuesto: this.presupuestoMediano('2023-08-15', '2023-12-15'),
        datosFormulario: datos,
        avalUrl: 'https://drive.google.com/file/d/aval-seed/view',
      });
      await this.seedDirector(p.director, edicion, conv, p.ua.autoridad.id);
      await this.marcarAdjudicada(edicion.id, {
        ordenMerito: orden,
        puntajeMerito: 89 - orden * 3,
        mecanismoAdjudicacion: MecanismoAdjudicacion.Merito,
        montoAdjudicado: 350_000,
      });
      orden++;
      await this.guardarInstitucional({
        convocatoria: conv, edicionId: edicion.id, autoridad: p.ua.autoridad,
        categorias: this.categoriasInstitucional({
          trayectoria: 8, antecedentes: 6, vinculacion: 8, coherencia: 8,
          fundamentacionTrayectoria: 'El equipo tiene trayectoria previa en extensión universitaria.',
          fundamentacionVinculacion: 'Buena articulación con organizaciones del territorio.',
        }),
        observaciones: 'Proyecto bien articulado con el territorio y con un equipo comprometido.',
      });
      await this.guardarCruzada({
        convocatoria: conv, edicionId: edicion.id, evaluador: p.ua.docentes[3], tipo: TipoEvaluacionCruzada.Propia,
        items: this.itemsCruzada({ problema: 9, objetivos: 7, metodologia: 6, participacionDiseno: 7, formacionAlumnos: 6, rolesAlumnos: 4, viabilidad: 4, presupuesto: 4, comunidad: 5, articulacion: 5, impactoEsperado: 7, sostenibilidad: 6 }),
        observaciones: 'Metodología adecuada y viable dentro del cronograma propuesto.',
      });

      const hitos = await this.seedHitos(edicion, ['2023-09-01', '2023-10-15', '2023-11-20']);
      await this.seedRendicion(edicion, {
        rubro: p.ua.ua.nombre === UA_INGENIERIA ? TipoRubro.BienesDeConsumo : TipoRubro.ViaticosYSeguros,
        monto: 30_000, fecha: '2023-10-01', estado: EstadoComprobante.Aceptado,
      });
      await this.seedRendicion(edicion, { rubro: TipoRubro.BienesDeUso, monto: 25_000, fecha: '2023-12-01', estado: EstadoComprobante.Aceptado });
      await this.seedAutoevaluacion(edicion, conv, EstadoAutoevaluacion.Completada);
      await this.seedInformeFinal(edicion, conv, EstadoInforme.Confirmado, hitos);
    }
  }

  // ─────────────────── Convocatoria 2024 (Ejecución) ───────────────────

  private async seedConvocatoria2024(): Promise<void> {
    const conv = this.convs.get(2024)!;
    const campos = await this.camposDeConvocatoria(conv);
    const ing = this.uaUsuarios.get('ING')!;
    const med = this.uaUsuarios.get('MED')!;
    const soc = this.uaUsuarios.get('SOC')!;
    const fil = this.uaUsuarios.get('FIL')!;

    // Evaluadores cruzados: docentes[3] de cada UA, dados de alta directamente por Rectorado.
    for (const pool of [ing, med, soc, fil]) {
      await this.seedEvaluadorAprobado(pool.docentes[3], conv);
    }

    type SpecProyecto = {
      ua: UsuariosUa; nombre: string; director: Usuario; codirector?: Usuario; resumen: string; area: string;
      rendiciones: Array<{ estado: EstadoComprobante; monto: number; motivoRechazo?: string }>;
      informe: EstadoInforme; autoeval: EstadoAutoevaluacion; uaPuedeVer?: boolean;
    };

    const proyectos: SpecProyecto[] = [
      { ua: ing, nombre: 'Puente Comunitario UBANEX', director: ing.docentes[0], resumen: 'Segunda edición de los talleres de oficios digitales.', area: 'Tecnología',
        rendiciones: [{ estado: EstadoComprobante.Aceptado, monto: 40_000 }, { estado: EstadoComprobante.Aceptado, monto: 35_000 }],
        informe: EstadoInforme.Confirmado, autoeval: EstadoAutoevaluacion.Completada, uaPuedeVer: true },
      { ua: ing, nombre: 'Robótica para la Inclusión', director: ing.docentes[1], codirector: ing.docentes[4], resumen: 'Introducción a la robótica educativa en escuelas públicas.', area: 'Tecnología',
        rendiciones: [{ estado: EstadoComprobante.EnRevision, monto: 28_000 }, { estado: EstadoComprobante.Aceptado, monto: 18_000 }],
        informe: EstadoInforme.Borrador, autoeval: EstadoAutoevaluacion.Borrador },
      { ua: med, nombre: 'Salud en Territorio', director: med.docentes[0], resumen: 'Continuidad de las jornadas de salud comunitaria.', area: 'Salud',
        rendiciones: [{ estado: EstadoComprobante.Aceptado, monto: 32_000 }],
        informe: EstadoInforme.Confirmado, autoeval: EstadoAutoevaluacion.Borrador },
      { ua: med, nombre: 'Nutrición Comunitaria', director: med.docentes[2], resumen: 'Talleres de alimentación saludable en comedores barriales.', area: 'Salud',
        rendiciones: [{ estado: EstadoComprobante.Rechazado, monto: 15_000, motivoRechazo: 'El comprobante no coincide con el rubro declarado.' }, { estado: EstadoComprobante.EnRevision, monto: 20_000 }],
        informe: EstadoInforme.Borrador, autoeval: EstadoAutoevaluacion.Borrador },
      { ua: soc, nombre: 'Voces del Barrio', director: soc.docentes[0], resumen: 'Continuidad de la radio comunitaria.', area: 'Cultura',
        rendiciones: [{ estado: EstadoComprobante.Aceptado, monto: 22_000 }],
        informe: EstadoInforme.Borrador, autoeval: EstadoAutoevaluacion.Completada },
      { ua: soc, nombre: 'Economía Popular en Red', director: soc.docentes[1], resumen: 'Fortalecimiento de ferias y cooperativas de la economía popular.', area: 'Educación',
        rendiciones: [{ estado: EstadoComprobante.EnRevision, monto: 26_000 }],
        informe: EstadoInforme.Borrador, autoeval: EstadoAutoevaluacion.Borrador },
      { ua: fil, nombre: 'Letras en la Comunidad', director: fil.docentes[0], resumen: 'Continuidad de los talleres de lectura y escritura.', area: 'Educación',
        rendiciones: [{ estado: EstadoComprobante.Aceptado, monto: 24_000 }],
        informe: EstadoInforme.Confirmado, autoeval: EstadoAutoevaluacion.Completada },
      { ua: fil, nombre: 'Memoria y Patrimonio Barrial', director: fil.docentes[1], codirector: fil.docentes[4], resumen: 'Relevamiento del patrimonio histórico de barrios populares.', area: 'Cultura',
        rendiciones: [{ estado: EstadoComprobante.Rechazado, monto: 12_000, motivoRechazo: 'Falta el detalle de la actividad realizada.' }, { estado: EstadoComprobante.EnRevision, monto: 16_000 }],
        informe: EstadoInforme.Borrador, autoeval: EstadoAutoevaluacion.Borrador },
    ];

    let orden = 1;
    for (const p of proyectos) {
      const datos = this.datosFormulario(campos, {
        resumen: p.resumen,
        fundamentacion: 'La propuesta responde a una demanda concreta relevada en la comunidad.',
        area: p.area,
        poblaciones: ['Comunidad general'],
        antecedentes: true,
        anio: 2024,
      });
      const edicion = await this.seedProyectoConEdicion({
        nombreProyecto: p.nombre,
        creadoPor: p.director,
        unidadAcademica: p.ua.ua,
        convocatoria: conv,
        estado: EstadoEdicion.EnEjecucion,
        presupuesto: this.presupuestoMediano('2025-09-15', '2026-02-15'),
        datosFormulario: datos,
        avalUrl: 'https://drive.google.com/file/d/aval-seed/view',
        uaPuedeVerComprobantes: p.uaPuedeVer ?? false,
      });
      await this.seedDirector(p.director, edicion, conv, p.ua.autoridad.id);
      if (p.codirector) await this.seedDirector(p.codirector, edicion, conv, p.ua.autoridad.id, false);
      await this.marcarAdjudicada(edicion.id, {
        ordenMerito: orden,
        puntajeMerito: 85 - orden * 2,
        mecanismoAdjudicacion: MecanismoAdjudicacion.Merito,
        montoAdjudicado: 320_000,
      });
      orden++;
      await this.guardarInstitucional({
        convocatoria: conv, edicionId: edicion.id, autoridad: p.ua.autoridad,
        categorias: this.categoriasInstitucional({
          trayectoria: 7, antecedentes: 7, vinculacion: 7, coherencia: 7,
          fundamentacionTrayectoria: 'Segunda participación consecutiva del equipo en la convocatoria.',
          fundamentacionVinculacion: 'Mantiene los acuerdos con instituciones del territorio.',
        }),
        observaciones: 'La trayectoria del equipo y la coherencia interna avalan la propuesta.',
      });
      await this.guardarCruzada({
        convocatoria: conv, edicionId: edicion.id, evaluador: p.ua.docentes[3], tipo: TipoEvaluacionCruzada.Propia,
        items: this.itemsCruzada({ problema: 8, objetivos: 7, metodologia: 6, participacionDiseno: 6, formacionAlumnos: 6, rolesAlumnos: 4, viabilidad: 4, presupuesto: 4, comunidad: 5, articulacion: 5, impactoEsperado: 6, sostenibilidad: 6 }),
        observaciones: 'Buena participación estudiantil y articulación con el medio.',
      });

      const hitos = await this.seedHitos(edicion, ['2025-10-01', '2025-12-05', '2026-02-10']);
      for (const r of p.rendiciones) {
        await this.seedRendicion(edicion, { rubro: TipoRubro.BienesDeConsumo, monto: r.monto, fecha: '2026-01-15', estado: r.estado, motivoRechazo: r.motivoRechazo });
      }
      await this.seedAutoevaluacion(edicion, conv, p.autoeval);
      await this.seedInformeFinal(edicion, conv, p.informe, hitos);
    }

    // Un proyecto que se presentó pero no llegó a financiarse: NoAdjudicado es terminal,
    // no tiene hitos, rendiciones ni informe.
    // Nota: el director tiene que ser alguien sin otra participación ya asignada en esta
    // convocatoria (ParticipacionConvocatoria admite una sola fila por usuario y convocatoria).
    const noAdjudicada = await this.seedProyectoConEdicion({
      nombreProyecto: 'Taller de Oficios Digitales para Personas Mayores',
      creadoPor: med.docentes[4],
      unidadAcademica: med.ua,
      convocatoria: conv,
      estado: EstadoEdicion.NoAdjudicado,
      presupuesto: this.presupuestoPequeno('2025-09-15', '2026-02-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Alfabetización digital para adultos mayores del barrio.',
        fundamentacion: 'Existe una demanda concreta relevada en centros de jubilados de la zona.',
        area: 'Tecnología',
        poblaciones: ['Adultos mayores'],
        anio: 2024,
      }),
    });
    await this.seedDirector(med.docentes[4], noAdjudicada, conv, med.autoridad.id);
    await this.guardarInstitucional({
      convocatoria: conv, edicionId: noAdjudicada.id, autoridad: med.autoridad,
      categorias: this.categoriasInstitucional({
        trayectoria: 4, antecedentes: 2, vinculacion: 4, coherencia: 5,
        fundamentacionTrayectoria: 'Primera participación del equipo en la convocatoria.',
        fundamentacionVinculacion: 'Vinculación aún incipiente con instituciones del territorio.',
        complementariedad: false, politicasPublicas: false,
      }),
      observaciones: 'Propuesta con potencial, pero el equipo no cuenta con trayectoria previa en extensión.',
    });
  }

  // ─────────────────── Convocatoria 2025 (Evaluación) ───────────────────

  private async seedConvocatoria2025(): Promise<void> {
    const conv = this.convs.get(2025)!;
    const campos = await this.camposDeConvocatoria(conv);
    const ing = this.uaUsuarios.get('ING')!;
    const med = this.uaUsuarios.get('MED')!;
    const soc = this.uaUsuarios.get('SOC')!;
    const fil = this.uaUsuarios.get('FIL')!;

    // Evaluadores cruzados: docentes[3] de cada UA, dados de alta directamente por Rectorado.
    for (const pool of [ing, med, soc, fil]) {
      await this.seedEvaluadorAprobado(pool.docentes[3], conv);
    }

    type SpecProyecto = {
      ua: UsuariosUa; nombre: string; director: Usuario; resumen: string; area: string; esPse?: boolean;
    };
    const proyectos: SpecProyecto[] = [
      { ua: ing, nombre: 'Puente Comunitario UBANEX', director: ing.docentes[0], resumen: 'Tercera edición de los talleres de oficios digitales, ahora con salida laboral asistida.', area: 'Tecnología' },
      { ua: ing, nombre: 'Taller de Robótica Educativa', director: ing.docentes[2], resumen: 'Robótica educativa en escuelas técnicas de la zona sur.', area: 'Tecnología' },
      { ua: med, nombre: 'Salud en Territorio', director: med.docentes[0], resumen: 'Tercera edición de las jornadas de salud comunitaria, con foco en salud mental.', area: 'Salud', esPse: true },
      { ua: med, nombre: 'Acompañamiento a Adultos Mayores', director: med.docentes[1], resumen: 'Visitas domiciliarias y acompañamiento a adultos mayores en situación de aislamiento.', area: 'Salud' },
      { ua: soc, nombre: 'Voces del Barrio', director: soc.docentes[0], resumen: 'Tercera edición de la radio comunitaria, con formación en producción audiovisual.', area: 'Cultura' },
      { ua: soc, nombre: 'Cooperativas y Trabajo Digno', director: soc.docentes[2], resumen: 'Acompañamiento técnico a cooperativas de trabajo de la economía popular.', area: 'Educación' },
      { ua: fil, nombre: 'Letras en la Comunidad', director: fil.docentes[0], resumen: 'Tercera edición de los talleres de lectura y escritura, ahora en escuelas rurales.', area: 'Educación' },
      { ua: fil, nombre: 'Patrimonio Oral de la Ciudad', director: fil.docentes[2], resumen: 'Relevamiento de historias orales de vecinos y vecinas de barrios históricos.', area: 'Cultura' },
    ];

    for (const p of proyectos) {
      const datos = this.datosFormulario(campos, {
        resumen: p.resumen,
        fundamentacion: 'El proyecto cuenta con antecedentes de ediciones anteriores de la convocatoria.',
        area: p.area,
        poblaciones: ['Comunidad general'],
        antecedentes: true,
        anio: 2025,
      });
      const edicion = await this.seedProyectoConEdicion({
        nombreProyecto: p.nombre,
        creadoPor: p.director,
        unidadAcademica: p.ua.ua,
        convocatoria: conv,
        estado: EstadoEdicion.EnEvaluacion,
        presupuesto: this.presupuestoMediano('2026-12-15', '2027-05-15'),
        datosFormulario: datos,
        avalUrl: 'https://drive.google.com/file/d/aval-seed/view',
      });
      await this.seedDirector(p.director, edicion, conv, p.ua.autoridad.id);

      await this.guardarInstitucional({
        convocatoria: conv, edicionId: edicion.id, autoridad: p.ua.autoridad,
        categorias: this.categoriasInstitucional({
          trayectoria: 9, antecedentes: 8, vinculacion: 8, coherencia: 8,
          fundamentacionTrayectoria: 'El equipo acumula tres ediciones consecutivas en la convocatoria.',
          fundamentacionVinculacion: 'Fuerte articulación con instituciones y organizaciones del territorio.',
        }),
        observaciones: 'El proyecto está muy bien articulado con el territorio y su equipo tiene una trayectoria sólida.',
        esPse: p.esPse,
      });

      const evaluadorPropio = p.ua === ing ? ing.docentes[3] : p.ua === med ? med.docentes[3] : p.ua === soc ? soc.docentes[3] : fil.docentes[3];
      const evaluadorAjeno = p.ua === ing ? med.docentes[3] : p.ua === med ? ing.docentes[3] : p.ua === soc ? fil.docentes[3] : soc.docentes[3];

      await this.guardarCruzada({
        convocatoria: conv, edicionId: edicion.id, evaluador: evaluadorPropio, tipo: TipoEvaluacionCruzada.Propia,
        items: this.itemsCruzada({ problema: 9, objetivos: 7, metodologia: 6, participacionDiseno: 7, formacionAlumnos: 6, rolesAlumnos: 4, viabilidad: 4, presupuesto: 4, comunidad: 5, articulacion: 5, impactoEsperado: 7, sostenibilidad: 6 }),
        observaciones: 'Problema claramente relevante y metodología adecuada al territorio.',
      });

      // El "hueco" de la demo: esta evaluación cruzada Ajena queda sin confirmar, para poder
      // completarla en vivo y mostrar el cierre de la etapa de Evaluación.
      const esHueco = p.nombre === 'Acompañamiento a Adultos Mayores';
      await this.guardarCruzada({
        convocatoria: conv, edicionId: edicion.id, evaluador: evaluadorAjeno, tipo: TipoEvaluacionCruzada.Ajena,
        items: esHueco
          ? this.itemsCruzada({ problema: 8, objetivos: 0, metodologia: 0, participacionDiseno: 0, formacionAlumnos: 0, rolesAlumnos: 0, viabilidad: 0, presupuesto: 0, comunidad: 0, articulacion: 0, impactoEsperado: 0, sostenibilidad: 0 })
          : this.itemsCruzada({ problema: 9, objetivos: 7, metodologia: 6, participacionDiseno: 7, formacionAlumnos: 6, rolesAlumnos: 5, viabilidad: 4, presupuesto: 4, comunidad: 5, articulacion: 5, impactoEsperado: 5, sostenibilidad: 5 }),
        observaciones: esHueco ? 'Evaluación en curso: falta completar la mayoría de los ítems.' : 'Evaluación desde la Unidad Académica emparejada: buena viabilidad y fuerte articulación comunitaria.',
        confirmada: !esHueco,
      });
    }
  }

  // ─────────────────── Convocatoria 2026 (Presentación) ───────────────────

  private async seedConvocatoria2026(): Promise<void> {
    const conv = this.convs.get(2026)!;
    const campos = await this.camposDeConvocatoria(conv);
    const ing = this.uaUsuarios.get('ING')!;
    const med = this.uaUsuarios.get('MED')!;
    const soc = this.uaUsuarios.get('SOC')!;
    const fil = this.uaUsuarios.get('FIL')!;

    // Puente Comunitario UBANEX: cuarta participación consecutiva. Rectorado ya lo marcó
    // como consolidado a mano (override manual, independiente del cálculo automático).
    const puente = await this.seedProyectoConEdicion({
      nombreProyecto: 'Puente Comunitario UBANEX',
      creadoPor: ing.docentes[0],
      unidadAcademica: ing.ua,
      convocatoria: conv,
      estado: EstadoEdicion.Presentado,
      presupuesto: this.presupuestoGrande('2027-01-15', '2027-06-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Cuarta edición de los talleres de oficios digitales, con salida laboral asistida y nueva sede.',
        fundamentacion: 'La trayectoria del equipo en extensión avala la continuidad de las acciones.',
        area: 'Tecnología',
        poblaciones: ['Niños y adolescentes', 'Comunidad general'],
        destinatariosEstimados: 180,
        antecedentes: true,
        localidad: { id: '06427010000', nombre: 'La Plata', provincia: 'Buenos Aires', lat: -34.9214, lon: -57.9544 },
        referente: med.autoridad,
        anio: 2026,
      }),
      esConsolidado: true,
    });
    await this.seedDirector(ing.docentes[0], puente, conv, ing.autoridad.id);

    // Un proyecto nuevo en Borrador (todavía no se presentó).
    const borradorIng = await this.seedProyectoConEdicion({
      nombreProyecto: 'Semillero de Innovación Tecnológica',
      creadoPor: ing.docentes[4],
      unidadAcademica: ing.ua,
      convocatoria: conv,
      estado: EstadoEdicion.Borrador,
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Espacio de experimentación tecnológica para estudiantes secundarios.',
        fundamentacion: 'El equipo detectó la necesidad en escuelas técnicas de la zona.',
        area: 'Tecnología',
        poblaciones: ['Niños y adolescentes'],
        anio: 2026,
      }),
    });
    await this.seedDirector(ing.docentes[4], borradorIng, conv, ing.autoridad.id);

    // Medicina: un Presentado y un Borrador.
    const medPresentado = await this.seedProyectoConEdicion({
      nombreProyecto: 'Salud en Territorio',
      creadoPor: med.docentes[0],
      unidadAcademica: med.ua,
      convocatoria: conv,
      estado: EstadoEdicion.Presentado,
      presupuesto: this.presupuestoMediano('2027-01-15', '2027-06-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Cuarta edición de las jornadas de salud comunitaria.',
        fundamentacion: 'El diagnóstico participativo realizado en la zona sustenta la intervención propuesta.',
        area: 'Salud',
        poblaciones: ['Comunidad general'],
        antecedentes: true,
        anio: 2026,
      }),
    });
    await this.seedDirector(med.docentes[0], medPresentado, conv, med.autoridad.id);

    const medBorrador = await this.seedProyectoConEdicion({
      nombreProyecto: 'Prevención de Adicciones en Adolescentes',
      creadoPor: med.docentes[2],
      unidadAcademica: med.ua,
      convocatoria: conv,
      estado: EstadoEdicion.Borrador,
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Talleres de prevención de adicciones para adolescentes en escuelas secundarias.',
        fundamentacion: 'Demanda relevada junto a centros de salud de la zona.',
        area: 'Salud',
        poblaciones: ['Niños y adolescentes'],
        anio: 2026,
      }),
    });
    await this.seedDirector(med.docentes[2], medBorrador, conv, med.autoridad.id);

    // Sociales y Filosofía: un Presentado y un PendienteDeCambios con sugerencia (una por UA).
    const socPresentado = await this.seedProyectoConEdicion({
      nombreProyecto: 'Voces del Barrio',
      creadoPor: soc.docentes[0],
      unidadAcademica: soc.ua,
      convocatoria: conv,
      estado: EstadoEdicion.Presentado,
      presupuesto: this.presupuestoMediano('2027-01-15', '2027-06-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Cuarta edición de la radio comunitaria.',
        fundamentacion: 'Existe una red de vínculos previa con instituciones de la zona.',
        area: 'Cultura',
        poblaciones: ['Comunidad general'],
        antecedentes: true,
        anio: 2026,
      }),
    });
    await this.seedDirector(soc.docentes[0], socPresentado, conv, soc.autoridad.id);

    const socPendiente = await this.seedProyectoConEdicion({
      nombreProyecto: 'Economía Popular en Red',
      creadoPor: soc.docentes[1],
      unidadAcademica: soc.ua,
      convocatoria: conv,
      estado: EstadoEdicion.PendienteDeCambios,
      presupuesto: this.presupuestoPequeno('2027-01-15', '2027-06-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Feria itinerante de cooperativas de la economía popular.',
        fundamentacion: 'Continuidad de la edición anterior.',
        area: 'Educación',
        poblaciones: ['Comunidad general'],
        anio: 2026,
      }),
    });
    await this.seedDirector(soc.docentes[1], socPendiente, conv, soc.autoridad.id);
    await this.seedSugerencia(socPendiente, soc.autoridad, {
      campo: 'nombre',
      valorActual: 'Economía Popular en Red',
      valorSugerido: null,
      comentario: 'Precisar en el nombre a qué feria itinerante se refiere el proyecto.',
    });

    const filPresentado = await this.seedProyectoConEdicion({
      nombreProyecto: 'Letras en la Comunidad',
      creadoPor: fil.docentes[0],
      unidadAcademica: fil.ua,
      convocatoria: conv,
      estado: EstadoEdicion.Presentado,
      presupuesto: this.presupuestoMediano('2027-01-15', '2027-06-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Cuarta edición de los talleres de lectura y escritura.',
        fundamentacion: 'La metodología combina trabajo de campo con actividades de formación.',
        area: 'Educación',
        poblaciones: ['Comunidad general'],
        antecedentes: true,
        anio: 2026,
      }),
    });
    await this.seedDirector(fil.docentes[0], filPresentado, conv, fil.autoridad.id);

    const filPendiente = await this.seedProyectoConEdicion({
      nombreProyecto: 'Memoria y Patrimonio Barrial',
      creadoPor: fil.docentes[1],
      unidadAcademica: fil.ua,
      convocatoria: conv,
      estado: EstadoEdicion.PendienteDeCambios,
      presupuesto: this.presupuestoPequeno('2027-01-15', '2027-06-15'),
      datosFormulario: this.datosFormulario(campos, {
        resumen: 'Segunda edición del relevamiento de patrimonio histórico barrial.',
        fundamentacion: 'Continuidad de la edición anterior.',
        area: 'Cultura',
        poblaciones: ['Comunidad general'],
        anio: 2026,
      }),
    });
    await this.seedDirector(fil.docentes[1], filPendiente, conv, fil.autoridad.id);
    await this.seedSugerencia(filPendiente, fil.autoridad, {
      campo: `datosFormulario.${this.campo(campos, CAMPOS_ESTANDAR.fundamentacion).id}`,
      valorActual: 'Continuidad de la edición anterior.',
      valorSugerido: 'Ampliar la fundamentación explicando qué barrios se relevarán en esta edición.',
      comentario: 'Ampliar la fundamentación del área temática elegida.',
    });
  }

  private async seedSugerencia(
    edicion: Edicion,
    sugeridoPor: Usuario,
    datos: { campo: string; valorActual: string | null; valorSugerido: string | null; comentario: string },
  ): Promise<void> {
    const existe = await this.sugerenciaRepo.count({ where: { edicionId: edicion.id } });
    if (existe > 0) return;
    const sugerencia = await this.sugerenciaRepo.save(
      this.sugerenciaRepo.create({
        edicionId: edicion.id,
        sugeridoPorId: sugeridoPor.id,
        campo: datos.campo,
        valorActual: datos.valorActual,
        valorSugerido: datos.valorSugerido,
        comentario: datos.comentario,
        estado: EstadoSugerencia.Pendiente,
      }),
    );
    await this.notificacionRepo.save(
      this.notificacionRepo.create({
        usuarioId: edicion.creadoPorId,
        tipo: TipoNotificacion.NUEVA_SUGERENCIA,
        sugerenciaId: sugerencia.id,
        mensaje: `${sugeridoPor.nombreCompleto} sugirió un cambio en el proyecto`,
      }),
    );
  }

  // ─────────────────── Resumen ───────────────────

  private async mostrarResumen(): Promise<void> {
    const usuarios = await this.usuarioRepo.count();
    const convocatorias = await this.convocatoriaRepo.count();
    const proyectos = await this.proyectoRepo.count();
    const ediciones = await this.edicionRepo.count();
    const participaciones = await this.participacionRepo.count();
    const institucionales = await this.institucionalEvalRepo.count();
    const cruzadas = await this.cruzadaEvalRepo.count();
    const hitos = await this.hitoRepo.count();
    const rendiciones = await this.rendicionRepo.count();
    const sugerencias = await this.sugerenciaRepo.count();

    console.log('  Resumen del seed:');
    console.log(`    Usuarios: ${usuarios}`);
    console.log(`    Convocatorias: ${convocatorias}`);
    console.log(`    Proyectos: ${proyectos} — Ediciones: ${ediciones}`);
    console.log(`    Participaciones: ${participaciones}`);
    console.log(`    Evaluaciones institucionales: ${institucionales} — cruzadas: ${cruzadas}`);
    console.log(`    Hitos: ${hitos} — Rendiciones: ${rendiciones}`);
    console.log(`    Sugerencias: ${sugerencias}`);
    console.log(`    Admin: admin@uba.ar / ${PASSWORD_SEED} — resto de los usuarios con la misma password`);
  }
}
