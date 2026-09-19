# Especificación funcional v1 — Cierre trimestral de autónomo

Responsable funcional: FORSETI
Implementación: VÖLUNDR
Alcance: preparación, conciliación y revisión. Quedan fuera la presentación ante la AEAT y cualquier automatismo de pago.

## Principios obligatorios

- Importes monetarios en céntimos enteros; nunca `float`.
- Conservar `sourceFileId`, `sourceSheet`, `sourceRow` y estado de revisión, pero no copiar el documento fuente al repositorio.
- Los fixtures del repositorio deben ser sintéticos y anónimos: sin NIF, nombres, direcciones, IBAN, correos, números de factura reales ni binarios fiscales.
- Separar siempre `declarado` (modelo presentado/importado), `calculado` (libros) y `diferencia`.
- Una discrepancia o incidencia abierta bloquea el estado `LISTO_PARA_REVISIÓN`, pero no impide importar ni guardar el trimestre.
- La aplicación no afirma que un modelo esté pagado cuando solo existe una solicitud de aplazamiento pendiente.

## Contrato mínimo

```ts
type MoneyCents = number; // entero seguro

type Quarter = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  status: "DRAFT" | "NEEDS_REVIEW" | "READY_FOR_REVIEW";
  forms: {
    m303?: {
      declaredResultCents: MoneyCents;
      calculatedResultCents?: MoneyCents;
      differenceCents?: MoneyCents;
      paymentStatus: "UNKNOWN" | "PENDING_DEFERRAL" | "PAID" | "DEBITED";
    };
    m349?: {
      declaredOperations: Array<{
        anonymousCounterpartyId: string;
        operationType: "INTRA_EU_ACQUISITION" | "INTRA_EU_SUPPLY";
        amountCents: MoneyCents;
      }>;
    };
  };
  ledger: {
    purchases: Array<LedgerEntry>;
    sales: Array<LedgerEntry>;
  };
  issues: Issue[];
  expectedTotals?: {
    declared303ResultCents: MoneyCents;
    intraEu349AmountCents: MoneyCents;
    excludedDomesticBaseCents: MoneyCents;
    excludedDomesticVatCents: MoneyCents;
    exemptAmountCents: MoneyCents;
  };
};

type LedgerEntry = {
  anonymousEntryId: string;
  anonymousCounterpartyId?: string;
  operationDate: string; // YYYY-MM-DD
  direction: "PURCHASE" | "SALE";
  documentType: "INVOICE" | "CREDIT_NOTE" | "OTHER";
  kind: "DOMESTIC" | "INTRA_EU" | "EXEMPT" | "OTHER";
  currency: "EUR";
  baseCents: MoneyCents;
  vatCents: MoneyCents;
  totalCents: MoneyCents;
  vatRateBasisPoints: number | null; // 2100 = 21%; null si no procede/no consta
  includedIn303: boolean;
  includedIn349: boolean;
  reviewStatus: "OK" | "REVIEW";
  sourceRef?: {
    sourceFileId: string;
    sourceSheet?: string;
    sourceRow?: number;
  }; // solo runtime/BD; nunca rutas, URLs ni binarios en fixtures del repo
};

type Issue = {
  code:
    | "DOMESTIC_PURCHASE_EXCLUDED_FROM_303"
    | "EXEMPT_OPERATION_REVIEW"
    | "DEFERRAL_PENDING"
    | "FORM_LEDGER_MISMATCH";
  severity: "INFO" | "WARNING" | "BLOCKER";
  relatedAnonymousEntryIds: string[];
  amountCents?: MoneyCents;
  message: string;
};
```

## Reglas ejecutables

1. `MoneyCents` debe ser entero, mayor o igual que cero y menor que `Number.MAX_SAFE_INTEGER`.
2. `differenceCents = calculatedResultCents - declaredResultCents` cuando ambos existan.
3. Una operación `INTRA_EU` incluida en el 349 debe tener correspondencia única por identificador anónimo, tipo y cuantía; si no, crear `FORM_LEDGER_MISMATCH/BLOCKER`.
4. Una compra doméstica con IVA y `includedIn303=false` crea `DOMESTIC_PURCHASE_EXCLUDED_FROM_303/WARNING`; el aviso agrupa las líneas relacionadas y muestra base e IVA, sin sugerir automáticamente que el IVA sea deducible.
5. Una línea `EXEMPT` crea `EXEMPT_OPERATION_REVIEW/WARNING` hasta que se confirme su tratamiento y soporte documental.
6. `paymentStatus=PENDING_DEFERRAL` crea `DEFERRAL_PENDING/BLOCKER`. Solo una evidencia posterior y explícita puede cambiar el estado a `PAID` o `DEBITED`.
7. `READY_FOR_REVIEW` exige: importaciones completadas, `differenceCents=0` cuando haya cálculo disponible y cero incidencias `BLOCKER`.
8. Redondeo: normalizar cada importe desde texto decimal a céntimos con dos decimales; no recalcular desde binarios de coma flotante.
9. Invariante por movimiento: `totalCents = baseCents + vatCents`, salvo nota de crédito, cuyos importes conservan signo coherente. El MVP del fixture solo usa importes no negativos.
10. Fechas en ISO `YYYY-MM-DD`; trimestre derivado de `operationDate` debe coincidir con el trimestre contenedor.

