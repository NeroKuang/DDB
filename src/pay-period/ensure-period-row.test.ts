import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";

describe("ensurePayPeriodRow", () => {
  it("returns the same row when called concurrently", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    await prisma.payPeriodStaffSetting.deleteMany({
      where: { payPeriod: { storeId, periodKey: JULY_2026_PERIOD_KEY } },
    });
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });

    const [a, b] = await Promise.all([
      ensurePayPeriodRow(storeId, JULY_2026_PERIOD_KEY),
      ensurePayPeriodRow(storeId, JULY_2026_PERIOD_KEY),
    ]);
    expect(a.id).toBe(b.id);

    const count = await prisma.payPeriod.count({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    expect(count).toBe(1);
  });
});
