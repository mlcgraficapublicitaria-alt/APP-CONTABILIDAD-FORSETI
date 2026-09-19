import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = resolve(process.cwd(), "prisma/migrations/20260919143000_add_quarterly_closure_domain");

describe("migración reversible del cierre trimestral", () => {
  it("revierte en orden de dependencias sin desactivar globalmente las claves foráneas", () => {
    const rollback = readFileSync(resolve(migrationDirectory, "rollback.sql"), "utf8");
    expect(rollback).not.toMatch(/FOREIGN_KEY_CHECKS/);
    const tables = [...rollback.matchAll(/DROP TABLE IF EXISTS `([^`]+)`/g)].map((match) => match[1]);
    expect(tables).toEqual([
      "QuarterlyIssue", "QuarterlyLedgerEntry", "QuarterlyImportRow", "QuarterlyImportBatch",
      "QuarterlySourceDocument", "Quarterly349Operation", "QuarterlyClosure",
    ]);
  });

  it("mantiene alineada la identidad del lote entre schema y migración", () => {
    const migration = readFileSync(resolve(migrationDirectory, "migration.sql"), "utf8");
    expect(migration).toContain("`mappingHash` CHAR(64) NOT NULL");
    expect(migration).toContain("sourceDocumentId`, `importerKey`, `importerVersion`, `mappingHash`");
    expect(migration).toContain("FOREIGN KEY (`sourceDocumentId`, `closureId`) REFERENCES `QuarterlySourceDocument`(`id`, `closureId`)");
  });
});
