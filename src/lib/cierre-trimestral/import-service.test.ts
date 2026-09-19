import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { DEFAULT_CSV_MAPPING } from "./csv";

const mocks = vi.hoisted(() => {
  const tx = {
    quarterlySourceDocument: { upsert: vi.fn() },
    quarterlyImportBatch: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    quarterlyImportRow: { deleteMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    quarterlyLedgerEntry: { findUnique: vi.fn(), create: vi.fn() },
    quarterlyClosure: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    quarterlyIssue: { deleteMany: vi.fn(), createMany: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  return {
    tx,
    prisma: { $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)) },
  };
});

vi.mock("../renta-fiscal/prisma", () => ({ prisma: mocks.prisma }));

import { confirmImportBatch, createCsvImportPreview } from "./import-service";

const csv = [
  "fecha;direccion;tipo_documento;clase;moneda;base;iva;total;tipo_iva;id_tercero;incluido_303;incluido_349",
  "2026-02-15;PURCHASE;INVOICE;INTRA_EU;EUR;285,50;0;285,50;0;EU-SUPPLIER-001;si;si",
].join("\n");

describe("idempotencia del servicio de importación", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no reescribe filas cuando el mismo fichero ya fue confirmado", async () => {
    mocks.tx.quarterlySourceDocument.upsert.mockResolvedValue({ id: "source-1" });
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1", status: "CONFIRMED", importerKey: "csv-ledger", importerVersion: "1",
      mappingJson: {}, rows: [{ sourceRow: 2, originalJson: {}, normalizedJson: { sourceRef: { sourceFileId: "source-1", sourceRow: 2 } }, fingerprint: "a".repeat(64), status: "IMPORTED", errorsJson: [] }],
    });

    const result = await createCsvImportPreview({
      closureId: "closure-1",
      fileName: "fixture.csv",
      mimeType: "text/csv",
      content: Buffer.from(csv),
    });

    expect(result.idempotentReplay).toBe(true);
    expect(mocks.tx.quarterlyImportBatch.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.quarterlyImportRow.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.quarterlyImportRow.createMany).not.toHaveBeenCalled();
    expect(result.preview.rows[0].normalized?.sourceRef?.sourceFileId).toBe("source-1");
    expect(mocks.tx.quarterlyImportBatch.findUnique.mock.calls[0][0].where).toHaveProperty("closureId_sourceDocumentId_importerKey_importerVersion_mappingHash");
  });

  it("repetir la confirmación no duplica libro ni auditoría", async () => {
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1",
      status: "CONFIRMED",
      validRowCount: 1,
      duplicateCount: 0,
      rows: [{ status: "IMPORTED" }],
    });

    await expect(confirmImportBatch("batch-1")).resolves.toEqual({
      batchId: "batch-1",
      imported: 1,
      duplicates: 0,
      idempotentReplay: true,
    });
    expect(mocks.tx.quarterlyLedgerEntry.create).not.toHaveBeenCalled();
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("aborta antes de escribir cuando existen filas inválidas", async () => {
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1",
      status: "PREVIEW",
      invalidRowCount: 1,
      duplicateCount: 0,
      rows: [],
    });

    await expect(confirmImportBatch("batch-1")).rejects.toThrow(/filas inválidas/);
    expect(mocks.tx.quarterlyLedgerEntry.create).not.toHaveBeenCalled();
    expect(mocks.tx.quarterlyImportBatch.update).not.toHaveBeenCalled();
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("rechaza una fila cuya fecha no pertenece al cierre antes de escribir", async () => {
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1", closureId: "closure-1", status: "PREVIEW", invalidRowCount: 0, duplicateCount: 0,
      rows: [{ id: "row-1", sourceRow: 2, status: "VALID", fingerprint: "a".repeat(64), normalizedJson: {
        anonymousEntryId: "ENTRY-1", operationDate: "2026-04-01", direction: "PURCHASE", documentType: "INVOICE",
        kind: "DOMESTIC", currency: "EUR", baseCents: 100, vatCents: 21, totalCents: 121,
        vatRateBasisPoints: 2100, includedIn303: true, includedIn349: false, reviewStatus: "OK",
      } }],
    });
    mocks.tx.quarterlyClosure.findUniqueOrThrow.mockResolvedValue({ id: "closure-1", taxCaseId: "case-1", fiscalYear: 2026, quarter: 1 });

    await expect(confirmImportBatch("batch-1")).rejects.toThrow(/no pertenece al trimestre/);
    expect(mocks.tx.quarterlyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it("distingue el mismo fichero cuando cambia el mapping", async () => {
    mocks.tx.quarterlySourceDocument.upsert.mockResolvedValue({ id: "source-1" });
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue(null);
    mocks.tx.quarterlyImportBatch.upsert.mockResolvedValue({ id: "batch-1" });
    await createCsvImportPreview({ closureId: "closure-1", fileName: "fixture.csv", mimeType: "text/csv", content: Buffer.from(csv) });
    const changedMapping = { ...DEFAULT_CSV_MAPPING, base: "total", total: "base" };
    await createCsvImportPreview({ closureId: "closure-1", fileName: "fixture.csv", mimeType: "text/csv", content: Buffer.from(csv), mapping: changedMapping });
    const firstKey = mocks.tx.quarterlyImportBatch.findUnique.mock.calls[0][0].where.closureId_sourceDocumentId_importerKey_importerVersion_mappingHash;
    const secondKey = mocks.tx.quarterlyImportBatch.findUnique.mock.calls[1][0].where.closureId_sourceDocumentId_importerKey_importerVersion_mappingHash;
    expect(firstKey.mappingHash).not.toBe(secondKey.mappingHash);
  });

  it("convierte una colisión P2002 concurrente en duplicado", async () => {
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1", closureId: "closure-1", sourceDocumentId: "source-1", status: "PREVIEW", invalidRowCount: 0, duplicateCount: 0,
      rows: [{ id: "row-1", sourceRow: 2, status: "VALID", fingerprint: "a".repeat(64), normalizedJson: {
        anonymousEntryId: "ENTRY-1", operationDate: "2026-02-01", direction: "PURCHASE", documentType: "INVOICE",
        kind: "DOMESTIC", currency: "EUR", baseCents: 100, vatCents: 21, totalCents: 121,
        vatRateBasisPoints: 2100, includedIn303: true, includedIn349: false, reviewStatus: "OK",
      } }],
    });
    mocks.tx.quarterlyClosure.findUniqueOrThrow
      .mockResolvedValueOnce({ id: "closure-1", taxCaseId: "case-1", fiscalYear: 2026, quarter: 1 })
      .mockResolvedValueOnce({ id: "closure-1", ledgerEntries: [], operations349: [], issues: [] });
    mocks.tx.quarterlyLedgerEntry.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "concurrent-ledger" });
    mocks.tx.quarterlyLedgerEntry.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.3" }));

    await expect(confirmImportBatch("batch-1")).resolves.toMatchObject({ imported: 0, duplicates: 1 });
    expect(mocks.tx.quarterlyImportRow.update).toHaveBeenCalledWith({ where: { id: "row-1" }, data: { status: "DUPLICATE" } });
  });

  it("no oculta como duplicado un P2002 causado por otra restricción", async () => {
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1", closureId: "closure-1", status: "PREVIEW", invalidRowCount: 0, duplicateCount: 0,
      rows: [{ id: "row-1", sourceRow: 2, status: "VALID", fingerprint: "c".repeat(64), normalizedJson: {
        anonymousEntryId: "ENTRY-COLLISION", operationDate: "2026-02-01", direction: "PURCHASE", documentType: "INVOICE",
        kind: "DOMESTIC", currency: "EUR", baseCents: 100, vatCents: 21, totalCents: 121,
        vatRateBasisPoints: 2100, includedIn303: true, includedIn349: false, reviewStatus: "OK",
      } }],
    });
    mocks.tx.quarterlyClosure.findUniqueOrThrow.mockResolvedValue({ id: "closure-1", taxCaseId: "case-1", fiscalYear: 2026, quarter: 1 });
    mocks.tx.quarterlyLedgerEntry.findUnique.mockResolvedValue(null);
    const collision = new Prisma.PrismaClientKnownRequestError("other unique", { code: "P2002", clientVersion: "6.19.3" });
    mocks.tx.quarterlyLedgerEntry.create.mockRejectedValue(collision);

    await expect(confirmImportBatch("batch-1")).rejects.toBe(collision);
    expect(mocks.tx.quarterlyImportRow.update).not.toHaveBeenCalled();
  });

  it("reconcilia incidencias fiscales y estado después de confirmar", async () => {
    const entry = {
      anonymousEntryId: "ENTRY-EXEMPT", operationDate: "2026-02-01", direction: "SALE", documentType: "INVOICE",
      kind: "EXEMPT", currency: "EUR", baseCents: 100, vatCents: 0, totalCents: 100,
      vatRateBasisPoints: 0, includedIn303: true, includedIn349: false, reviewStatus: "REVIEW",
    };
    mocks.tx.quarterlyImportBatch.findUnique.mockResolvedValue({
      id: "batch-1", closureId: "closure-1", sourceDocumentId: "source-1", status: "PREVIEW", invalidRowCount: 0, duplicateCount: 0,
      rows: [{ id: "row-1", sourceRow: 2, status: "VALID", fingerprint: "b".repeat(64), normalizedJson: entry }],
    });
    mocks.tx.quarterlyClosure.findUniqueOrThrow
      .mockResolvedValueOnce({ id: "closure-1", taxCaseId: "case-1", fiscalYear: 2026, quarter: 1 })
      .mockResolvedValueOnce({
        id: "closure-1", issues: [], operations349: [{ operationType: "INTRA_EU_ACQUISITION", anonymousCounterpartyId: "EU-1", amountCents: BigInt(500) }],
        ledgerEntries: [
          { ...entry, taxKind: "EXEMPT", baseCents: BigInt(100), vatCents: BigInt(0), totalCents: BigInt(100) },
          { ...entry, anonymousEntryId: "ENTRY-DOMESTIC-ZERO-VAT", direction: "PURCHASE", taxKind: "DOMESTIC", includedIn303: false, baseCents: BigInt(100), vatCents: BigInt(0), totalCents: BigInt(100) },
        ],
      });
    mocks.tx.quarterlyLedgerEntry.findUnique.mockResolvedValue(null);
    mocks.tx.quarterlyLedgerEntry.create.mockResolvedValue({ id: "ledger-1" });

    await expect(confirmImportBatch("batch-1")).resolves.toMatchObject({ imported: 1, duplicates: 0 });
    const issueData = mocks.tx.quarterlyIssue.createMany.mock.calls[0][0].data;
    expect(issueData.map((issue: { code: string }) => issue.code)).toEqual(["EXEMPT_OPERATION_REVIEW", "FORM_LEDGER_MISMATCH"]);
    expect(mocks.tx.quarterlyClosure.update).toHaveBeenCalledWith({ where: { id: "closure-1" }, data: { status: "NEEDS_REVIEW" } });
  });
});
