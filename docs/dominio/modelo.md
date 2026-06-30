# Modelo de Dominio — UBANEX

## Convocatoria

```mermaid
classDiagram
    class Convocatoria {
        +id: string
        +nombre: string
        +anio: number
        +estado: EstadoConvocatoria
        +fechasPresentacion: RangoFechas
        +fechasEvaluacion: RangoFechas
        +fechasEjecucion: RangoFechas
    }

    class EstadoConvocatoria {
        <<enumeration>>
        Configuracion
        Presentacion
        Evaluacion
        Ejecucion
        Cierre
    }

    class RangoFechas {
        <<value object>>
        +inicio: Date
        +fin: Date
    }

    class TemplateFormulario {
        +id: string
        +nombre: string
        +esDefault: boolean
    }

    class CampoFormulario {
        <<value object>>
        +tipo: TipoCampo
        +nombre: string
        +esObligatorio: boolean
        +orden: number
        +opciones: string[]
    }

    class TipoCampo {
        <<enumeration>>
        texto
        booleano
        checkbox
        select
        archivo
    }

    Convocatoria *-- EstadoConvocatoria : estado
    Convocatoria *-- RangoFechas : fechasPresentacion
    Convocatoria *-- RangoFechas : fechasEvaluacion
    Convocatoria *-- RangoFechas : fechasEjecucion
    Convocatoria --> TemplateFormulario : template
    TemplateFormulario *-- CampoFormulario : campos
    CampoFormulario *-- TipoCampo : tipo
```

### Notas

- Las etapas de la convocatoria son siempre las mismas 5 (`Configuracion`, `Presentacion`, `Evaluacion`, `Ejecucion`, `Cierre`) y se corresponden 1 a 1 con el estado actual.
- Solo `Presentacion`, `Evaluacion` y `Ejecucion` tienen fechas de inicio y fin predefinidas (value object `RangoFechas`).
- `Configuracion` y `Cierre` no tienen fechas asociadas.
- `TemplateFormulario` define los campos dinámicos del formulario de presentación. Puede reutilizarse entre convocatorias (`esDefault`).
- Un `CampoFormulario` puede tener `opciones` solo cuando su `tipo` es `checkbox` o `select`.

---

## Proyecto y Edición

```mermaid
classDiagram
    class Proyecto {
        +id: string
        +nombre: string
    }

    class Edicion {
        +id: string
        +estado: EstadoEdicion
        +datosFormulario: object
    }

    class EstadoEdicion {
        <<enumeration>>
        Borrador
        Presentado
        PendienteDeCambios
        EnEvaluacion
        Adjudicado
        NoAdjudicado
        EnEjecucion
        Cerrado
    }

    class Presupuesto {
        <<value object>>
        +montoTotal: number
    }

    class Rubro {
        <<value object>>
        +tipo: TipoRubro
        +subtotal: number
    }

    class TipoRubro {
        <<enumeration>>
        ViaticosYSeguros
        BienesDeConsumo
        BienesDeUso
    }

    class Viatico {
        <<value object>>
        +tipoPersona: TipoPersona
        +descripcion: string
        +periodo: string
        +monto: number
    }

    class Bien {
        <<value object>>
        +descripcion: string
        +cantidad: number
        +precioUnitario: number
        +monto: number
    }

    class TipoPersona {
        <<enumeration>>
        Docente
        Estudiante
    }

    class UnidadAcademica {
        +id: string
        +nombre: string
    }

    class Usuario {
        +id: string
    }

    Edicion --> Convocatoria : se presenta en
    Edicion --> UnidadAcademica : pertenece a
    Edicion --> Usuario : director
    Edicion --> Usuario : codirector
    Proyecto --> Edicion : tiene
    Edicion --> Presupuesto : tiene
    Edicion *-- EstadoEdicion : estado
    Presupuesto *-- Rubro : rubros
    Rubro *-- TipoRubro : tipo
    Rubro --> Viatico : partidas (si tipo = ViaticosYSeguros)
    Rubro --> Bien : partidas (si tipo = BienesDeConsumo o BienesDeUso)
    Viatico *-- TipoPersona : tipoPersona
```

### Notas

- `Proyecto` es una entidad raíz con datos estables que persisten entre años (ej: nombre).
- `Edicion` representa la instancia de un proyecto dentro de una convocatoria específica. Un proyecto puede tener múltiples ediciones a lo largo del tiempo.
- El estado `NoAdjudicado` es terminal (no hay suplencia).
- El `Presupuesto` se compone de exactamente 3 rubros fijos: `ViaticosYSeguros`, `BienesDeConsumo` y `BienesDeUso`.
- `Viatico` tiene un `tipoPersona` (Docente o Estudiante). Ambos tipos suman al subtotal del rubro `ViaticosYSeguros`.
- `Edicion` tiene un `director` (obligatorio) y un `codirector` (opcional), ambos de tipo `Usuario` con rol `DirectorDeProyecto`.

---

## Evaluación

