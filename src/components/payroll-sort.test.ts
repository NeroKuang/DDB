import { describe, expect, it } from "vitest";
import type { PayRow } from "@/compile/types";
import { sortPayRows } from "@/components/payroll-sort";

function row(partial: {
  primaryNickname: string;
  sales?: number;
  netPay?: number;
}): PayRow {
  const stored = {
    hours: 10,
    basePay: 0,
    sales: partial.sales ?? 0,
    commission: 0,
    targetBonus: 0,
    taskBonus: 0,
    allowance: 0,
    demerits: 0,
    deduction: 0,
    overtimeWithHoliday: 0,
    overtimeWithoutHoliday: 0,
    repayment: 0,
    photoCommission: 0,
    laborHealthInsurance: 0,
    monthlyPay: 0,
    netPay: partial.netPay ?? 0,
  };
  return {
    legalName: "",
    primaryNickname: partial.primaryNickname,
    title: "",
    kind: "regular",
    venue: "frontOfHouse",
    payNote: "",
    allowanceNote: "",
    original: stored,
    stored,
  };
}

describe("sortPayRows", () => {
  it("sorts by sales descending on first click key", () => {
    const rows = [
      row({ primaryNickname: "A", sales: 100 }),
      row({ primaryNickname: "B", sales: 500 }),
    ];
    const sorted = sortPayRows(rows, { key: "sales", direction: "desc" });
    expect(sorted.map((item) => item.primaryNickname)).toEqual(["B", "A"]);
  });

  it("sorts nicknames with zh locale", () => {
    const rows = [
      row({ primaryNickname: "粉冥" }),
      row({ primaryNickname: "乙醚" }),
    ];
    const sorted = sortPayRows(rows, {
      key: "primaryNickname",
      direction: "asc",
    });
    expect(sorted[0]?.primaryNickname).toBe("乙醚");
  });
});
