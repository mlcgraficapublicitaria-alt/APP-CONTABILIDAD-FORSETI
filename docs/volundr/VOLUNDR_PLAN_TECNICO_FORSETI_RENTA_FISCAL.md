# VÖLUNDR — Plan técnico de producción
## FORSETI — Sección/agente de renta fiscal

> Documento técnico propio de VÖLUNDR, derivado del brief funcional base. Orientado a implementación real desde VS Code, con foco en MVP, seguridad, trazabilidad, organización documental y flujo guiado de validación fiscal.

---

## 1. Resumen ejecutivo

Se propone una **sección funcional dentro del ecosistema FORSETI** para gestionar expedientes de renta fiscal de forma guiada, segura y auditable. El sistema debe ayudar a recopilar documentación, estructurar datos, detectar faltantes e inconsistencias y preparar resúmenes claros para validación final del usuario, sin automatizar acciones sensibles hacia terceros sin confirmación expresa.

### Prioridad cerrada
1. **MVP realista**.
2. **Arquitectura base**.
3. **Estructura del proyecto en VS Code**.
4. **Plan de implementación por fases**.

---

## 2. MVP realista

### Incluye
- Creación de expediente fiscal por ejercicio.
- Definición de jurisdicción y tipo de caso.
- Checklist documental base.
- Carga manual y/o registro documental de archivos recibidos.
- Clasificación de documentos: ingresos, retenciones, gastos, inversiones, inmuebles, familia, otros.
- Registro de datos clave con estado: confirmado / estimado / pendiente.
- Detección básica de faltantes e inconsistencias por reglas.
- Resumen fiscal preliminar.
- Lista priorizada de siguientes pasos.
- Auditoría mínima de cambios y validaciones.
- Acceso por roles básicos.

### No incluye en MVP
- Presentación automática a Hacienda/terceros.
- OCR avanzado multimodelo complejo.
- Integraciones masivas bancarias.
- Firma electrónica avanzada.
- Cálculo fiscal exhaustivo para todos los países.
- Portal multi-cliente completo para asesorías grandes.

### Criterio de aceptación del MVP
Un usuario o asesor puede abrir un expediente, marcar ejercicio/jurisdicción, registrar documentos, detectar faltantes, revisar inconsistencias y obtener un resumen operativo claro antes de la validación final.

---

## 3. Arquitectura base

```text
[Frontend Web]
     |
     v
[Backend API]
  |      |      |
  |      |      +--> [Motor de validaciones/reglas]
  |      +---------> [Módulo documental]
  |
  +--> [PostgreSQL]
  +--> [Object Storage cifrado/opcional]
  +--> [Logs/Auditoría/Observabilidad]
```

### Principios
- Backend como capa única de acceso a datos sensibles.
- Separación entre expediente, documentos, validaciones y auditoría.
- Modelo preparado para distintos países/jurisdicciones.
- Reglas de validación configurables por tipo de caso.
- Minimización de exposición de datos sensibles en frontend y logs.

---

## 4. Stack recomendado

### Frontend
- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **React Hook Form + Zod**
- **TanStack Query**

### Backend
- **NestJS**
- **TypeScript**
- **class-validator** o Zod en bordes

### Persistencia
- **PostgreSQL**
- **Prisma ORM**

### Documentos
- **S3-compatible storage** o almacenamiento local cifrado según entorno

### Infraestructura
- **Docker Compose** para local
- **GitHub Actions** para CI/CD

### Seguridad
- **JWT + refresh tokens**
- **Argon2** para contraseñas
- cifrado en tránsito y control de acceso por roles

---

## 5. Estructura del proyecto en VS Code

