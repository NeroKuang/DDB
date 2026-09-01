"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { PayRow } from "@/compile/types";
import {
  defaultInputValue,
  EDITABLE_PAY_FIELDS,
  formatHours,
  formatMoney,
  isStoredOverride,
  venueLabel,
} from "@/components/payroll-format";
import {
  savePayRowStoredAction,
  type PayRowStoredActionState,
} from "@/pay-row-stored/actions";

const initial: PayRowStoredActionState = { ok: false, message: "" };

function ReadOnlyCell({
  original,
  stored,
  kind,
}: {
  original: number;
  stored: number;
  kind: "hours" | "money";
}) {
  const fmt = kind === "hours" ? formatHours : formatMoney;
  const same = !isStoredOverride(original, stored);
  return (
    <span className="tabular-nums">
      {same ? (
        fmt(stored)
      ) : (
        <>
          <span className="block">{fmt(stored)}</span>
          <span className="block text-xs opacity-70">原 {fmt(original)}</span>
        </>
      )}
    </span>
  );
}

function EditableRow({
  storeId,
  staffId,
  row,
}: {
  storeId: string;
  staffId: string;
  row: PayRow;
}) {
  const formId = `payrow-${row.primaryNickname}-${row.venue}`;
  const [state, action, pending] = useActionState(
    savePayRowStoredAction,
    initial
  );

  return (
    <>
      <tr className="border-b border-[var(--border)] align-top">
        <td>{row.title || "—"}</td>
        <td>{row.legalName || "—"}</td>
        <td>
          <Link
            href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}`}
            className="text-link"
          >
            {row.primaryNickname}
          </Link>
        </td>
        <td>{venueLabel(row.venue)}</td>
        {EDITABLE_PAY_FIELDS.map((field) => {
          const original = row.original[field.name];
          const stored = row.stored[field.name];
          const edited = isStoredOverride(original, stored);
          return (
            <td key={field.name} className={edited ? "cell-edited" : undefined}>
              <input
                form={formId}
                name={field.name}
                type="number"
                step="any"
                className="inline-cell-input"
                placeholder={String(original)}
                defaultValue={defaultInputValue(original, stored)}
                aria-label={`${row.primaryNickname} ${field.header}`}
              />
              <span className="mt-0.5 block text-xs opacity-60">
                原{" "}
                {field.kind === "hours"
                  ? formatHours(original)
                  : formatMoney(original)}
              </span>
            </td>
          );
        })}
        <td className="max-w-[10rem] text-xs opacity-80">
          {row.allowanceNote || "—"}
        </td>
        <td className="max-w-[12rem] text-xs opacity-80">
          {row.payNote || "—"}
        </td>
        <td className="sticky right-0 bg-[var(--surface)]">
          <form id={formId} action={action} className="space-y-1">
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="staffId" value={staffId} />
            <input type="hidden" name="venue" value={row.venue} />
            <button
              type="submit"
              disabled={pending || !staffId}
              className="whitespace-nowrap rounded bg-[var(--accent)] px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              {pending ? "…" : "儲存"}
            </button>
            {state.message ? (
              <p
                role="status"
                className={`max-w-[8rem] text-xs ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
              >
                {state.message}
              </p>
            ) : null}
            {!staffId ? (
              <p className="text-xs text-[var(--danger)]">缺 staffId</p>
            ) : null}
          </form>
        </td>
      </tr>
    </>
  );
}

function ReadOnlyRow({ row }: { row: PayRow }) {
  return (
    <tr className="border-b border-[var(--border)] align-top">
      <td>{row.title || "—"}</td>
      <td>{row.legalName || "—"}</td>
      <td>
        <Link
          href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}`}
          className="text-link"
        >
          {row.primaryNickname}
        </Link>
      </td>
      <td>{venueLabel(row.venue)}</td>
      {EDITABLE_PAY_FIELDS.map((field) => (
        <td key={field.name}>
          <ReadOnlyCell
            original={row.original[field.name]}
            stored={row.stored[field.name]}
            kind={field.kind}
          />
        </td>
      ))}
      <td className="max-w-[10rem] text-xs opacity-80">
        {row.allowanceNote || "—"}
      </td>
      <td className="max-w-[12rem] text-xs opacity-80">{row.payNote || "—"}</td>
    </tr>
  );
}

/** 薪資表：Admin 未鎖定時直接在列內編輯儲存值。 */
export function PayrollEditableTable({
  storeId,
  rows,
  staffIdByNickname,
  editable,
}: {
  storeId: string;
  rows: PayRow[];
  staffIdByNickname: Record<string, string>;
  editable: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm opacity-70">本期沒有薪資列。</p>;
  }

  return (
    <div className="space-y-2">
      {editable ? (
        <p className="text-xs opacity-70">
          直接在表格內修改採用值；留空表示跟隨原始數字。修改後按該列「儲存」。
        </p>
      ) : null}
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
              {editable ? (
                <th className="sticky right-0 bg-[var(--surface-muted)]">
                  操作
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              editable ? (
                <EditableRow
                  key={`${row.primaryNickname}-${row.venue}`}
                  storeId={storeId}
                  staffId={staffIdByNickname[row.primaryNickname] ?? ""}
                  row={row}
                />
              ) : (
                <ReadOnlyRow
                  key={`${row.primaryNickname}-${row.venue}`}
                  row={row}
                />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