```mermaid
classDiagram
    class UnidadAcademica {
        +id: string
        +nombre: string
    }

    class Emparejamiento {
        +id: string
    }

    class TemplateEvaluacionInstitucional {
        +id: string
        +nombre: string
        +esDefault: boolean
    }

    class TemplateEvaluacionCruzada {
        +id: string
        +nombre: string
        +esDefault: boolean
    }

    class EvaluacionInstitucional {
        +id: string
        +estado: EstadoEvaluacion
    }

    class EvaluacionCruzada {
        +id: string
        +tipo: TipoEvaluacionCruzada
        +estado: EstadoEvaluacion
    }

    class EstadoEvaluacion {
        <<enumeration>>
        Borrador
        Confirmada
    }

    class TipoEvaluacionCruzada {
        <<enumeration>>
        Propia
        Ajena
    }

    class Usuario {
        +id: string
    }

    Convocatoria --> Emparejamiento : define
    Emparejamiento --> UnidadAcademica : unidadA
    Emparejamiento --> UnidadAcademica : unidadB

    Edicion --> EvaluacionInstitucional : tiene (1 a 1)
    Edicion --> EvaluacionCruzada : tiene (0 a 3)

    EvaluacionInstitucional --> TemplateEvaluacionInstitucional : se basa en
    EvaluacionCruzada --> TemplateEvaluacionCruzada : se basa en

    EvaluacionCruzada --> Usuario : evaluador
    EvaluacionInstitucional --> Usuario : realizada por
    EvaluacionInstitucional --> Usuario : confirmada por
    Usuario --> UnidadAcademica : pertenece a

    EvaluacionInstitucional *-- EstadoEvaluacion : estado
    EvaluacionCruzada *-- EstadoEvaluacion : estado
    EvaluacionCruzada *-- TipoEvaluacionCruzada : tipo
```

### Notas

- `UnidadAcademica` representa cada una de las 14 facultades de la UBA.
- El `Emparejamiento` define pares de unidades académicas por convocatoria. Con 14 unidades resultan exactamente 7 parejas. Cada unidad solo está emparejada con otra única.
- Cada `Edicion` recibe:
  - **1** evaluación institucional (realizada por la Secretaría de Extensión de su UA).
  - **0 a 3** evaluaciones cruzadas (propia + ajena + eventual tercera UA de resolución).
- `EvaluacionInstitucional` y `EvaluacionCruzada` tienen estado `Borrador | Confirmada`.
- La confirmación de `EvaluacionInstitucional` la realiza un usuario con rol autoridad de la Secretaría. La de `EvaluacionCruzada` la confirma el propio evaluador.

#### Estructura de TemplateEvaluacionInstitucional

- **Categorías** configurables por convocatoria (default: "Puntaje diferencial", "Articulación del proyecto"). Cada categoría contiene **subcategorías** con:
  - nombre / texto del criterio
  - tipo de valor (numérico con mínimo y máximo, o booleano) — excluyentes
  - fundamentación opcional (texto)
- **Checklist** — sección aparte de ítems booleanos que no suma a la ponderación final. Es independiente de las categorías.

#### Estructura de TemplateEvaluacionCruzada

- **5 categorías** configurables por convocatoria (default: Justificación y Formulación 25pts, Capacitación de Alumnos 20pts, Adecuación Instrumental y Factibilidad 10pts, Vinculación con el Medio 12pts, Impacto Social 15pts).
- Cada categoría contiene **ítems** con nombre, puntaje máximo y puntaje asignado.
- Al final se muestra un **cuadro de puntuación** con categorías, puntajes máximos y puntajes asignados, más la **ponderación final** (suma de máximos y suma de asignados). Este cuadro es calculado, no almacenado.

---

## Usuarios y Roles

```mermaid
classDiagram
    class Usuario {
        +id: string
        +email: string
        +nombreCompleto: string
        +roles: RolUsuario[]
        +estadoDirector: EstadoDirector
        +habilitado: boolean
    }

    class RolUsuario {
        <<enumeration>>
        AutoridadDeRectorado
        AsistenteDeRectorado
        AutoridadDeSecretaria
        AsistenteDeSecretaria
        DirectorDeProyecto
        Evaluador
    }

    class EstadoDirector {
        <<enumeration>>
        PendienteDeValidacion
        Validado
        Rechazado
    }

    Usuario *-- RolUsuario : roles
    Usuario *-- EstadoDirector : estadoDirector (si tiene DirectorDeProyecto en roles)
    Usuario --> UnidadAcademica : pertenece a (nullable)
    Usuario --> Usuario : creado por
```

### Notas

- **Rectorado**: 1 a 3 Autoridades, 0 a N Asistentes. No pertenecen a ninguna UA.
- **Secretaría de Extensión**: 1 a 3 Autoridades, 0 a N Asistentes por UA. Cada usuario de Secretaría pertenece a una UA específica.
- **Director de Proyecto**: 0 a N. Se registra solo, requiere validación por Autoridad de Secretaría de su UA. Puede estar asignado a una `Edicion` como director o codirector. Máximo 2 proyectos por convocatoria (1 como director + 1 como codirector).
- **Evaluador**: 0 a N por UA. Creado por Autoridad de Secretaría de dicha UA.
- Un usuario puede acumular múltiples roles a lo largo del tiempo (ej: fue DirectorDeProyecto en una convocatoria y luego Evaluador en otra), pero todos deben pertenecer al mismo **grupo**:
  - **Gestión**: AutoridadDeRectorado, AsistenteDeRectorado, AutoridadDeSecretaria, AsistenteDeSecretaria
  - **Ejecución**: DirectorDeProyecto, Evaluador
  - Es **regla de negocio** excluyente: no se pueden mezclar roles de gestión con roles de ejecución.
- `estadoDirector` solo aplica cuando el usuario tiene `DirectorDeProyecto` en sus roles (PendienteDeValidacion → Validado | Rechazado).
- `creadoPor` referencia al Usuario que creó la cuenta (aplica para Evaluadores y Asistentes).
