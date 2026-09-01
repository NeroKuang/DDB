import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";

/** Test helper: ensure July pay period is not locked between parallel test files. */
export async function clearJulyPayPeriodLock(storeId: string): Promise<void> {
  await prisma.payPeriod.deleteMany({
    where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
  });
}
