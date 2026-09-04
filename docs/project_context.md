# Resumen Consolidado – Proyecto TPP FIUBA

## Sistema de Gestión para Convocatorias UBANEX

---

# 1. Contexto General

## Proyecto seleccionado

Desarrollo de un sistema integral para gestionar convocatorias de extensión universitaria de la Universidad de Buenos Aires, inicialmente enfocado en UBANEX.

Cliente principal:

* Secretaría de Extensión Universitaria del Rectorado UBA.
* Referente principal: Sofía Della Villa.

El proyecto se desarrolla como Trabajo Profesional de Licenciatura en Análisis de Sistemas (FIUBA).

---

# 2. Alternativas de Proyecto Evaluadas

Durante el relevamiento inicial se analizaron tres propuestas:

## A. Ficha Integral del Estudiante (SIGBAS)

Objetivo:

Centralizar toda la participación de un estudiante dentro de las actividades del SIGBAS.

Problemas detectados:

* Existen múltiples sistemas independientes.
* No existe una visión unificada del recorrido estudiantil.
* Becas, pasantías, tutorías, cultura, deportes y otros programas funcionan de manera aislada.

Estado:

Interesante pero complejo por:

* Gran cantidad de integraciones.
* Reestructuración institucional en curso.
* Dependencia de múltiples sistemas existentes.

---

## B. Sistema para Cooperativas (Fundación La Base)

Objetivo:

Desarrollar un sistema de gestión económica para cooperativas que reciben créditos productivos.

Posible relación con Farmacoop:

* Compartir modelo de gestión.
* Adaptarse a múltiples cooperativas.
* Seguimiento económico y financiero.

Ventajas:

* Problema concreto.
* Alcance relativamente controlado.

Desventajas:

* Muchos stakeholders distintos.
* Menor alineación con la experiencia universitaria.

---

## C. Plataforma UBANEX

Objetivo:

Gestionar de punta a punta las convocatorias de extensión universitaria.

Ventajas:

* Alto impacto institucional.
* Problema claramente identificado.
* Cliente definido.
* Procesos existentes documentados.
* Posibilidad de crecimiento futuro.

Resultado:

Proyecto seleccionado.

---

# 3. Reuniones con Sofía Della Villa

## Primera reunión

Hallazgos principales:

### Situación actual

La gestión de convocatorias se realiza mediante:

* Formularios.
* PDFs.
* Correos electrónicos.
* Google Drive.
* Documentación en papel.

Consecuencias:

* Duplicación de información.
* Mucho trabajo manual.
* Falta de trazabilidad.
* Dificultad para generar estadísticas.

---

## Segunda reunión

Se presentó el proceso completo de UBANEX.

Se identificaron tres módulos principales:

### Módulo 1

Apertura de convocatoria y presentación.

### Módulo 2

Evaluación y adjudicación.

### Módulo 3

Rendición de fondos.

Además surgió un cuarto módulo:

### Módulo 4

Informes finales y cierre.

---

## Tercera reunión

Se profundizó en:

* Roles.
* Permisos.
* Evaluaciones.
* Formularios dinámicos.
* Rendición presupuestaria.
* Infraestructura.

---

# 4. Proceso UBANEX

## Módulo 1 – Convocatorias y Presentación

### Objetivo

Gestionar el ciclo completo de las convocatorias y la presentación de proyectos.

### Convocatoria

- Cada convocatoria tiene **año** y **5 estados** que se corresponden con las etapas del proceso: `Configuración → Presentación → Evaluación → Ejecución → Cierre`.
- Las etapas `Presentación`, `Evaluación` y `Ejecución` tienen **fechas de inicio y fin** configurables al crear la convocatoria. `Configuración` y `Cierre` no tienen fechas asociadas.

### Formularios dinámicos

- Cada convocatoria define su propio **template de formulario** (estructura de campos) para la presentación de proyectos.
- Los templates pueden reutilizarse entre convocatorias (opción **default**).
- Tipos de campo disponibles (`TipoCampo`): `texto`, `texto_largo`, `numero`, `fecha`,
  `geolocalizacion`, `booleano`, `checkbox`, `select`, `usuario`, `tabla`, `seccion` y
  `archivo`. `archivo` está deshabilitado hasta que exista almacenamiento de adjuntos;
  `seccion` es solo un separador visual.
