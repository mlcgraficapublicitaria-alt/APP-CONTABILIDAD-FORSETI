import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../tests/fixtures/cierre-trimestral/1t-2026-anon.json";
import type { QuarterClose } from "./types";

const mocks = vi.hoisted(() => {
  const tx = {
    quarterlyClosure: { upsert: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    quarterlyLedgerEntry: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    quarterly349Operation: { deleteMany: vi.fn(), createMany: vi.fn() },
    quarterlyIssue: { deleteMany: vi.fn(), createMany: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  return { tx, prisma: { $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)) } };
});

vi.mock("../renta-fiscal/prisma", () => ({ prisma: mocks.prisma }));

import { markQuarterReadyForReview, saveQuarterClose } from "./persistence";

describe("persistencia integrada del cierre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.quarterlyClosure.upsert.mockResolvedValue({ id: "closure-1" });
    mocks.tx.quarterlyLedgerEntry.findMany.mockResolvedValue([{ anonymousEntryId: "ENTRY-EU-001" }]);
    mocks.tx.quarterlyClosure.findUniqueOrThrow.mockResolvedValue({
      ledgerEntries: [], operations349: [], payment303Status: "UNKNOWN", declared303ResultCents: null,
    });
  });

  it("preserva las filas importadas, su trazabilidad y su deduplicación al guardar", async () => {
    await saveQuarterClose("case-1", structuredClone(fixture) as QuarterClose);

    expect(mocks.tx.quarterlyLedgerEntry.deleteMany).toHaveBeenCalledWith({
      where: { closureId: "closure-1", importBatchId: null },
    });
    const created = mocks.tx.quarterlyLedgerEntry.createMany.mock.calls[0][0].data;
    expect(created).toHaveLength(3);
    expect(created.some((entry: { anonymousEntryId: string }) => entry.anonymousEntryId === "ENTRY-EU-001")).toBe(false);
  });

  it("no marca READY mientras exista cualquier lote PREVIEW o FAILED", async () => {
    mocks.tx.quarterlyClosure.findUniqueOrThrow
      .mockResolvedValueOnce({ ledgerEntries: [], operations349: [], payment303Status: "UNKNOWN", declared303ResultCents: null })
      .mockResolvedValueOnce({
        calculated303ResultCents: BigInt(100), difference303Cents: BigInt(0), issues: [],
        importBatches: [{ status: "CONFIRMED" }, { status: "PREVIEW" }],
      });
    await expect(markQuarterReadyForReview("closure-1")).rejects.toThrow(/no cumple/);
    expect(mocks.tx.quarterlyClosure.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: "READY_FOR_REVIEW" } }));
  });

  it("regenera DEFERRAL_PENDING aunque el payload lo omita", async () => {
    const candidate = structuredClone(fixture) as QuarterClose;
    candidate.issues = [];
    mocks.tx.quarterlyClosure.findUniqueOrThrow.mockResolvedValue({
      ledgerEntries: [], operations349: [], payment303Status: "PENDING_DEFERRAL", declared303ResultCents: BigInt(122320),
    });

    await saveQuarterClose("case-1", candidate);

    expect(mocks.tx.quarterlyIssue.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      closureId: "closure-1", code: "DEFERRAL_PENDING", severity: "BLOCKER",
    })] });
  });
});
