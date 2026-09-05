import { computeLaborHealthInsurance } from "@/lib/labor-health-insurance";

describe("computeLaborHealthInsurance", () => {
  it("uses fixed amount when carryOverMonthly and mode fixed", () => {
    expect(
      computeLaborHealthInsurance(
        { mode: "fixed", amount: 2100, ratio: 0, carryOverMonthly: true },
        undefined,
        50000
      )
    ).toBe(2100);
  });

  it("uses basePay × ratio when carryOverMonthly and mode ratio", () => {
    expect(
      computeLaborHealthInsurance(
        { mode: "ratio", amount: 0, ratio: 0.05, carryOverMonthly: true },
        undefined,
        42000
      )
    ).toBe(2100);
  });

  it("uses period override fixed when not carryOverMonthly", () => {
    expect(
      computeLaborHealthInsurance(
        { mode: "fixed", amount: 9999, ratio: 0, carryOverMonthly: false },
        { mode: "fixed", amount: 1500, ratio: 0 },
        42000
      )
    ).toBe(1500);
  });

  it("uses period override ratio when not carryOverMonthly", () => {
    expect(
      computeLaborHealthInsurance(
        { mode: "fixed", amount: 9999, ratio: 0, carryOverMonthly: false },
        { mode: "ratio", amount: 0, ratio: 0.1 },
        38000
      )
    ).toBe(3800);
  });

  it("defaults period override to zero fixed when not carryOverMonthly and no override", () => {
    expect(
      computeLaborHealthInsurance(
        { mode: "ratio", amount: 0, ratio: 0.05, carryOverMonthly: false },
        undefined,
        40000
      )
    ).toBe(0);
  });
});
