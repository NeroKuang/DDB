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

export function PayrollSummaryTable({ rows }: { rows: PayRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">本期沒有薪資列。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">暱稱</th>
            <th className="py-2 pr-3 font-medium">本名</th>
            <th className="py-2 pr-3 font-medium">場別</th>
            <th className="py-2 pr-3 font-medium">上班時數</th>
            <th className="py-2 pr-3 font-medium">底薪</th>
            <th className="py-2 pr-3 font-medium">營業額</th>
            <th className="py-2 pr-3 font-medium">業績獎金</th>
            <th className="py-2 pr-3 font-medium">達標</th>
            <th className="py-2 pr-3 font-medium">任務</th>
            <th className="py-2 pr-3 font-medium">當月薪資</th>
            <th className="py-2 font-medium">應領</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = `${row.primaryNickname}-${row.venue}`;
            return (
              <tr key={key} className="border-b border-zinc-200 align-top">
                <td className="py-2 pr-3">
                  <Link
                    href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}`}
                    className="underline underline-offset-2"
                  >
                    {row.primaryNickname}
                  </Link>
                </td>
                <td className="py-2 pr-3">{row.legalName || "—"}</td>
                <td className="py-2 pr-3">{venueLabel(row.venue)}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {row.original.hours === row.stored.hours ? (
                    formatHours(row.stored.hours)
                  ) : (
                    <>
                      <span className="block">
                        {formatHours(row.stored.hours)}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        原始 {formatHours(row.original.hours)}
                      </span>
                    </>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={row.original.basePay}
                    stored={row.stored.basePay}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={row.original.sales}
                    stored={row.stored.sales}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={row.original.commission}
                    stored={row.stored.commission}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={row.original.targetBonus}
                    stored={row.stored.targetBonus}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={row.original.taskBonus}
                    stored={row.stored.taskBonus}
                  />
                </td>
                <td className="py-2 pr-3">
                  <MoneyCell
                    original={row.original.monthlyPay}
                    stored={row.stored.monthlyPay}
                  />
                </td>
                <td className="py-2">
                  <MoneyCell
                    original={row.original.netPay}
                    stored={row.stored.netPay}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
