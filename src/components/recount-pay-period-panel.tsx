"use client";

import { useActionState } from "react";
import { ActionStatus } from "@/components/action-status";
import {
  recountPayPeriodAction,
  type RecountActionState,
} from "@/payroll/recount-actions";

const initial: RecountActionState = { ok: false, message: "" };

export function RecountPayPeriodPanel({
  storeId,
  periodKey,
  locked,
  isAdmin,
}: {
  storeId: string;
  periodKey: string;
  locked: boolean;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(
    recountPayPeriodAction,
    initial
  );

  if (!isAdmin || locked) {
    return null;
  }

  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="periodKey" value={periodKey} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm underline underline-offset-2 disabled:opacity-60"
      >
        {pending ? "重算中…" : "重算本期"}
      </button>
      {state.message ? (
        <ActionStatus ok={state.ok} message={state.message} />
      ) : null}
    </form>
  );
}
