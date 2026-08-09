# Plan de implementación — Módulo de Evaluación UBANEX

> Documento de contexto para retomar el trabajo sin perder el hilo.
> Estado actual: **completado** (C1–C16 en rama `feature-evaluacion`).

---

## 1. Objetivo

Construir el módulo de evaluación de convocatorias UBANEX **full-stack** (backend NestJS + frontend React), reemplazando el stub actual de `evaluaciones/`, siguiendo el modelo de dominio de `docs/dominio/modelo.md` y `docs/project_context.md`.

El módulo de evaluación actual es un stub: entidad `Evaluacion` (proyectoId, evaluador, tipo, puntaje, observaciones, estado) + un único `GET /evaluaciones`, y la página `Evaluacion.tsx` es una maqueta. Nada de eso refleja el dominio real.

## 2. Decisiones de diseño acordadas (NO cambiar sin consultar)

1. **Templates con patrón Formulario**: entidades `TemplateEvaluacionInstitucional` y `TemplateEvaluacionCruzada` con `esPlantilla`/`esDefault` (biblioteca reutilizable) + OneToOne opcional desde `Convocatoria` (espejo de `Formulario` → `convocatoria.formularioId`).
2. **Alcance full-stack** en este avance.
3. **Transición de ediciones**: al pasar la convocatoria a `Evaluacion`, las ediciones `Presentado`/`PendienteDeCambios` → `EnEvaluacion` (en `ConvocatoriasService.actualizar`).
4. **Tercera UA de resolución** incluida desde el inicio: se extiende `TipoEvaluacionCruzada` con `TerceraUa`. Mecánica (interpretación propia porque el doc no la detalla): **Rectorado designa directamente un evaluador `Aprobado`** (sin conflicto de interés, máx. 1 `TerceraUa` por edición) mediante `POST /evaluaciones/cruzadas/:edicionId/designar-tercera`.
5. **Gestión de plantillas de biblioteca desde la UI** (crear/editar/eliminar), nueva página `/plantillas-evaluacion` (Rectorado).
6. **Vista de Rectorado = monitoreo básico** (estados por edición, sin acciones).
7. **Evaluación Institucional 1:1 compartida por edición**: la completan Autoridades y Asistentes de Secretaría sobre el mismo borrador; la confirma solo una **Autoridad** de Secretaría.
8. **Evaluación requiere template configurado**: si la convocatoria no tiene asociado su template de evaluación (institucional o cruzada), la creación de la evaluación devuelve error.
9. **Etapas**: los templates se editan solo en `Configuracion` (congelados al pasar a `Presentacion`); las evaluaciones se crean/editan/confirman solo en etapa `Evaluacion`.
10. **Infraestructura**: el proyecto usa `synchronize: true` (TypeORM) — las tablas nuevas se crean solas, no hace falta migración para el esquema.

## 3. Modelo de datos (backend)

Nuevas entidades en `backend/src/evaluaciones/`:

| Entidad | Campos clave |
|---|---|
| `TemplateEvaluacionInstitucional` | id, nombre, `esDefault`, `esPlantilla`, `categorias` (JSON: `[{id, nombre, subcategorias: [{id, texto, tipoValor: numerico\|booleano, minimo?, maximo?, fundamentacion?}]}]`), `checklist` (JSON: `[{id, texto}]`) |
| `TemplateEvaluacionCruzada` | id, nombre, `esDefault`, `esPlantilla`, `categorias` (JSON: `[{id, nombre, puntajeMaximo, items: [{id, nombre, puntajeMaximo}]}]`) |
| `EvaluacionInstitucional` | convocatoriaId, edicionId (1:1), templateId, estado (`Borrador\|Confirmada`), realizadoPorId, confirmadoPorId, `categorias` (JSON respuestas), `checklist` (JSON respuestas), observaciones |
| `EvaluacionCruzada` | convocatoriaId, edicionId, evaluadorId, tipo (`Propia\|Ajena\|TerceraUa`), templateId, estado (`Borrador\|Confirmada`), `items` (JSON: `[{itemId, puntajeAsignado}]`), observaciones |

Cambios:
- `TipoEvaluacionCruzada` += `TerceraUa` (backend `common/enums/` + frontend `data/types.ts`).
- `Convocatoria` += `templateEvaluacionInstitucionalId` y `templateEvaluacionCruzadaId` (OneToOne, nullable).

## 4. Endpoints

