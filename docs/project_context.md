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
- Tipos de campo disponibles: `texto`, `booleano`, `checkbox`, `select`, `archivo`.
- Cada campo se configura como obligatorio u opcional.

### Proyecto y Edición

- Un **Proyecto** es una entidad raíz con datos estables que persisten entre años (ej: nombre).
- Una **Edición** es la instancia de un proyecto dentro de una convocatoria específica. Un proyecto puede tener múltiples ediciones a lo largo del tiempo.
- Cada edición pertenece a una **Unidad Académica** (la facultad de su director).
- Estados de una edición: `Borrador → Presentado → PendienteDeCambios → EnEvaluación → Adjudicado | NoAdjudicado → EnEjecución → Cerrado`.
- `NoAdjudicado` es terminal.
- Cada edición tiene un **director** (obligatorio) y un **codirector** (opcional), ambos con rol DirectorDeProyecto.
- Un director puede participar en máximo **2 proyectos por convocatoria** (1 como director + 1 como codirector).

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

Proyecto financiado y ejecutado durante dos años consecutivos con mismo equipo directivo. Reciben tratamiento diferencial.

### Orden de mérito

Se construye utilizando:
* Puntajes de ambas evaluaciones.
* Prioridades institucionales.
* Cuota federativa.

---

## Módulo 3 – Ejecución y Rendición

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

### Funcionalidades

* Presupuestos (con el desglose por rubros).
* Comprobantes.
* Facturas.
* Tickets.
* Observaciones.
* Readecuaciones presupuestarias.

Actualmente:

Todo se realiza mediante Google Drive.

### Mejoras buscadas

* Clasificación por rubros (ya definido en el modelo de dominio).
* Trazabilidad.
* Historial.
* Estados de aprobación.
* Comentarios.

---

# Módulo 4 – Informes de Cierre

Objetivo:

Cerrar formalmente los proyectos.

Documentación:

* Informes finales.
* Evidencias.
* Productos académicos.

---

# 5. Roles del Sistema

### Unidad Académica

Las 14 facultades de la UBA son la unidad organizativa central del sistema. Cada una tiene su propia Secretaría de Extensión. El Rectorado es un órgano central que no pertenece a ninguna UA.

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
* Crear Evaluadores de su UA.
* Crear Asistentes de Secretaría de su UA.
* Validar la habilitación de Directores de Proyecto de su UA.

#### Asistente de Secretaría (0 a N por UA)

Puede realizar muchas de las funciones de las Autoridades de Secretaría (incluyendo completar evaluaciones institucionales), pero **no puede confirmar** evaluaciones, validar directores ni crear usuarios.

---

### Director de Proyecto (0 a N)

Funciones:
* Crear proyectos y ediciones.
* Editarlos y adjuntar documentación.
* Responder observaciones.
* Gestionar rendiciones.

Registro y validación:
* Se registra por sí mismo en la aplicación.
* Requiere **validación** por una Autoridad de Secretaría de su UA.
* Estados: `PendienteDeValidación → Validado | Rechazado`.

Restricción:
* Máximo 2 participaciones por convocatoria (1 como director + 1 como codirector).

---

### Evaluador (0 a N por UA)

Funciones:
* Evaluar proyectos (propios y ajenos de la UA emparejada).
* Asignar puntajes.
* Emitir observaciones.

Registro:
* Es creado por una **Autoridad de Secretaría** de su UA (no se registra solo).

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
3. Adjudicación.
4. Ejecución.
5. Rendición.
6. Cierre.

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

## Director de Proyecto

* Crear proyecto y ediciones.
* Presentar documentación.
* Gestionar ejecución.
* Gestionar rendición.

---

## Evaluador

* Revisar proyectos (propios y ajenos).
* Asignar puntajes.
* Emitir observaciones.

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

## Infraestructura

* ¿Dónde se almacenarán los documentos adjuntos (archivos de formularios, comprobantes de rendición)?
* ¿Hay límite de espacio?
* ¿Existe infraestructura FIUBA disponible?

## Integraciones

* ¿Se integrará con GDE?
* ¿Solo almacenar códigos o documentos también?

## Evaluación

* Fórmula exacta del puntaje final (cómo se combinan evaluación institucional y cruzada para el orden de mérito).
* Reglas precisas de cuota federativa.
* Manejo de suplentes y de la tercera UA de resolución de inconsistencias.

## Rendición

* Flujo exacto de aprobación de rendiciones.
* Estados posibles de una rendición.
* Responsables finales de la aprobación (autoridad de Secretaría, Rectorado, etc.).

---

# Estado actual

Proyecto definido.
Relevamiento avanzado.
Documento de propuesta prácticamente terminado.
Modelo de dominio completo en `docs/dominio/modelo.md` (diagramas Mermaid: Convocatoria, Proyecto y Edición, Evaluación, Usuarios y Roles).
Próximos artefactos:

* Product Vision.
* User Story Mapping (borrador inicial en esta sección).
* WBS.
* Wireframes.
* Backlog.
* Implementación de entidades del modelo de dominio.
* Presentación de defensa.