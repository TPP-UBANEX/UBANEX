# UBANEX — Convenciones para Agentes de IA

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5, TailwindCSS 3, shadcn/ui, React Router 7 |
| Backend | NestJS 10, TypeScript 5, TypeORM 1.x, PostgreSQL |
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
    └── project_context.md
```

## Convenciones de código

### General
- TypeScript estricto (`strict: true`). No usar `any`.
- Nombres en inglés para código, español para contenido visible al usuario.
- Usar `import` en lugar de `require` (backend usa CommonJS, frontend usa ESM).

### Backend (NestJS)
- Cada módulo en su propia carpeta con nombre en plural (`usuarios/`, `convocatorias/`).
- Los endpoints REST usan plural: `GET /convocatorias`, `POST /proyectos`.
- Entidades TypeORM decoradas con `@Entity()`, `@PrimaryGeneratedColumn()`, etc.
- Inyectar dependencias via constructor `private readonly servicio: Servicio`.
- Usar DTOs para validación de entrada (con `class-validator` cuando se agregue).

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

## Lo que NO hacer
- No modificar `docs/project_context.md` (documentación de requerimientos).
- No instalar librerías sin verificar que no exista ya una alternativa en el proyecto.
- No generar archivos fuera de `backend/` o `frontend/` a menos que sea necesario.
- **No hacer commit ni push sin autorización explícita del usuario.**