**Templates biblioteca** (módulo `templates-evaluacion/`, gestión = Rectorado; `esDefault` único):
- `GET/POST /templates-evaluacion-institucional`, `GET/:id`, `PUT/:id`, `DELETE/:id`
- Idem `/templates-evaluacion-cruzada`

**Config por convocatoria** (en `ConvocatoriasController`, espejo de `/formulario`):
- `GET/PUT /convocatorias/:id/template-evaluacion-institucional`
- `GET/PUT /convocatorias/:id/template-evaluacion-cruzada`
- Solo editable en `Configuracion`; partir de plantilla copia su estructura con ids regenerados.

**Evaluaciones** (`EvaluacionesController`):
- `GET /evaluaciones?convocatoriaId=` — monitoreo Rectorado (por edición: estado institucional + resumen cruzadas).
- Institucional (Secretaría de la UA de la edición):
  - `GET /evaluaciones/institucionales?convocatoriaId=` — ediciones `EnEvaluacion` de su UA.
  - `GET /evaluaciones/institucionales/:edicionId` — get o crea borrador compartido con estructura del template.
  - `PUT /evaluaciones/institucionales/:edicionId` — guardar borrador.
  - `POST /evaluaciones/institucionales/:edicionId/confirmar` — solo **Autoridad** de Secretaría.
- Cruzada (evaluador con participación `Evaluador` estado `Aprobado`):
  - `GET /evaluaciones/cruzadas/disponibles?convocatoriaId=` — ediciones de su UA (`Propia`) y UA emparejada (`Ajena`) + designadas por Rectorado (`TerceraUa`); excluye conflicto de interés y lo ya evaluado.
  - `GET/PUT /evaluaciones/cruzadas/:edicionId` — get/crea y guarda borrador.
  - `POST /evaluaciones/cruzadas/:edicionId/confirmar` — autoconfirmación.
  - `POST /evaluaciones/cruzadas/:edicionId/designar-tercera` — **Rectorado**.

## 5. Reglas de negocio

- Crear/editar/confirmar evaluaciones solo en etapa `Evaluacion`. Templates editables solo en `Configuracion`.
- Institucional: compartida 1:1 por edición; solo Secretaría de la UA; confirma solo Autoridad.
- Cruzada: una evaluación por evaluador+edición; una por UA (Propia + Ajena) + opcional `TerceraUa`; el evaluador autoconfirma.
- Conflicto de interés: no se puede evaluar el propio proyecto ni un proyecto donde se participa (aplica a todos los tipos, incluida `TerceraUa`).
- La evaluación requiere que la convocatoria tenga su template configurado (ver decisión 8).
- Transición: al entrar la convocatoria en `Evaluacion`, ediciones `Presentado`/`PendienteDeCambios` → `EnEvaluacion`.

## 6. Plan de commits por etapas

Formato Conventional Commits según `AGENTS.md`. Cada commit es compilable por sí solo. **NO pushear** sin autorización.

### Etapa 1 — Backend: templates y configuración
- **C1** `feat(evaluaciones): agregar TerceraUa a TipoEvaluacionCruzada` — ✅ COMPLETADO
  - Extender enum backend + crear `backend/src/evaluaciones/templates-default.ts` (datos default de ambos templates).
- **C2** `feat(templates-evaluacion): CRUD de templates de evaluación` — ✅
  - Entidades `TemplateEvaluacionInstitucional`/`TemplateEvaluacionCruzada`, módulo `templates-evaluacion/` (controller+service, CRUD completo, unicidad `esDefault`), validación de estructura en `common/dto`, registro en `app.module.ts`.
- **C3** `feat(convocatorias): asociar templates de evaluación a la convocatoria` — ✅
  - OneToones en `Convocatoria` + endpoints `GET/PUT /convocatorias/:id/template-evaluacion-*`.

### Etapa 2 — Backend: evaluación
- **C4** `feat(evaluaciones): entidades EvaluacionInstitucional y EvaluacionCruzada` — ✅
  - Entidades + registro en `EvaluacionesModule` (reemplaza stub). Conservar `GET /evaluaciones` existente (reapuntado) para no romper frontend actual.
- **C5** `feat(convocatorias): transición de ediciones a EnEvaluacion` — ✅
  - En `ConvocatoriasService.actualizar`, al pasar a `Evaluacion`.
- **C6** `feat(evaluaciones): endpoints de evaluación institucional` — ✅
  - `GET/PUT .../institucionales...` + `confirmar`. Reglas de Secretaría y Autoridad.
