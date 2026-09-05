import {
  DEFAULT_COMMISSION_RATE,
  effectiveCommissionRate,
  parseCommissionRateField,
} from "@/lib/commission-rate";

describe("commission rate defaults", () => {
  it("defaults empty form field to 20%", () => {
    expect(parseCommissionRateField(null)).toBe(DEFAULT_COMMISSION_RATE);
    expect(parseCommissionRateField("")).toBe(DEFAULT_COMMISSION_RATE);
  });

  it("parses explicit rates", () => {
    expect(parseCommissionRateField("0.15")).toBe(0.15);
    expect(parseCommissionRateField("0")).toBe(0);
  });

  it("treats legacy zero as default at compile time", () => {
    expect(effectiveCommissionRate(0)).toBe(DEFAULT_COMMISSION_RATE);
    expect(effectiveCommissionRate(0.2)).toBe(0.2);
  });
});