## Oracle de aceptación 1T 2026 anonimizado

El fixture `fixture-1t-2026-anon.json` debe producir exactamente:

- Resultado declarado del 303: `122320` céntimos (1.223,20 €).
- Operación intracomunitaria del 349: `28550` céntimos (285,50 €), con correspondencia única en compras.
- Aviso agrupado equivalente al caso revisado de dos compras domésticas excluidas del 303: base total `71000` e IVA total `14910` céntimos.
- Aviso por operación exenta: `3500` céntimos.
- Bloqueo por aplazamiento pendiente.
- Estado final: `NEEDS_REVIEW`.

El valor del 303 es inicialmente un **oracle declarado**. No debe presentarse como resultado recalculado hasta disponer del desglose completo y confirmar el mapeo de casillas; el sistema mostrará claramente esa distinción.

## Pruebas de aceptación

```ts
expect(result.forms.m303.declaredResultCents).toBe(122320);
expect(result.forms.m303.paymentStatus).toBe("PENDING_DEFERRAL");
expect(result.forms.m349.declaredOperations).toContainEqual({
  anonymousCounterpartyId: "EU-SUPPLIER-001",
  operationType: "INTRA_EU_ACQUISITION",
  amountCents: 28550,
});
expect(match349ToLedger(result, "EU-SUPPLIER-001", 28550)).toHaveLength(1);
expect(sumIssue(result, "DOMESTIC_PURCHASE_EXCLUDED_FROM_303", "baseCents")).toBe(71000);
expect(sumIssue(result, "DOMESTIC_PURCHASE_EXCLUDED_FROM_303", "vatCents")).toBe(14910);
expect(issueAmount(result, "EXEMPT_OPERATION_REVIEW")).toBe(3500);
expect(result.issues.some(i => i.code === "DEFERRAL_PENDING" && i.severity === "BLOCKER")).toBe(true);
expect(result.status).toBe("NEEDS_REVIEW");
expect(scanFixtureForPersonalData(fixture)).toEqual([]);
```

## Tolerancias y matriz PASS/FAIL

- Importes importados con dos decimales: tolerancia `0` céntimos tras normalización. No se acepta comparación aproximada.
- Totales recalculados desde líneas: tolerancia `0` céntimos porque se suman enteros.
- Correspondencia 349 ↔ libro: cuantía exacta, mismo trimestre, tipo compatible y exactamente una coincidencia. Cero o más de una coincidencia es `FAIL`.
- Resultado 303 del fixture: `PASS` si el valor **declarado importado** es exactamente `122320`; cualquier otro valor es `FAIL`.
- El recálculo del 303 queda `NOT_EVALUATED`, no `PASS`, mientras falte el desglose completo de casillas. La interfaz no puede equiparar `NOT_EVALUATED` con conciliado.
- Alertas: `PASS` si aparecen una sola vez por caso, con código y severidad correctos, y sus sumas son exactas. Ausencia, duplicación o importe distinto es `FAIL`.
- Estado: con `DEFERRAL_PENDING/BLOCKER`, el único estado aceptable es `NEEDS_REVIEW`; `READY_FOR_REVIEW` es `FAIL`.
- Privacidad: cualquier coincidencia de dato personal, URL/ID de Drive, documento binario/base64 o identificador fiscal/documental real es `FAIL` inmediato de CI.
- Parser: fila ilegible, moneda distinta de EUR, fecha inválida o importe con más de dos decimales no se corrige silenciosamente; genera error de importación trazable y el caso es `FAIL` hasta revisión.

Resumen de salida del evaluador:

```ts
type AcceptanceResult = {
  verdict: "PASS" | "FAIL";
  checks: Array<{
    id: string;
    verdict: "PASS" | "FAIL" | "NOT_EVALUATED";
    expected?: unknown;
    actual?: unknown;
    message: string;
  }>;
};
```

## Criterios de privacidad para CI

El test `scanFixtureForPersonalData` debe fallar ante claves o patrones de NIF/CIF, IBAN, email, teléfono, dirección postal, nombre/razón social real, número de factura real, URL de Drive o contenido base64/binario. Se admite únicamente identificación sintética con prefijos `ANON-`, `EU-SUPPLIER-` o `ENTRY-`.
