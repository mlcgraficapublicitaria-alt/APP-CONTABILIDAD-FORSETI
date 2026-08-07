import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredExpense = {
  id: string;
  expenseDate: string;
  month: string;
  supplier: string;
  invoiceNumber: string;
  concept: string;
  category: string;
  amount: number;
  notes: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const rootPath = path.join(process.cwd(), ".forseti", "gastos");
const filesPath = path.join(rootPath, "archivos");
const metadataPath = path.join(rootPath, "gastos.json");

export async function readExpenses() {
  try {
    const content = await readFile(metadataPath, "utf8");
    const expenses = JSON.parse(content) as StoredExpense[];
    return Array.isArray(expenses) ? expenses : [];
  } catch {
    return [];
  }
}

export async function writeExpenses(expenses: StoredExpense[]) {
  await mkdir(filesPath, { recursive: true });
  await writeFile(metadataPath, JSON.stringify(expenses, null, 2), "utf8");
}

export async function saveExpenseFile(storedName: string, content: Buffer) {
  await mkdir(filesPath, { recursive: true });
  await writeFile(path.join(filesPath, path.basename(storedName)), content);
}

export async function readExpenseFile(storedName: string) {
  return readFile(path.join(filesPath, path.basename(storedName)));
}

export function safeDownloadName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "justificante";
}