- Cada campo se configura como obligatorio u opcional.

### Proyecto y Edición

- Un **Proyecto** es una entidad raíz con datos estables que persisten entre años (ej: nombre).
- Una **Edición** es la instancia de un proyecto dentro de una convocatoria específica. Un proyecto puede tener múltiples ediciones a lo largo del tiempo.
- Cada edición pertenece a una **Unidad Académica** (la facultad de su director).
- Estados de una edición: `Borrador → Presentado → PendienteDeCambios → EnEvaluación → Adjudicado | NoAdjudicado → EnEjecución → Cerrado`.
- `NoAdjudicado` es terminal.
- Cada edición tiene **directores** asignados a través de `ParticipacionConvocatoria` con rol `DirectorDeProyecto`. Un director principal (`esDirectorPrincipal = true`) es obligatorio; un segundo director es opcional.
- Un usuario puede participar como director en máximo **2 proyectos por convocatoria**.

---

## Módulo 2 – Evaluación y Adjudicación

### Unidad Académica

- La UBA tiene **14 unidades académicas** (facultades).
- Cada proyecto/edición pertenece a la UA de su director.
- Los evaluadores pertenecen a una UA específica.
- Las Secretarías de Extensión pertenecen cada una a su UA. El Rectorado es órgano central y no pertenece a ninguna UA.

### Emparejamiento

- Por cada convocatoria, el Rectorado define **7 parejas de unidades académicas** (14 UAs total). Cada UA se empareja con una única otra.

### Evaluación Institucional

Realizada por la Secretaría de Extensión de la UA del proyecto:

- La pueden completar tanto **Autoridades** como **Asistentes** de Secretaría.
- La **confirmación** final la da exclusivamente una **Autoridad** de Secretaría.
- Tiene estado `Borrador | Confirmada`.

#### Estructura

- **Categorías** configurables por convocatoria (default: "Puntaje diferencial", "Articulación del proyecto"). Cada categoría contiene **subcategorías** con:
  - nombre del criterio
  - tipo de valor (numérico con mínimo y máximo, o booleano) — excluyentes
  - fundamentación opcional
- **Checklist** — sección independiente de ítems booleanos que **no suma** a la ponderación final.
- La **ponderación final** se obtiene de la suma de las categorías.

### Evaluación Cruzada

Realizada por **Evaluadores docentes** de las UAs emparejadas:

- Cada evaluador evalúa proyectos **propios** (de su UA) y **ajenos** (de la UA emparejada).
- Un evaluador puede evaluar múltiples proyectos.
- Cada edición recibe **0 a 3 evaluaciones cruzadas**: propia, ajena, y eventualmente una tercera de una UA de resolución para inconsistencias extraordinarias.
- El evaluador mismo confirma su evaluación (no requiere autoridad superior).
- Tiene estado `Borrador | Confirmada`.

#### Estructura

- **5 categorías** configurables por convocatoria (default: Justificación y Formulación 25pts, Capacitación de Alumnos 20pts, Adecuación Instrumental y Factibilidad 10pts, Vinculación con el Medio 12pts, Impacto Social 15pts).
- Cada categoría contiene **ítems** con nombre, puntaje máximo y puntaje asignado.
- Al final se muestra un **cuadro de puntuación** con categorías, puntajes máximos y puntajes asignados, más la **ponderación final** (suma de máximos y suma de asignados). Es calculado, no almacenado.

### Templates de evaluación

- Ambos tipos de evaluación tienen **templates configurables** por convocatoria, análogos a los formularios dinámicos.
- Pueden reutilizarse entre convocatorias (opción default).

### Reglas importantes

#### Conflictos de interés

No puede evaluarse:

* Su propio proyecto.
* Proyecto donde participe.

#### Asignaciones

- Rectorado define los cruces entre facultades (emparejamiento).
- La evaluación cruzada es abierta: todos los evaluadores de una pareja de UAs pueden evaluar cualquier proyecto, pero cada proyecto recibe una sola evaluación proveniente de cada UA.

