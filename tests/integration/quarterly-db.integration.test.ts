import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.QUARTERLY_TEST_DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
const isExplicitlyTemporary = /(?:^|[_-])(test|tmp|temp)(?:$|[_-])/i.test(databaseName);

describe.skipIf(!databaseUrl)("cierre trimestral contra MySQL temporal", () => {
  if (databaseUrl && !isExplicitlyTemporary) {
    throw new Error("QUARTERLY_TEST_DATABASE_URL debe apuntar a una base cuyo nombre incluya test, tmp o temp.");
  }

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl! });
  const migrationDirectory = resolve(process.cwd(), "prisma/migrations/20260919143000_add_quarterly_closure_domain");

  beforeAll(() => {
    execFileSync(process.execPath, [resolve(process.cwd(), "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl! }, stdio: "pipe",
    });
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("materializa mappingHash, BIGINT y las restricciones del ledger", async () => {
    const columns = await prisma.$queryRaw<Array<{ COLUMN_NAME: string; DATA_TYPE: string }>>`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'QuarterlyImportBatch' AND COLUMN_NAME = 'mappingHash'
    `;
    expect(columns).toEqual([{ COLUMN_NAME: "mappingHash", DATA_TYPE: "char" }]);
    const money = await prisma.$queryRaw<Array<{ DATA_TYPE: string }>>`
      SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'QuarterlyLedgerEntry' AND COLUMN_NAME = 'totalCents'
    `;
    expect(money[0]?.DATA_TYPE).toBe("bigint");
    const checks = await prisma.$queryRaw<Array<{ CONSTRAINT_NAME: string }>>`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'QuarterlyLedgerEntry' AND CONSTRAINT_TYPE = 'CHECK'
    `;
    expect(checks.map((item) => item.CONSTRAINT_NAME)).toEqual(expect.arrayContaining([
      "QuarterlyLedgerEntry_currency_chk", "QuarterlyLedgerEntry_money_nonnegative_chk",
      "QuarterlyLedgerEntry_total_chk", "QuarterlyLedgerEntry_vat_rate_chk",
    ]));
  });

  it("impide por FK compuesta asociar un documento fuente a un cierre distinto", async () => {
    await prisma.user.create({ data: { id: "q-user", email: "quarterly-test@example.invalid", name: "Quarterly test", passwordHash: "not-a-real-secret" } });
    await prisma.taxCase.createMany({ data: [
      { id: "q-case-a", reference: "Q-TEST-A", title: "A", taxpayerName: "Anon", fiscalYear: 2026, ownerId: "q-user" },
      { id: "q-case-b", reference: "Q-TEST-B", title: "B", taxpayerName: "Anon", fiscalYear: 2026, ownerId: "q-user" },
    ] });
    await prisma.quarterlyClosure.createMany({ data: [
      { id: "q-close-a", taxCaseId: "q-case-a", fiscalYear: 2026, quarter: 1 },
      { id: "q-close-b", taxCaseId: "q-case-b", fiscalYear: 2026, quarter: 1 },
    ] });
    await prisma.quarterlySourceDocument.create({ data: {
      id: "q-source-a", closureId: "q-close-a", fileName: "a.csv", mimeType: "text/csv",
      sizeBytes: 10, sha256: "a".repeat(64),
    } });

    await expect(prisma.$executeRawUnsafe(`
      INSERT INTO QuarterlyImportBatch
        (id, closureId, sourceDocumentId, importerKey, importerVersion, mappingHash, status, mappingJson,
         validRowCount, invalidRowCount, duplicateCount, createdAt, updatedAt)
      VALUES (?, ?, ?, 'csv-ledger', '1', ?, 'PREVIEW', '{}', 0, 0, 0, NOW(3), NOW(3))
    `, "q-cross-batch", "q-close-b", "q-source-a", "b".repeat(64))).rejects.toThrow();
  });

  it("aplica constraints, cascadas e identidad idempotente del lote", async () => {
    await expect(prisma.quarterlyLedgerEntry.create({ data: {
      closureId: "q-close-a", anonymousEntryId: "ENTRY-BAD-TOTAL", operationDate: new Date("2026-02-01T00:00:00Z"),
      direction: "PURCHASE", documentType: "INVOICE", taxKind: "DOMESTIC", currency: "EUR",
      baseCents: BigInt(100), vatCents: BigInt(21), totalCents: BigInt(999), reviewStatus: "OK",
    } })).rejects.toThrow();

    const identity = {
      closureId: "q-close-a", sourceDocumentId: "q-source-a", importerKey: "csv-ledger", importerVersion: "1", mappingHash: "c".repeat(64),
    };
    const batch = await prisma.quarterlyImportBatch.create({ data: { id: "q-batch-a", ...identity, mappingJson: {} } });
    await expect(prisma.quarterlyImportBatch.create({ data: { id: "q-batch-duplicate", ...identity, mappingJson: {} } })).rejects.toThrow();
    await prisma.quarterlyImportRow.create({ data: {
      id: "q-row-a", importBatchId: batch.id, sourceRow: 2, fingerprint: "d".repeat(64), status: "VALID", originalJson: {}, errorsJson: [],
    } });
    await prisma.quarterlySourceDocument.delete({ where: { id: "q-source-a" } });
    expect(await prisma.quarterlyImportBatch.count({ where: { id: batch.id } })).toBe(0);
    expect(await prisma.quarterlyImportRow.count({ where: { id: "q-row-a" } })).toBe(0);
  });

  it("resuelve una colisión concurrente mediante la unicidad de deduplicación", async () => {
    const peer = new PrismaClient({ datasourceUrl: databaseUrl! });
    const data = {
      closureId: "q-close-a", operationDate: new Date("2026-02-01T00:00:00Z"), direction: "PURCHASE" as const,
      documentType: "INVOICE" as const, taxKind: "DOMESTIC" as const, currency: "EUR", baseCents: BigInt(100),
      vatCents: BigInt(21), totalCents: BigInt(121), reviewStatus: "OK" as const, deduplicationKey: "e".repeat(64),
    };
    try {
      const results = await Promise.allSettled([
        prisma.quarterlyLedgerEntry.create({ data: { id: "q-ledger-race-a", anonymousEntryId: "ENTRY-RACE-A", ...data } }),
        peer.quarterlyLedgerEntry.create({ data: { id: "q-ledger-race-b", anonymousEntryId: "ENTRY-RACE-B", ...data } }),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(await prisma.quarterlyLedgerEntry.count({ where: { closureId: "q-close-a", deduplicationKey: data.deduplicationKey } })).toBe(1);
    } finally {
      await peer.$disconnect();
    }
  });

  it("ejecuta el rollback completo sin desactivar FOREIGN_KEY_CHECKS", async () => {
    const rollback = readFileSync(resolve(migrationDirectory, "rollback.sql"), "utf8");
    expect(rollback).not.toMatch(/FOREIGN_KEY_CHECKS/);
    for (const statement of rollback.split(";").map((part) => part.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    const remaining = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'Quarterly%'
    `;
    expect(Number(remaining[0]?.total ?? 0)).toBe(0);
  });
});
