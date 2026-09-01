import { describe, expect, it } from "vitest";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { prisma } from "@/lib/prisma";
import {
  loadPeriodStaffInputs,
  seedJulyPeriodStaffFromFixture,
  upsertPeriodStaffSetting,
} from "@/pay-period-staff/manage";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

describe("pay-period-staff", () => {
  it("seeds July fixture settings once and loads 久橙 split", async () => {
    await seedZhongshanStoreAndStaff();
    const store = await prisma.store.findUniqueOrThrow({
      where: { code: ZHONGSHAN_STORE_CODE },
    });
    const first = await seedJulyPeriodStaffFromFixture();
    const second = await seedJulyPeriodStaffFromFixture();
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);

    const inputs = await loadPeriodStaffInputs(store.id, JULY_2026_PERIOD_KEY);
    const jiuCheng = inputs.find((row) => row.primaryNickname === "久橙");
    expect(jiuCheng?.addBackOfHouseRow).toBe(true);
    expect(jiuCheng?.venueSalesSplit).toEqual({
      frontOfHouse: 1150,
      backOfHouse: 2950,
    });
  });

  it("lets Admin upsert custom settings", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    await seedJulyPeriodStaffFromFixture();
    const staff = await prisma.staff.findFirstOrThrow({
      where: { storeId, primaryNickname: "粉冥" },
    });
    await upsertPeriodStaffSetting({
      actorRole: "ADMIN",
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
      staffId: staff.id,
      settings: {
        addBackOfHouseRow: false,
        landInsuranceOn: "frontOfHouse",
        landTargetOn: "frontOfHouse",
        landMonthlyOn: "frontOfHouse",
        landTaskBonusOn: "frontOfHouse",
        payTargetBonus: true,
        perRow: {
          frontOfHouse: {
            demerits: 2,
            overtimeWithHoliday: 0,
            overtimeWithoutHoliday: 0,
            allowance: 0,
            allowanceNote: "",
            repayment: 0,
            photoCommission: 0,
          },
        },
      },
    });
    const inputs = await loadPeriodStaffInputs(storeId, JULY_2026_PERIOD_KEY);
    const fenMing = inputs.find((row) => row.primaryNickname === "粉冥");
    expect(fenMing?.payTargetBonus).toBe(true);
    expect(fenMing?.perRow.frontOfHouse?.demerits).toBe(2);
    expect(
      zhongshanJuly2026Shop().periodStaff.find(
        (row) => row.primaryNickname === "祤晞"
      )?.perRow.frontOfHouse?.demerits
    ).toBe(6);
  });
});