### Puntajes

- Ambas evaluaciones generan puntaje por separado.
- No rechazan proyectos directamente. El rechazo o aprobación surge posteriormente.

### Proyectos consolidados

Proyecto con `esConsolidado = true`: mismo equipo directivo durante dos años consecutivos. Su Edición **saltea la etapa de Evaluación** en la convocatoria actual y pasa directamente a Adjudicación (si cumple requisitos). Aparece primero en el orden de mérito, ordenado por nota final entre sí.

### Orden de mérito

Se construye con la **nota final** de cada edición: cada "Sí" de la evaluación
institucional suma 10 pts y se le suma el promedio de las evaluaciones cruzadas
confirmadas (`notaFinal = round((promedioCruzadas + puntajeInstitucional) * 10) / 10`).
Los proyectos consolidados encabezan el orden. No hay umbral de nota para adjudicar: el
corte lo determina el presupuesto disponible de la convocatoria y la **cuota federativa**
como piso por unidad académica. Ver [`dominio/modelo.md`](dominio/modelo.md) §Adjudicación
y Orden de Mérito para el algoritmo completo.

### Adjudicación

- Es la **resolución formal** emitida por Rectorado que selecciona proyectos del orden de mérito y les asigna un monto.
- El **Orden de Mérito** se genera **automáticamente** al finalizar la etapa `Evaluación`. Ordena todas las ediciones evaluadas por nota final descendente. Los proyectos consolidados aparecen primeros, ordenados por nota final entre sí.
- La **cuota federativa** actúa como piso: si al aplicar el orden de mérito una UA tiene menos proyectos adjudicados que la cuota, se toman los siguientes mejores proyectos de esa UA, aunque tengan menor nota que otros de UAs que ya superaron la cuota.

---

## Módulo 3 – Ejecución, Rendición y Seguimiento

Comienza cuando se firma la resolución de adjudicación.

### Presupuesto

- Cada edición tiene un **presupuesto** asociado desde su creación (puede estar vacío en estado Borrador).
- El presupuesto tiene un **monto total** y se compone de **3 rubros fijos**:

#### Rubro 1: Viáticos y Seguros
- Desglosado por **tipo de persona** (Docente / Estudiante).
- Cada partida incluye: descripción, período, monto.
- El subtotal del rubro suma los montos de ambos tipos de persona.

#### Rubro 2: Bienes de Consumo
- Cada partida incluye: descripción, cantidad, precio unitario, monto.
- Subtotal calculado.

#### Rubro 3: Bienes de Uso
- Misma estructura que Bienes de Consumo.

### Rendición

> **Estado: no implementado aún.** Hoy `Rendicion` es una tabla mínima de solo lectura;
> no existen los comprobantes ni el flujo de revisión descrito abajo (ver "Estado actual").

- Una única **Rendición** por Edición, activa durante la etapa `Ejecución`.
- El director y/o codirector suben **Comprobantes** (archivos PDF o imagen), cada uno asociado a uno de los 3 rubros del presupuesto.
- Cada comprobante tiene estado individual: `EnRevisión → Aceptado | Rechazado`.
- La revisión de comprobantes la realiza Rectorado. Si se rechaza, se deja un **comentario** explicativo. El director puede subir un nuevo comprobante que **reemplace** al rechazado.

Actualmente todo se realiza mediante Google Drive.

### Seguimiento de Ejecución (Hitos)

- Durante la etapa `Ejecución`, los directores registran **Hitos** para documentar actividades realizadas con su equipo.
- Cada hito incluye: título, descripción, fecha de inicio, fecha de fin, integrantes (texto libre) y categoría (enumerado fijo por definir).
- Visibilidad: solo usuarios de la Secretaría de la UA correspondiente y de Rectorado pueden consultar los hitos de un proyecto.

### Mejoras buscadas

* Trazabilidad de comprobantes y su estado.
* Historial de reemplazos de comprobantes rechazados.
* Registro de hitos de ejecución.

---

## Módulo 4 – Cierre

### Informe Final

