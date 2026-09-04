# UBANEX — Convenciones para Agentes de IA

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5, TailwindCSS 3, shadcn/ui, React Router 7 |
| Backend | NestJS 10, TypeScript 5, TypeORM, PostgreSQL |
| Contenedores | Docker Compose |
| Infra | Render, GitHub |

## Estructura del proyecto

```
UBANEX/
├── backend/        # NestJS API
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── app.controller.ts
│       └── <modulo>/
│           ├── <modulo>.module.ts
│           ├── <modulo>.controller.ts
│           ├── <modulo>.service.ts
│           └── <modulo>.entity.ts
├── frontend/       # React SPA
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/       # Una carpeta por página/ruta
│       ├── components/  # Componentes compartidos + ui/ (shadcn)
│       ├── lib/         # Utilidades (api.ts, utils.ts)
│       └── data/        # Tipos TypeScript
└── docs/
    ├── project_context.md   # Requerimientos + estado de avance
    └── dominio/
        └── modelo.md        # Modelo de dominio (diagramas + reglas)
```

## Convenciones de código

### General
- TypeScript estricto (`strict: true`). No usar `any`.
- Nombres en inglés para código, español para contenido visible al usuario.
- Usar `import` en lugar de `require` (backend usa CommonJS, frontend usa ESM).

### Backend (NestJS)
- Arquitectura orientada a DDD (Domain-Driven Design): separar en capas **domain** (entidades, value objects, repositorios), **application** (casos de uso, DTOs) e **infrastructure** (persistencia, servicios externos).
- **Lenguaje ubicuo en español** — todo el código del dominio, nombres de clases, métodos, variables, comentarios y commits deben usar términos del dominio UBA en español (ej: `Convocatoria`, `Proyecto`, `Evaluacion`, `Rendicion`, `DirectorDeProyecto`).
- Cada módulo en su propia carpeta con nombre en plural (`usuarios/`, `convocatorias/`).
- Los endpoints REST usan plural: `GET /convocatorias`, `POST /proyectos`.
- Entidades TypeORM decoradas con `@Entity()`, `@PrimaryGeneratedColumn()`, etc.
- Inyectar dependencias via constructor `private readonly servicio: Servicio`.
- Usar DTOs con `class-validator` para validación de entrada (ya en uso en todo el backend, ver `<modulo>/dto/*.dto.ts`).

### Frontend (React)
- Una carpeta por página en `pages/`, componentes compartidos en `components/`.
- Import paths absolutos con `@/` alias: `@/components/ui/button`.
- Nombres de componentes en PascalCase, archivos en PascalCase también.
- Usar los primitivos de shadcn/ui (`@/components/ui/...`) para UI consistente.
- El layout principal (Sidebar + Header) envuelve las rutas en `App.tsx`.

### Estilos
- TailwindCSS utility classes. No CSS modules ni styled-components.
- shadcn/ui design tokens en `globals.css` (variables CSS para light/dark).
- `cn()` de `@/lib/utils` para combinar clases condicionalmente.

### API Client
- `api.ts` en `@/lib/api.ts` es el wrapper central de fetch.
- Nuevos endpoints se agregan ahí como funciones tipadas.
- Tipos compartidos en `@/data/types.ts`.

## Commits
- Formato: `tipo(alcance): mensaje` (Conventional Commits).
- Tipos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`.
- Ejemplo: `feat(convocatorias): agregar POST para crear convocatoria`.

## Comandos

```bash
# Docker (flujo de desarrollo habitual, desde la raíz)
make dev          # Levanta db + backend + frontend con logs
make seed         # Igual que dev, forzando el seed
make reset-seed   # Borra volúmenes y levanta desde cero con el seed completo
make help         # Lista todos los targets

# Backend
cd backend && npm run start:dev   # Desarrollo (hot reload)
cd backend && npm run build        # Build
cd backend && npm run lint         # ESLint
cd backend && npm run format       # Prettier

# Frontend
cd frontend && npm run dev         # Desarrollo (Vite)
cd frontend && npm run build       # Build
cd frontend && npm run lint        # ESLint
cd frontend && npm run format      # Prettier
```

## Seed

El seed (`backend/src/seed/`) corre al iniciar el backend sólo si `UBANEX_SEED=true`.
En Docker `docker-compose.yml` lo activa por defecto; para saltearlo, `UBANEX_SEED=false make dev`
o fijar la variable en un `.env` en la raíz del repo. Es idempotente: no duplica datos.

### Mantenerlo al día

El seed escribe con `repo.save()` directo, sin pasar por los DTOs ni `class-validator`: puede
insertar filas que la API rechazaría. Y TypeScript no valida las columnas `json`, cuya forma la
define *otra fila*. Por eso el compilador no avisa cuando el seed queda desactualizado.

**Un cambio no está terminado hasta revisar el seed.** Si tocaste algo de la izquierda, revisá lo
de la derecha:

| Si tocaste… | Revisá en el seed |
|---|---|
| `Formulario.campos` (o el formulario estándar) | `datosFormulario()` |
| `Edicion.presupuesto` | `crearPresupuesto()` en `seed.utils.ts` |
| `templates-default.ts` (ids de categorías/checklist/items) | `categoriasInstitucional()` e `itemsCruzada()` en `seed.service.ts` |
| cualquier `*.entity.ts` | columnas nuevas no-nulas y relaciones obligatorias |

Después de tocarlo: `make reset-seed` y confirmar que arranca sin errores y que la pantalla
afectada muestra los datos bien.

## Lo que NO hacer
- No modificar el cuerpo de requerimientos de `docs/project_context.md` (§1–§15); sí se mantiene al día su sección "Estado actual". El modelo de dominio vive en `docs/dominio/modelo.md`.
- No instalar librerías sin verificar que no exista ya una alternativa en el proyecto.
- No generar archivos fuera de `backend/` o `frontend/` a menos que sea necesario.
- **No hacer commit ni push sin autorización explícita del usuario.**

## Documentacion
- SIEMPRE que se realize un cambio identificar si se debe modificar algo de la documentacion tecnica, funcional o manual de usuario para reflejar el presente del proyecto
