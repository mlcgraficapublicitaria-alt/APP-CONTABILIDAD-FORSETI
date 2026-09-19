import { afterEach, describe, expect, it, vi } from "vitest";
import { readQuarterBooks, templateRows } from "./google-books";

vi.mock("../google-service-account", () => ({
  hasGoogleServiceAccountCredentials: () => true,
  getGoogleAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

const header = "fecha,numero_factura,nif_tercero,nombre_tercero,concepto,clase,moneda,base,tipo_iva,iva,total,incluido_303,incluido_349";

describe("libros normalizados de Google Sheets", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("une expedidas y recibidas del trimestre y conserva trazabilidad fiscal", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [header.split(","), "01/07/2026,A-1,B00000000,Cliente,Servicio,DOMESTIC,EUR,1000.00,21,210.00,1210.00,si,no".split(","), "01/10/2026,A-2,B00000000,Cliente,Fuera,DOMESTIC,EUR,1,21,0.21,1.21,si,no".split(",")] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [header.split(","), "02/08/2026,P-1,B00000001,Proveedor,Gasto,DOMESTIC,EUR,100.00,21,21.00,121.00,si,no".split(",")] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await readQuarterBooks("12345678901234567890", 2026, 3);
    expect(result.rowCount).toBe(2);
    expect(result.content).toContain("A-1;B00000000;Cliente;Servicio;EXPEDIDAS");
    expect(result.content).toContain("P-1;B00000001;Proveedor;Gasto;RECIBIDAS");
    expect(result.content).not.toContain("A-2");
  });

  it("publica plantillas coherentes para las dos pestañas", () => {
    const template = templateRows();
    expect(template.headers).toContain("numero_factura");
    expect(template.examples.EXPEDIDAS).toHaveLength(template.headers.length);
    expect(template.examples.RECIBIDAS).toHaveLength(template.headers.length);
  });
});