- Cuando la convocatoria pasa a `Ejecución`, se crea un **InformeFinal** vacío asociado a cada Edición.
- El sistema autogenera el contenido inicial a partir de los **hitos** registrados durante la ejecución. El director puede editarlo libremente y opcionalmente adjuntar un archivo PDF.
- Estado: `Borrador → Confirmado`. Una vez confirmado, queda como registro definitivo (nadie lo aprueba).

### Autoevaluación de Impacto

- Cada convocatoria define su propio **Template de Autoevaluación de Impacto** (configurable por Rectorado, reutilizable entre convocatorias, opción default).
- Tipos de pregunta disponibles: texto, booleano, escala numérica (con mínimo y máximo), select, checkbox.
- La completa el director o codirector durante la etapa `Ejecución`. Puede guardarse como `Borrador` y retomarse después.
- Estado: `Borrador → Completada`.

### Requisitos para el cierre

Para que una Edición pase a `Cerrado` se requiere:

- [ ] InformeFinal en estado `Confirmado`.
- [ ] Autoevaluación de Impacto en estado `Completada`.
- [ ] Rendición con todos los comprobantes en estado `Aceptado`.

---

# 5. Roles del Sistema

### Unidad Académica

Las 14 facultades de la UBA son la unidad organizativa central del sistema. Cada una tiene su propia Secretaría de Extensión. El Rectorado es un órgano central que no pertenece a ninguna UA.

### Grupos de roles

Los roles se dividen en dos **grupos excluyentes** — un usuario no puede mezclar roles de distintos grupos:

| Grupo | Roles |
|---|---|
| **Gestión** | AutoridadDeRectorado, AsistenteDeRectorado, AutoridadDeSecretaria, AsistenteDeSecretaria |
| **Ejecución** | Estudiante, Docente |

Un usuario puede acumular múltiples roles a lo largo del tiempo (ej: fue Director en una convocatoria y luego Evaluador en otra), pero todos deben pertenecer al mismo grupo.

### Rectorado

#### Autoridad de Rectorado (1 a 3 en total)

Funciones:
* Crear y configurar convocatorias (etapas, fechas, templates).
* Definir emparejamientos de UAs.
* Validar proyectos.
* Emitir adjudicaciones.
* Administrar usuarios del sistema (crear Asistentes de Rectorado, Autoridades de Secretaría).
* Modificar convocatorias incluso luego del cierre.

#### Asistente de Rectorado (0 a N)

Puede realizar muchas de las funciones de las Autoridades, pero **no puede dar confirmaciones finales** ni realizar acciones críticas como emitir adjudicaciones o modificar convocatorias cerradas.

---

### Secretarías de Extensión (por Unidad Académica)

#### Autoridad de Secretaría (1 a 3 por UA)

Funciones:
* Validar proyectos de su UA.
* Realizar y **confirmar** evaluaciones institucionales.
* Asignar Evaluadores a una convocatoria (sobre usuarios existentes con rol Docente).
* Crear Asistentes de Secretaría de su UA.
* Validar Docentes de su UA.

#### Asistente de Secretaría (0 a N por UA)

Puede realizar muchas de las funciones de las Autoridades de Secretaría (incluyendo completar evaluaciones institucionales), pero **no puede confirmar** evaluaciones, validar docentes ni crear usuarios.

---

### Docente (0 a N)

Funciones:
* Crear proyectos y ediciones.
* Editarlos y adjuntar documentación.
* Responder observaciones.
* Gestionar rendiciones.
* Puede ser asignado como `DirectorDeProyecto` o `Evaluador` en una convocatoria específica.

Registro y validación:
* Se registra por sí mismo en la aplicación indicando su Unidad Académica.
* Requiere **validación** por una Autoridad de Secretaría de su UA.
* Estados: `PendienteDeValidación → Validado | Rechazado`.

Restricción:
* Máximo 2 participaciones como director por convocatoria.

---

### Estudiante (0 a N)

Funciones:
* Visualizar proyectos en los que participa.

Registro:
* Se registra por sí mismo en la aplicación.
* No requiere validación.
* No puede ser asignado a roles de ejecución (`DirectorDeProyecto` o `Evaluador`).

---

### Director de Proyecto (rol de ejecución por convocatoria)

