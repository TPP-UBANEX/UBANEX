# UBANEX

Sistema de gestión integral para las convocatorias de extensión universitaria de la UBA
(inicialmente UBANEX): digitaliza y estructura el ciclo completo de una convocatoria
—presentación, evaluación, adjudicación y orden de mérito, ejecución y seguimiento,
rendición y cierre— con formularios y evaluaciones configurables, roles y permisos,
historial de cambios y auditoría.

Trabajo Profesional de la Licenciatura en Análisis de Sistemas (FIUBA). Cliente:
Secretaría de Extensión Universitaria del Rectorado UBA.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5, TailwindCSS 3, shadcn/ui, React Router 7 |
| Backend | NestJS 10, TypeScript 5, TypeORM, PostgreSQL |
| Contenedores | Docker Compose |
| Infra | Render, GitHub |

## Estructura

```
UBANEX/
├── backend/     # API NestJS
├── frontend/    # SPA React
└── docs/        # Documentación (ver abajo)
```

## Puesta en marcha

Con Docker (flujo habitual, desde la raíz):

```bash
make dev          # Levanta db + backend + frontend con logs
make seed         # Igual que dev, forzando el seed
make reset-seed   # Borra volúmenes y arranca desde cero con el seed completo
make help         # Lista todos los targets
```

Sin Docker:

```bash
cd backend && npm install && npm run start:dev   # API en :3000
cd frontend && npm install && npm run dev        # SPA en :5173
```

## Documentación

- [`docs/project_context.md`](docs/project_context.md) — documento de requerimientos (contexto, proceso UBANEX, roles, alcance) y estado de avance.
- [`docs/dominio/modelo.md`](docs/dominio/modelo.md) — modelo de dominio (diagramas de clases + reglas de negocio).
- [`AGENTS.md`](AGENTS.md) — convenciones de código y flujo de trabajo.
