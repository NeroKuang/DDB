import type { CompileResult } from "@/compile/types";
import { prisma } from "@/lib/prisma";

export type CachedCompilePayload = {
  periodLabel: string;
  periodKey: string;
  source: "storage" | "fixture" | "db";
  result: CompileResult;
};

export async function readCompileCache(
  storeId: string,
  periodKey: string
): Promise<CachedCompilePayload | null> {
  const row = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { compileCacheJson: true },
  });
  if (!row?.compileCacheJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(row.compileCacheJson) as CachedCompilePayload;
    if (
      !parsed ||
      parsed.periodKey !== periodKey ||
      !parsed.result ||
      !Array.isArray(parsed.result.payRows)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCompileCache(
  storeId: string,
  periodKey: string,
  payload: CachedCompilePayload
): Promise<void> {
  await prisma.payPeriod.updateMany({
    where: { storeId, periodKey },
    data: {
      compileCacheJson: JSON.stringify(payload),
      compileCacheAt: new Date(),
    },
  });
}

export async function invalidateCompileCache(
  storeId: string,
  periodKey: string
): Promise<void> {
  await prisma.payPeriod.updateMany({
    where: { storeId, periodKey },
    data: {
      compileCacheJson: null,
      compileCacheAt: null,
    },
  });
}
