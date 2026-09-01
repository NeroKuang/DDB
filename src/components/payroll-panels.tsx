import Link from "next/link";
import type { PayRow, Venue } from "@/compile/types";
import {
  EDITABLE_PAY_FIELDS,
  formatHours,
  formatMoney,
  venueLabel,
} from "@/components/payroll-format";

function MoneyCell({ original, stored }: { original: number; stored: number }) {
  const same = original === stored;
  return (
    <span className="tabular-nums">
      {same ? (
        formatMoney(stored)
      ) : (
        <>
          <span className="block">{formatMoney(stored)}</span>
          <span className="block text-xs opacity-70">
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
      <span className="block text-xs opacity-70">
        原始 {formatHours(original)}
      </span>
    </span>
  );
}

/** Read-only 薪資表（匯出對齊用）。 */
export function PayrollSummaryTable({ rows }: { rows: PayRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm opacity-70">本期沒有薪資列。</p>;
  }

  return (
    <div className="card-surface overflow-x-auto">
      <table className="table-compact w-full min-w-[96rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th>職稱</th>
            <th>本名</th>
            <th>暱稱</th>
            <th>場別</th>
            {EDITABLE_PAY_FIELDS.map((field) => (
              <th key={field.name}>{field.header}</th>
            ))}
            <th>加給備註</th>
            <th>發薪備註</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = `${row.primaryNickname}-${row.venue}`;
            const o = row.original;
            const s = row.stored;
            return (
              <tr
                key={key}
                className="border-b border-[var(--border)] align-top"
              >
                <td>{row.title || "—"}</td>
                <td>{row.legalName || "—"}</td>
                <td>
                  <Link
                    href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}`}
                    className="text-[var(--accent)] underline underline-offset-2"
                  >
                    {row.primaryNickname}
                  </Link>
                </td>
                <td>{venueLabel(row.venue)}</td>
                {EDITABLE_PAY_FIELDS.map((field) => (
                  <td key={field.name}>
                    {field.kind === "hours" ? (
                      <HoursCell original={o.hours} stored={s.hours} />
                    ) : (
                      <MoneyCell
                        original={o[field.name]}
                        stored={s[field.name]}
                      />
                    )}
                  </td>
                ))}
                <td className="max-w-[10rem] text-xs opacity-80">
                  {row.allowanceNote || "—"}
                </td>
                <td className="max-w-[12rem] text-xs opacity-80">
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
