"use client";

import { useActionState } from "react";
import {
  lockPayPeriodAction,
  type PayPeriodActionState,
  unlockPayPeriodAction,
} from "@/pay-period/actions";

const initial: PayPeriodActionState = { ok: false, message: "" };

export function PayPeriodLockPanel({
  storeId,
  locked,
  lockEligible,
  isAdmin,
}: {
  storeId: string;
  locked: boolean;
  lockEligible: boolean;
  isAdmin: boolean;
}) {
  const [lockState, lockAction, lockPending] = useActionState(
    lockPayPeriodAction,
    initial
  );
  const [unlockState, unlockAction, unlockPending] = useActionState(
    unlockPayPeriodAction,
    initial
  );
  const statusMessage = lockState.message || unlockState.message;
  const statusOk = lockState.message ? lockState.ok : unlockState.ok;

  if (!isAdmin) {
    return locked ? (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        本期已鎖定，業績數字已凍結。
      </p>
    ) : null;
  }

  return (
    <section className="space-y-2 rounded border border-zinc-200 p-4 dark:border-zinc-700">
      <h2 className="text-base font-medium">鎖定本期</h2>
      {locked ? (
        <>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            已鎖定。personal
            業績面與本期薪資報表採用鎖定當下快照；解鎖後才可再改追加任務等。
          </p>
          <form action={unlockAction}>
            <input type="hidden" name="storeId" value={storeId} />
            <button
              type="submit"
              disabled={unlockPending}
              className="text-sm underline underline-offset-2 disabled:opacity-60"
            >
              {unlockPending ? "解鎖中…" : "解鎖本期"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            未對上的暱稱須清空且必要匯入齊全才可鎖定。鎖定後店員看到的業績不再隨匯入變動。
          </p>
          <form action={lockAction}>
            <input type="hidden" name="storeId" value={storeId} />
            <button
              type="submit"
              disabled={lockPending || !lockEligible}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {lockPending ? "鎖定中…" : "鎖定本期"}
            </button>
          </form>
          {!lockEligible ? (
            <p className="text-xs text-zinc-500">
              目前不可鎖定（未對上暱稱或必要匯入未齊）。
            </p>
          ) : null}
        </>
      )}
      {statusMessage ? (
        <p
          role="status"
          className={
            statusOk ? "text-sm text-emerald-700" : "text-sm text-red-700"
          }
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
