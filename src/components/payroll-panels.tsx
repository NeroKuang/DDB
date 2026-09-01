import Link from "next/link";
import type { PayRow, Venue } from "@/compile/types";

function formatMoney(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatHours(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function venueLabel(venue: Venue): string {
  return venue === "backOfHouse" ? "內場" : "外場";
}

function MoneyCell({ original, stored }: { original: number; stored: number }) {
  const same = original === stored;
  return (
    <span className="tabular-nums">
      {same ? (
        formatMoney(stored)
      ) : (
        <>
          <span className="block">{formatMoney(stored)}</span>
          <span className="block text-xs text-zinc-500">
            原始 {formatMoney(original)}
          </span>
        </>
      )}
    </span>
  );
}

function HoursCell({ original, stored }: { original: number; stored: number }) {
  if (original === stored) {
    return <span className="tabular-nums">{formatHours(stored)}</span>;
  }
  return (
    <span className="tabular-nums">
      <span className="block">{formatHours(stored)}</span>
      <span className="block text-xs text-zinc-500">
        原始 {formatHours(original)}
      </span>
    </span>
  );
}

/** Columns aligned with 薪資表匯出 named headers, plus 場別／任務獎金 for the web table. */
export function PayrollSummaryTable({ rows }: { rows: PayRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">本期沒有薪資列。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[96rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">職稱</th>
            <th className="py-2 pr-3 font-medium">本名</th>
            <th className="py-2 pr-3 font-medium">暱稱</th>
            <th className="py-2 pr-3 font-medium">場別</th>
            <th className="py-2 pr-3 font-medium">上班時數</th>
            <th className="py-2 pr-3 font-medium">底薪</th>
            <th className="py-2 pr-3 font-medium">營業額(不含服務費)</th>
            <th className="py-2 pr-3 font-medium">業績獎金</th>
            <th className="py-2 pr-3 font-medium">達標獎金</th>
            <th className="py-2 pr-3 font-medium">任務獎金</th>
            <th className="py-2 pr-3 font-medium">加班(含國定)</th>
            <th className="py-2 pr-3 font-medium">加班(不含國定)</th>
            <th className="py-2 pr-3 font-medium">加給</th>
            <th className="py-2 pr-3 font-medium">加給備註</th>
            <th className="py-2 pr-3 font-medium">記點</th>
            <th className="py-2 pr-3 font-medium">還款(預支薪水)</th>
            <th className="py-2 pr-3 font-medium">應扣</th>
            <th className="py-2 pr-3 font-medium">牆拍、贖罪券、特典抽成</th>
            <th className="py-2 pr-3 font-medium">當月薪資</th>
            <th className="py-2 pr-3 font-medium">勞健保</th>
            <th className="py-2 pr-3 font-medium">應領薪資</th>
            <th className="py-2 font-medium">發薪備註</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = `${row.primaryNickname}-${row.venue}`;
            const o = row.original;
            const s = row.stored;
            return (
              <tr key={key} className="border-b border-zinc-200 align-top">
                <td className="py-2 pr-3">{row.title || "—"}</td>
                <td className="py-2 pr-3">{row.legalName || "—"}</td>
                <td className="py-2 pr-3">
                  <Link
                    href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}`}
                    className="underline underline-offset-2"
                  >
                    {row.primaryNickname}
                  </Link>
                </td>
                <td className="py-2 pr-3">{venueLabel(row.venue)}</td>
                <td className="py-2 pr-3">
                  <HoursCell original={o.hours} stored={s.hours} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.basePay} stored={s.basePay} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.sales} stored={s.sales} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.commission} stored={s.commission} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.targetBonus} stored={s.targetBonus} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.taskBonus} stored={s.taskBonus} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={o.overtimeWithHoliday}
                    stored={s.overtimeWithHoliday}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={o.overtimeWithoutHoliday}
                    stored={s.overtimeWithoutHoliday}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.allowance} stored={s.allowance} />
                </td>
                <td className="max-w-[10rem] py-2 pr-3 text-xs text-zinc-600">
                  {row.allowanceNote || "—"}
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.demerits} stored={s.demerits} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.repayment} stored={s.repayment} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.deduction} stored={s.deduction} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={o.photoCommission}
                    stored={s.photoCommission}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.monthlyPay} stored={s.monthlyPay} />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={o.laborHealthInsurance}
                    stored={s.laborHealthInsurance}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell original={o.netPay} stored={s.netPay} />
                </td>
                <td className="max-w-[12rem] py-2 text-xs text-zinc-600">
                  {row.payNote || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