- **C7** `feat(evaluaciones): evaluación cruzada disponible/guardar/confirmar` — ✅
  - `disponibles`, `GET/PUT .../cruzadas/:edicionId`, `confirmar`. Reglas de `Propia`/`Ajena`, emparejamiento, conflicto de interés.
- **C8** `feat(evaluaciones): designación de tercera UA de resolución` — ✅
  - `POST .../designar-tercera` (Rectorado).

### Etapa 3 — Backend: monitoreo y seed
- **C9** `feat(evaluaciones): monitoreo de evaluaciones para Rectorado` — ✅
  - `GET /evaluaciones?convocatoriaId=`.
- **C10** `feat(seed): templates default y asignación a convocatorias` — ✅
  - `main.ts`: templates default (institucional: "Puntaje diferencial", "Articulación del proyecto" + checklist; cruzada: 25/20/10/12/15 pts) + asociar a convocatorias en `Configuracion` (UBANEX 2027).

### Etapa 4 — Frontend: base
- **C11** `feat(frontend): tipos y cliente api de evaluaciones y templates` — ✅
  - `data/types.ts` + `lib/api.ts`.

### Etapa 5 — Frontend: templates
- **C12** `feat(frontend): builders de templates de evaluación` — ✅
  - `TemplateInstitucionalBuilder` / `TemplateCruzadaBuilder` (modo biblioteca y convocatoria; importar plantilla regenera ids).
- **C13** `feat(frontend): gestión de plantillas de evaluación` — ✅
  - `pages/PlantillasEvaluacion.tsx` + ruta `/plantillas-evaluacion` (Rectorado).
- **C14** `feat(frontend): configuración de templates en convocatoria` — ✅
  - `components/EvaluacionConfigTab.tsx` + tab Evaluación en `ConvocatoriaDetail.tsx`.

### Etapa 6 — Frontend: página de evaluación
- **C15** `feat(frontend): página de evaluación institucional, cruzada y monitoreo` — ✅
  - Reescribir `pages/Evaluacion.tsx`: selector de convocatoria + tabs por rol, formularios, checklist, cuadro de puntuación calculado, confirmación según rol.

### Etapa 7 — Verificación
- **C16** `chore(evaluaciones): verificación final de build y lint` — ✅
  - `npm run build && npm run lint` en backend y frontend. Tests unitarios del módulo pendientes (opcional).

## 7. Comandos

```bash
# Backend
cd backend && npm run start:dev   # Desarrollo (hot reload)
cd backend && npm run build
cd backend && npm run lint
cd backend && npm run format

# Frontend
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm run format
```

DB local con `docker-compose.yml`. Usuarios seed (ver `backend/src/main.ts`): `admin@uba.ar`/`admin` (Autoridad de Rectorado), `autoridad-derecho@uba.ar`/`123456`, `evaluador@uba.ar`/`123456` (Docente validado de Derecho), `evaluador-ingenieria@uba.ar`/`123456`.

## 8. Referencias de código útiles

- **Patrón Formulario** (espejo para templates): `backend/src/formularios/` (entidad con `esPlantilla`/`esDefault`, service con unicidad de default), `frontend/src/components/FormularioBuilderTab.tsx`, `frontend/src/components/SeleccionarPlantillaDialog.tsx`, endpoints `/convocatorias/:id/formulario` en `ConvocatoriasService`.
- **Roles por convocatoria / evaluadores**: `backend/src/participaciones-convocatoria/participacion-convocatoria.service.ts` (`CANTIDAD_EVALUADORES_POR_UA` en `common/constantes.ts`; estados `Aprobado` en `EstadoPropuestaEvaluador`).
- **Emparejamiento**: `backend/src/convocatorias/emparejamiento.entity.ts`, `EmparejamientoTab` en frontend.
- **Enums existentes reutilizables**: `EstadoEvaluacion` (`Borrador|Confirmada`), `TipoEvaluacionCruzada` (`Propia|Ajena|TerceraUa`).
- **Roles guard**: `backend/src/auth/guards/roles.guard.ts`, decorator `@Roles()` y `@CurrentUser()`.
- **Ediciones**: `backend/src/proyectos/edicion.entity.ts` (estado, unidadAcademica, convocatoria, creadoPor).

## 9. Estado de avance

| Commit | Estado |
|---|---|
| C1–C15 | ✅ |
| C16 | ✅ (build + lint OK; tests unitarios opcionales pendientes) |
