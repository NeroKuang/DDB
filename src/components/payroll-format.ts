import type {
  PayRow,
  PayRowOriginals,
  StaffKind,
  Venue,
} from "@/compile/types";

export function formatMoney(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatHours(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function venueLabel(venue: Venue): string {
  return venue === "backOfHouse" ? "內場" : "外場";
}

export function staffKindLabel(kind: StaffKind): string {
  return kind === "guest" ? "客座" : "正職";
}

export function isStoredOverride(original: number, stored: number): boolean {
  return original !== stored;
}

export type EditablePayField = keyof PayRowOriginals;

export const EDITABLE_PAY_FIELDS: {
  name: EditablePayField;
  header: string;
  kind: "hours" | "money";
}[] = [
  { name: "hours", header: "上班時數", kind: "hours" },
  { name: "basePay", header: "底薪", kind: "money" },
  { name: "sales", header: "營業額(不含服務費)", kind: "money" },
  { name: "commission", header: "業績獎金", kind: "money" },
  { name: "targetBonus", header: "達標獎金", kind: "money" },
  { name: "taskBonus", header: "任務獎金", kind: "money" },
  { name: "overtimeWithHoliday", header: "加班(含國定)", kind: "money" },
  { name: "overtimeWithoutHoliday", header: "加班(不含國定)", kind: "money" },
  { name: "allowance", header: "加給", kind: "money" },
  { name: "demerits", header: "記點", kind: "money" },
  { name: "repayment", header: "還款(預支薪水)", kind: "money" },
  { name: "deduction", header: "應扣", kind: "money" },
  { name: "photoCommission", header: "牆拍、贖罪券、特典抽成", kind: "money" },
  { name: "monthlyPay", header: "當月薪資", kind: "money" },
  { name: "laborHealthInsurance", header: "勞健保", kind: "money" },
  { name: "netPay", header: "應領薪資", kind: "money" },
];

export function defaultInputValue(original: number, stored: number): string {
  return isStoredOverride(original, stored) ? String(stored) : "";
}
