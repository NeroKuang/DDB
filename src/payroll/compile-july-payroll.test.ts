import { describe, expect, it } from "vitest";
import { compileJuly2026Payroll } from "@/payroll/compile-july-payroll";
import { roundMoney } from "@/lib/money";

describe("compileJuly2026Payroll", () => {
  it("computes 時薪制 原始底薪 as 時薪 × 該列上班時數 for 粉冥", async () => {
    const { result, shop } = await compileJuly2026Payroll();
    const fenMing = result.payRows.find(
      (row) => row.primaryNickname === "粉冥" && row.venue === "frontOfHouse"
    );
    const master = shop.staff.find(
      (person) => person.primaryNickname === "粉冥"
    );
    expect(fenMing).toBeTruthy();
    expect(master?.payKind).toBe("hourly");
    expect(master?.hourlyRate).toBe(230);
    expect(fenMing!.original.sales).toBe(75685);
    expect(fenMing!.original.hours).toBeGreaterThan(0);
    expect(fenMing!.original.basePay).toBe(
      roundMoney(master!.hourlyRate * fenMing!.original.hours)
    );
  });

  it("uses 月薪 as 原始底薪 for 湯圓 on 外場", async () => {
    const { result } = await compileJuly2026Payroll();
    const tangYuan = result.payRows.find(
      (row) => row.primaryNickname === "湯圓" && row.venue === "frontOfHouse"
    );
    expect(tangYuan?.original.basePay).toBe(42000);
  });
});