El usuario debe tener rol `Docente` y estar validado. Una Autoridad de Secretaría lo asigna como `DirectorDeProyecto` en una convocatoria específica mediante `ParticipacionConvocatoria`.

Funciones:
* Crear proyectos y ediciones (heredado de Docente).
* Editar proyectos y adjuntar documentación.
* Responder observaciones.
* Gestionar rendiciones.
* Registrar hitos de ejecución.
* Completar autoevaluación de impacto e informe final.

Restricción:
* Máximo 2 participaciones como director por convocatoria.

---

### Evaluador (rol de ejecución por convocatoria)

El usuario debe tener rol `Docente` y estar validado. Una **Autoridad de Secretaría** lo asigna como `Evaluador` en una convocatoria específica mediante `ParticipacionConvocatoria`.

Funciones:
* Evaluar proyectos de su UA y de la UA emparejada.
* Asignar puntajes.
* Emitir observaciones.

Restricciones:
* No puede tener conflicto de interés.

---

# 6. Estado del Arte

Sistemas estudiados:

## SIGEVA

Ventajas:

* Gestión de convocatorias.
* Evaluaciones.

Problemas:

* Cerrado.
* Orientado a investigación.

---

## Kuali Research

Orientado a:

* Subsidios.
* Grants.

No contempla:

* Extensión universitaria.

---

## Symplectic Elements

Orientado a:

* Producción científica.

No contempla:

* Convocatorias de extensión.

---

## SurveyMonkey Apply

Permite:

* Formularios.
* Evaluaciones.

Limitación:

No cubre el ciclo completo.

---

## OpenProject

Gestión general de proyectos.

No contempla reglas académicas.

---

## GDE

Excelente para expedientes.

No contempla:

* Lógica de convocatorias.
* Evaluaciones.
* Orden de mérito.

---

# 7. Problema Definido

La gestión actual de los proyectos de extensión universitaria es ineficiente debido a la inexistencia de una plataforma única que centralice y estructure el proceso completo.

Consecuencias:

* Duplicación de información.
* Procesos manuales propensos a errores.
* Demoras.
* Escasa trazabilidad.
* Sobrecarga administrativa.
* Falta de estadísticas.
* Problemas de seguimiento.

---

# 8. Propuesta Definitiva

Sistema web modular compuesto por:

1. Convocatorias y presentación.
2. Evaluación.
3. Adjudicación y orden de mérito.
4. Ejecución y seguimiento (hitos).
5. Rendición (comprobantes).
6. Autoevaluación de impacto.
7. Cierre (informe final).

Características:

* Formularios dinámicos.
* Gestión documental.
* Roles y permisos.
* Historial de cambios.
* Auditoría.
* Trazabilidad.

---

# 9. Es / No Es

## Es

* Sistema de gestión para convocatorias de extensión.
* Plataforma configurable.
* Registro centralizado del ciclo de vida.

## No es

* Red social.
* Portal público.
* Blog institucional.
* Sistema académico tipo SIU.

---

# 10. Hace / No Hace

## Hace

* Gestiona convocatorias.
* Gestiona evaluaciones.
* Gestiona adjudicaciones.
* Gestiona rendiciones.
* Permite seguimiento.

## No hace

* No reemplaza GDE.
* No realiza pagos.
* No evalúa automáticamente.
* No garantiza adjudicaciones.

---

# 11. User Story Mapping

## Rectorado

### Autoridad de Rectorado

* Configurar convocatoria (etapas, fechas, templates).
* Gestionar formularios y templates de evaluación.
* Definir emparejamiento de UAs.
* Validar proyectos.
* Emitir adjudicaciones.
* Administrar usuarios del sistema.
* Generar orden de mérito y emitir adjudicaciones.
* Revisar y aceptar/rechazar comprobantes de rendición.
* Configurar template de autoevaluación de impacto.

### Asistente de Rectorado

* Colaborar en la configuración de convocatorias.
* Gestionar formularios.
* Revisar proyectos.

---

## Secretaría

### Autoridad de Secretaría

* Validar proyectos de su UA.
* Evaluar institucionalmente y **confirmar** evaluaciones.
* Gestionar evaluadores (crearlos).
* Validar directores de proyecto.

