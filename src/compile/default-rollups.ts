import type { Rollup } from "@/compile/types";

/** Built-in salary line rollups (shop overrides merge on top). */
export const DEFAULT_ROLLUPS: Record<string, Rollup> = {
  basePay: "addToMonthlyPay",
  commission: "addToMonthlyPay",
  targetBonus: "addToMonthlyPay",
  taskBonus: "addToMonthlyPay",
  allowance: "addToMonthlyPay",
  deduction: "subtractFromNetPay",
  laborHealthInsurance: "subtractFromNetPay",
  overtimeWithHoliday: "none",
  overtimeWithoutHoliday: "none",
  repayment: "none",
  photoCommission: "none",
};

export const BUILTIN_ROLLUP_FIELD_KEYS = [
  "basePay",
  "commission",
  "targetBonus",
  "taskBonus",
  "allowance",
  "deduction",
  "laborHealthInsurance",
  "overtimeWithHoliday",
  "overtimeWithoutHoliday",
  "repayment",
  "photoCommission",
] as const;

export type BuiltinRollupFieldKey = (typeof BUILTIN_ROLLUP_FIELD_KEYS)[number];

export const ROLLUP_LABELS: Record<Rollup, string> = {
  none: "不進加總",
  addToMonthlyPay: "加入當月薪資",
  addToNetPay: "加入應領",
  subtractFromNetPay: "從應領扣除",
};

export const BUILTIN_FIELD_LABELS: Record<BuiltinRollupFieldKey, string> = {
  basePay: "底薪",
  commission: "業績獎金",
  targetBonus: "達標獎金",
  taskBonus: "任務獎金",
  allowance: "加給",
  deduction: "應扣",
  laborHealthInsurance: "勞健保",
  overtimeWithHoliday: "加班(含國定)",
  overtimeWithoutHoliday: "加班(不含國定)",
  repayment: "還款(預支薪水)",
  photoCommission: "牆拍、贖罪券、特典抽成",
};
