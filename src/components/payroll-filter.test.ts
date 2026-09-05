import { describe, expect, it } from "vitest";
import type { PayRow } from "@/compile/types";
import {
  filterPayRows,
  rowHasStoredOverride,
} from "@/components/payroll-filter";

function sampleRow(overrides: Partial<PayRow> = {}): PayRow {
  const base: PayRow = {
    legalName: "何思蓉",
    primaryNickname: "祤晞",
    title: "店長",
    kind: "regular",
    venue: "frontOfHouse",
    payNote: "",
    allowanceNote: "",
    original: {
      hours: 65.5,
      basePay: 15410,
      sales: 51040,
      commission: 10208,
      targetBonus: 8000,
      taskBonus: 0,
      allowance: 10000,
      demerits: 6,
      deduction: 1380,
      overtimeWithHoliday: 0,
      overtimeWithoutHoliday: 0,
      repayment: 0,
      photoCommission: 0,
      laborHealthInsurance: 2100,
      monthlyPay: 43618,
      netPay: 41518,
    },
    stored: {
      hours: 65.5,
      basePay: 15410,
      sales: 51040,
      commission: 10208,
      targetBonus: 8000,
      taskBonus: 0,
      allowance: 10000,
      demerits: 6,
      deduction: 1380,
      overtimeWithHoliday: 0,
      overtimeWithoutHoliday: 0,
      repayment: 0,
      photoCommission: 0,
      laborHealthInsurance: 2100,
      monthlyPay: 43618,
      netPay: 41518,
    },
  };
  return { ...base, ...overrides };
}

describe("payroll-filter", () => {
  it("filters by venue, kind, title, and query", () => {
    const rows = [
      sampleRow(),
      sampleRow({
        primaryNickname: "小楓",
        legalName: "客座",
        title: "客座",
        kind: "guest",
        venue: "backOfHouse",
      }),
    ];
    const filtered = filterPayRows(rows, {
      query: "小楓",
      venue: "backOfHouse",
      kind: "guest",
      titles: ["客座"],
      overrideOnly: "all",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.primaryNickname).toBe("小楓");
  });

  it("detects stored overrides", () => {
    const row = sampleRow({
      stored: {
        ...sampleRow().stored,
        netPay: 40000,
      },
    });
    expect(rowHasStoredOverride(row)).toBe(true);
  });
});