```text
forseti-renta/
├─ apps/
│  ├─ web/
│  └─ api/
├─ packages/
│  ├─ ui/
│  ├─ config/
│  ├─ types/
│  ├─ sdk/
│  └─ rules/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ infra/
│  ├─ docker/
│  └─ scripts/
├─ docs/
│  ├─ adr/
│  ├─ api/
│  └─ runbooks/
├─ tests/
│  ├─ e2e/
│  ├─ integration/
│  └─ fixtures/
├─ .env.example
├─ docker-compose.yml
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

---

## 6. Flujo funcional

1. Crear expediente fiscal.
2. Definir año, jurisdicción y tipo de caso.
3. Generar checklist documental base según perfil.
4. Registrar documentos recibidos.
5. Extraer o introducir datos clave.
6. Ejecutar validaciones.
7. Detectar faltantes, duplicados, incoherencias o riesgos.
8. Preparar resumen fiscal preliminar.
9. Marcar decisiones pendientes del usuario.
10. Cerrar con checklist final previo a presentación manual.

---

## 7. Pantallas o módulos necesarios

### Frontend
- Login
- Dashboard de expedientes
- Vista de expediente
- Checklist documental
- Gestor documental
- Formulario de datos fiscales
- Panel de inconsistencias/riesgos
- Resumen final
- Auditoría básica

### Backend modules
- auth
- users
- tax-cases
- documents
- data-points
- validations
- summaries
- audit
- settings

---

## 8. Backend / API necesaria

### Endpoints iniciales
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

---

## 9. Modelo de datos

### Entidades principales
- **User**
- **Role**
- **TaxCase**
- **TaxProfile**
- **Document**
- **DocumentRequirement**
- **DataPoint**
- **ValidationIssue**
- **CaseSummary**
- **AuditEvent**

### Esquema simplificado

```text
User (id, email, passwordHash, name, role, status, createdAt)
TaxCase (id, ownerId, fiscalYear, jurisdiction, status, caseType, createdAt, updatedAt)
TaxProfile (id, taxCaseId, familyStatus, hasRentals, hasInvestments, hasForeignIncome, selfEmployed, notes)
DocumentRequirement (id, jurisdiction, caseType, key, label, required, category)
Document (id, taxCaseId, requirementKey, fileName, storagePath, category, status, uploadedAt)
DataPoint (id, taxCaseId, key, label, valueText, valueNumber, currency, status, sourceDocumentId, confirmedAt)
ValidationIssue (id, taxCaseId, severity, code, title, detail, status, createdAt)
CaseSummary (id, taxCaseId, summaryText, pendingText, reviewedAt)
AuditEvent (id, userId, entityType, entityId, action, metadataJson, createdAt)
```

### Estados útiles
- `pending`
- `received`
- `reviewed`
- `confirmed`
- `estimated`
- `blocked`
- `closed`

---

## 10. Gestión documental

### Requisitos
- Subida controlada de PDF/JPG/PNG.
- Clasificación por categoría fiscal.
- Asociación a requisito documental.
- Estado de revisión por documento.
- Posibilidad de marcar documento como inválido, duplicado o incompleto.
- Descarga restringida según permisos.

### Recomendación
Separar metadatos en DB y binarios en storage. Nunca incrustar binarios en la base relacional.

---

## 11. Validaciones

### Tipos
- Documentales: falta documento obligatorio.
- Estructurales: año/jurisdicción inconsistentes.
- Numéricas: importes imposibles o incoherentes.
- Cruzadas: varios pagadores no reflejados, retenciones sin ingresos, alquiler sin inmueble, etc.
- De estado: dato estimado usado como si estuviera confirmado.

### Regla clave
Cada validación debe marcar claramente:
- gravedad
- dato afectado
- motivo
- acción sugerida

---

## 12. Seguridad y privacidad

### Mínimos obligatorios
- backend-only access a datos sensibles
- TLS
- Argon2 para passwords
- control de acceso por rol
- expiración y rotación de sesiones
- logs estructurados con enmascarado
- validación de MIME y tamaño en documentos
- antivirus/escaneo opcional en fase 2

### Datos sensibles
- NIF, cuentas, direcciones y documentos personales deben mostrarse parcialmente en listados.
- En exportes internos, diferenciar vista reducida y vista completa autorizada.

---

## 13. Manejo de datos sensibles

- Minimización desde captura.
- Campos sensibles etiquetados.
- Masking en UI y logs.
- Retención definida por política.
- Borrado o archivado controlado.
- No compartir con terceros sin confirmación expresa del usuario.

---

## 14. Roles y permisos

### MVP
- **admin**
- **advisor**
- **owner/user**

### Capacidades básicas
- admin: configuración, acceso amplio, auditoría
- advisor: revisar, validar, resumir
- owner/user: aportar documentos, revisar faltantes, confirmar datos

---

## 15. Auditoría y trazabilidad

Registrar como mínimo:
- creación de expediente
- cambio de estado
- subida/eliminación lógica de documento
- modificación de datos clave
- ejecución de validaciones
- generación de resumen
- accesos sensibles si aplica

Cada evento debe incluir:
- usuario
- acción
- entidad
- timestamp
- metadatos mínimos

---

## 16. Testing

### Unit
- reglas de validación
- normalización de estados
- permisos
- generación de checklist

### Integración
- auth
- creación de expediente
- subida documental
- ejecución de validaciones
- resumen

### E2E
- login
- crear caso
- subir documento
- marcar datos
- validar
- revisar resumen

### Herramientas
- **Vitest/Jest**
- **Supertest**
- **Playwright**

---

## 17. CI/CD

### Pipeline mínimo
1. install
2. lint
3. type-check
4. test
5. build
6. docker build
7. deploy staging
8. aprobación manual a producción

### Recomendación
- GitHub Actions
- migraciones Prisma controladas
- secretos en entorno, nunca en repo

---

## 18. Despliegue

### Recomendación práctica
- frontend: Vercel o container
- backend: Render / Railway / VPS Docker
- DB: PostgreSQL gestionado
- storage: S3-compatible

### Si el entorno exige mayor control
- backend y storage en infraestructura propia
- cifrado de disco y backups controlados

---

## 19. Observabilidad

- logs JSON estructurados
- requestId por petición
- Sentry para errores
- métricas básicas: expedientes creados, validaciones ejecutadas, faltantes detectados, errores de subida
- alertas por fallos de API y latencia

---

## 20. Roadmap por fases

### Fase 0 — Setup
- monorepo
- auth base
- prisma
- docker local
- shell UI

### Fase 1 — MVP
- expedientes
- checklist documental
- documentos
- datos clave
- validaciones base
- resumen preliminar
- auditoría mínima

### Fase 1.5 — Hardening
- masking reforzado
- mejor gestión de errores
- observabilidad
- controles de acceso más finos

### Fase 2 — Operativo real
- OCR asistido
- reglas avanzadas por jurisdicción
- exportes estructurados
- trazabilidad ampliada
- panel admin de requisitos

### Fase 3 — Escalado
- multi-cliente/asesoría
- flujos de aprobación
- integraciones externas
- analítica avanzada

---

## 21. Riesgos técnicos y mitigación

### 1. Ambigüedad fiscal por jurisdicción
- Modular reglas por país y no asumir universalidad.

### 2. Manejo de datos altamente sensibles
- Minimización, masking, control de acceso, storage separado.

### 3. Validaciones insuficientes o engañosas
- Separar dato confirmado, estimado y pendiente.

### 4. Caos documental
- Checklist estructurado + categorías + estados + requisitos.

### 5. Dependencia futura de OCR/IA
- Diseñar módulos desacoplados desde el inicio.

---

## 22. Arquitectura de código recomendada

### Backend
- `controllers`
- `services`
- `repositories`
- `rules`
- `policies`
- `storage`

### Frontend
- `app/`
- `features/expedientes`
- `features/documentos`
- `features/validaciones`
- `components/`
- `lib/`

---

## 23. Backlog técnico inicial

### Imprescindible
- auth
- tax cases
- document requirements
- document upload metadata
- data points
- validations base
- summary base
- audit trail

### Después
- OCR
- panel admin de reglas
- exportes
- permisos granulares

---

## 24. Decisiones técnicas clave

1. **NestJS + Next.js** para equilibrio entre estructura y velocidad.
2. **PostgreSQL + Prisma** por claridad y trazabilidad.
3. **Storage desacoplado** para documentos.
4. **Motor de reglas simple pero extensible** desde MVP.
5. **Estados explícitos** para confirmed/estimated/pending.

---

## 25. Entregable listo para desarrollo

Con este documento ya puede abrirse una implementación real en VS Code en este orden:

1. bootstrap del monorepo
2. prisma y migraciones
3. auth
4. tax cases
5. checklist/documentos
6. validaciones
7. resumen
8. auditoría y hardening

---

## 26. Pendientes previos a producción real

- país/jurisdicción exacta de alcance inicial
- política de retención documental
- nivel de cifrado exigido
- si habrá OCR o IA desde fase temprana
- si el usuario final es particular, asesor o ambos
- criterios legales/compliance aplicables

---

**Documento generado por VÖLUNDR.**