### Asistente de Secretaría

* Revisar proyectos.
* Completar evaluaciones institucionales (sin confirmar).

---

> Los roles de **Director de Proyecto** y **Evaluador** son roles de ejecución asignados por convocatoria sobre usuarios con rol `Docente` validado. Ver §5 para detalle.

## Director de Proyecto

* Crear proyecto y ediciones.
* Presentar documentación.
* Gestionar ejecución.
* Registrar hitos de ejecución.
* Subir comprobantes de rendición.
* Completar autoevaluación de impacto.
* Completar y confirmar informe final.

---

## Evaluador

* Revisar proyectos (propios y ajenos).
* Asignar puntajes.
* Emitir observaciones.

---

## Sistema (automatizaciones)

* Generar orden de mérito al finalizar evaluación.
* Crear informe final al iniciar ejecución (autogenerado desde hitos).
* Verificar requisitos de cierre antes de permitir el estado Cerrado.

---

# 12. Arquitectura Propuesta

Frontend:

* React 18.
* TypeScript 5.
* Vite 5.
* TailwindCSS 3.
* shadcn/ui.
* React Router 7.

Backend:

* NestJS 10.
* TypeScript 5.
* TypeORM 1.x.

Base de datos:

* PostgreSQL.

Campos dinámicos:

* JSON (para almacenar respuestas de formularios dinámicos).

---

## Infraestructura

Hosting:

* Render.

Versionado:

* GitHub.

Almacenamiento:

Pendiente definir:

* Servidor FIUBA.
* Nube.

---

# 13. Objetivo General

Desarrollar un sistema integral de gestión que digitalice y estructure el proceso completo de convocatorias UBANEX, permitiendo administrar de manera centralizada la presentación, evaluación, adjudicación, ejecución, rendición y cierre de proyectos de extensión universitaria, mejorando la eficiencia operativa, la transparencia institucional y la trazabilidad de la información.

---

# 14. Plan de Actividades (4 meses)

## Semana 1–2

Relevamiento y modelado.

Duración:
2 semanas.

---

## Semana 3

Arquitectura y diseño técnico.

Duración:
1 semana.

---

## Semana 4–6

Módulo de Convocatorias y Presentación.

Duración:
3 semanas.

---

## Semana 7–9

Módulo de Evaluación y Adjudicación.

Duración:
3 semanas.

---

## Semana 10–12

Módulo de Ejecución y Rendición.

Duración:
3 semanas.

---

## Semana 13

Módulo de Cierre.

Duración:
1 semana.

---

## Semana 14

Integración general.

Duración:
1 semana.

---

## Semana 15

Validación institucional.

Duración:
1 semana.

---

## Semana 16

Documentación final y entrega.

Duración:
1 semana.

---

# 15. Preguntas Pendientes

> Nota: varias de estas preguntas ya se resolvieron durante la implementación. Se marcan
> abajo con **[Resuelto]**; el detalle está en [`dominio/modelo.md`](dominio/modelo.md).

## Infraestructura

* ¿Dónde se almacenarán los documentos adjuntos (archivos de formularios, comprobantes de rendición)?
* ¿Hay límite de espacio?
* ¿Existe infraestructura FIUBA disponible?

## Integraciones

* ¿Se integrará con GDE?
* ¿Solo almacenar códigos o documentos también?

## Evaluación

* **[Resuelto]** Fórmula del puntaje final: cada "Sí" institucional suma 10 pts y
  `notaFinal = round((promedio de cruzadas confirmadas + puntaje institucional) * 10) / 10`.
  No hay umbral de nota; el corte lo da el presupuesto + la cuota federativa.
* **[Resuelto]** Reglas de cuota federativa: piso por UA con algoritmo de 3 pasos
  (mérito global con tope por UA → piso de cuota → swap por excedente).
* **[Resuelto]** Tercera UA de resolución de inconsistencias: se compara la evaluación
  Propia vs. Ajena contra `umbralInconsistenciaCruzada` (default 40) y se designa un
  evaluador de una tercera UA. Suplencias: no hay (el estado `NoAdjudicado` es terminal).

## Rendición

