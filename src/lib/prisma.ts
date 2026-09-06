import { PrismaClient } from "@prisma/client";
import { withPrismaPoolParams } from "@/lib/prisma-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return new PrismaClient();
  }
  return new PrismaClient({
    datasources: {
      db: { url: withPrismaPoolParams(rawUrl) },
    },
  });
}

/**
 * Always reuse one client (dev HMR + production Node). Skipping the global in
 * production used to spawn multiple pools and hit connection_limit=3 timeouts
 * while 網頁取數 held the event loop and the shell re-seeded titles/staff.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
