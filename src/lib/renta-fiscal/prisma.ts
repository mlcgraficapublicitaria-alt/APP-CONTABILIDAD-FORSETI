import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  rentaFiscalPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.rentaFiscalPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.rentaFiscalPrisma = prisma;
}
