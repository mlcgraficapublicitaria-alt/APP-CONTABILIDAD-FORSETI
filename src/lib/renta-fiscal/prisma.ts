import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  rentaFiscalPrisma?: PrismaClient;
};

const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export const prisma =
  globalForPrisma.rentaFiscalPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.rentaFiscalPrisma = prisma;
}
