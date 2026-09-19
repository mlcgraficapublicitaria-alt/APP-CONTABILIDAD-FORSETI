# VÖLUNDR — Inspección y plan del MVP de cierre trimestral de autónomo

Fecha: 2026-09-19
Estado: propuesta técnica inicial; sin despliegue ni cambios de producción

## 1. Resultado de la inspección

Repositorio canónico inspeccionado: `APP-CONTABILIDAD-FORSETI` (`mlcgraficapublicitaria-alt/APP-CONTABILIDAD-FORSETI`).

Base aprovechable:

- Next.js 16, React 19 y TypeScript, con rutas de interfaz y API en el mismo proyecto.
- Prisma 6 con MySQL y migraciones existentes.
- Autenticación local, roles, auditoría y entidades de expediente fiscal ya creadas.
- Analizadores PDF preliminares para modelos 130 y 303 mediante `pdf-parse`.
- Interfaz de expediente y validaciones existente, aunque `/renta-fiscal` y su detalle redirigen actualmente a `/`.

Brechas para el nuevo alcance:

- `TaxCase` representa un expediente anual, no cierres por año y trimestre.
- `DataPoint` guarda pares clave/valor; no sirve como libro normalizado de ingresos, gastos e impuestos.
- El registro documental actual es lógico y no conserva un fichero importado real ni su hash.
- No existe una canalización de importación, vista previa, mapeo de columnas, deduplicación ni confirmación.
- No hay lector CSV/Excel instalado. PDF admite extracción de texto, pero no tablas normalizadas ni OCR dentro de este módulo.
- No hay fixtures de importación ni pruebas automatizadas del flujo.
- La rama local está limpia pero contiene un commit por delante de `origin/main`; no se hará push ni despliegue en este frente.

## 2. Decisión de arquitectura

Mantener el monolito modular actual. No crear otro backend ni otro repositorio para el MVP.

El cierre trimestral se implementará como módulo dentro de FORSETI con tres capas:

1. **Dominio**: cierre, movimientos, impuestos, incidencias y conciliación.
2. **Importación**: fichero fuente → extracción → vista previa → mapeo → validación → confirmación idempotente.
3. **Interfaz**: asistente de importación y panel de revisión del trimestre.

Los importadores no escribirán directamente movimientos definitivos. Primero crearán un lote en borrador con filas originales y normalizadas; el usuario confirmará el lote tras revisar errores y duplicados.

## 3. Modelo de datos propuesto

### Entidades nuevas

- `QuarterlyClosure`: autónomo/expediente, ejercicio, trimestre, fechas, estado y totales calculados.
- `SourceDocument`: fichero original, tipo, nombre, tamaño, hash SHA-256, almacenamiento y metadatos sin datos sensibles en logs.
- `ImportBatch`: importador y versión, estado, configuración de mapeo, conteos y usuario responsable.
- `ImportRow`: número de fila/página, carga original JSON, carga normalizada JSON, estado y mensajes de validación.
- `LedgerEntry`: fecha, tipo (`INCOME`, `EXPENSE`), tercero, concepto, número documental, base, IVA, IRPF, total, divisa y origen.
- `TaxAmount`: desglose por movimiento y clase (`OUTPUT_VAT`, `INPUT_VAT`, `IRPF_WITHHELD`, etc.).
- `ReconciliationIssue`: duplicado, campo ausente, descuadre o clasificación pendiente, con resolución auditable.

### Relaciones y restricciones

- Un expediente puede tener un cierre por trimestre: único `(taxCaseId, fiscalYear, quarter)`.
- Un fichero puede generar varios lotes si cambia el mapeo, pero solo un lote confirmado por hash, cierre e importador.
- Cada movimiento conserva `sourceDocumentId`, `importBatchId` e `importRowId` para trazabilidad.
- Importes con `Decimal`; fechas en UTC y fecha fiscal separada de timestamps técnicos.
- La identidad fiscal real no formará parte de fixtures, snapshots ni mensajes de error.

`TaxCase`, `User` y `AuditEvent` se reutilizan. `DataPoint` seguirá disponible para el módulo de renta anual, pero no será el libro contable del cierre trimestral.

## 4. Importadores

### Contrato común

Cada adaptador implementará `probe`, `extract`, `normalize` y `validate`. La salida será un formato intermedio común, independiente de Prisma. Esto permite probar importadores sin base de datos y cambiar reglas sin releer el fichero.

### CSV

- Detección de separador, BOM y codificación habitual.
- Vista previa y mapeo manual de columnas.
- Normalización española de fechas y decimales.
- Límites de tamaño, filas y longitud de celda.

### Excel

- Soporte inicial `.xlsx`, selección de hoja y cabecera.
- Lectura de valores calculados; no ejecución de macros ni fórmulas.
- Misma vista previa, mapeo y normalización que CSV.
- Añadir una librería mantenida para XLSX tras validar licencia y superficie de seguridad.

