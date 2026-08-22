// Estructuras y valores por defecto de los templates de evaluación.
// Se usan como base para seedear las plantillas de biblioteca (esDefault/esPlantilla)
// y como referencia del dominio.

import { EstructuraTemplateInstitucional, EstructuraTemplateCruzada } from '../templates-evaluacion/estructura-template';
import { EstructuraTemplateAutoevaluacion } from '../ejecucion/estructura-autoevaluacion';
import { TipoPregunta } from '../common/enums/tipo-pregunta.enum';

export const TEMPLATE_INSTITUCIONAL_DEFAULT: EstructuraTemplateInstitucional = {
  categorias: [
    {
      id: 'cat-puntaje-diferencial',
      nombre: 'Puntaje diferencial',
      subcategorias: [
        {
          id: 'sub-trayectoria-equipo',
          texto: 'Trayectoria del equipo en extensión universitaria',
          tipoValor: 'numerico',
          minimo: 0,
          maximo: 10,
          fundamentacion: null,
        },
        {
          id: 'sub-antecedentes',
          texto: 'Antecedentes del proyecto en convocatorias anteriores',
          tipoValor: 'numerico',
          minimo: 0,
          maximo: 10,
          fundamentacion: null,
        },
        {
          id: 'sub-complementariedad-equipo',
          texto: 'El equipo es complementario e incluye estudiantes',
          tipoValor: 'booleano',
          minimo: null,
          maximo: null,
          fundamentacion: null,
        },
        {
          id: 'sub-estudiantes-activos',
          texto: 'El proyecto incorpora estudiantes como parte activa del equipo',
          tipoValor: 'booleano',
          minimo: null,
          maximo: null,
          fundamentacion: null,
        },
      ],
    },
    {
      id: 'cat-articulacion',
      nombre: 'Articulación del proyecto',
      subcategorias: [
        {
          id: 'sub-vinculacion-territorio',
          texto: 'Vinculación con instituciones y organizaciones del territorio',
          tipoValor: 'numerico',
          minimo: 0,
          maximo: 10,
          fundamentacion: null,
        },
        {
          id: 'sub-coherencia',
          texto: 'Coherencia entre objetivos y actividades',
          tipoValor: 'numerico',
          minimo: 0,
          maximo: 10,
          fundamentacion: null,
        },
        {
          id: 'sub-politicas-publicas',
          texto: 'El proyecto articula con políticas públicas o planes existentes',
          tipoValor: 'booleano',
          minimo: null,
          maximo: null,
          fundamentacion: null,
        },
        {
          id: 'sub-devolucion',
          texto: 'El proyecto prevé devolución de resultados a la comunidad',
          tipoValor: 'booleano',
          minimo: null,
          maximo: null,
          fundamentacion: null,
        },
      ],
    },
  ],
  checklist: [
    {
      id: 'check-superposicion',
      texto: 'El equipo declara no tener superposición con otros proyectos presentados',
    },
    {
      id: 'check-presupuesto',
      texto: 'El presupuesto es acorde a las actividades propuestas',
    },
    {
      id: 'check-documentacion',
      texto: 'La documentación presentada está completa',
    },
  ],
};

export const TEMPLATE_CRUZADA_DEFAULT: EstructuraTemplateCruzada = {
  categorias: [
    {
      id: 'cat-justificacion',
      nombre: 'Justificación y Formulación',
      puntajeMaximo: 25,
      items: [
        {
          id: 'item-problema',
          nombre: 'Claridad y relevancia del problema a abordar',
          puntajeMaximo: 10,
        },
        {
          id: 'item-objetivos',
          nombre: 'Coherencia entre objetivos, actividades y resultados esperados',
          puntajeMaximo: 8,
        },
        {
          id: 'item-metodologia',
          nombre: 'Adecuación de la metodología propuesta',
          puntajeMaximo: 7,
        },
      ],
    },
    {
      id: 'cat-capacitacion',
      nombre: 'Capacitación de Alumnos',
      puntajeMaximo: 20,
      items: [
        {
          id: 'item-participacion-diseno',
          nombre: 'Participación de estudiantes en el diseño e implementación',
          puntajeMaximo: 8,
        },
        {
          id: 'item-formacion-alumnos',
          nombre: 'Formación de alumnos en el campo de la extensión',
          puntajeMaximo: 7,
        },
        {
          id: 'item-roles-alumnos',
          nombre: 'Cantidad y roles de alumnos involucrados',
          puntajeMaximo: 5,
        },
      ],
    },
    {
      id: 'cat-factibilidad',
      nombre: 'Adecuación Instrumental y Factibilidad',
      puntajeMaximo: 10,
      items: [
        {
          id: 'item-viabilidad',
          nombre: 'Viabilidad del cronograma y de los recursos disponibles',
          puntajeMaximo: 5,
        },
        {
          id: 'item-presupuesto',
          nombre: 'Adecuación del presupuesto solicitado',
          puntajeMaximo: 5,
        },
      ],
    },
    {
      id: 'cat-vinculacion',
      nombre: 'Vinculación con el Medio',
      puntajeMaximo: 12,
      items: [
        {
          id: 'item-comunidad',
          nombre: 'Grado de participación de la comunidad destinataria',
          puntajeMaximo: 6,
        },
        {
          id: 'item-articulacion',
          nombre: 'Articulación con organizaciones e instituciones del territorio',
          puntajeMaximo: 6,
        },
      ],
    },
    {
      id: 'cat-impacto',
      nombre: 'Impacto Social',
      puntajeMaximo: 15,
      items: [
        {
          id: 'item-impacto-esperado',
          nombre: 'Impacto esperado en la comunidad destinataria',
          puntajeMaximo: 8,
        },
        {
          id: 'item-sostenibilidad',
          nombre: 'Sostenibilidad de los resultados en el tiempo',
          puntajeMaximo: 7,
        },
      ],
    },
  ],
};

export const TEMPLATE_AUTOEVALUACION_DEFAULT: EstructuraTemplateAutoevaluacion = {
  preguntas: [
    {
      id: 'preg-objetivos',
      tipo: TipoPregunta.Texto,
      texto: '¿En qué medida se cumplieron los objetivos planteados en el proyecto?',
      esObligatorio: true,
      orden: 0,
      opciones: null,
      escalaMin: null,
      escalaMax: null,
    },
    {
      id: 'preg-impacto',
      tipo: TipoPregunta.EscalaNumerica,
      texto: 'Grado de impacto logrado en la comunidad destinataria',
      esObligatorio: true,
      orden: 1,
      opciones: null,
      escalaMin: 1,
      escalaMax: 10,
    },
    {
      id: 'preg-participacion',
      tipo: TipoPregunta.Booleano,
      texto: '¿Se sostuvo la participación de estudiantes durante toda la ejecución?',
      esObligatorio: true,
      orden: 2,
      opciones: null,
      escalaMin: null,
      escalaMax: null,
    },
    {
      id: 'preg-continuidad',
      tipo: TipoPregunta.Select,
      texto: '¿Pensás dar continuidad al proyecto en próximas convocatorias?',
      esObligatorio: false,
      orden: 3,
      opciones: ['Sí', 'No', 'No aún'],
      escalaMin: null,
      escalaMax: null,
    },
    {
      id: 'preg-aprendizajes',
      tipo: TipoPregunta.Checkbox,
      texto: '¿Qué aprendizajes destacás de la experiencia?',
      esObligatorio: false,
      orden: 4,
      opciones: ['Formación en extensión', 'Articulación con la comunidad', 'Trabajo en equipo', 'Gestión de proyectos'],
      escalaMin: null,
      escalaMax: null,
    },
  ],
};
