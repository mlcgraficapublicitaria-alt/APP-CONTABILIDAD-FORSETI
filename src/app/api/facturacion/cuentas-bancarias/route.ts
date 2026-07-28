import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";

type BankAccount = {
  id: string;
  value: string;
};

type SaveBankAccountBody = {
  value?: string;
};

const defaultBankAccount = "GLOBAL CAJA: ES15 3190 0091 1504 0253 9910";
const localBankAccountsPath = path.join(process.cwd(), ".forseti", "invoice-bank-accounts.json");

async function readBankAccounts(): Promise<BankAccount[]> {
  try {
    const content = await readFile(localBankAccountsPath, "utf8");
    const accounts = JSON.parse(content) as BankAccount[];
    if (Array.isArray(accounts) && accounts.length > 0) return accounts;
  } catch {
    // La cuenta predeterminada permite empezar aunque el archivo aun no exista.
  }

  return [{ id: "default", value: defaultBankAccount }];
}

async function writeBankAccounts(accounts: BankAccount[]) {
  await mkdir(path.dirname(localBankAccountsPath), { recursive: true });
  await writeFile(localBankAccountsPath, JSON.stringify(accounts, null, 2), "utf8");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  return ok({ accounts: await readBankAccounts() });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<SaveBankAccountBody>(request);
  const value = body.value?.trim();
  if (!value) return badRequest("Escribe la cuenta bancaria que quieres guardar.");

  try {
    const accounts = await readBankAccounts();
    const existing = accounts.find((account) => account.value.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"));
    if (existing) return ok({ account: existing });

    const account = { id: randomUUID(), value };
    accounts.push(account);
    await writeBankAccounts(accounts);
    return ok({ account }, { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? `No se pudo guardar la cuenta: ${error.message}` : "No se pudo guardar la cuenta.");
  }
}