### PDF

- Reutilizar la extracción de texto existente para modelos 130/303 y PDFs con texto.
- Adaptadores por plantilla/tipo documental; nunca inferencia silenciosa de importes.
- Si el PDF es escaneado, marcar `REQUIRES_OCR` o revisión manual. OCR queda fuera de la primera fase salvo fixture representativo aprobado.
- Toda extracción debe conservar página, fragmento fuente y nivel de confianza.

### Idempotencia y seguridad

- SHA-256 del fichero, clave de deduplicación por movimiento y transacciones al confirmar.
- MIME real, extensión permitida, tamaño máximo y nombres saneados.
- Binarios fuera de la base relacional; en DB solo metadatos y clave de almacenamiento.
- Sin datos fiscales, NIF, emails o facturas reales en fixtures. Los ejemplos usarán entidades ficticias e importes alterados.

## 5. Interfaz MVP

Integración aprobada: herramienta interna de FORSETI, dentro de la sección
`HERRAMIENTAS`, con nombre visible exacto `CIERRES TRIMESTRES AUTONOMO` y
ruta `/forseti/cierres-trimestres-autonomo`. No se implementará como
aplicación separada ni como módulo raíz.

Flujo:

1. Seleccionar expediente, ejercicio y trimestre.
2. Subir PDF, CSV o XLSX.
3. Ver detección de formato y elegir hoja/plantilla.
4. Mapear columnas cuando proceda.
5. Revisar vista previa con filas válidas, avisos, errores y posibles duplicados.
6. Confirmar la importación.
7. Revisar panel del trimestre: ingresos, gastos, IVA repercutido/soportado, retenciones e incidencias.
8. Marcar el cierre como revisado internamente.

El panel será informativo y auditable. No incluirá botones de presentación, conexión con AEAT ni afirmaciones de validez fiscal definitiva.

## 6. Implementación por fases

### Fase 0 — fixtures y criterios de aceptación

- Definir matrices de columnas y documentos soportados.
- Crear fixtures sintéticos de CSV, XLSX y PDF, más casos inválidos y duplicados.
- Acordar límites de tamaño y totales esperados.

Salida: fixtures anonimizados y pruebas de contrato del formato intermedio.

### Fase 1 — dominio y persistencia

- Añadir enums y modelos Prisma.
- Crear migración MySQL reversible y seed sintético.
- Implementar servicios de cierre, lotes y auditoría, sin interfaz pública.

Salida: esquema migrable y pruebas unitarias del dominio.

### Fase 2 — CSV y Excel

- Construir contrato común, adaptadores tabulares, mapeo y validación.
- Añadir API de vista previa y confirmación transaccional.
- Implementar deduplicación e idempotencia.

Salida: importación completa de fixtures CSV/XLSX sin escrituras parciales.

### Fase 3 — PDF

- Extraer el código PDF común de los analizadores actuales.
- Implementar adaptadores 130/303 basados en texto y trazabilidad por página.
- Resolver explícitamente PDFs escaneados como revisión manual o OCR posterior.

Salida: vista previa estructurada y auditable de fixtures PDF aprobados.

### Fase 4 — interfaz MVP

- Activar navegación del módulo sin reactivar de forma accidental la antigua renta fiscal.
- Crear listado de cierres, asistente de importación y panel de revisión.
- Añadir estados vacíos, errores recuperables y accesibilidad básica.

Salida: recorrido local de extremo a extremo.

### Fase 5 — endurecimiento y validación previa a producción

- Pruebas de integración, permisos, límites, ficheros malformados y regresión.
- `lint`, build y prueba de migración sobre una base desechable.
- Revisión funcional con Mariano en entorno local/staging.
- Comprobación expresa de producción antes de cualquier limpieza local.

Salida: candidato a despliegue. El despliegue y cualquier presentación AEAT quedan fuera de este plan hasta autorización independiente.

## 7. Orden de trabajo inmediato

1. Recibir o fabricar de forma controlada un fixture sintético por formato y fijar sus resultados esperados.
2. Cerrar el formato intermedio y el modelo Prisma.
3. Implementar primero CSV; después XLSX; finalmente PDF, porque el riesgo crece en ese orden.
4. Construir la interfaz sobre APIs ya verificadas.

## 8. Riesgos y decisiones pendientes

- Precisar qué exportaciones CSV/XLSX reales deben soportarse primero (banco, facturación, asesoría u otro origen).
- Identificar variantes exactas de PDF de modelos 130/303 y si llegan como texto o escaneo.
- Elegir almacenamiento privado definitivo para los binarios.
- Confirmar si un mismo cierre debe separar varias actividades/epígrafes.
- No limpiar copias, datos ni artefactos locales hasta que Mariano confirme expresamente que producción está comprobada.
