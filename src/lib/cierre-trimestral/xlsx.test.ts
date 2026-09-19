import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { makeWorkbook } from "./xlsx";

describe("exportación XLSX", () => {
  it("genera un libro abrible con las hojas fiscales", async () => {
    const buffer = await makeWorkbook([{ name: "EXPEDIDAS", rows: [["Fecha", "Base"], ["2026-07-01", 100]] }]);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file("xl/workbook.xml")).not.toBeNull();
    expect(await zip.file("xl/worksheets/sheet1.xml")?.async("text")).toContain("2026-07-01");
  });
});
