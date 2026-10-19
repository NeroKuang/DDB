import {
  businessDaysForPeriodKey,
  type BusinessDayBounds,
} from "@/compile/period-catalog";
import { prisma } from "@/lib/prisma";

/** Calendar-month defaults, or Admin-overridden 營業日起訖 on PayPeriod. */
export async function resolveBusinessDayBounds(
  storeId: string | undefined,
  periodKey: string
): Promise<BusinessDayBounds> {
  if (storeId) {
    const row = await prisma.payPeriod.findUnique({
      where: { storeId_periodKey: { storeId, periodKey } },
      select: {
        businessDayStartIso: true,
        businessDayEndIso: true,
      },
    });
    if (row?.businessDayStartIso && row?.businessDayEndIso) {
      return {
        startIso: row.businessDayStartIso,
        endIso: row.businessDayEndIso,
      };
    }
  }
  return businessDaysForPeriodKey(periodKey);
}
