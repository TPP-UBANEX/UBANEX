# Feature: Módulo de Ejecución (Hitos + Autoevaluación de Impacto + Informe Final)

> **ESTADO: COMPLETADO (Etapas 1-10).** Backend + frontend listos, build y lint OK en ambos.
> Pendiente de verificación manual: `make reset-seed` (no reposible en esta máquina) y la
> pantalla de templates (Etapa 11, opcional, no implementada).

Documento de trabajo para implementar el ciclo de ejecución/cierre de UBANEX.
Este archivo es la fuente de verdad del plan. Si la conversación se compacta,
volver a leer SIEMPRE este documento antes de continuar.

---

## 1. Objetivo

Agregar las tres funcionalidades del Módulo 3 (Ejecución) y del Módulo 4 (Cierre)
que aún no existen en el código:

1. **Hitos de ejecución** (registrar / modificar / eliminar / ver / ver como admin).
2. **Autoevaluación de Impacto** (template dinámico por convocatoria + completar como borrador/completada).
3. **Informe Final** (contenido autogenerado desde hitos + editar + confirmar).

Referencia de dominio: `docs/project_context.md` (Módulo 3 y Módulo 4) y `docs/dominio/modelo.md`.

---

## 2. User stories que cubre

| US | Título | Actor | Alcance |
|----|--------|-------|---------|
| #64 | Registrar un hito de ejecución | Director de Proyecto | Crear hito en edición |
| #65 | Modificar un hito de ejecución | Director de Proyecto | Editar hito |
| #66 | Eliminar un hito de ejecución | Director de Proyecto | Borrar hito |
| #67 | Ver los hitos registrados de una edición | Director de Proyecto | Listar hitos de su edición |
| #68 | Completar la autoevaluación de impacto | Director de Proyecto | Borrador + Completada |
| #69 | Editar el informe final | Director de Proyecto | Editar contenido + adjuntar PDF opcional |
| #70 | Confirmar el informe final | Director de Proyecto | Dejar registro definitivo (requisito de cierre) |
| #74 | Ver hitos e info de proyectos | Administrador (Secretaría/Rectorado) | Vista integral desde listado de proyectos |

Nota: #74 es la única que se sale del patrón CRUD directo: es una **vista nueva en el listado
de proyectos** (fila expandible), no un CRUD de director.

---

## 3. Categorías de hitos (`CategoriaHito`)

Enum actualmente vacío en `backend/src/common/enums/categoria-hito.enum.ts`.
Set acordado:

```ts
export enum CategoriaHito {
  Organizacion = 'Organizacion',
  Capacitacion = 'Capacitacion',
  ActividadConLaComunidad = 'ActividadConLaComunidad',
  Articulacion = 'Articulacion',
  Difusion = 'Difusion',
  InformeParcial = 'InformeParcial',
}
```
(se puede ajustar si el país/cliente lo pide, pero éste es el set base aprobado)

---

## 4. Decisiones de diseño acordadas

- **Tres módulos en UN módulo backend** `execucion` (carpeta `ejecucion/`) para no duplicar
  lógica de estados/perfil/auditoría. Nombre del módulo en español (convención DDD).
- Autoevaluación: **template dinámico completo** configurable por Rectorado
  (`TemplateAutoevaluacionImpacto` + CRUD de templates + copia default), no solo template fijo.
- US #74: **fila expandible en `Proyectos.tsx`** (visible a Secretaría/Rectorado).
- Hitos mutables/borrables solo cuando la edición está `EnEjecucion`.
- Autoevaluación e Informe siguen el patrón **Borrador → Sellado** (replicar `EvaluacionInstitucional`).

---

## 5. Conocimiento clave del código (NO perder)

### Backend

- **Stack**: NestJS 10, TypeORM 1.x, PostgreSQL, TypeScript estricto, CommonJS, `import` no `require`.
- `app.module.ts`: `autoLoadEntities: true` + `synchronize: process.env.RENDER !== 'true'`.
  Agregar módulo nuevo solo a la lista de `imports` (no hace falta listar entidades globales).
