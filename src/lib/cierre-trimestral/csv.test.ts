import { describe, expect, it } from "vitest";
import { DEFAULT_CSV_MAPPING, parseDecimalToCents, previewCsv } from "./csv";
import { summarizePreview } from "./import-service";

const header = "fecha;direccion;tipo_documento;clase;moneda;base;iva;total;tipo_iva;id_tercero;incluido_303;incluido_349";
const valid = "2026-02-15;PURCHASE;INVOICE;INTRA_EU;EUR;285,50;0;285,50;0;EU-SUPPLIER-001;si;si";

describe("adaptador CSV del cierre trimestral", () => {
  it("normaliza decimales españoles a céntimos sin coma flotante", () => {
    expect(parseDecimalToCents("1.223,20")).toBe(122320);
    expect(parseDecimalToCents("285,5")).toBe(28550);
    expect(() => parseDecimalToCents("1,234")).toThrow(/dos decimales/);
  });

  it("genera preview trazable y detecta duplicados internos", () => {
    const preview = previewCsv([header, valid, valid].join("\n"));
    expect(preview.delimiter).toBe(";");
    expect(preview.rows[0]).toMatchObject({ sourceRow: 2, status: "VALID" });
    expect(preview.rows[0].normalized?.sourceRef?.sourceRow).toBe(2);
    expect(preview.rows[1].status).toBe("DUPLICATE");
    expect(preview.rows[0].fingerprint).toBe(preview.rows[1].fingerprint);
    expect(summarizePreview(preview)).toEqual({ valid: 1, invalid: 0, duplicate: 1, canConfirm: true });
  });

  it("impide confirmar un preview con filas inválidas", () => {
    const preview = previewCsv([header, valid.replace("285,50;0;285,50", "285,50;0;999,00")].join("\n"));
    expect(preview.rows[0].status).toBe("INVALID");
    expect(summarizePreview(preview).canConfirm).toBe(false);
  });

  it("exige moneda declarada y rechaza monedas fuera del contrato EUR", () => {
    expect(() => previewCsv([header.replace(";moneda", ""), valid.replace(";EUR", "")].join("\n"))).toThrow(/moneda/);
    const nonEur = previewCsv([header, valid.replace(";EUR;", ";USD;")].join("\n"));
    expect(nonEur.rows[0]).toMatchObject({ status: "INVALID" });
    expect(nonEur.rows[0].errors[0]).toMatch(/Moneda no soportada/);
  });

  it("admite saltos de línea entrecomillados y conserva la fila física de origen", () => {
    const multilineHeader = `${header};nota`;
    const multilineMapping = { ...DEFAULT_CSV_MAPPING };
    const row = `${valid};"primera línea\nsegunda línea"`;
    const preview = previewCsv([multilineHeader, row].join("\n"), multilineMapping);
    expect(preview.rows[0]).toMatchObject({ sourceRow: 2, status: "VALID" });
    expect(preview.rows[0].original.nota).toBe("primera línea\nsegunda línea");
  });

  it("marca como inválidas las filas con más o menos celdas que la cabecera", () => {
    expect(previewCsv([header, `${valid};sobrante`].join("\n")).rows[0].errors[0]).toMatch(/Número de celdas/);
    expect(previewCsv([header, valid.split(";").slice(0, -1).join(";")].join("\n")).rows[0].errors[0]).toMatch(/Número de celdas/);
  });

  it("marca para revisión las exentas y compras domésticas excluidas", () => {
    const exempt = valid.replace("PURCHASE;INVOICE;INTRA_EU", "SALE;INVOICE;EXEMPT");
    const domesticExcluded = valid.replace("INTRA_EU", "DOMESTIC").replace(";si;si", ";no;no");
    expect(previewCsv([header, exempt].join("\n")).rows[0].normalized?.reviewStatus).toBe("REVIEW");
    expect(previewCsv([header, domesticExcluded].join("\n")).rows[0].normalized?.reviewStatus).toBe("REVIEW");
  });
});
