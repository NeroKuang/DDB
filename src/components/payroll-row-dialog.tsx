"use client";

import { useActionState, useEffect, useRef } from "react";
import type { PayRow } from "@/compile/types";
import {
  defaultInputValue,
  EDITABLE_PAY_FIELDS,
  formatHours,
  formatMoney,
  isStoredOverride,
  staffKindLabel,
  venueLabel,
} from "@/components/payroll-format";
import {
  savePayRowStoredAction,
  type PayRowStoredActionState,
} from "@/pay-row-stored/actions";

const initial: PayRowStoredActionState = { ok: false, message: "" };

const FIELD_GROUPS: {
  title: string;
  fields: (typeof EDITABLE_PAY_FIELDS)[number]["name"][];
}[] = [
  {
    title: "工時與底薪",
    fields: ["hours", "basePay"],
  },
  {
    title: "業績與獎金",
    fields: ["sales", "commission", "targetBonus", "taskBonus", "allowance"],
  },
  {
    title: "加班與其他",
    fields: [
      "overtimeWithHoliday",
      "overtimeWithoutHoliday",
      "repayment",
      "photoCommission",
    ],
  },
  {
    title: "扣款與合計",
    fields: [
      "demerits",
      "deduction",
      "monthlyPay",
      "laborHealthInsurance",
      "netPay",
    ],
  },
];

function ReadOnlyField({
  field,
  row,
}: {
  field: (typeof EDITABLE_PAY_FIELDS)[number];
  row: PayRow;
}) {
  const original = row.original[field.name];
  const stored = row.stored[field.name];
  const edited = isStoredOverride(original, stored);
  const fmt = field.kind === "hours" ? formatHours : formatMoney;
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2">
      <p className="text-xs text-muted">{field.header}</p>
      <p className="tabular-nums font-medium">{fmt(stored)}</p>
      {edited ? (
        <p className="text-xs text-muted">原始 {fmt(original)}</p>
      ) : null}
    </div>
  );
}

function EditForm({
  storeId,
  periodKey,
  staffId,
  row,
  onSaved,
}: {
  storeId: string;
  periodKey: string;
  staffId: string;
  row: PayRow;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(
    savePayRowStoredAction,
    initial
  );
  const prevOk = useRef(false);

  useEffect(() => {
    if (state.ok && !prevOk.current) {
      prevOk.current = true;
      onSaved?.();
    }
    if (!state.ok) {
      prevOk.current = false;
    }
  }, [state.ok, onSaved]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="periodKey" value={periodKey} />
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="venue" value={row.venue} />
      <p className="text-xs text-muted">
        留空表示跟隨原始編成數字。有填寫的欄位會寫入儲存值。
      </p>
      {FIELD_GROUPS.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-sm font-medium">{group.title}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {EDITABLE_PAY_FIELDS.filter((field) =>
              group.fields.includes(field.name)
            ).map((field) => {
              const original = row.original[field.name];
              const stored = row.stored[field.name];
              return (
                <label
                  key={field.name}
                  className="flex flex-col gap-0.5 text-xs"
                >
                  {field.header}
                  <input
                    name={field.name}
                    type="number"
                    step="any"
                    className="field-input"
                    placeholder={String(original)}
                    defaultValue={defaultInputValue(original, stored)}
                  />
                  <span className="text-muted">
                    原{" "}
                    {field.kind === "hours"
                      ? formatHours(original)
                      : formatMoney(original)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
      {(row.allowanceNote || row.payNote) && (
        <section className="space-y-1 text-xs text-muted">
          {row.allowanceNote ? <p>加給備註：{row.allowanceNote}</p> : null}
          {row.payNote ? <p>發薪備註：{row.payNote}</p> : null}
        </section>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <button
          type="submit"
          disabled={pending || !staffId}
          className="btn-primary"
        >
          {pending ? "儲存中…" : "儲存儲存值"}
        </button>
        {!staffId ? (
          <p className="text-xs text-[var(--danger)]">
            缺少 staffId，無法儲存。
          </p>
        ) : null}
        {state.message ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function PayRowDialog({
  row,
  open,
  editable,
  storeId,
  periodKey,
  staffId,
  onClose,
  onSaved,
}: {
  row: PayRow | null;
  open: boolean;
  editable: boolean;
  storeId: string;
  periodKey: string;
  staffId: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && row) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, row]);

  if (!row) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="payroll-dialog"
      onClose={onClose}
      aria-labelledby="payroll-dialog-title"
    >
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="payroll-dialog-title" className="font-display text-xl">
              {row.primaryNickname}
            </h2>
            <p className="text-sm text-muted">
              {row.legalName || "—"} · {row.title || "—"} ·{" "}
              {venueLabel(row.venue)} · {staffKindLabel(row.kind)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-2 py-1 text-xs"
            aria-label="關閉"
          >
            關閉
          </button>
        </header>

        {editable ? (
          <EditForm
            key={`${row.primaryNickname}-${row.venue}`}
            storeId={storeId}
            periodKey={periodKey}
            staffId={staffId}
            row={row}
            onSaved={onSaved}
          />
        ) : (
          <div className="space-y-4">
            {FIELD_GROUPS.map((group) => (
              <section key={group.title} className="space-y-2">
                <h3 className="text-sm font-medium">{group.title}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {EDITABLE_PAY_FIELDS.filter((field) =>
                    group.fields.includes(field.name)
                  ).map((field) => (
                    <ReadOnlyField key={field.name} field={field} row={row} />
                  ))}
                </div>
              </section>
            ))}
            {(row.allowanceNote || row.payNote) && (
              <section className="space-y-1 text-xs text-muted">
                {row.allowanceNote ? (
                  <p>加給備註：{row.allowanceNote}</p>
                ) : null}
                {row.payNote ? <p>發薪備註：{row.payNote}</p> : null}
              </section>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
