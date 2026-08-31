import { isInPayPeriod, parseIchefDateTime } from "@/lib/business-day";
import { roundMoney } from "@/lib/money";
import { readFirstSheetRows } from "@/import/read-xlsx-sheet";

const NOTE_ITEM = /^(.+?)\s+\$([0-9]+(?:\.[0-9]+)?)$/;

export type CheckoutNoteLine = {
  nickname: string;
  amount: number;
  orderer: string;
  at: Date;
  voided: boolean;
};

export async function parseCheckoutFile(
  filePath: string,
  period: { start: Date; end: Date }
): Promise<CheckoutNoteLine[]> {
  const rows = await readFirstSheetRows(filePath);
  const header = rows[0] ?? [];
  const col = (name: string) => header.indexOf(name);
  const timeIdx = col("結帳時間");
  const statusIdx = col("目前概況");
  const itemsIdx = col("品項");
  const ordererIdx = col("訂購人");
  if (timeIdx < 0 || statusIdx < 0 || itemsIdx < 0 || ordererIdx < 0) {
    throw new Error("結帳／作廢檔缺少結帳時間、目前概況、品項或訂購人欄");
  }

  const lines: CheckoutNoteLine[] = [];
  for (const row of rows.slice(1)) {
    const at = parseIchefDateTime(row[timeIdx] ?? "");
    if (!at || !isInPayPeriod(at, period.start, period.end)) {
      continue;
    }
    const voided = (row[statusIdx] ?? "").includes("作廢");
    const ordererRaw = (row[ordererIdx] ?? "").trim();
    const orderer = ordererRaw === "--" ? "" : ordererRaw;
    const items = (row[itemsIdx] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const item of items) {
      const match = item.match(NOTE_ITEM);
      if (!match) {
        continue;
      }
      lines.push({
        nickname: match[1],
        amount: roundMoney(Number(match[2])),
        orderer,
        at,
        voided,
      });
    }
  }
  return lines;
}
