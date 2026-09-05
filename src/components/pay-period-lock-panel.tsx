"use client";

import { useActionState } from "react";
import { ActionStatus } from "@/components/action-status";
import {
  lockPayPeriodAction,
  type PayPeriodActionState,
  unlockPayPeriodAction,
} from "@/pay-period/actions";

const initial: PayPeriodActionState = { ok: false, message: "" };

export function PayPeriodLockPanel({
  storeId,
  periodKey,
  locked,
  lockEligible,
  lockBlockReasons,
  isAdmin,
}: {
  storeId: string;
  periodKey: string;
  locked: boolean;
  lockEligible: boolean;
  lockBlockReasons: string[];
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
            <input type="hidden" name="periodKey" value={periodKey} />
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
            未對上的暱稱須處理完且必要匯入齊全才可鎖定。鎖定後店員看到的業績不再隨匯入變動。
          </p>
          {!lockEligible && lockBlockReasons.length > 0 ? (
            <ul className="list-inside list-disc text-xs text-zinc-500">
              {lockBlockReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <form action={lockAction}>
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="periodKey" value={periodKey} />
            <button
              type="submit"
              disabled={lockPending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {lockPending ? "鎖定中…" : "鎖定本期"}
            </button>
          </form>
        </>
      )}
      <ActionStatus ok={statusOk} message={statusMessage} />
    </section>
  );
}
