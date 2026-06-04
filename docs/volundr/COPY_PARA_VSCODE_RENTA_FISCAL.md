# COPY PARA VS CODE — FORSETI RENTA FISCAL

> Preparado por **VÖLUNDR** para arrancar producción técnica real sobre este repo.

## Lee primero
- `docs/volundr/VOLUNDR_PLAN_TECNICO_FORSETI_RENTA_FISCAL.md`
- contexto actual del repo y estructura existente

## Orden
No rehagas la documentación.
Quiero que conviertas este plan en una **base técnica real y arrancable en local** dentro del repo actual.

## Objetivo de esta fase
Construir la primera base funcional para una sección/agente de FORSETI orientada a **renta fiscal**, con foco en:
- expedientes fiscales
- organización documental
- datos clave
- validaciones
- resumen operativo
- seguridad y trazabilidad

## Prioridad absoluta
Cierra primero:
1. arquitectura base ejecutable
2. modelo de datos inicial
3. backend funcional mínimo
4. frontend base usable
5. auth base
6. flujo MVP de expediente

## Lo que debes construir ahora

### 1. Adaptar el repo actual sin romperlo
Revisa la estructura existente y evoluciona el proyecto con criterio.
Si hace falta refactorizar, hazlo de forma controlada.
No destruyas lo ya útil si puede reutilizarse.

### 2. Backend/API mínimo
Deja implementados o preparados estos módulos:
- auth
- users
- tax-cases
- documents
- data-points
- validations
- summaries
- audit
- health

Endpoints mínimos esperados:
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /me`
- `POST /tax-cases`
- `GET /tax-cases`
- `GET /tax-cases/:id`
- `PATCH /tax-cases/:id`
- `GET /tax-cases/:id/checklist`
- `POST /tax-cases/:id/documents`
- `GET /tax-cases/:id/documents`
- `POST /tax-cases/:id/data-points`
- `PATCH /tax-cases/:id/data-points/:dataPointId`
- `POST /tax-cases/:id/validate`
- `GET /tax-cases/:id/issues`
- `GET /tax-cases/:id/summary`
- `GET /tax-cases/:id/audit`
- `GET /health`

### 3. Modelo de datos
Define la base inicial con Prisma para:
- User
- TaxCase
- TaxProfile
- DocumentRequirement
- Document
- DataPoint
- ValidationIssue
- CaseSummary
- AuditEvent

Incluye:
- migración inicial
- seed mínimo
- estados `confirmed / estimated / pending`
- relaciones limpias y auditables

### 4. Frontend inicial
Quiero como mínimo:
- login
- dashboard de expedientes
- vista de expediente
- checklist documental
- lista de faltantes
- panel de incidencias
- resumen preliminar

No hace falta UI final, pero sí una base limpia y mantenible.

### 5. Gestión documental
En esta fase basta con:
- subida controlada de documentos
- metadatos en DB
- storage desacoplado
- clasificación por categoría
- estado de revisión

### 6. Validaciones
Implementa reglas base para detectar:
- documentos obligatorios faltantes
- inconsistencias simples
- datos pendientes usados como confirmados
- incoherencias entre ingresos/retenciones/gastos cuando sea evidente

### 7. Auth y seguridad
Deja listo:
- login por email/password
- password hash seguro
- JWT + refresh token
- guards
- roles base `admin`, `advisor`, `owner`
- enmascarado razonable de datos sensibles en listados

## Calidad mínima obligatoria
- TypeScript
- lint
- typecheck
- scripts claros
- `.env.example`
- README actualizado
- arranque local claro
- sin secretos hardcodeados
- sin exponer datos sensibles innecesariamente

## Criterios importantes
- No automatizar presentación a terceros.
- No inventar datos fiscales.
- No mezclar datos confirmados con estimados.
- Si algo queda incompleto, márcalo con `TODO:` claro.
- Si una parte avanzada ralentiza el MVP, deja stub limpio y sigue.

## Entregable esperado
Quiero el repo listo con:
1. base técnica funcional
2. auth base
3. expedientes fiscales
4. checklist/documentos
5. validaciones iniciales
6. resumen preliminar
7. documentación mínima de arranque

## Al terminar
Indica:
- qué has construido
- cómo se arranca
- qué partes han quedado mockeadas o simplificadas
- qué falta para pasar de base técnica a MVP operativo completo

**Ejecuta producción inicial; no rehagas la estrategia.**