* Flujo exacto de aprobación de rendiciones.
* Estados posibles de una rendición.
* Responsables finales de la aprobación (autoridad de Secretaría, Rectorado, etc.).

## Ejecución y Seguimiento

* **[Resuelto]** Categorías fijas de hitos (`CategoriaHito`): Organización, Capacitación,
  Actividad con la Comunidad, Articulación, Difusión, Informe Parcial.
* ¿Quién revisa los comprobantes de rendición exactamente (Rectorado, Secretaría, ambos)?
* ¿Hay un límite de reemplazos de comprobantes rechazados?

## Autoevaluación de Impacto

* ¿El template de autoevaluación se comparte entre convocatorias como los formularios (esDefault)?
* ¿Hay un mínimo de preguntas obligatorias?

---

# Estado actual

Proyecto definido. Relevamiento avanzado. Documento de propuesta terminado. Modelo de
dominio implementado en código (ver [`dominio/modelo.md`](dominio/modelo.md)).

## Implementado

* Autenticación JWT: registro propio como Estudiante/Docente, login, guards y roles.
* 6 roles globales (Autoridad/Asistente de Rectorado, Autoridad/Asistente de Secretaría,
  Estudiante, Docente) en grupos excluyentes; validación de docentes por Secretaría.
* Roles de ejecución por convocatoria (`DirectorDeProyecto`, `Evaluador`) vía
  `ParticipacionConvocatoria`; alta directa de evaluadores por Rectorado.
* CRUD de usuarios con paginación, filtros y perfil académico/docente; auditoría de
  acciones; catálogos de unidades académicas, carreras y geo.
* CRUD de convocatorias con estados y fechas por etapa.
* Reglas de cierre de convocatoria: solo se cierra cuando la fecha actual es igual o
  posterior a la fecha de fin de ejecución y no quedan comprobantes en revisión.
* Formularios dinámicos con 12 tipos de campo, tablas, y plantillas reutilizables;
  se congelan al pasar a `Presentacion`.
* Proyectos y ediciones con presupuesto de 3 rubros (recálculo en backend), tope de
  presupuesto solicitado por convocatoria, aval de edición y reenvío ("resubir").
* Sugerencias de cambio sobre ediciones presentadas + notificaciones in-app / mail.
* Emparejamiento de unidades académicas por convocatoria.
* Evaluación institucional y cruzada con estado `Borrador | Confirmada` y plantillas
  configurables por convocatoria.
* Consolidación derivada del historial + override tri-estado; salteo de evaluación de
  consolidados.
* Orden de mérito y adjudicación propuesta (mérito / cuota federativa) con presupuesto a
  adjudicar (topes, extra por insumos, extra por PSE); confirmación que fija el resultado
  y notifica a los directores.
* Desempate por tercera evaluación: umbral de inconsistencia cruzada y designación de un
  evaluador de una tercera unidad académica.
* Hitos de ejecución.
* Comprobantes de rendición: carga por rubro con consumo del presupuesto y estados
  `EnRevision → Aceptado | Rechazado`; **aceptar/rechazar es solo de Rectorado** (con
  motivo de rechazo) y el director controla si la Secretaría de la UA puede ver la
  sección en modo lectura (`Edicion.uaPuedeVerComprobantes`, default `false`); si no la
  habilita, la Secretaría ve un aviso al abrir la pestaña.
* Autoevaluación de impacto (plantillas configurables) e informe final (autogenerado
  desde hitos), cada uno con su confirmación.

## Falta / incompleto

* **Rendición de comprobantes**: está implementado el circuito básico (carga por rubro,
  revisión por Rectorado), pero faltan el historial/reemplazo de comprobantes rechazados
  y la subida de archivos reales (hoy el comprobante es un link).
* **Cierre de la Edición a `Cerrado`**: existen las confirmaciones individuales de
  informe y autoevaluación, pero no la transición que valida los 3 requisitos (informe
  confirmado + autoevaluación completada + rendición aceptada).
* **Almacenamiento de adjuntos**: `TipoCampo.Archivo` deshabilitado, aval como URL, sin
  subida real de archivos.
* Wireframes y presentación de defensa.