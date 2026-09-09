import { describe, expect, it } from "vitest";
import { parseMoneyFormField } from "@/lib/parse-money-field";

describe("parseMoneyFormField", () => {
  it("treats empty as 0 so payKind can save without retyping amount", () => {
    expect(parseMoneyFormField("", "時薪")).toBe(0);
    expect(parseMoneyFormField("   ", "月薪")).toBe(0);
    expect(parseMoneyFormField(null, "時薪")).toBe(0);
  });

  it("parses plain and comma-grouped amounts", () => {
    expect(parseMoneyFormField("230", "時薪")).toBe(230);
    expect(parseMoneyFormField("42,000", "月薪")).toBe(42000);
  });

  it("rejects non-numeric and negative values", () => {
    expect(() => parseMoneyFormField("abc", "時薪")).toThrow(/時薪須為數字/);
    expect(() => parseMoneyFormField("-1", "月薪")).toThrow(/月薪不可為負/);
  });
});
