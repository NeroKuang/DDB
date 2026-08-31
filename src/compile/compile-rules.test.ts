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
});
