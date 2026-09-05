import { compilePayPeriod } from "@/compile/compile-pay-period";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { CheckoutNoteLine } from "@/import/parse-checkout";

function line(
  nickname: string,
  amount: number,
  extras: Partial<CheckoutNoteLine> = {}
): CheckoutNoteLine {
  return {
    nickname,
    amount,
    orderer: "",
    at: new Date("2026-07-15T20:00:00+08:00"),
    voided: false,
    ...extras,
  };
}

describe("compilePayPeriod rules", () => {
  it("does not add voided 業績注記 to 個人業績", () => {
    const shop = zhongshanJuly2026Shop();
    const result = compilePayPeriod({
      shop,
      checkoutLines: [line("粉冥", 1000), line("粉冥", 500, { voided: true })],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: true,
    });
    const fenMing = result.payRows.find(
      (row) => row.primaryNickname === "粉冥"
    );
    expect(fenMing?.original.sales).toBe(1000);
  });

  it("keeps saved 儲存值 when 重算 updates 原始數字", () => {
    const shop = zhongshanJuly2026Shop();
    const first = compilePayPeriod({
      shop,
      checkoutLines: [line("粉冥", 1000)],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: true,
    });
    const storedCommission = 1;
    const recounted = compilePayPeriod({
      shop,
      checkoutLines: [line("粉冥", 2000)],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: true,
      savedStored: {
        粉冥: { frontOfHouse: { commission: storedCommission } },
      },
    });
    const row = recounted.payRows.find(
      (item) => item.primaryNickname === "粉冥"
    );
    expect(row?.original.commission).toBe(400);
    expect(row?.stored.commission).toBe(storedCommission);
    expect(
      first.payRows.find((item) => item.primaryNickname === "粉冥")?.original
        .commission
    ).toBe(200);
  });

  it("does not let 未對上的點選 block 鎖定本期", () => {
    const shop = zhongshanJuly2026Shop();
    const result = compilePayPeriod({
      shop,
      checkoutLines: [line("粉冥", 1000)],
      punchPairs: [],
      noteClicks: [{ itemName: "修女貪杯", nickname: "不是店員", clicks: 3 }],
      noteOuterComplete: true,
    });
    expect(result.unmatchedClicks.length).toBe(1);
    expect(result.lockEligible).toBe(true);
  });

  it("attributes POS nickname to staff for the whole period", () => {
    const shop = zhongshanJuly2026Shop();
    const attributions = new Map([["幽靈暱稱", "粉冥"]]);
    const result = compilePayPeriod({
      shop,
      checkoutLines: [line("幽靈暱稱", 888)],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: true,
      periodNicknameAttributions: attributions,
    });
    const fenMing = result.payRows.find(
      (row) => row.primaryNickname === "粉冥"
    );
    expect(fenMing?.original.sales).toBe(888);
    expect(result.unmatchedNicknames).toEqual([]);
    expect(result.lockEligible).toBe(true);
  });

  it("computes ratio-based 勞健保 from basePay when carryOverMonthly", () => {
    const shop = zhongshanJuly2026Shop();
    shop.staff = shop.staff.map((person) =>
      person.primaryNickname === "空想"
        ? {
            ...person,
            laborHealthInsuranceMode: "ratio",
            laborHealthInsuranceRatio: 0.06689473684210526,
            laborHealthInsuranceAmount: 0,
            laborHealthInsuranceCarryOverMonthly: true,
          }
        : person
    );
    const result = compilePayPeriod({
      shop,
      checkoutLines: [line("空想", 1000)],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: true,
    });
    const row = result.payRows.find((item) => item.primaryNickname === "空想");
    expect(row?.original.basePay).toBe(38000);
    expect(row?.original.laborHealthInsurance).toBe(2542);
  });
});
