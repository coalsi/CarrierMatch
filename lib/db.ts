import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitialized: boolean | undefined;
};

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // In production (Vercel), use /tmp for ephemeral SQLite
  if (process.env.VERCEL) return "file:/tmp/carriermatch.db";
  // Local dev
  return "file:./prisma/dev.db";
}

function ensureDb() {
  if (globalForPrisma.dbInitialized) return;

  const dbUrl = getDbUrl();
  const dbPath = dbUrl.replace("file:", "");

  if (!existsSync(dbPath)) {
    try {
      // Push schema to create tables
      execSync(`npx prisma db push --skip-generate`, {
        env: { ...process.env, DATABASE_URL: dbUrl },
        cwd: process.cwd(),
        stdio: "ignore",
      });
    } catch {
      // If prisma push fails, tables will be created on first query error
    }
  }

  globalForPrisma.dbInitialized = true;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getDbUrl();
  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });
}

ensureDb();

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
