import { readFileSync } from "fs";
import type { Venue } from "@/compile/types";

export type NamedSalaryCsvRow = {
  title: string;
  legalName: string;
  primaryNickname: string;
  venue: Venue;
  hours: number;
  basePay: number;
  sales: number;
  commission: number;
  targetBonus: number;
  overtimeWithHoliday: number;
  overtimeWithoutHoliday: number;
  allowance: number;
  allowanceNote: string;
  demerits: number;
  repayment: number;
  deduction: number;
  photoCommission: number;
  monthlyPay: number;
  laborHealthInsurance: number;
  netPay: number;
  payNote: string;
};

function num(raw: string | undefined): number {
  const t = (raw ?? "").trim();
  if (t === "" || t === "--") {
    return 0;
  }
  const n = Number(t.replace(/%$/, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseNamedSalaryCsv(filePath: string): NamedSalaryCsvRow[] {
  const text = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const rows: NamedSalaryCsvRow[] = [];
  const seen = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const legalName = (cols[1] ?? "").trim();
    const primaryNickname = (cols[2] ?? "").trim();
    if (!primaryNickname && !legalName) {
      continue;
    }
    if (!primaryNickname && Number(cols[0]) > 0 && !legalName) {
      continue;
    }
    if (!primaryNickname) {
      continue;
    }
    const count = seen.get(primaryNickname) ?? 0;
    seen.set(primaryNickname, count + 1);
    rows.push({
      title: (cols[0] ?? "").trim(),
      legalName,
      primaryNickname,
      venue: count === 0 ? "frontOfHouse" : "backOfHouse",
      hours: num(cols[3]),
      basePay: num(cols[4]),
      sales: num(cols[5]),
      commission: num(cols[6]),
      targetBonus: num(cols[7]),
      overtimeWithHoliday: num(cols[8]),
      overtimeWithoutHoliday: num(cols[9]),
      allowance: num(cols[13]),
      allowanceNote: (cols[14] ?? "").trim(),
      demerits: num(cols[15]),
      repayment: num(cols[16]),
      deduction: num(cols[17]),
      photoCommission: num(cols[19]),
      monthlyPay: num(cols[20]),
      laborHealthInsurance: num(cols[21]),
      netPay: num(cols[22]),
      payNote: (cols[23] ?? "").trim(),
    });
  }
  return rows;
}

export const NAMED_EXPORT_HEADERS = [
  "職稱",
  "本名",
  "暱稱",
  "上班時數",
  "底薪",
  "營業額(不含服務費)",
  "業績獎金",
  "達標獎金",
  "加班(含國定)",
  "加班(不含國定)",
  "加給",
  "加給備註",
  "記點",
  "還款(預支薪水)",
  "應扣",
  "牆拍、贖罪券、特典抽成",
  "當月薪資",
  "勞健保",
  "應領薪資",
  "發薪備註",
] as const;
