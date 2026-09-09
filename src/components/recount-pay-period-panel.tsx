"use client";

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActionStatus } from "@/components/action-status";
import { DialogCloseButton } from "@/components/dialog-close-button";
import { DialogShellChrome } from "@/components/cathedral-ornament";
import {
  EDITABLE_PAY_FIELDS,
  formatMoney,
  venueLabel,
} from "@/components/payroll-format";
import {
  recountPayPeriodAction,
  type RecountActionState,
} from "@/payroll/recount-actions";
import {
  storedOverrideKey,
  type StoredOverrideCell,
} from "@/pay-row-stored/manage";

const initial: RecountActionState = { ok: false, message: "" };

function fieldLabel(field: StoredOverrideCell["field"]): string {
  return (
    EDITABLE_PAY_FIELDS.find((item) => item.name === field)?.header ?? field
  );
}

export function RecountPayPeriodPanel({
  storeId,
  periodKey,
  locked,
  isAdmin,
  overrides,
  label = "重算本期",
  hint,
  variant = "link",
}: {
  storeId: string;
  periodKey: string;
  locked: boolean;
  isAdmin: boolean;
  /** Current period stored-value overrides (person × field). */
  overrides: StoredOverrideCell[];
  /** Button label; period-staff uses「重算當月薪資」. */
  label?: string;
  hint?: string;
  variant?: "link" | "button";
}) {
  const [state, action, pending] = useActionState(
    recountPayPeriodAction,
    initial
  );
  const [open, setOpen] = useState(false);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const allKeys = useMemo(
    () => overrides.map((cell) => storedOverrideKey(cell)),
    [overrides]
  );
  const [kept, setKept] = useState<Set<string>>(() => new Set(allKeys));
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setKept(new Set(allKeys));
    setClearAllConfirm(false);
  }, [allKeys, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setClearAllConfirm(false);
    }
  }, [state.ok, state.message]);

  if (!isAdmin) {
    return null;
  }

  if (locked) {
    return hint ? (
      <p className="text-sm text-muted">本期已鎖定，無法重算薪資原始數字。</p>
    ) : null;
  }

  const buttonClass =
    variant === "button"
      ? "rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      : "text-sm underline underline-offset-2 disabled:opacity-60";

  function startRecount() {
    if (overrides.length === 0) {
      formRef.current?.requestSubmit();
      return;
    }
    setOpen(true);
  }

  return (
    <div className="space-y-2">
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}

      {/* No-override / keep-all direct path */}
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="periodKey" value={periodKey} />
        <input type="hidden" name="retainMode" value="keep-all" />
      </form>

      <button
        type="button"
        disabled={pending}
        className={buttonClass}
        onClick={startRecount}
      >
        {pending ? "重算中…" : label}
      </button>
      {state.message && !open ? (
        <ActionStatus ok={state.ok} message={state.message} />
      ) : null}

      <dialog
        ref={dialogRef}
        className="payroll-dialog max-w-3xl"
        onClose={() => {
          setOpen(false);
          setClearAllConfirm(false);
        }}
        aria-labelledby={titleId}
      >
        <DialogShellChrome>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="section-title font-display">
                重算前選擇要保留的儲存值
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                勾選＝重算後仍保留該人×欄的手改儲存值；取消勾選＝刪除該覆寫，之後跟著新的原始數字。預設全保留。
              </p>
            </div>
            <DialogCloseButton
              onClick={() => {
                setOpen(false);
                setClearAllConfirm(false);
              }}
            />
          </header>

          <form action={action} className="space-y-4">
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="periodKey" value={periodKey} />
            <input type="hidden" name="retainMode" value="select" />
            {[...kept].map((key) => (
              <input key={key} type="hidden" name="keep" value={key} />
            ))}

            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                className="btn-secondary px-2.5 py-1 text-xs"
                onClick={() => {
                  setKept(new Set(allKeys));
                  setClearAllConfirm(false);
                }}
              >
                全保留
              </button>
              <button
                type="button"
                className="btn-secondary px-2.5 py-1 text-xs"
                onClick={() => {
                  if (!clearAllConfirm) {
                    setClearAllConfirm(true);
                    return;
                  }
                  setKept(new Set());
                  setClearAllConfirm(false);
                }}
              >
                {clearAllConfirm
                  ? "再按一次：確定清除全部手改儲存值"
                  : "全部打回原始"}
              </button>
            </div>
            {clearAllConfirm ? (
              <p
                className="text-xs text-amber-700 dark:text-amber-300"
                role="status"
              >
                將清除本期全部已存儲存值覆寫。再按一次「確定清除…」套用，或按「全保留」取消。
              </p>
            ) : null}

            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-2 pr-2 font-medium">保留</th>
                    <th className="py-2 pr-2 font-medium">店員</th>
                    <th className="py-2 pr-2 font-medium">場別</th>
                    <th className="py-2 pr-2 font-medium">欄位</th>
                    <th className="py-2 font-medium">儲存值</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map((cell) => {
                    const key = storedOverrideKey(cell);
                    const checked = kept.has(key);
                    return (
                      <tr key={key} className="border-b border-[var(--border)]">
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setClearAllConfirm(false);
                              setKept((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) {
                                  next.add(key);
                                } else {
                                  next.delete(key);
                                }
                                return next;
                              });
                            }}
                            aria-label={`保留 ${cell.primaryNickname} ${fieldLabel(cell.field)}`}
                          />
                        </td>
                        <td className="py-2 pr-2">{cell.primaryNickname}</td>
                        <td className="py-2 pr-2">{venueLabel(cell.venue)}</td>
                        <td className="py-2 pr-2">{fieldLabel(cell.field)}</td>
                        <td className="py-2 tabular-nums">
                          {formatMoney(cell.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending
                  ? "重算中…"
                  : kept.size === 0
                    ? "清除全部覆寫並重算"
                    : kept.size === allKeys.length
                      ? "全保留並重算"
                      : `保留 ${kept.size} 筆並重算`}
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-sm"
                onClick={() => {
                  setOpen(false);
                  setClearAllConfirm(false);
                }}
              >
                取消
              </button>
            </div>
            {state.message ? (
              <ActionStatus ok={state.ok} message={state.message} />
            ) : null}
          </form>
        </DialogShellChrome>
      </dialog>
    </div>
  );
}