- **Patrón de entidad** (ver `evaluaciones/evaluacion-cruzada.entity.ts`):
  - `@PrimaryGeneratedColumn('uuid') id`
  - `@ManyToOne(() => X) @JoinColumn({ name: 'xId' }) x: X` + `@Column() xId: string`
  - enum guardado como `@Column({ type: 'varchar', default: ... })` (NO `type: 'enum'`;
    solo `Convocatoria.estado` usa enum nativo).
  - `@CreateDateColumn() creadoEn`, `@UpdateDateColumn() actualizadoEn`
  - FK: `convocatoriaId`, `edicionId`
  - Mojadas: `realizadoPorId/actualizadoPorId/confirmadoPorId` (nullables) → `Usuario`
- **Patrón de módulo** (ver `evaluaciones/evaluaciones.module.ts`):
  - `TypeOrmModule.forFeature([...entidades propias y ajenas que inyecte...])`
  - `imports: [AuditoriaModule]`
  - `controllers: [Controller]`, `providers: [Service]`
- **Patrón de controller** (`evaluaciones.controller.ts`, `sugerencias.controller.ts`):
  - `@Controller('ruta')` + `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase
  - `@Roles(RolUsuario.X)` por handler (semántica **OR**, de `roles.guard.ts`)
  - `@CurrentUser() usuario: Usuario` para el usuario autenticado
  - Rutas anidadas estilo `ediciones/:edicionId/...`
- **`ParticipacionGuard` + `@RequiereParticipacion` EXISTEN pero NO se usan en controllers**.
  Pueden usarse para autorizar `DirectorDeProyecto`, o validar manual en service
  (replicar helpers privados de `sugerencias.service.ts`: `esSecretaria`, `esRectorado`,
  `validarDirectorOCreador`, y lanzar `ForbiddenException`).
- **Patrón guardar/confirmar con sello** (replicar `evaluaciones.service.ts`):
  - guardar = upsert por `edicionId`; si ya sellado → `BadRequestException`.
  - confirmar = valida rol + completitud (recorre estructura del template) + setea `estado`
    sellado + `confirmadoPorId`; luego `repo.save` + `auditoria.registrar(...)`.
- **Validación de respuestas contra template**: `evaluaciones/validar-respuestas-evaluacion.ts`
  (funciones puras) — modelo para validar respuestas de autoevaluación.
- **Auditoría**: `AuditoriaService.registrar(...)`. Agregar valores nuevos a
  `common/enums/tipo-entidad-auditoria.enum.ts` si se quiere historial por entidad.
- **DTOs**: `class-validator`; base `common/dto/listar-paginado.dto.ts`; respuestas paginadas
  `common/interfaces/paginated-response.interface.ts`.
- **Enums existentes** en `common/enums/`: `estado-autoevaluacion.enum.ts`
  (`Borrador, Completada`) ya existe; `estado-informe.enum.ts` (`Borrador, Confirmado`) ya existe;
  `categoria-hito.enum.ts` está **vacío** (lo llenamos). `tipo-pregunta.enum.ts`:
  `texto, booleano, escalaNumerica, select, checkbox`.

### Entidades de referencia

- `proyectos/edicion.entity.ts`: columnas → `id, proyectoId, convocatoriaId, estado
  (varchar, default Borrador), creadoPorId, unidadAcademicaId, anioEdicion, presupuesto (json),
  datosFormulario (json), creadoEn, actualizadoEn, eliminadoEn (soft delete)`.
  Queries filtran `eliminadoEn IS NULL`.
- `convocatorias/convocatoria.entity.ts`: columnas → `id, nombre, descripcion, anio,
  estado (enum nativo), fechas... (6 dates nullables), formularioId, templateEvaluacionInstitucionalId,
  templateEvaluacionCruzadaId`. → Agregar **`templateAutoevaluacionImpactoId`** (nullable).
- `evaluaciones/template...` + `templates-evaluacion/estructura-template.ts`: modelo de como
  armar `TemplateAutoevaluacionImpacto` con `estructura` JSON (copy-on-write / esPlantilla / esDefault).

### Seed

- `backend/src/seed/seed.module.ts` → agregar entidades a `TypeOrmModule.forFeature`.
- `backend/src/seed/seed.service.ts` (2742 líneas): constructor recibe `DataSource` + servicios,
  arma repos con `dataSource.getRepository(Entidad)`. Métodos idempotentes (`findOne` previo).
  Orquestador `ejecutarSeed()` (línea ~267). Conteos en `mostrarResumen()`.
- `backend/src/seed/seed.utils.ts`: `generarEvaluacionInstitucional/Cruzada(estructura, rng, completo)`
  → modelo para generar respuestas de autoevaluación; `mulberry32`/`Rng` (semilla 20260810);
  `clonarCamposConIdsNuevos`, `slugUa`, `capitalizar`. `generarPresupuesto(rng, anioInicio)`.
- Ediciones **canónicas** objetivo (convocatoria 2025, `EstadoEdicion.EnEjecucion`): `p5`, `p6`,
  `pConsolidada` (campos privados tipo `this.p5`). También hay `pCerrada` (Cerrado).
- **Sin nada de hitos/autoevaluación/informe hoy**: `grep` da 0. Hay que agregarlo todo.
- **IMPORTANTE (AGENTS.md)**: cada cambio de entidad requiere revisar/actualizar seed y
  correr `make reset-seed`.

### Frontend

- **Stack**: React 18 + TS5 + Vite5 + Tailwind3 + shadcn/ui + React Router 7.
  `@/` alias → `src`. `cn()` de `@/lib/utils`. Iconos `lucide-react`. Toasts `sonner`.
- **NO hay** react-hook-form / zod / axios / react-query. Formularios = `useState` controlado +
  validación inline + `toast`. Input de fecha = `<Input type="date">`. Booleano = `<Button>Sí/No`.
- CHECAR: no hay `label.tsx`, `form.tsx`, `checkbox.tsx` en `components/ui` (usar input nativo
  chequeable). Primitivas ui disponibles: button, card, badge, input, textarea, select, table,
  tabs, dialog, dropdown-menu, skeleton, tooltip, avatar, separator, sheet.
- `lib/api.ts`: objeto tipado `api` con namespaces; helpers `get/post/patch/del` + `request`.
  Tipos inline con `import('@/data/types').T`. Query params filtran vacíos con URLSearchParams.
- `data/types.ts` (807 líneas): enums + interfaces espejo del backend en español; `estadoBadge`,
  `estadoConvocatoriaLabel`, `estadoEdicionLabel`.
- `App.tsx`: rutas privadas dentro de `<ProtectedRoute><Layout><Routes>`; rutas protegidas por rol
  con `<ProtectedRoute roles={ROLES_X}>`.
- `Sidebar.tsx`: `menuItems` + sección "Gestión" con botones condicionales por rol (solo esGestion).
- `Header.tsx`: `tituloSeccion(pathname, search, userId)` → agregar título si se agrega página nueva.
- `pages/ProyectoDetail.tsx` (1366 líneas): tabs dinámicos (`TABS_FIJAS_POST` =
  direccion/presupuesto/evaluaciones/rendiciones/cierre/sugerencias), sincronizados con `?tab=`.
  Los tabs `rendiciones` y `cierre` son **placeholders** (a reemplazar). Patrón:
  solo activos para ediciones `EnEjecucion` (o `Cerrado` en lectura).
- `pages/Evaluacion.tsx` (1145 líneas): **modelo de referencia** para autoevaluación e informe.
  `InstitucionalView`: lista + selección + `initRespuestas(template.estructura, evaluacion)`
  (`Record<string, {valor, fundamentacion}>`), `disabled={confirmada}`, botones
  "Guardar borrador" + "Confirmar evaluación". `Paginador` reusable dentro de la página.
- `pages/Proyectos.tsx` (278 líneas): selector vista `tabla | kanban`, pipeline por estados,
  search debounced 400ms, filtros, paginación. → Aquí va la fila expandible de #74.
- `components/ui/tabs.tsx` (Radix) para tabs. `Table` + `Badge` para listas.

---

## 6. Plan por etapas + commits

Formato de commit (Conventional, UNA oración corta): `tipo(alcance): mensaje corto`.
Tipos: feat/fix/chore/refactor/docs/test/style. Ej: `feat(hitos): crear CRUD de hitos`.

Dependencias: seed al final (necesita entidades). Backend antes de frontend para que la UI
pueda consumir.

### Etapa 1 — Enums y auditoría (backend) + entidades base
- Llenar `categoria-hito.enum.ts`.
- Agregar `tipo-entidad-auditoria.enum.ts`: `HITO`, `AUTOEVALUACION_IMPACTO`, `INFORME_FINAL`.

**Commits:**
- `feat(hitos): definir categorias de hitos`
- `chore(auditoria): agregar entidades de ejecucion al audit`

### Etapa 2 — Template de Autoevaluación (backend)
- `template-autoevaluacion.entity.ts`, DTOs, service CRUD de templates (esDefault + copy),
  endpoints de configuración por convocatoria.
- Columna `templateAutoevaluacionImpactoId` en `Convocatoria` (y DTO/response de convocatoria).
- Registrar entidad en `ejecucion.module.ts`.

**Commits:**
- `feat(autoevaluacion): crear template de autoevaluacion por convocatoria`
- `feat(convocatorias): vincular template de autoevaluacion a convocatoria`

### Etapa 3 — Módulo ejecucion: entidades Hito, Autoevaluacion, InformeFinal (backend)
- Las 3 entidades + imports en `ejecucion.module.ts`.
- Registrar `EjecucionModule` en `app.module.ts`.

**Commits:**
- `feat(ejecucion): crear entidades de hitos autoevaluacion e informe`

### Etapa 4 — CRUD de Hitos (backend)
- Controller + service: POST/GET/PUT/DELETE. Validación de rol (director) y de edición `EnEjecucion`.
- Lectura extra para Secretaría de la UA y Rectorado (US #74 backend).
- Autorizar por `DirectorDeProyecto` (guard o helper manual).

**Commits:**
- `feat(hitos): crear el CRUD de hitos de ejecucion`

### Etapa 5 — Autoevaluación de Impacto (backend)
- Controller + service: GET por edición, PUT (guardar borrador), POST completar. Upsert + sello.
- Validación de respuestas contra el template.

**Commits:**
- `feat(autoevaluacion): permitir guardar y completar la autoevaluacion`

### Etapa 6 — Informe Final (backend)
- Controller + service: GET/PUT (editar + adjuntar PDF), POST confirmar.
- Autogenerar contenido desde los hitos de la edición al crear.

**Commits:**
- `feat(informe-final): redactar confirmar y autogenerar informe desde hitos`

### Etapa 7 — Seed (backend)
- Entidades a `seed.module.ts`, repos en constructor, métodos `seedHitos/seedAutoevaluaciones/
  seedInformesFinales` (canónicos sobre p5/p6/pConsolidada) + llamarlos en `ejecutarSeed` +
  `mostrarResumen`.
- Probar `make reset-seed`.

**Commits:**
- `chore(seed): sembrar hitos autoevaluaciones e informes`

### Etapa 8 — Tipos y API client (frontend)
- `data/types.ts`: enums/interfaces/DTOs/labels.
- `lib/api.ts`: namespaces `api.ejecucion.hitos`, `api.autoevaluacion`, `api.informeFinal`,
  `api.templatesAutoevaluacion`.

**Commits:**
- `feat(frontend): tipar api de ejecucion`

### Etapa 9 — UI en ProyectoDetail (frontend)
- Componentes `HitosEjecucionTab`, `AutoevaluacionTab`, `InformeFinalTab`.
- Reemplazar placeholders de tabs `cierre`/`rendiciones` y agregar tab de ejecución.
- Solo activos para `EnEjecucion`.

**Commits:**
- `feat(hitos): tab de hitos en el proyecto`
- `feat(autoevaluacion): tab de autoevaluacion de impacto`
- `feat(informe-final): tab de informe final`

### Etapa 10 — Vista admin #74 (frontend)
- Fila expandible en `Proyectos.tsx` para ver hitos (Secretaría/Rectorado).

**Commits:**
- `feat(hitos): ver hitos desde el listado de proyectos`

### Etapa 11 — (Opcional) Pantalla de templates de autoevaluación (US extra)
- Si se requiere UI para gestionar `TemplateAutoevaluacionImpacto` por Rectorado:
  página `/plantillas-autoevaluacion`, item en `Sidebar` (condicional Rectorado), título en `Header`.

**Commits:**
- `feat(autoevaluacion): pantalla de templates de autoevaluacion`

---

## 7. Verificación por etapa

- Backend: `cd backend && npm run lint && npm run build`
- Frontend: `cd frontend && npm run lint && npm run build`
- Flujo seed: `make reset-seed` (desde la raíz) y confirmar que arranca sin errores.
- ChECKER: si se toca `Edicion`, `Convocatoria`, cualquier `*.entity.ts` o enums, revisar seed
  según tabla de AGENTS.md ANTES de considerar terminada la etapa.

---

## 8. Checklist de reglas de negocio a respetar

- Hito:
  - campos: `titulo, descripcion, fechaInicio, fechaFin, integrantes (texto libre), categoria`.
  - fechas de hito deben caer dentro de `fechasEjecucion` de la convocatoria.
  - crear/editar/eliminar solo en edición `EnEjecucion`; directores (creador o DirectorDeProyecto).
  - lectura: director + Secretaría de la UA + Rectorado.
- Autoevaluación:
  - 1:1 con Edición. Estados `Borrador → Completada`. Puede guardarse borrador y retomarse.
  - la completa director/codirector durante `Ejecucion`.
  - es requisito de cierre (Edición no pasa a `Cerrado` sin `Completada`).
  - tipos de pregunta: texto, booleano, escalaNumerica (min/max), select, checkbox.
- Informe Final:
  - 1:1 con Edición. Estados `Borrador → Confirmado`.
  - se crea al pasar convocatoria a `Ejecucion`; contenido autogenerado desde **hitos**.
  - editar contenido + adjuntar PDF opcional. Al confirmar = registro definitivo (nadie lo aprueba).
  - es requisito de cierre.

---

## 9. Preguntas pendientes / decisiones futuras

- (Definido) CategoriaHito: set de 6 propuesto.
- (Definido) Autoevaluación: template dinámico completo.
- (Definido) US #74: fila expandible en Proyectos.
- Todo: fórmula final nota / orden de mérito quedan para otra iteración (fuera de esta feature).

---

## 10. Referencias rápidas de archivos

- Módulo modelo: `backend/src/evaluaciones/` (entity/controller/service/módulo)
- Entity de referencia: `backend/src/evaluaciones/evaluacion-cruzada.entity.ts`
- Service de estados: `backend/src/evaluaciones/evaluaciones.service.ts` (guardar/confirmar)
- Autores roles: `backend/src/auth/decorators/roles.decorator.ts`, `current-user.decorator.ts`,
  `backend/src/auth/guards/*`
- Participación: `backend/src/auth/guards/participacion.guard.ts`,
  `backend/src/auth/decorators/requiere-participacion.decorator.ts` (sin usar aún)
- Convocatoria: `backend/src/convocatorias/convocatoria.entity.ts`
- Edición: `backend/src/proyectos/edicion.entity.ts`
- Seed: `backend/src/seed/seed.service.ts`, `seed.utils.ts`, `seed.module.ts`
- Frontend API: `frontend/src/lib/api.ts`
- Frontend tipos: `frontend/src/data/types.ts`
- Modelo UI: `frontend/src/pages/Evaluacion.tsx`, `frontend/src/pages/ProyectoDetail.tsx`
- Listado proyectos (#74): `frontend/src/pages/Proyectos.tsx`
- Rutas/menú: `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`,
  `frontend/src/components/Header.tsx`