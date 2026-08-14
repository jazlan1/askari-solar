import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

function buildMariaDBClient(dbUrl: string): PrismaClient {
  const isProd = process.env.NODE_ENV === "production";
  const parsed = new URL(dbUrl);
  const adapter = new PrismaMariaDb({
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306"),
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectTimeout: 5000,
    acquireTimeout: 5000,
    connectionLimit: isProd ? 10 : 2,
    idleTimeout: isProd ? 30000 : 10000,
  });
  return new PrismaClient({ adapter });
}

function buildSQLiteClient(dbUrl: string): PrismaClient {
  // Use eval("require") to completely bypass webpack and turbopack compile-time static tracers.
  // This prevents build/runtime errors when optional SQLite dependencies are missing in production.
  const requireFunc = typeof (globalThis as any).__non_webpack_require__ !== "undefined"
    ? (globalThis as any).__non_webpack_require__
    : eval("require");
  const { PrismaBetterSqlite3 } = requireFunc("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const dbUrl = process.env.DATABASE_URL || "";

  if (!dbUrl) {
    throw new Error(
      "[db] DATABASE_URL is not set. Cannot connect to the database."
    );
  }

  const client = dbUrl.startsWith("file:")
    ? buildSQLiteClient(dbUrl)
    : buildMariaDBClient(dbUrl);

  globalForPrisma.prisma = client;
  return client;
}

// Proxy that defers getClient() until the first property access.
// This means the DB connection is only established when a query is actually
// made (at request time), NOT during Next.js static build/page-data collection.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
