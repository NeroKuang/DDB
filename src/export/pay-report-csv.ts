import type { PayRow } from "@/compile/types";
import { NAMED_EXPORT_HEADERS } from "@/import/parse-named-salary-csv";
import { roundMoney } from "@/lib/money";

function cell(value: string | number): string {
  if (typeof value === "number") {
    return String(roundMoney(value));
  }
  return value;
}

export function payRowsToNamedCsv(rows: PayRow[]): string {
  const lines = [
    NAMED_EXPORT_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.title,
        row.legalName,
        row.primaryNickname,
        cell(row.stored.hours),
        cell(row.stored.basePay),
        cell(row.stored.sales),
        cell(row.stored.commission),
        cell(row.stored.targetBonus),
        cell(row.stored.overtimeWithHoliday),
        cell(row.stored.overtimeWithoutHoliday),
        cell(row.stored.allowance),
        row.allowanceNote,
        cell(row.stored.demerits),
        cell(row.stored.repayment),
        cell(row.stored.deduction),
        cell(row.stored.photoCommission),
        cell(row.stored.monthlyPay),
        cell(row.stored.laborHealthInsurance),
        cell(row.stored.netPay),
        row.payNote,
      ].join(",")
    ),
  ];
  return `\uFEFF${lines.join("\n")}\n`;
}
