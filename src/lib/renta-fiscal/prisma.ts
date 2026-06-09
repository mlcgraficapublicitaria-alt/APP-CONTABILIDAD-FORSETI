import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  rentaFiscalPrisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
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
