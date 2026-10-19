import { describe, expect, it } from "vitest";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { zhongshanEmptyShop } from "@/compile/zhongshan-empty-shop";
import { CUSTOM_VALUES_JSON_KEY } from "@/pay-row-stored/custom-values";

describe("compilePayPeriod custom salary items", () => {
  it("keeps custom original 0 and rolls stored into monthly pay", () => {
    const shop = zhongshanEmptyShop();
    shop.staff = [
      {
        legalName: "測試",
        primaryNickname: "測",
        aliases: [],
        title: "",
        kind: "regular",
        payKind: "hourly",
        hourlyRate: 200,
        monthlyPay: 0,
        commissionRate: 0.2,
        targetBonusAmount: 0,
        laborHealthInsuranceAmount: 0,
        laborHealthInsuranceMode: "fixed",
        laborHealthInsuranceRatio: 0,
        laborHealthInsuranceCarryOverMonthly: true,
        payNote: "備註列",
      },
    ];
    shop.customSalaryItems = [
      {
        id: "c1",
        name: "特殊津貼",
        rollup: "addToMonthlyPay",
      },
    ];
    const result = compilePayPeriod({
      shop,
      checkoutLines: [],
      punchPairs: [
        {
          nickname: "測",
          hours: 10,
          clockIn: new Date("2026-07-01T13:00:00+08:00"),
          clockOut: new Date("2026-07-01T23:00:00+08:00"),
        },
      ],
      noteClicks: [],
      noteOuterComplete: true,
      savedStored: {
        測: {
          frontOfHouse: {
            [CUSTOM_VALUES_JSON_KEY]: { c1: 500 },
          },
        },
      },
    });
    const row = result.payRows[0];
    expect(row?.payNote).toBe("備註列");
    expect(row?.customItems).toEqual([
      { id: "c1", name: "特殊津貼", original: 0, stored: 500 },
    ]);
    expect(row?.original.basePay).toBe(2000);
    expect(row?.stored.monthlyPay).toBe(2500);
  });
});
