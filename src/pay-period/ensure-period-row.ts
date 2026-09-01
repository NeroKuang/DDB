import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Race-safe PayPeriod row (concurrent upsert/create may hit P2002). */
export async function ensurePayPeriodRow(
  storeId: string,
  periodKey: string
): Promise<{ id: string }> {
  const existing = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }

  try {
    return await prisma.payPeriod.create({
      data: { storeId, periodKey },
      select: { id: true },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    return prisma.payPeriod.findUniqueOrThrow({
      where: { storeId_periodKey: { storeId, periodKey } },
      select: { id: true },
    });
  }
}
