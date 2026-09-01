"use client";

import { useActionState } from "react";
import type { PayRow } from "@/compile/types";
import {
  savePayRowStoredAction,
  type PayRowStoredActionState,
} from "@/pay-row-stored/actions";

const initial: PayRowStoredActionState = { ok: false, message: "" };

const FIELDS: { name: keyof PayRow["stored"]; label: string }[] = [
  { name: "hours", label: "時數" },
  { name: "basePay", label: "底薪" },
  { name: "sales", label: "營業額" },
  { name: "commission", label: "業績獎金" },
  { name: "targetBonus", label: "達標獎金" },
  { name: "taskBonus", label: "任務獎金" },
  { name: "allowance", label: "加給" },
  { name: "demerits", label: "記點" },
  { name: "deduction", label: "應扣" },
  { name: "overtimeWithHoliday", label: "假日加班" },
  { name: "overtimeWithoutHoliday", label: "平日加班" },
  { name: "repayment", label: "還款" },
  { name: "photoCommission", label: "牆拍抽成" },
  { name: "laborHealthInsurance", label: "勞健保" },
  { name: "monthlyPay", label: "當月薪資" },
  { name: "netPay", label: "應領" },
];

function PayRowEditForm({
  storeId,
  staffId,
  row,
  locked,
}: {
  storeId: string;
  staffId: string;
  row: PayRow;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(
    savePayRowStoredAction,
    initial
  );
  const venueLabel = row.venue === "backOfHouse" ? "內場" : "外場";

  return (
    <details className="rounded border border-zinc-200 p-2 dark:border-zinc-700">
      <summary className="cursor-pointer text-sm">
        {row.primaryNickname}（{venueLabel}）— 編輯儲存值
      </summary>
      {locked ? (
        <p className="mt-2 text-xs text-zinc-500">本期已鎖定。</p>
      ) : (
        <form action={action} className="mt-2 space-y-2">
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="venue" value={row.venue} />
          <p className="text-xs text-zinc-500">
            留空表示不覆寫（跟隨重算後的原始數字）。目前顯示的是採用值。
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {FIELDS.map((field) => (
              <label key={field.name} className="flex flex-col gap-0.5 text-xs">
                {field.label}
                <input
                  name={field.name}
                  type="number"
                  step="any"
                  placeholder={String(row.original[field.name])}
                  defaultValue={
                    row.stored[field.name] !== row.original[field.name]
                      ? row.stored[field.name]
                      : ""
                  }
                  className="rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
                <span className="text-zinc-400">
                  原 {row.original[field.name]}
                </span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={pending || !staffId}
            className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "儲存中…" : "儲存儲存值"}
          </button>
          {state.message ? (
            <p
              role="status"
              className={state.ok ? "text-emerald-700" : "text-red-700"}
            >
              {state.message}
            </p>
          ) : null}
        </form>
      )}
    </details>
  );
}

export function PayRowStoredEditor({
  storeId,
  rows,
  staffIdByNickname,
  locked,
  isAdmin,
}: {
  storeId: string;
  rows: PayRow[];
  staffIdByNickname: Record<string, string>;
  locked: boolean;
  isAdmin: boolean;
}) {
  if (!isAdmin || rows.length === 0) {
    return null;
  }
  const enriched = rows.map((row) => ({
    ...row,
    staffId: staffIdByNickname[row.primaryNickname] ?? "",
  }));
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">薪資列儲存值</h2>
      <p className="text-xs text-zinc-500">
        覆寫採用值；重算本期只更新原始數字，已儲存的欄位維持不變。
      </p>
      <div className="space-y-1">
        {enriched.map((row) => (
          <PayRowEditForm
            key={`${row.primaryNickname}-${row.venue}`}
            storeId={storeId}
            staffId={row.staffId}
            row={row}
            locked={locked}
          />
        ))}
      </div>
    </section>
  );
}
