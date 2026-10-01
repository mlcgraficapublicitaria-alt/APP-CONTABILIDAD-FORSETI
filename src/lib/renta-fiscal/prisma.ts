import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { getDatabaseUrl } from "../database-url";

const globalForPrisma = globalThis as unknown as {
  rentaFiscalPrisma?: PrismaClient;
};

const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

function createMariaDbAdapter(url: string) {
  const connection = new URL(url);
  const database = decodeURIComponent(connection.pathname.slice(1));

  if (connection.protocol !== "mysql:" || !database) {
    throw new Error("DATABASE_URL debe ser una URL mysql:// válida.");
  }

  return new PrismaMariaDb({
    host: connection.hostname,
    port: Number(connection.port || 3306),
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database,
    // Shared hosting has a strict process/connection limit. Keep the pool small.
    connectionLimit: 2,
  });
}

export const prisma =
  globalForPrisma.rentaFiscalPrisma ??
  new PrismaClient({
    adapter: createMariaDbAdapter(databaseUrl),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.rentaFiscalPrisma = prisma;
}
