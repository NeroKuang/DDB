import { describe, expect, it } from "vitest";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { prisma } from "@/lib/prisma";
import {
  loadPeriodStaffInputs,
  seedJulyPeriodStaffFromFixture,
  upsertPeriodStaffSetting,
} from "@/pay-period-staff/manage";
import { DEFAULT_PERIOD_STAFF_SETTINGS } from "@/pay-period-staff/types";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";

describe("pay-period-staff", () => {
  it("seeds July fixture settings once and loads 久橙 split", async () => {
    await seedZhongshanStoreAndStaff();
    const store = await prisma.store.findUniqueOrThrow({
      where: { code: ZHONGSHAN_STORE_CODE },
    });
    await seedJulyPeriodStaffFromFixture();
    const second = await seedJulyPeriodStaffFromFixture();
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

  it("uses fresh defaults for a new period instead of July fixture", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    await seedJulyPeriodStaffFromFixture();
    await ensurePayPeriodRow(storeId, "2026-08");

    const august = await loadPeriodStaffInputs(storeId, "2026-08");
    const jiuCheng = august.find((row) => row.primaryNickname === "久橙");
    const julyFixture = zhongshanJuly2026Shop().periodStaff.find(
      (row) => row.primaryNickname === "久橙"
    );

    expect(jiuCheng?.addBackOfHouseRow).toBe(false);
    expect(jiuCheng?.payTargetBonus).toBe(false);
    expect(jiuCheng?.venueSalesSplit).toBeUndefined();
    expect(julyFixture?.addBackOfHouseRow).toBe(true);

    const july = await loadPeriodStaffInputs(storeId, JULY_2026_PERIOD_KEY);
    const jiuChengJuly = july.find((row) => row.primaryNickname === "久橙");
    expect(jiuChengJuly?.addBackOfHouseRow).toBe(true);

    const fenMingAugust = august.find((row) => row.primaryNickname === "粉冥");
    expect(fenMingAugust).toMatchObject(DEFAULT_PERIOD_STAFF_SETTINGS);
  });
});
