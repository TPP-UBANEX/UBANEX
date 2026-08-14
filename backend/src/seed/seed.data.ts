export const UAS_NOMBRES: string[] = [
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

export const CARRERAS_POR_UA: Record<string, string[]> = {
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
  'Ciclo Básico Común (CBC)': ['Ciclo Básico Común'],
};

export const FORMULARIOS_SEED: Array<{ nombre: string; esDefault: boolean }> = [
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

export const NOMBRES: string[] = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hernán',
  'Inés', 'Julián', 'Karina', 'Leandro', 'Marta', 'Nicolás', 'Olga', 'Pablo',
  'Romina', 'Santiago', 'Valeria', 'Walter', 'Cecilia', 'Marcos', 'Lucía',
  'Federico', 'Paula', 'Ramiro', 'Silvina', 'Tomás', 'Verónica', 'Andrés',
];

export const APELLIDOS: string[] = [
  'Aguirre', 'Benítez', 'Cabrera', 'Domínguez', 'Espinoza', 'Ferreyra', 'Giménez',
  'Herrera', 'Ibarra', 'Juárez', 'Ledesma', 'Molina', 'Navarro', 'Ortega',
  'Paredes', 'Quinteros', 'Roldán', 'Sosa', 'Villalba', 'Álvarez', 'Méndez',
  'Acosta', 'Vega', 'Luna', 'Peralta', 'Cáceres', 'Ríos', 'Barrionuevo', 'Carrizo',
];

export const AREAS_DOCENTE: Record<string, string[]> = {
  'Facultad de Derecho': ['Derecho Constitucional', 'Derecho Penal', 'Derecho Civil', 'Derecho Laboral'],
  'Facultad de Ciencias Económicas': ['Economía Aplicada', 'Administración Pública', 'Contabilidad', 'Finanzas'],
  'Facultad de Ciencias Sociales': ['Comunicación', 'Sociología', 'Trabajo Social', 'Ciencia Política'],
  'Facultad de Filosofía y Letras': ['Historia', 'Letras', 'Filosofía', 'Antropología'],
  'Facultad de Ingeniería': ['Ingeniería Civil', 'Ingeniería Electrónica', 'Ingeniería en Informática', 'Ingeniería Industrial'],
  'Facultad de Medicina': ['Clínica Médica', 'Salud Pública', 'Enfermería', 'Nutrición'],
  'Facultad de Ciencias Exactas y Naturales': ['Matemática', 'Física', 'Química', 'Computación'],
  'Facultad de Arquitectura, Diseño y Urbanismo': ['Arquitectura', 'Diseño Industrial', 'Urbanismo'],
  'Facultad de Agronomía': ['Producción Vegetal', 'Ambiente', 'Agroalimentos'],
  'Facultad de Farmacia y Bioquímica': ['Farmacología', 'Bioquímica Clínica', 'Biotecnología'],
  'Facultad de Odontología': ['Odontología', 'Salud Bucal Comunitaria'],
  'Facultad de Psicología': ['Psicología Clínica', 'Psicología Social', 'Musicoterapia'],
  'Facultad de Ciencias Veterinarias': ['Medicina Veterinaria', 'Salud Animal', 'Gestión de Agroalimentos'],
  'Ciclo Básico Común (CBC)': ['Ciencias Exactas', 'Ciencias Sociales', 'Humanidades'],
};

export const TITULO_INICIOS: string[] = [
  'Programa de', 'Red de', 'Talleres de', 'Laboratorio de', 'Observatorio de',
  'Campaña de', 'Jornadas de', 'Capacitación en', 'Fortalecimiento de', 'Acceso a',
  'Promoción de', 'Acompañamiento en', 'Producción de', 'Investigación sobre',
  'Desarrollo de', 'Vinculación con', 'Centro de', 'Ciclo de', 'Escuela de',
  'Feria de', 'Sistema de', 'Red Territorial de', 'Equipo de', 'Banco de',
  'Formación en', 'Difusión de', 'Fomento de', 'Fortalecimiento de la',
  'Promoción de la', 'Acompañamiento de',
];

export const TITULO_TEMAS: string[] = [
  'alfabetización digital', 'huertas comunitarias', 'salud comunitaria',
  'prevención de adicciones', 'educación ambiental', 'oficios para la inclusión laboral',
  'memoria y patrimonio barrial', 'economía popular', 'género y diversidad',
  'acceso al agua potable', 'lectura en barrios populares', 'tecnología para adultos mayores',
  'arte y cultura comunitaria', 'deporte e inclusión social', 'soberanía alimentaria',
  'reciclaje y economía circular', 'turismo comunitario', 'comunicación popular',
  'derechos de las niñeces', 'voluntariado universitario', 'alimentación saludable',
  'educación popular', 'salud mental comunitaria', 'producción audiovisual barrial',
  'robótica educativa', 'huertas urbanas', 'oficios digitales', 'alfabetización financiera',
  'teatro comunitario', 'música y niñez', 'prevención de violencias',
  'acceso a la justicia', 'ciencia ciudadana', 'deporte y salud',
  'tutorías para ingresantes', 'huerta agroecológica escolar',
];

export const RESUMENES_PROYECTO: string[] = [
  'Propuesta de {tema} desarrollada junto a organizaciones sociales del territorio.',
  'Iniciativa de {tema} con perspectiva comunitaria y participación estudiantil activa.',
  'Proyecto de {tema} orientado a fortalecer capacidades en la comunidad destinataria.',
  'Experiencia de {tema} articulada con instituciones educativas y de salud de la zona.',
  'Dispositivo de {tema} con enfoque de derechos y continuidad en el tiempo.',
  'Acción territorial de {tema} que integra docencia, investigación y extensión.',
  'Espacio de {tema} con metodología participativa y evaluación colectiva.',
  'Red de {tema} que articula equipos docentes, estudiantes y vecinos de la zona.',
];

export const FUNDAMENTACIONES: string[] = [
  'El equipo acumula experiencia previa en el territorio y articula con organizaciones locales.',
  'La propuesta responde a una demanda concreta relevada en la comunidad.',
  'La metodología combina trabajo de campo con actividades de formación.',
  'Existe una red de vínculos previa con instituciones de la zona.',
  'El proyecto cuenta con antecedentes de ediciones anteriores de la convocatoria.',
  'El diagnóstico participativo realizado en la zona sustenta la intervención propuesta.',
  'La trayectoria del equipo en extensión avala la continuidad de las acciones.',
];

export const OBSERVACIONES_INST: string[] = [
  'Proyecto bien articulado con el territorio y con un equipo comprometido.',
  'La trayectoria del equipo y la coherencia interna avalan la propuesta.',
  'Se recomienda ajustar algunos indicadores de impacto en la ejecución.',
  'La vinculación con la comunidad es sólida y sostenible en el tiempo.',
  'Presenta fortalezas claras y una devolución adecuada a los destinatarios.',
];

export const OBSERVACIONES_CRUZADA: string[] = [
  'Metodología adecuada y viable dentro del cronograma propuesto.',
  'Buena participación estudiantil y articulación con el medio.',
  'El presupuesto es razonable en relación con los objetivos planteados.',
  'Problema relevante con impacto esperado en la comunidad destinataria.',
  'Se destaca la sostenibilidad de las acciones luego del período de ejecución.',
  'La formulación del proyecto es clara y los indicadores resultan medibles.',
];

export const COMENTARIOS_SUGERENCIA: string[] = [
  'Reformular el resumen para explicitar los destinatarios y el impacto esperado.',
  'Completar el cronograma con actividades mensuales y responsables.',
  'Precisar la población destinataria y los criterios de inclusión.',
  'Ampliar la fundamentación del área temática elegida.',
  'Ajustar el presupuesto a las actividades planteadas en el cronograma.',
  'Incorporar instancias de evaluación y devolución a la comunidad.',
];
