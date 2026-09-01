import { describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { buildShopInputsForPeriod } from "@/compile/build-shop-inputs";
import { compilePayPeriodLive } from "@/compile/compile-for-period";
import {
  businessDaysForPeriodKey,
  fileRangeForPeriodKey,
  getPeriodCatalogEntry,
} from "@/compile/period-catalog";
import { seedJulyPeriodStaffFromFixture } from "@/pay-period-staff/manage";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

describe("編成 module — buildShopInputsForPeriod", () => {
  it("loads 久橙 split from period staff DB via single entry", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    await seedJulyPeriodStaffFromFixture();
    const { shop } = await buildShopInputsForPeriod({
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
    const jiuCheng = shop.periodStaff.find(
      (row) => row.primaryNickname === "久橙"
    );
    expect(jiuCheng?.venueSalesSplit).toEqual({
      frontOfHouse: 1150,
      backOfHouse: 2950,
    });
  });
});

describe("編成 module — period catalog adapter", () => {
  it("maps 2026-07 to file range and business days", () => {
    const entry = getPeriodCatalogEntry(JULY_2026_PERIOD_KEY);
    expect(entry.labelPrefix).toContain("2026-07");
    expect(fileRangeForPeriodKey(JULY_2026_PERIOD_KEY).startDate).toBe(
      "2026-06-30"
    );
    expect(businessDaysForPeriodKey(JULY_2026_PERIOD_KEY).startIso).toContain(
      "2026-07-01"
    );
  });
});

describe("編成 module — compilePayPeriodLive", () => {
  it("compiles July fixtures through store-scoped entry", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    const compiled = await compilePayPeriodLive({
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
    const fenMing = compiled.result.payRows.find(
      (row) => row.primaryNickname === "粉冥"
    );
    expect(fenMing?.original.sales).toBe(75685);
    expect(compiled.periodKey).toBe(JULY_2026_PERIOD_KEY);
  });
});
