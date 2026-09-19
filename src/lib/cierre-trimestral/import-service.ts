import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../renta-fiscal/prisma";
import { previewCsv } from "./csv";
import { mapLedgerEntryForPersistence } from "./persistence";
import { reconcileQuarterClosure } from "./reconciliation";
import type { CsvMapping, ImportPreview } from "./import-types";
import type { LedgerEntry } from "./types";

function mappingHash(mapping: CsvMapping): string {
  const canonical = Object.entries(mapping).sort(([left], [right]) => left.localeCompare(right));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function quarterForDate(date: string): number {
  return Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1;
}

function persistedPreview(batch: {
  importerKey: string; importerVersion: string; mappingJson: unknown;
  rows: Array<{ sourceRow: number; originalJson: unknown; normalizedJson: unknown; fingerprint: string; status: string; errorsJson: unknown }>;
}, delimiter: ImportPreview["delimiter"]): ImportPreview {
  const rows = batch.rows.map((row) => ({
    sourceRow: row.sourceRow,
    original: row.originalJson as Record<string, string>,
    normalized: row.normalizedJson as LedgerEntry | undefined,
    fingerprint: row.fingerprint,
    status: row.status === "IMPORTED" ? "VALID" as const : row.status as "VALID" | "INVALID" | "DUPLICATE",
    errors: row.errorsJson as string[],
  }));
  return {
    importerKey: batch.importerKey as "csv-ledger",
    importerVersion: batch.importerVersion as "1",
    delimiter,
    mapping: batch.mappingJson as CsvMapping,
    rows,
    counts: {
      valid: rows.filter((row) => row.status === "VALID").length,
      invalid: rows.filter((row) => row.status === "INVALID").length,
      duplicate: rows.filter((row) => row.status === "DUPLICATE").length,
    },
  };
}

type PreviewInput = {
  closureId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
  storageKey?: string;
  mapping?: CsvMapping;
};

export async function createCsvImportPreview(input: PreviewInput) {
  const text = input.content.toString("utf8");
  const preview = previewCsv(text, input.mapping);
  const sha256 = createHash("sha256").update(input.content).digest("hex");
  const previewMappingHash = mappingHash(preview.mapping);

  return prisma.$transaction(async (tx) => {
    const sourceDocument = await tx.quarterlySourceDocument.upsert({
      where: { closureId_sha256: { closureId: input.closureId, sha256 } },
      create: {
        closureId: input.closureId, fileName: input.fileName, mimeType: input.mimeType,
        sizeBytes: input.content.byteLength, sha256, storageKey: input.storageKey,
      },
      update: { fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.content.byteLength, storageKey: input.storageKey },
    });
    const batchKey = {
      closureId: input.closureId,
      sourceDocumentId: sourceDocument.id,
      importerKey: preview.importerKey,
      importerVersion: preview.importerVersion,
      mappingHash: previewMappingHash,
    };
    const confirmedBatch = await tx.quarterlyImportBatch.findUnique({
      where: { closureId_sourceDocumentId_importerKey_importerVersion_mappingHash: batchKey },
      include: { rows: { orderBy: { sourceRow: "asc" } } },
    });
    if (confirmedBatch?.status === "CONFIRMED") {
      return {
        batchId: confirmedBatch.id,
        sourceDocumentId: sourceDocument.id,
        sha256,
        preview: persistedPreview(confirmedBatch, preview.delimiter),
        idempotentReplay: true,
      };
    }
    const batch = await tx.quarterlyImportBatch.upsert({
      where: { closureId_sourceDocumentId_importerKey_importerVersion_mappingHash: batchKey },
      create: {
        closureId: input.closureId, sourceDocumentId: sourceDocument.id,
        importerKey: preview.importerKey, importerVersion: preview.importerVersion, mappingHash: previewMappingHash,
        mappingJson: preview.mapping, validRowCount: preview.counts.valid,
        invalidRowCount: preview.counts.invalid, duplicateCount: preview.counts.duplicate,
      },
      update: {
        status: "PREVIEW", mappingJson: preview.mapping, validRowCount: preview.counts.valid,
        invalidRowCount: preview.counts.invalid, duplicateCount: preview.counts.duplicate, confirmedAt: null,
      },
    });
    const tracedRows = preview.rows.map((row) => ({
      ...row,
      normalized: row.normalized ? {
        ...row.normalized,
        sourceRef: { ...row.normalized.sourceRef, sourceFileId: sourceDocument.id, sourceRow: row.sourceRow },
      } : undefined,
    }));
    await tx.quarterlyImportRow.deleteMany({ where: { importBatchId: batch.id } });
    await tx.quarterlyImportRow.createMany({ data: tracedRows.map((row) => ({
      importBatchId: batch.id, sourceRow: row.sourceRow, fingerprint: row.fingerprint, status: row.status,
      originalJson: row.original, normalizedJson: row.normalized as unknown as Prisma.InputJsonValue | undefined,
      errorsJson: row.errors,
    })) });
    return { batchId: batch.id, sourceDocumentId: sourceDocument.id, sha256, preview: { ...preview, rows: tracedRows }, idempotentReplay: false };
  });
}

function ledgerCreateData(closureId: string, batchId: string, rowId: string, fingerprint: string, entry: LedgerEntry, year: number, quarter: number) {
  const mapped = mapLedgerEntryForPersistence(entry, year, quarter, entry.direction);
  return {
    closureId, importBatchId: batchId, importRowId: rowId, deduplicationKey: fingerprint,
    ...mapped,
  };
}

export async function confirmImportBatch(batchId: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.quarterlyImportBatch.findUnique({ where: { id: batchId }, include: { rows: true } });
    if (!batch) throw new Error("Lote de importación no encontrado.");
    if (batch.status === "CONFIRMED") return {
      batchId,
      imported: batch.rows.filter((row) => row.status === "IMPORTED").length,
      duplicates: batch.rows.filter((row) => row.status === "DUPLICATE").length,
      idempotentReplay: true,
    };
    if (batch.invalidRowCount > 0) throw new Error("El lote contiene filas inválidas y no puede confirmarse.");
    const closure = await tx.quarterlyClosure.findUniqueOrThrow({ where: { id: batch.closureId } });

    let imported = 0;
    let duplicates = batch.duplicateCount;
    for (const row of batch.rows) {
      if (row.status !== "VALID" || !row.normalizedJson) continue;
      const entry = row.normalizedJson as unknown as LedgerEntry;
      if (Number(entry.operationDate.slice(0, 4)) !== closure.fiscalYear || quarterForDate(entry.operationDate) !== closure.quarter) {
        throw new Error(`La fila ${row.sourceRow} no pertenece al trimestre del cierre.`);
      }
      const existing = await tx.quarterlyLedgerEntry.findUnique({
        where: { closureId_deduplicationKey: { closureId: batch.closureId, deduplicationKey: row.fingerprint } },
        select: { id: true },
      });
      if (existing) {
        duplicates += 1;
        await tx.quarterlyImportRow.update({ where: { id: row.id }, data: { status: "DUPLICATE" } });
        continue;
      }
      try {
        await tx.quarterlyLedgerEntry.create({ data: ledgerCreateData(batch.closureId, batch.id, row.id, row.fingerprint, entry, closure.fiscalYear, closure.quarter) });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const duplicate = await tx.quarterlyLedgerEntry.findUnique({
            where: { closureId_deduplicationKey: { closureId: batch.closureId, deduplicationKey: row.fingerprint } },
            select: { id: true },
          });
          if (duplicate) {
            duplicates += 1;
            await tx.quarterlyImportRow.update({ where: { id: row.id }, data: { status: "DUPLICATE" } });
            continue;
          }
        }
        throw error;
      }
      await tx.quarterlyImportRow.update({ where: { id: row.id }, data: { status: "IMPORTED" } });
      imported += 1;
    }
    await tx.quarterlyImportBatch.update({ where: { id: batch.id }, data: { status: "CONFIRMED", duplicateCount: duplicates, confirmedAt: new Date() } });
    await reconcileQuarterClosure(tx, batch.closureId);
    await tx.auditEvent.create({ data: {
      taxCaseId: closure.taxCaseId,
      action: "QUARTERLY_IMPORT_CONFIRMED", entity: "QuarterlyImportBatch", entityId: batch.id,
      metadata: JSON.stringify({ imported, duplicates, sourceDocumentId: batch.sourceDocumentId }),
    } });
    return { batchId, imported, duplicates, idempotentReplay: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function summarizePreview(preview: ImportPreview) {
  return { ...preview.counts, canConfirm: preview.counts.invalid === 0 };
}
