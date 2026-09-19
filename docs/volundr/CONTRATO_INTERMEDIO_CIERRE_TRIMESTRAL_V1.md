# Contrato intermedio de importación — cierre trimestral v1

Fecha: 2026-09-19
Estado: contrato técnico v1 alineado con la especificación canónica de FORSETI
Ámbito: CSV, XLSX y PDF con texto; sin presentación AEAT

## Objetivo

Separar la extracción de cada formato de la persistencia Prisma. Todos los
adaptadores producirán este documento intermedio antes de crear movimientos
definitivos. La confirmación solo será posible cuando no existan errores
bloqueantes y el usuario haya revisado los avisos.

## Reglas transversales

- Versión obligatoria: `closure-import/v1`.
- El envelope de importación puede conservar dinero como cadena decimal con dos
  posiciones, sin separador de miles. Antes de persistir o calcular se
  normaliza a céntimos enteros seguros o `Decimal`; nunca se usa coma flotante
  binaria. Ejemplo de entrada: `"1223.20"`; persistencia: `122320` céntimos.
- Fechas fiscales: `YYYY-MM-DD`, sin hora ni zona.
- Divisa inicial: `EUR`.
- El signo se expresa por `entryType`; los importes monetarios son positivos.
- Toda fila conserva localizador y fragmento de origen, pero estos no deben
  contener NIF, email, dirección ni otros datos personales en logs o fixtures.
- Los códigos de aviso son estables y aptos para pruebas; el texto visible puede
  cambiar sin romper el contrato.

## Envelope

```ts
type ClosureImportV1 = {
  schemaVersion: "closure-import/v1";
  importer: {
    kind: "CSV" | "XLSX" | "PDF_130" | "PDF_303" | "PDF_OTHER";
    version: string;
  };
  source: {
    fileName: string;
    mediaType: string;
    sha256: string;
    sizeBytes: number;
    sheetName?: string;
  };
  period: {
    fiscalYear: number;
    quarter: 1 | 2 | 3 | 4;
  };
  rows: IntermediateRowV1[];
  declaredResults?: DeclaredResultV1[];
  diagnostics: DiagnosticV1[];
};
```

## Fila normalizada

```ts
type IntermediateRowV1 = {
  rowKey: string;
  locator: {
    row?: number;
    page?: number;
    sourceFragment?: string;
  };
  status: "VALID" | "WARNING" | "ERROR" | "DUPLICATE" | "REQUIRES_REVIEW";
  raw: Record<string, unknown>;
  entry?: {
    fiscalDate: string;
    entryType: "INCOME" | "EXPENSE";
    documentNumber?: string;
    counterpartyLabel?: string;
    concept: string;
    taxCategory:
      | "STANDARD"
      | "REDUCED"
      | "SUPER_REDUCED"
      | "EXEMPT"
      | "INTRA_EU_GOODS"
      | "INTRA_EU_SERVICES"
      | "REVERSE_CHARGE"
      | "NOT_SUBJECT_LOCATION"
      | "PENDING_CLASSIFICATION";
    intraEuOperationType?: "INTRA_EU_ACQUISITION" | "INTRA_EU_SUPPLY";
    netAmount: string;
    vatRate?: string;
    vatAmount: string;
    withholdingRate?: string;
    withholdingAmount: string;
    grossAmount: string;
    currency: "EUR";
  };
  diagnostics: DiagnosticV1[];
};
```

`rowKey` será determinista dentro del fichero. La clave candidata de duplicado
se calculará después de normalizar con fecha fiscal, tipo, documento, base,
impuestos y total; no se confiará solo en el número de factura.

## Resultados declarados

Los PDFs de modelos pueden aportar importes declarados sin generar por sí solos
movimientos contables:

```ts
type DeclaredResultV1 = {
  form: "130" | "303" | "349";
  code: string;
  amount: string;
  locator: { page?: number; sourceFragment?: string };
  confidence: "HIGH" | "MEDIUM" | "LOW";
};
```

La conciliación comparará estos resultados con los calculados a partir de los
movimientos. Una diferencia no se corregirá silenciosamente.

## Diagnósticos

```ts
type DiagnosticV1 = {
  code: string;
  severity: "INFO" | "WARNING" | "ERROR" | "BLOCKER";
  scope: "FILE" | "ROW" | "FIELD" | "RECONCILIATION";
  field?: string;
  message: string;
};
```

Códigos técnicos iniciales:

- `UNSUPPORTED_MEDIA_TYPE`, `FILE_TOO_LARGE`, `EMPTY_FILE`.
- `MISSING_REQUIRED_COLUMN`, `INVALID_DATE`, `INVALID_DECIMAL`.
- `AMOUNT_MISMATCH`, `PERIOD_MISMATCH`, `POSSIBLE_DUPLICATE`.
- `REQUIRES_OCR`, `LOW_EXTRACTION_CONFIDENCE`.
- `DECLARED_RESULT_MISMATCH`, `PENDING_CLASSIFICATION`.
- `DOMESTIC_PURCHASE_EXCLUDED_FROM_303`, `EXEMPT_OPERATION_REVIEW`.
- `DEFERRAL_PENDING`, `FORM_LEDGER_MISMATCH`.

Los códigos y condiciones fiscales se rigen por la matriz funcional canónica
entregada por FORSETI. `ERROR` identifica un dato o fila que no puede
normalizarse; `BLOCKER` identifica una incidencia de negocio que permite
importar y guardar el trimestre, pero impide cerrarlo o marcarlo
`READY_FOR_REVIEW`.

## Criterios técnicos de aceptación

Un fixture obtiene `PASS` si:

1. El adaptador produce `schemaVersion` y hash válidos.
2. El número y orden lógico de filas coincide con lo esperado.
3. Los importes se normalizan de forma exacta, sin coma flotante.
4. Todos los errores y avisos esperados aparecen por código y localizador.
5. Una segunda vista previa produce el mismo resultado normalizado.
6. Una segunda confirmación del mismo lote no crea movimientos nuevos.
7. Los valores declarados concilian exactamente con su oracle. El recálculo
   solo se evalúa cuando existe desglose suficiente; hasta entonces devuelve
   `NOT_EVALUATED` y no se presenta como conciliado.

Es `FAIL` si existe un `ERROR`, cambia el resultado entre ejecuciones, se pierde
la trazabilidad de origen o se crea una escritura parcial. Un `BLOCKER` no hace
fallar la importación ni el guardado: fuerza `NEEDS_REVIEW` e impide cierre y
`READY_FOR_REVIEW`.

## Fixture sintético coordinado

El paquete mínimo será:

- `1t-2026-movimientos.csv` y equivalente `.xlsx` con el mismo resultado.
- PDF de texto sintético para el resultado 303.
- `expected.json` con filas normalizadas, diagnósticos y totales.
- Casos negativos: columna ausente, decimal inválido, duplicado, trimestre
  incorrecto y PDF escaneado simulado.

Valores funcionales ya fijados por ODIN para el fixture de aceptación:

- resultado declarado 303: `1223.20` EUR (`122320` céntimos);
- operación intracomunitaria anonimizada para 349: `285.50` EUR;
- operación exenta: `35.00` EUR;
- avisos sintéticos equivalentes a revisión de tercero y aplazamiento pendiente.

El recálculo del 303 queda `NOT_EVALUATED` hasta disponer del desglose completo
de casillas. La matriz funcional vigente, códigos, severidades y tolerancia cero
están definidos en la especificación canónica de FORSETI.
