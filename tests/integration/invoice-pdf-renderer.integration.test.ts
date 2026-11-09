import { describe, expect, it } from "vitest";
import { buildPrintableInvoiceDocument } from "../../src/lib/invoice-printable-document";
import { renderInvoicePdf } from "../../src/lib/invoice-pdf-server";

describe("renderer PDF canónico de facturas", () => {
  it("renderiza con Chromium el mismo documento compartido que usa la impresión", async () => {
    const html = buildPrintableInvoiceDocument({
      documentName: "FACTURA N.º A/PRUEBA", invoiceDate: "2026-11-09", invoiceSeries: "A", invoiceNumber: "PRUEBA", articleCode: "P",
      issuerName: "EMISOR DE PRUEBA", issuerTaxId: "B00000000", issuerAddress: "Calle Prueba 1", issuerPostalCode: "28000", issuerCity: "Madrid", issuerEmail: "emisor@example.test", issuerPhone: "600000000", issuerBankAccount: "ES00 0000 0000 0000 0000 0000",
      clientName: "CLIENTE DE PRUEBA", clientDetails: "CIF: B00000001", clientNameFontSize: "12", clientDetailsFontSize: "10", billedService: "Servicio de prueba", serviceNotes: "", baseAmount: "100", totalDiscountRate: "0", vatRate: "21", irpfRate: "0",
    }, { grossBaseAmount: 100, totalDiscountRate: 0, totalDiscountAmount: 0, baseAmount: 100, vatRate: 21, vatAmount: 21, irpfRate: 0, irpfAmount: 0, totalAmount: 121 }, [
      { id: "linea-prueba", articleCode: "P", description: "Servicio de prueba", unitPrice: "100", discountRate: "0", noCost: false, notes: "" },
    ]);
    const pdf = await renderInvoicePdf(html);
    expect(html).toContain("CLIENTE DE PRUEBA");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(512);
  }, 120_000);
});
