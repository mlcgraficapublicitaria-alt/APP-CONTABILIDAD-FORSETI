const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const migrationName = "20260604093000_init_renta_fiscal";
const dbPath = path.join(__dirname, "dev.db");
const migrationPath = path.join(__dirname, "migrations", migrationName, "migration.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );
`);

const alreadyApplied = db.prepare('SELECT "id" FROM "_prisma_migrations" WHERE "migration_name" = ?').get(migrationName);
if (!alreadyApplied) {
  db.exec(sql);
  db.prepare(`
    INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
    VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
  `).run(migrationName, "manual-sqlite-init", migrationName, 1);
}

db.close();
console.log(`SQLite listo en ${dbPath}`);
