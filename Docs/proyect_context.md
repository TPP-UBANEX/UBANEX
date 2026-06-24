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

## Módulo 1 – Apertura y Presentación

### Objetivo

Permitir presentar proyectos.

### Funcionalidades

* Publicar convocatorias.
* Crear formularios dinámicos.
* Configurar campos obligatorios y opcionales.
* Adjuntar documentación.
* Gestionar estados.

### Características importantes

Los formularios deben permitir:

* Texto.
* Booleanos.
* Checkboxes.
* Selects.
* Integrantes.
* Roles.
* Objetivos.
* Actividades.
* Archivos.

### Restricciones

* Director puede editar hasta el cierre.
* Rectorado puede editar excepcionalmente luego.

---

# Módulo 2 – Evaluación y Adjudicación

## Evaluación Institucional

Realizada por:

* Secretarías de extensión.

Características:

* Revisión administrativa.
* Puntaje numérico.

---

## Evaluación Cruzada

Realizada por:

* Evaluadores docentes.

Características:

* Evaluación de contenido.
* Puntaje numérico.

---

## Reglas importantes

### Conflictos de interés

No puede evaluarse:

* Su propio proyecto.
* Proyecto donde participe.

### Asignaciones

Rectorado:

* Define cruces entre facultades.

Secretarías:

* Asignan evaluadores a proyectos.

---

## Puntajes

Ambas evaluaciones generan puntaje.

No rechazan proyectos directamente.

El rechazo o aprobación surge posteriormente.

---

## Proyectos consolidados

Definición:

Proyecto financiado y ejecutado durante dos años consecutivos con mismo equipo directivo.

Reciben tratamiento diferencial.

---

## Orden de mérito

Se construye utilizando:

* Puntajes.
* Prioridades institucionales.
* Cuota federativa.

---

# Módulo 3 – Ejecución y Rendición

Comienza cuando se firma la resolución de adjudicación.

## Funcionalidades

* Presupuestos.
* Comprobantes.
* Facturas.
* Tickets.
* Observaciones.
* Readecuaciones presupuestarias.

Actualmente:

Todo se realiza mediante Google Drive.

---

## Mejoras buscadas

* Clasificación por rubros.
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

## Rectorado

Funciones:

* Crear convocatorias.
* Configurar formularios.
* Validar proyectos.
* Definir cruces.
* Emitir adjudicaciones.
* Administrar usuarios.

Permisos especiales:

* Modificar convocatorias incluso luego del cierre.

---

## Secretarías de Extensión

Funciones:

* Validar proyectos.
* Gestionar evaluadores.
* Realizar evaluación institucional.
* Crear usuarios.

---

## Director de Proyecto

Funciones:

* Crear proyectos.
* Editarlos.
* Adjuntar documentación.
* Responder observaciones.
* Gestionar rendiciones.

Restricción:

Máximo dos participaciones por convocatoria.

---

## Evaluadores

Funciones:

* Evaluar proyectos.
* Asignar puntajes.
* Emitir observaciones.

Restricciones:

No pueden tener conflicto de interés.

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

Actividades:

* Configurar convocatoria.
* Gestionar formularios.
* Validar proyectos.
* Gestionar evaluadores.
* Emitir adjudicaciones.

---

## Secretaría

Actividades:

* Revisar proyectos.
* Evaluar institucionalmente.
* Gestionar evaluadores.

---

## Director

Actividades:

* Crear proyecto.
* Presentar documentación.
* Gestionar ejecución.
* Gestionar rendición.

---

## Evaluador

Actividades:

* Revisar proyectos.
* Asignar puntajes.
* Emitir observaciones.

---

# 12. Arquitectura Propuesta

Frontend:

* React.
* Shadcn UI.

Backend:

* Node.js.

Base de datos:

* PostgreSQL.

Campos dinámicos:

* JSON.

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

* ¿Dónde se almacenarán los documentos?
* ¿Hay límite de espacio?
* ¿Existe infraestructura FIUBA disponible?

## Integraciones

* ¿Se integrará con GDE?
* ¿Solo almacenar códigos o documentos también?

## Evaluación

* Fórmula exacta del puntaje final.
* Reglas precisas de cuota federativa.
* Manejo de suplentes.

## Rendición

* Flujo exacto de aprobación.
* Estados posibles.
* Responsables finales.

---

# Estado actual

Proyecto definido.
Relevamiento avanzado.
Documento de propuesta prácticamente terminado.
Próximos artefactos:

* Product Vision.
* User Story Mapping.
* WBS.
* Wireframes.
* Backlog.
* Diagramas.
* Presentación de defensa.