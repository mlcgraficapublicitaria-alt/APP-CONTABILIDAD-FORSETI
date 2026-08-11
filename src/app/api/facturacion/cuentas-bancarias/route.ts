import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasMysqlDatabaseUrl } from "@/lib/database-url";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";

type BankAccount = {
  id: string;
  value: string;
};

type SaveBankAccountBody = {
  value?: string;
};

const defaultBankAccount = "GLOBAL CAJA: ES15 3190 0091 1504 0253 9910";
const localBankAccountsPath = path.join(process.cwd(), ".forseti", "invoice-bank-accounts.json");
const localInvoicesPath = path.join(process.cwd(), ".forseti", "invoices.json");

function bankAccountFromInvoiceMetadata(value?: string | null) {
  if (!value?.trim().startsWith("{")) return "";
  try {
    const metadata = JSON.parse(value) as { issuerBankAccount?: unknown };
    return typeof metadata.issuerBankAccount === "string" ? metadata.issuerBankAccount.trim() : "";
  } catch {
    return "";
  }
}

function mergeBankAccounts(...groups: BankAccount[][]) {
  const accounts = new Map<string, BankAccount>();
  for (const account of groups.flat()) {
    const value = account.value.trim();
    const key = value.toLocaleLowerCase("es");
    if (key && !accounts.has(key)) accounts.set(key, { ...account, value });
  }
  return [...accounts.values()];
}

async function recoverBankAccountsFromInvoices(): Promise<BankAccount[]> {
  if (!hasMysqlDatabaseUrl()) {
    try {
      const content = await readFile(localInvoicesPath, "utf8");
      const invoices = JSON.parse(content) as Array<{ id?: string; issuerBankAccount?: string }>;
      if (!Array.isArray(invoices)) return [];
      return invoices
        .filter((invoice) => invoice.issuerBankAccount?.trim())
        .map((invoice, index) => ({
          id: `recovered-${invoice.id || index}`,
          value: invoice.issuerBankAccount!.trim(),
        }));
    } catch {
      return [];
    }
  }

  const invoices = await prisma.invoice.findMany({
    select: { id: true, renderedHtml: true, issuerProfile: { select: { bankAccount: true } } },
    orderBy: { issueDate: "desc" },
  });

  return invoices.flatMap((invoice) => {
    const value = bankAccountFromInvoiceMetadata(invoice.renderedHtml) || invoice.issuerProfile.bankAccount?.trim() || "";
    return value ? [{ id: `recovered-${invoice.id}`, value }] : [];
  });
}

async function ensureDatabaseBankAccountsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`InvoiceBankAccount\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`value\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      UNIQUE INDEX \`InvoiceBankAccount_value_key\` (\`value\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

async function readDatabaseBankAccounts(): Promise<BankAccount[]> {
  await ensureDatabaseBankAccountsTable();

  const recovered = mergeBankAccounts(
    [{ id: "default", value: defaultBankAccount }],
    await recoverBankAccountsFromInvoices(),
  );

  await prisma.invoiceBankAccount.createMany({
    data: recovered.map((account) => ({ value: account.value })),
    skipDuplicates: true,
  });

  return prisma.invoiceBankAccount.findMany({
    select: { id: true, value: true },
    orderBy: { createdAt: "asc" },
  });
}

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

  try {
    if (hasMysqlDatabaseUrl()) return ok({ accounts: await readDatabaseBankAccounts() });

    const accounts = mergeBankAccounts(await readBankAccounts(), await recoverBankAccountsFromInvoices());
    return ok({ accounts });
  } catch (error) {
    return badRequest(error instanceof Error ? `No se pudieron recuperar las cuentas: ${error.message}` : "No se pudieron recuperar las cuentas.");
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<SaveBankAccountBody>(request);
  const value = body.value?.trim();
  if (!value) return badRequest("Escribe la cuenta bancaria que quieres guardar.");

  try {
    if (hasMysqlDatabaseUrl()) {
      await ensureDatabaseBankAccountsTable();
      const existing = await prisma.invoiceBankAccount.findFirst({
        where: { value: { equals: value } },
        select: { id: true, value: true },
      });
      if (existing) return ok({ account: existing });

      const account = await prisma.invoiceBankAccount.create({
        data: { value },
        select: { id: true, value: true },
      });
      return ok({ account }, { status: 201 });
    }

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
